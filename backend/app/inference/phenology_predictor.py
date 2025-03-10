import os
import re
import numpy as np
import torch
import torch.nn as nn
import rasterio
from datetime import datetime
import ast  # in case pixel is provided as a string
import traceback

PHENOLOGY_STAGES = ["bbch_00", "bbch_10", "bbch_31", "bbch_51", "bbch_75", "bbch_87", "bbch_99"]
CHANNELS = ["blu", "grn", "nir", "re1", "re2", "re3", "red", "sw1", "sw2"]
NORMALIZATION_VALUES = {
    'blu': {'min': 1151, 'max': 2238},
    'grn': {'min': 1380, 'max': 2432},
    'nir': {'min': 2757, 'max': 6504},
    're1': {'min': 1717, 'max': 3073},
    're2': {'min': 2673, 'max': 5078},
    're3': {'min': 2763, 'max': 5933},
    'red': {'min': 1239, 'max': 2936},
    'sw1': {'min': 2328, 'max': 3846},
    'sw2': {'min': 1829, 'max': 3413}
}

class RNNModel(nn.Module):
    def __init__(self, input_size=9, hidden_size=32, output_size=7, num_layers=2):
        super(RNNModel, self).__init__()
        self.rnn = nn.GRU(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)


    def forward(self, x):
        rnn_outputs, _ = self.rnn(x)
        x = self.fc(rnn_outputs[:, -1, :])
        return x

def read_field_tiff_features(tiff_dir, pixel, band_indices):
    """
    Read TIFF files from a directory, extract a feature vector for a given pixel.
    
    Args:
        tiff_dir (str): Path to the directory containing TIFF files.
        pixel (tuple or str): Pixel coordinates (x, y). If string, it will be converted.
        band_indices (list): List of indices to select from the pixel values.
        
    Returns:
        sequence_features (list): List of feature vectors (each as a numpy array).
        sequence_dates (list): Corresponding list of datetime objects for each TIFF file.
    """
    # Ensure pixel is a tuple (if passed as string, convert it)
    if isinstance(pixel, str):
        pixel = ast.literal_eval(pixel)
    
    # List all TIFF files (supporting both .tif and .tiff extensions)
    files = [f for f in os.listdir(tiff_dir) if f.endswith('.tif') or f.endswith('.tiff')]
    
    # Use a regex to extract a date in the format YYYY-MM-DD from the filename.
    date_pattern = re.compile(r"(\d{4}-\d{2}-\d{2})")
    file_date_tuples = []
    for file in files[:-7]:
        match = date_pattern.search(file)
        if match:
            date_str = match.group(1)
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                file_date_tuples.append((date_obj, file))
            except ValueError:
                print(f"Skipping {file}: Could not parse date {date_str}")
    
    # Sort files by extracted date
    file_date_tuples.sort(key=lambda x: x[0])
    
    sequence_features = []
    sequence_dates = []
    for date_obj, file in file_date_tuples:
        tiff_path = os.path.join(tiff_dir, file)
        try:
            with rasterio.open(tiff_path) as src:
                # Read all bands; shape is [bands, height, width]
                image_data = src.read()
                # Check if the image contains enough bands for the given indices
                if image_data.shape[0] < max(band_indices) + 1:
                    print(f"Skipping {file}: Not enough bands (found {image_data.shape[0]} bands)")
                    continue
                
                # Extract pixel values. Note: rasterio uses [band, row, col] indexing.
                # Here we assume pixel is given as (x, y) where x is column and y is row.
                x, y = pixel
                pixel_values = image_data[:, y, x]  # shape: (n_bands,)
                
                # Select only the bands of interest
                feature_vector = pixel_values[band_indices]
                sequence_features.append(feature_vector)
                sequence_dates.append(date_obj)
        except Exception:
            print(f"Error processing {file}:")
            print(traceback.format_exc())
            continue

    return sequence_features, sequence_dates

def normalize_features_array(features_list, normalization_values=NORMALIZATION_VALUES, channels=CHANNELS):
    """
    Normalize a list of feature vectors using provided normalization values.
    
    Args:
        features_list (list): List of feature vectors (each as a 1D NumPy array).
        normalization_values (dict): Dictionary with min and max for each channel.
        channels (list): List of channel names in the order corresponding to the feature vector.
    
    Returns:
        normalized_array (np.ndarray): Array of normalized feature vectors.
    """
    # Stack the list into a 2D array of shape [n_samples, n_channels]
    features_array = np.stack(features_list, axis=0).astype(np.float32)
    
    # Normalize each channel using vectorized operations
    for i, chan in enumerate(channels):
        norm_vals = normalization_values.get(chan)
        if norm_vals is not None:
            min_val = norm_vals['min']
            max_val = norm_vals['max']
            features_array[:, i] = (features_array[:, i] - min_val) / (max_val - min_val)
    return features_array

def predict_phenological_stage_one_pixel(
        tiff_dir, pixel, model, device, 
        band_indices = [1, 2, 7, 4, 5, 6, 3, 10, 11],
        normalization_values = NORMALIZATION_VALUES,
        channels = CHANNELS
):
    """
    Create a sequence from TIFF features and predict the phenological stage using the RNN model.
    
    Args:
        tiff_dir (str): Directory with TIFF files.
        pixel (tuple or str): Pixel coordinates (x, y) at which to extract features.
        model (nn.Module): The trained RNN model.
        device (torch.device): Device on which to run the model.
        band_indices (list): List of band indices to use for feature extraction.
        and more
    Returns:
        predicted_stage (int): The predicted phenological stage (index of max output).
        dates (list): Sorted dates corresponding to each feature vector.
    """
    # Get the sequence of features and the corresponding dates
    sequence_features, dates = read_field_tiff_features(tiff_dir, pixel, band_indices)
    
    if not sequence_features:
        print("No feature vectors were extracted.")
        return None, None

    normalized_features = normalize_features_array(sequence_features, normalization_values, channels)
    # Stack the feature vectors to create a tensor
    # Tensor shape should be [batch_size, seq_len, input_size]
    seq_tensor = torch.tensor(normalized_features, dtype=torch.float32).unsqueeze(0)
    seq_tensor = seq_tensor.to(device)
    
    model.eval()
    with torch.no_grad():
        output = model(seq_tensor)
    
    # Assuming the model outputs a tensor of shape [1, output_size] corresponding to scores for each stage,
    # choose the index (phenological stage) with the maximum score.
    _, predicted_stage = torch.max(output.data, 1)
    return predicted_stage.item(), dates

# Example usage:
if __name__ == "__main__":
    # Example parameters (adjust these as needed)
    tiff_folder = "./data/sentinel_data"
    pixel_coordinate = (5, 5)  # Example (x, y) coordinate

    model = RNNModel()
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    loaded_checkpoint = torch.load('./data/model_wieghts/narc_satellite_phen_model.pth', map_location=device)
    model.load_state_dict(loaded_checkpoint['model'])

    predicted_stage, dates = predict_phenological_stage_one_pixel(tiff_folder, pixel_coordinate, model, device)
    if predicted_stage is not None:
        print("Predicted Phenological Stage:", predicted_stage, PHENOLOGY_STAGES[predicted_stage])
        print("Feature Dates:", len(dates), dates)



# Use this thread of cowlars chatgpt for further coding
# https://chatgpt.com/c/67ce1044-fcd8-800f-919d-20c4b4009465