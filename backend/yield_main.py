import os
import csv
import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from tqdm import tqdm
import rasterio
from rasterio.plot import show
import matplotlib.colors as mcolors
from concurrent.futures import ProcessPoolExecutor, as_completed
import re
from datetime import datetime

from yield_predictory import (
    YieldRNNModel, predict_yield_field, predict_yield_pixel, predict_yield_pixel_with_date_limit,
    NORMALIZATION_VALUES, CHANNELS
)

def generate_predictions_and_save_csv(
        tiff_dir, 
        output_dir, 
        sowing_date=None,
        model_path=r"C:/New folder/model/yield.pth", 
        output_filename="yield_report.csv"):
    """
    Get the field-level yield prediction (averaging all pixels) and save to CSV.

    Args:
        tiff_dir (str): Directory containing TIFF files.
        output_dir (str): Directory to save the output CSV file.
        model_path (str): Path to the trained yield model.
        output_filename (str): Name of the output CSV file to save predictions.
    """
    yield_model = YieldRNNModel()
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    yield_model.to(device)
    loaded_checkpoint = torch.load(model_path, map_location=device)
    yield_model.load_state_dict(loaded_checkpoint['model'])

    print(f"Getting yield predictions")
    predicted_yield, dates = predict_yield_field(tiff_dir, yield_model, device, sowing_date)
    
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

def process_yield_time_series_predictions(
        tiff_dir, 
        output_dir,
        sowing_date=None,
        model_path=r"C:/New folder/model/yield.pth", 
        band_indices = [1, 2, 7, 4, 5, 6, 3, 10, 11],
        sample_tiff=None,
        max_workers=4,
        skip_pixels=None,
        pixel_mask=None
    ):
    """
    Process TIFF files sequentially, making yield predictions for each time point.
    Creates a series of GeoTIFF files showing yield predictions over time.
    Also maintains the original functionality of field-level averaging.
    
    Args:
        tiff_dir (str): Directory with TIFF files.
        output_dir (str): Directory to save outputs.
        model_path (str): Path to the trained model weights.
        band_indices (list): List of band indices to use.
        sample_tiff (str): Optional path to a sample TIFF for spatial reference.
        max_workers (int): Number of parallel workers.
        skip_pixels (int): Optional, process every Nth pixel.
        pixel_mask (ndarray): Optional boolean mask of pixels to process.
        
    Returns:
        list: Paths to the output files for each date.
        dict: Field-level yield predictions for each date.
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Load model
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    yield_model = YieldRNNModel()
    loaded_checkpoint = torch.load(model_path, map_location=device)
    yield_model.load_state_dict(loaded_checkpoint['model'])
    yield_model.to(device)
    
    # Get all TIFF files sorted by date
    files = [f for f in os.listdir(tiff_dir) if f.endswith('.tif') or f.endswith('.tiff')]
    date_pattern = re.compile(r'^(\d{4}-\d{2}-\d{2})\.tiff$')
    
    file_date_tuples = []
    for file in files:
        match = date_pattern.match(file)
        if match:
            date_str = match.group(1)
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                file_date_tuples.append((date_obj, file))
            except ValueError:
                print(f"Skipping {file}: Could not parse date {date_str}")
    
    # Sort files by date
    file_date_tuples.sort(key=lambda x: x[0])
    
    if not file_date_tuples:
        raise ValueError(f"No valid dated TIFF files found in {tiff_dir}")
    
    # Get spatial reference from a sample TIFF
    if sample_tiff is None:
        sample_tiff = os.path.join(tiff_dir, file_date_tuples[0][1])
        
    with rasterio.open(sample_tiff) as src:
        height, width = src.shape
        meta = src.meta.copy()
        
        # Create a list of pixel coordinates to process
        coordinates = []
        for y in range(height):
            for x in range(width):
                if skip_pixels and (x % skip_pixels != 0 or y % skip_pixels != 0):
                    continue
                if pixel_mask is not None and not pixel_mask[y, x]:
                    continue
                coordinates.append((x, y))
    
    print(f"Processing {len(coordinates)} pixels for {len(file_date_tuples)} time points")
    
    # Storage for output file paths and field-level predictions
    output_paths = []
    field_level_predictions = {}
    
    # Also calculate and save field-level predictions (original functionality)
    field_predictions_csv = os.path.join(output_dir, "field_level_yield_report.csv")
    with open(field_predictions_csv, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["date", "yield"])  # Write header
    
    # Process predictions for each date in sequence
    for end_idx, (current_date, _) in enumerate(file_date_tuples, 1):
        current_date_str = current_date.strftime('%Y-%m-%d')
        
        print(f"\nMaking yield predictions up to {current_date_str} using {end_idx} images")
        
        # Create a results array for yield predictions
        results_array = np.full((height, width), np.nan, dtype=np.float32)
        
        # Process pixels in parallel for the current date
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            future_to_coord = {
                executor.submit(
                    predict_yield_pixel_with_date_limit, 
                    tiff_dir, 
                    (x, y), 
                    yield_model, 
                    device,
                    current_date,  # Only use data up to this date
                    band_indices,
                    NORMALIZATION_VALUES,
                    CHANNELS,
                    sowing_date
                ): (x, y) for x, y in coordinates
            }
            
            # Process results as they complete
            valid_predictions = []
            for future in tqdm(as_completed(future_to_coord), total=len(coordinates), 
                              desc=f"Processing pixels for {current_date_str}"):
                x, y = future_to_coord[future]
                try:
                    predicted_yield, dates = future.result()
                    if predicted_yield is not None:
                        # Store result in array
                        results_array[y, x] = predicted_yield
                        valid_predictions.append(predicted_yield)
                except Exception as e:
                    print(f"Error processing pixel ({x}, {y}) for date {current_date_str}: {e}")
        
        # Calculate field-level average yield
        field_yield = np.nanmean(results_array) if valid_predictions else None
        field_level_predictions[current_date_str] = field_yield
        
        # Save field-level prediction to CSV
        with open(field_predictions_csv, mode='a', newline='') as file:
            writer = csv.writer(file)
            if field_yield is not None:
                writer.writerow([current_date_str, field_yield])
        
        # Save results as a TIFF file with date in the filename
        meta.update({
            'count': 1,
            'dtype': 'float32',
            'nodata': np.nan
        })
        tiff_path = os.path.join(output_dir, f'yield_predictions_{current_date_str}.tif')
        with rasterio.open(tiff_path, 'w', **meta) as dst:
            dst.write(results_array, 1)
        
        # Create a visualization with date in the filename
        # Use a colormap suitable for yield values (viridis or similar)
        valid_data = results_array[~np.isnan(results_array)]
        if len(valid_data) > 0:
            vmin = np.nanmin(results_array)
            vmax = np.nanmax(results_array)
            
            fig = plt.figure(figsize=(12, 10), frameon=False)
            ax = fig.add_subplot(111)
            img = ax.imshow(results_array, cmap='viridis', vmin=vmin, vmax=vmax)
            cbar = plt.colorbar(img, ax=ax)
            cbar.set_label('Yield (t/ha)')
            
            ax.set_title(f'Yield Prediction {current_date_str}')
            ax.set_axis_off()
            plt.tight_layout()
            
            viz_path = os.path.join(output_dir, f'yield_visualization_{current_date_str}.png')
            plt.savefig(viz_path, dpi=300, bbox_inches='tight')
            plt.close(fig)  # Close the figure to free memory
        else:
            viz_path = None
            print(f"No valid yield predictions for {current_date_str}, skipping visualization")
        
        print(f"Outputs for {current_date_str} saved to {tiff_path}")
        print(f"Field-level yield prediction: {field_yield:.2f} t/ha" if field_yield else "No field-level prediction")
        output_paths.append((current_date_str, tiff_path, viz_path, field_yield))
    
    return output_paths, field_level_predictions