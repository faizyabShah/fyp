import os
import numpy as np
import torch
import pandas as pd
import matplotlib.pyplot as plt
from tqdm import tqdm
import rasterio
from rasterio.plot import show
import matplotlib.colors as mcolors
from concurrent.futures import ProcessPoolExecutor, as_completed

# Import the necessary functions from your original script
from phenology_predictory import (
    RNNModel, predict_phenological_stage_one_pixel, 
    PHENOLOGY_STAGES, CHANNELS, NORMALIZATION_VALUES
)

def process_entire_tiff(
        tiff_dir, 
        output_dir,
        model_path,
        band_indices = [1, 2, 7, 4, 5, 6, 3, 10, 11],
        sample_tiff=None,  # Optional: Use a specific TIFF for spatial reference
        max_workers=4,     # For parallel processing
        skip_pixels=None,  # Optional: Process every Nth pixel (e.g., 5 means every 5th pixel)
        pixel_mask=None    # Optional: Boolean mask of pixels to process
    ):
    """
    Process an entire TIFF file series to predict phenological stages for each pixel.
    
    Args:
        tiff_dir (str): Directory with TIFF files.
        output_dir (str): Directory to save outputs.
        model_path (str): Path to the trained model weights.
        band_indices (list): List of band indices to use.
        sample_tiff (str): Optional path to a sample TIFF for spatial reference.
        max_workers (int): Number of parallel workers.
        skip_pixels (int): Optional, process every Nth pixel to reduce computation.
        pixel_mask (ndarray): Optional boolean mask of pixels to process.
        
    Returns:
        tuple: Paths to the output CSV and image files.
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    NEW_NORM = {
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
    
    # Load model
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = RNNModel()
    loaded_checkpoint = torch.load(model_path, map_location=device)
    model.load_state_dict(loaded_checkpoint['model'])
    model.to(device)
    
    # Get spatial reference from a sample TIFF
    if sample_tiff is None:
        # Use the first TIFF file in the directory for spatial reference
        tiff_files = [f for f in os.listdir(tiff_dir) if f.endswith('.tif') or f.endswith('.tiff')]
        if not tiff_files:
            raise ValueError(f"No TIFF files found in {tiff_dir}")
        sample_tiff = os.path.join(tiff_dir, tiff_files[0])
        
    with rasterio.open(sample_tiff) as src:
        # Get the shape of the TIFF (height, width)
        height, width = src.shape
        # Get metadata for creating output TIFF
        meta = src.meta.copy()
        
        # Create a list of pixel coordinates to process
        coordinates = []
        for y in range(height):
            for x in range(width):
                # Apply skip_pixels if specified
                if skip_pixels and (x % skip_pixels != 0 or y % skip_pixels != 0):
                    continue
                # Apply pixel_mask if specified
                if pixel_mask is not None and not pixel_mask[y, x]:
                    continue
                coordinates.append((x, y))
    
    print(f"Processing {len(coordinates)} pixels out of {height * width} total pixels")
    
    # Create a results array and initialize with NoData (-1)
    results_array = np.full((height, width), -1, dtype=np.int8)
    # Create a list to store results for CSV
    results_list = []
    
    # Process pixels in parallel
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        # Create a dictionary to map future to pixel coordinates
        future_to_coord = {
            executor.submit(
                predict_phenological_stage_one_pixel, 
                tiff_dir, 
                (x, y), 
                model, 
                device,
                band_indices,
                NORMALIZATION_VALUES,
                CHANNELS
            ): (x, y) for x, y in coordinates
        }
        
        # Process results as they complete
        for future in tqdm(as_completed(future_to_coord), total=len(coordinates), desc="Processing pixels"):
            x, y = future_to_coord[future]
            try:
                predicted_stage, dates = future.result()
                if predicted_stage is not None:
                    # Store result in array
                    results_array[y, x] = predicted_stage
                    # Store result for CSV
                    results_list.append({
                        'x': x, 
                        'y': y, 
                        'predicted_stage': predicted_stage,
                        'stage_name': PHENOLOGY_STAGES[predicted_stage],
                        'num_observations': len(dates) if dates else 0
                    })

                    if dates and len(dates) > 0:
                        last_date = dates[-1].strftime('%Y-%m-%d')
            except Exception as e:
                print(f"Error processing pixel ({x}, {y}): {e}")
    
    # Save results to CSV
    results_df = pd.DataFrame(results_list)
    csv_path = os.path.join(output_dir, f'{last_date}.csv')
    results_df.to_csv(csv_path, index=False)
    print(f"Results saved to {csv_path}")
    
    # Save results as a TIFF file
    meta.update({
        'count': 1,
        'dtype': 'int8',
        'nodata': -1
    })
    tiff_path = os.path.join(output_dir, 'phenology_predictions.tif')
    with rasterio.open(tiff_path, 'w', **meta) as dst:
        dst.write(results_array, 1)
    print(f"Results saved to {tiff_path}")
    
    # Create a visualization with matplotlib
    # Define a colormap for the phenology stages
    colors = [
    '#FF0000', 
    '#FF8033',
    '#FFFF00', 
    '#66FF4D', 
    '#0000FF', 
    '#FF00FF', 
    '#00FFFF' 
  ]
    cmap = mcolors.ListedColormap(colors)
    
    # Set up boundaries for the colormap
    bounds = np.arange(-0.5, len(PHENOLOGY_STAGES) + 0.5)
    norm = mcolors.BoundaryNorm(bounds, cmap.N)
    
    # Create the figure
    fig = plt.figure(figsize=(12, 10), frameon=False)
    ax = fig.add_subplot(111)
    img = ax.imshow(results_array, cmap=cmap, norm=norm)

    # Remove all axes, borders, etc.
    ax.set_axis_off()
    plt.subplots_adjust(top=1, bottom=0, right=1, left=0, hspace=0, wspace=0)
    plt.margins(0, 0)
    ax.xaxis.set_major_locator(plt.NullLocator())
    ax.yaxis.set_major_locator(plt.NullLocator())

    # Save the visualization with tight bbox and no extra space
    viz_path = os.path.join(output_dir, f'phenology_visualization_{last_date}.png')
    plt.savefig(viz_path, dpi=300, bbox_inches='tight', pad_inches=0)
    print(f"Visualization saved to {viz_path}")
    
    return csv_path, tiff_path, viz_path

def process_with_mask(
        tiff_dir, 
        output_dir,
        mask_file=None,  # Optional: Path to a binary mask file
        mask_value=1,     # Value in mask that indicates pixels to process
        model_path='C:/New folder/model/best.pth'
    ):
    """
    Process an entire TIFF using a mask to identify relevant pixels.
    
    Args:
        tiff_dir (str): Directory with TIFF files
        model_path (str): Path to model weights
        output_dir (str): Output directory
        mask_file (str): Path to a mask file (binary TIFF)
        mask_value (int): Value in mask that indicates pixels to process
    
    Returns:
        tuple: Paths to the output files
    """
    # Load mask if provided
    pixel_mask = None
    if mask_file and os.path.exists(mask_file):
        with rasterio.open(mask_file) as src:
            pixel_mask = src.read(1) == mask_value
        print(f"Loaded mask with {pixel_mask.sum()} pixels to process")
    
    return process_entire_tiff(
        tiff_dir=tiff_dir,
        output_dir=output_dir,
        model_path=model_path,
        pixel_mask=pixel_mask
    )

if __name__ == "__main__":
    # Example usage:
    tiff_dir = r"C:\Users\PMYLS\Downloads\satellite code\sentinel-data-rotated"
    model_path = "./model/best.pth"
    output_dir = "./results"
    
    # Option 1: Process the entire TIFF (might be slow for large images)
    #csv_path, tiff_path, viz_path = process_entire_tiff(tiff_dir, output_dir, model_path)
    
    # Option 2: Process every 5th pixel to reduce computation
    #csv_path, tiff_path, viz_path = process_entire_tiff(tiff_dir, output_dir, model_path, skip_pixels=5)
    
    # Option 3: Process only pixels within a crop mask
    csv_path, tiff_path, viz_path = process_with_mask(
        tiff_dir, 
        model_path, 
        output_dir,
        mask_file="./data/crop_mask.tif"
    )
    
    print("Processing complete!")
    print(f"CSV results: {csv_path}")
    print(f"TIFF results: {tiff_path}")
    print(f"Visualization: {viz_path}")