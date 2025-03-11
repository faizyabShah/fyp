import os
import csv
import torch

from yield_predictory import (
    YieldRNNModel, predict_yield_field
)


def generate_predictions_and_save_csv(
        tiff_dir, 
        output_dir, 
        model_path=r"c:\Users\hassa\Downloads\best (6).pth", 
        output_filename="yield_report.csv"):
    """
    Loop through all pixel coordinates in the TIFF file, predict yield for each,
    and save the results in a CSV file. Creates a new CSV file with headers if it doesn't exist,
    otherwise appends to the existing file.

    Args:
        tiff_dir (str): Directory containing TIFF files.
        model (nn.Module): The trained RNN model.
        device (torch.device): Device on which to run the model.
        output_dir (str): Directory to save the output CSV file.
        output_filename (str): Name of the output CSV file to save predictions.
    """
    yield_model = YieldRNNModel()
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    yield_model.to(device)
    loaded_checkpoint = torch.load(model_path, map_location=device)
    yield_model.load_state_dict(loaded_checkpoint['model'])

    print(f"Getting yield predictions")
    predicted_yield, dates = predict_yield_field(tiff_dir, yield_model, device)
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    output_path = os.path.join(output_dir, f"{output_filename}")
    file_exists = os.path.isfile(output_path)
    
    # Format the date
    if dates and len(dates) > 0:
        date_str = dates[-1].strftime("%Y-%m-%d")  # Format as YYYY-MM-DD
    else:
        date_str = "unknown"
    
    # Write to CSV file
    with open(output_path, mode='a', newline='') as file:
        writer = csv.writer(file)
        
        # Write header if the file is being created for the first time
        if not file_exists:
            writer.writerow(["date", "yield"])
        
        # Write data if we have a valid prediction
        if predicted_yield is not None:
            writer.writerow([date_str, predicted_yield])

    print(f"Yield predictions saved to {output_path}")