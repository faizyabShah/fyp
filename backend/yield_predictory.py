import csv
import os
import re
import numpy as np
import torch
import torch.nn as nn
import rasterio
from datetime import datetime
import traceback

# Define the channel names and normalization values for the satellite bands.
CHANNELS = ["blu", "grn", "nir", "re1", "re2", "re3", "red", "sw1", "sw2"]
NORMALIZATION_VALUES = {
        'blu': {'min': 151, 'max': 1238},
        'grn': {'min': 380, 'max': 1432},
        'nir': {'min': 1757, 'max': 5504},
        're1': {'min': 717, 'max': 2073},
        're2': {'min': 1673, 'max': 4078},
        're3': {'min': 1763, 'max': 4933},
        'red': {'min': 239, 'max': 1936},
        'sw1': {'min': 1328, 'max': 2846},
        'sw2': {'min': 829, 'max': 2413}
    }

# Function to unnormalize the yield prediction.
def unnormalize_yield(normalized_yield):
    minimum = 4.5
    maximum = 10.85
    return normalized_yield * (maximum - minimum) + minimum

# Yield RNN model (input_size=10 since we have days_from_sowing + 9 bands).
class YieldRNNModel(nn.Module):
    def __init__(self, input_size=10, hidden_size=32, output_size=1, num_layers=2):
        super(YieldRNNModel, self).__init__()
        self.rnn = nn.GRU(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        rnn_outputs, _ = self.rnn(x)
        x = self.fc(rnn_outputs[:, -1, :])
        return x

def read_field_tiff_features_yield(tiff_dir, band_indices, channels):
    """
    Read TIFF files from a directory, compute the average value for each selected band 
    over the entire field, and compute days from sowing (using the first file as sowing date).
    
    Args:
        tiff_dir (str): Directory containing TIFF files.
        band_indices (list): List of band indices to extract (e.g., [1,2,7,4,5,6,3,10,11]).
        channels (list): List of channel names corresponding to these bands.
        
    Returns:
        sequence_features (list): List of feature vectors, each of length 10:
            [days_from_sowing, avg_blu, avg_grn, ..., avg_sw2]
        sequence_dates (list): List of datetime objects corresponding to each TIFF file.
    """
    # List TIFF files in the directory
    files = [f for f in os.listdir(tiff_dir) if f.endswith('.tif') or f.endswith('.tiff')]
    
    # Use regex to extract a date in the format YYYY-MM-DD from the filename.
    date_pattern = re.compile(r"(\d{4}-\d{2}-\d{2})")
    file_date_tuples = []
    for file in files:
        match = date_pattern.search(file)
        if match:
            date_str = match.group(1)
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                file_date_tuples.append((date_obj, file))
            except ValueError:
                print(f"Skipping {file}: Could not parse date {date_str}")
    
    # Sort files by date.
    file_date_tuples.sort(key=lambda x: x[0])
    
    sequence_features = []
    sequence_dates = []
    sowing_date = None
    for date_obj, file in file_date_tuples:
        tiff_path = os.path.join(tiff_dir, file)
        try:
            with rasterio.open(tiff_path) as src:
                image_data = src.read()  # shape: [bands, height, width]
                if image_data.shape[0] < max(band_indices) + 1:
                    print(f"Skipping {file}: Not enough bands (found {image_data.shape[0]} bands)")
                    continue
                
                # Compute the average for each specified band.
                avg_values = []
                for idx in band_indices:
                    band_data = image_data[idx]  # band_data shape: [height, width]
                    avg_val = np.mean(band_data)
                    avg_values.append(avg_val)
                
                # Set sowing date from the first file.
                if sowing_date is None:
                    sowing_date = date_obj
                days_from_sowing = (date_obj - sowing_date).days
                
                # Create feature vector: [days_from_sowing, avg_blu, avg_grn, ..., avg_sw2]
                feature_vector = [days_from_sowing] + avg_values
                sequence_features.append(feature_vector)
                sequence_dates.append(date_obj)
        except Exception:
            print(f"Error processing {file}:")
            print(traceback.format_exc())
            continue
    
    return sequence_features, sequence_dates

def normalize_features_array_yield(features_list, normalization_values=NORMALIZATION_VALUES, channels=CHANNELS):
    """
    Normalize the satellite band features in the yield feature vectors.
    The first column (days_from_sowing) remains unchanged.
    
    Args:
        features_list (list): List of feature vectors (each of length 10).
        normalization_values (dict): Normalization values for each satellite band.
        channels (list): List of channel names corresponding to indices 1-9 in the feature vector.
        
    Returns:
        normalized_array (np.ndarray): Array of normalized feature vectors.
    """
    # Stack list into a 2D array and ensure float type.
    features_array = np.stack(features_list, axis=0).astype(np.float32)
    # Normalize satellite band features (columns 1 through 9).
    for i, chan in enumerate(channels):
        norm_vals = normalization_values.get(chan)
        if norm_vals is not None:
            min_val = norm_vals['min']
            max_val = norm_vals['max']
            features_array[:, i+1] = (features_array[:, i+1] - min_val) / (max_val - min_val)
    return features_array

def predict_yield_field(
    tiff_dir, model, device,
    band_indices=[1, 2, 7, 4, 5, 6, 3, 10, 11],
    normalization_values=NORMALIZATION_VALUES,
    channels=CHANNELS
):
    """
    Create a sequence of field-level yield features (including days from sowing),
    normalize them (except for days_from_sowing), and predict yield using the RNN model.
    
    Args:
        tiff_dir (str): Directory with TIFF files.
        model (nn.Module): Trained yield RNN model.
        device (torch.device): Device to run the model.
        band_indices (list): List of band indices for feature extraction.
        normalization_values (dict): Normalization values for satellite bands.
        channels (list): List of channel names for the satellite bands.
    
    Returns:
        predicted_yield (float): Unnormalized predicted yield.
        dates (list): Sorted list of datetime objects corresponding to each feature vector.
    """
    sequence_features, dates = read_field_tiff_features_yield(tiff_dir, band_indices, channels)
    if not sequence_features:
        print("No feature vectors were extracted.")
        return None, None

    normalized_features = normalize_features_array_yield(sequence_features, normalization_values, channels)
    
    # Create a tensor with shape [batch_size, seq_len, input_size]
    seq_tensor = torch.tensor(normalized_features, dtype=torch.float32).unsqueeze(0)
    seq_tensor = seq_tensor.to(device)
    
    model.eval()
    with torch.no_grad():
        output = model(seq_tensor)
    
    normalized_yield = output.item()  # Model outputs a normalized yield value.
    predicted_yield = unnormalize_yield(normalized_yield)
    return predicted_yield, dates
