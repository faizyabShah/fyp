from sentinelhub import DataCollection, SHConfig, SentinelHubRequest, CRS, BBox, MimeType, bbox_to_dimensions, SentinelHubCatalog, filter_times
import os
import sys
from datetime import datetime, timedelta
import numpy as np
from PIL import Image
from app.config import Config
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_origin, from_bounds
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import csv

from pyproj import Transformer

# Configure Sentinel Hub credentials
config = SHConfig()
config.instance_id = '0a26c1fc-c12a-456f-b795-28ebeba0e142'
config.sh_client_id = 'a3265009-a113-42de-b298-6722d4bbbb7c'
config.sh_client_secret = 'IpUFFJJn3ihYofil3FcH4Fat7Wd6Ptau'

configuration = Config()

# Ensure the data folder exists.
DATA_FOLDER = configuration.BASE_DIR
os.makedirs(DATA_FOLDER, exist_ok=True)

def fetch_sentinel_imagery(polygon_coords, username, name, start_date_str, end_date_str, max_cloud_coverage=0.7):
    """
    Fetch Sentinel-2 imagery based on the provided polygon coordinates for all images between start and end dates.
    
    Parameters:
    -----------
    polygon_coords : list
        List of [lon, lat] points defining the polygon in WGS84
    username : str
        Username for creating the output directory
    name : str
        Name for creating the output directory
    start_date_str : str
        Start date for fetching imagery (YYYY-MM-DD)
    end_date_str : str
        End date for fetching imagery (YYYY-MM-DD)
    max_cloud_coverage : float
        Maximum cloud coverage (0-1)
    
    Returns:
    --------
    bool or dict
        True if successful or an error dictionary
    """
    # Compute bounding box from the polygon coordinates (assumes [lon, lat] points)
    print("FETCHING SENTINEL IMAGERY")
    lons = [pt[0] for pt in polygon_coords]
    lats = [pt[1] for pt in polygon_coords]
    minx, miny, maxx, maxy = min(lons), min(lats), max(lons), max(lats)
    print('here')
    
    # Create a transformer to convert from WGS84 to EPSG:32643
    transformer = Transformer.from_crs("EPSG:4326", "EPSG:32643", always_xy=True)
    
    # Transform the bounding box corners to EPSG:32643
    utm_min_x, utm_min_y = transformer.transform(minx, miny)
    utm_max_x, utm_max_y = transformer.transform(maxx, maxy)
    
    # Create BBox object with EPSG:32643 CRS
    bbox = BBox(bbox=[utm_min_x, utm_min_y, utm_max_x, utm_max_y], crs=CRS.UTM_43N)
    
    # Create WGS84 BBox for catalog search
    wgs84_bbox = BBox(bbox=[minx, miny, maxx, maxy], crs=CRS.WGS84)
    print("got bbox")
    
    # Convert start_date_str and end_date_str to datetime objects
    start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
    end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
    time_interval = (start_date_str, end_date_str)
    
    # Calculate dimensions at 10m resolution
    bbox_size = bbox_to_dimensions(bbox, resolution=10)
    print("dimensions calculated")
    
    # Check if dimensions are too large
    max_pixels = 4500 * 4500  # Reasonable maximum size to avoid memory issues
    if bbox_size[0] * bbox_size[1] > max_pixels:
        scale_factor = np.sqrt(max_pixels / (bbox_size[0] * bbox_size[1]))
        new_width = int(bbox_size[0] * scale_factor)
        new_height = int(bbox_size[1] * scale_factor)
        print(f"Warning: Image dimensions too large. Rescaling to {new_width}x{new_height}")
        bbox_size = (new_width, new_height)
    
    # Initialize the Sentinel Hub Catalog to get all available timestamps
    catalog = SentinelHubCatalog(config=config)
    
    # Search for available data
    search_iterator = catalog.search(
        collection=DataCollection.SENTINEL2_L2A,
        bbox=wgs84_bbox,
        time=time_interval,
        filter="eo:cloud_cover <= " + str(max_cloud_coverage * 100)  # Convert to percentage
    )
    
    # Get all timestamps
    all_timestamps = search_iterator.get_timestamps()
    
    if not all_timestamps:
        return {"error": f"No Sentinel-2 data available for the period {start_date_str} to {end_date_str} with cloud coverage ≤ {max_cloud_coverage * 100}%"}
    
    print(f"Found {len(all_timestamps)} acquisition dates")
    
    # Filter unique acquisition times (e.g., within 1 hour difference)
    unique_acquisitions = filter_times(all_timestamps, timedelta(hours=1))
    print(f"After filtering: {len(unique_acquisitions)} unique acquisitions")
    
    # Define the Sentinel-2 bands we want to retrieve
    sentinel2_bands = {
        'B01': 'coastal aerosol',
        'B02': 'blue',
        'B03': 'green',
        'B04': 'red',
        'B05': 'vegetation red edge',
        'B06': 'vegetation red edge',
        'B07': 'vegetation red edge',
        'B08': 'NIR',
        'B8A': 'narrow NIR',
        'B09': 'water vapor',
        'B11': 'SWIR',
        'B12': 'SWIR'
    }
    
    # Create directory to store output
    directory_path = os.path.join(DATA_FOLDER, f"{username}_{name}")
    os.makedirs(directory_path, exist_ok=True)
    
    # Get all bands in one request for better consistency
    evalscript = """
    //VERSION=3
    function setup() {
        return {
            input: [{
                bands: ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B8A", "B09", "B11", "B12"],
                units: "DN"
            }],
            output: {
                bands: 12,
                sampleType: "FLOAT32"
            }
        };
    }

    function evaluatePixel(sample) {
        return [
            sample.B01, 
            sample.B02, 
            sample.B03, 
            sample.B04, 
            sample.B05, 
            sample.B06, 
            sample.B07, 
            sample.B08, 
            sample.B8A, 
            sample.B09, 
            sample.B11, 
            sample.B12
        ];
    }
    """
    
    # Metadata eval script
    metadata_script = """
    //VERSION=3
    function setup() {
        return {
            input: [{
                bands: ["B02"],
                units: "DN"
            }],
            output: {
                id: "default",
                bands: 1,
                sampleType: "FLOAT32"
            }
        };
    }

    function updateOutputMetadata(scenes, inputMetadata, outputMetadata) {
        outputMetadata.userData = {
            timestamp: scenes[0].date.toISOString(),
            acquisitionDate: scenes[0].date.toISOString(),
            cloudCoverage: scenes[0].meta.cloudCoverPercentage,
            tiles: scenes.map(scene => scene.meta.tileId)
        };
    }

    function evaluatePixel(sample) {
        return [1.0];
    }
    """
    
    # Process each unique acquisition
    success_count = 0
    error_count = 0
    
    for timestamp in unique_acquisitions:
        date_str = timestamp.strftime('%Y-%m-%d')
        print(f"Processing date: {date_str}")
        
        # Create a single request for all bands to ensure alignment
        request = SentinelHubRequest(
            evalscript=evalscript,
            input_data=[
                SentinelHubRequest.input_data(
                    data_collection=DataCollection.SENTINEL2_L2A,
                    time_interval=(timestamp.strftime('%Y-%m-%d'), (timestamp + timedelta(days=1)).strftime('%Y-%m-%d')),
                    maxcc=max_cloud_coverage,
                    # mosaicking_order="leastCC"
                )
            ],
            responses=[
                SentinelHubRequest.output_response('default', MimeType.TIFF)
            ],
            bbox=bbox,
            size=bbox_size,
            config=config
        )
        
        # Get metadata for this specific date
        # metadata_request = SentinelHubRequest(
        #     evalscript=metadata_script,
        #     input_data=[
        #         SentinelHubRequest.input_data(
        #             data_collection=DataCollection.SENTINEL2_L2A,
        #             time_interval=(timestamp.strftime('%Y-%m-%d'), (timestamp + timedelta(days=1)).strftime('%Y-%m-%d')),
        #             # mosaicking_order='leastCC',
        #             maxcc=max_cloud_coverage
        #         )
        #     ],
        #     responses=[
        #         SentinelHubRequest.output_response('default', MimeType.TIFF)
        #     ],
        #     bbox=bbox,
        #     size=(1, 1),
        #     config=config
        # )
        
        # # Get metadata
        # metadata = None
        # try:
        #     metadata_result = metadata_request.get_data()[0]
        #     if hasattr(metadata_result, 'metadata') and 'userData' in metadata_result.metadata:
        #         metadata = metadata_result.metadata['userData']
        #         print(f"Metadata successfully retrieved for {date_str}")
        #     else:
        #         print(f"Metadata structure not as expected for {date_str}")
        # except Exception as e:
        #     print(f"Error retrieving metadata for {date_str}: {e}")
        
        # Fetch the data
        try:
            print(f"Retrieving all bands for {date_str}...")
            data = request.get_data()
            
            if not data or len(data) == 0:
                print(f"No data returned from Sentinel Hub for {date_str}")
                error_count += 1
                continue
            
            # The data is returned as a multiband array
            multiband_data = data[0]
            
            print(f"Data retrieved for {date_str}")
            # Separate into individual bands
            # The bands are in the order defined in the evalscript
            band_order = ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B8A', 'B09', 'B11', 'B12']
            band_data = {}
            
            for i, band_name in enumerate(band_order):
                band_data[band_name] = multiband_data[:, :, i]
            
            # Get dimensions
            height, width = multiband_data.shape[:2]
            
            # Save as a multi-band GeoTIFF
            image_path = os.path.join(directory_path, "imagery", f"{date_str}.tiff")
            os.makedirs(os.path.dirname(image_path), exist_ok=True)
            
            # Calculate the transform for the correct coordinates in UTM
            transform = from_bounds(utm_min_x, utm_min_y, utm_max_x, utm_max_y, width, height)
            crs = 'EPSG:32643'  # UTM zone 43N
            
            # Save the multiband image
            try:
                with rasterio.open(
                    image_path, 'w', 
                    driver='GTiff', 
                    count=len(band_order), 
                    width=width, 
                    height=height,
                    dtype=multiband_data.dtype, 
                    crs='EPSG:32643',  # UTM zone 43N
                    transform=transform
                ) as dst:
                    for i, band_name in enumerate(band_order):
                        dst.write(band_data[band_name], i + 1)  # Write each band
                        dst.set_band_description(i + 1, band_name)
                    
                    # Add basic file metadata
                    # metadata_dict = {
                    #     'date_generated': datetime.now().isoformat(),
                    #     'acquisition_date': date_str,
                    #     'band_order': ','.join(band_order)
                    # }
                    
                    # Add any additional metadata from Sentinel Hub
                    # if metadata:
                    #     metadata_dict.update({
                    #         'acquisition_date': metadata.get('acquisitionDate', date_str),
                    #         'cloud_coverage': str(metadata.get('cloudCoverage', 'Not available')),
                    #     })
                    #     if 'tiles' in metadata:
                    #         metadata_dict['tiles'] = ','.join(metadata['tiles'])
                    
                    # dst.update_tags(**metadata_dict)
                
                print(f"Successfully saved {len(band_order)} bands to {image_path}")
                
                # Generate and save RGB preview
                preview_path = os.path.join(directory_path, "preview", f"{date_str}_preview.tiff")
                os.makedirs(os.path.dirname(preview_path), exist_ok=True)
                create_rgb_preview(band_data, preview_path, transform, crs)

                # Generate and save NDVI image
                ndvi_path = os.path.join(directory_path, "ndvi", f"{date_str}_NDVI.tiff")
                os.makedirs(os.path.dirname(ndvi_path), exist_ok=True)
                create_ndvi_image(band_data, ndvi_path, transform, crs)

                savi_path = os.path.join(directory_path, "savi", f"{date_str}_SAVI.tiff")
                os.makedirs(os.path.dirname(savi_path), exist_ok=True)
                create_savi_image(band_data, savi_path, transform, crs)

                # Generate and save false color composite
                false_color_path = os.path.join(directory_path, "false_color", f"{date_str}_false_color.tiff")
                os.makedirs(os.path.dirname(false_color_path), exist_ok=True)
                create_false_color_composite(band_data, false_color_path, transform, crs, bands=['B08', 'B04', 'B03'])

                avg_indices = calculate_average_indices(band_data)
                
                # Prepare CSV row
                csv_row = {
                    'date': date_str,
                    'ndvi': avg_indices['ndvi'],
                    'savi': avg_indices['savi']
                }

                csv_path = os.path.join(directory_path, "indices.csv")
                csv_exists = os.path.exists(csv_path)
                
                with open(csv_path, 'a', newline='') as csvfile:
                    fieldnames = ['date', 'ndvi', 'savi']
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    
                    # Write header if file doesn't exist
                    if not csv_exists:
                        writer.writeheader()
                    
                    writer.writerow(csv_row)
                
                print(f"Added indices for {date_str} to CSV file")

                
                success_count += 1
                
            except Exception as e:
                error_message = f"Error saving image for {date_str}: {str(e)}"
                print(error_message)
                error_count += 1
                continue
            
        except Exception as e:
            error_message = f"Error fetching data for {date_str}: {str(e)}"
            print(error_message)
            error_count += 1
            continue
    
    # Return summary
    if success_count > 0:
        print(f"Processed {success_count} images successfully with {error_count} errors")
        return True
    else:
        return {"error": f"Failed to process any images between {start_date_str} and {end_date_str}"}

def create_rgb_preview(band_data, save_path, transform, crs, scale_factor=9, contrast_stretch=True):
    """
    Create an RGB preview image from the band data and save as GeoTIFF
    
    Parameters:
    -----------
    band_data : dict
        Dictionary containing band data
    save_path : str
        Path to save the RGB preview image
    transform : Affine
        Spatial transform information
    crs : str or CRS
        Coordinate Reference System
    scale_factor : int, optional
        Factor to increase resolution by using interpolation (default=3)
    contrast_stretch : bool, optional
        Whether to apply contrast stretching (default=True)
    """
    if 'B04' in band_data and 'B03' in band_data and 'B02' in band_data:
        # Extract bands
        red = band_data['B04'].copy()
        green = band_data['B03'].copy()
        blue = band_data['B02'].copy()
        
        # Get dimensions
        height, width = red.shape
        
        # Better normalization with individual band stretching
        if contrast_stretch:
            # Normalize each band separately for better color representation
            red_norm = np.zeros_like(red, dtype=np.float32)
            green_norm = np.zeros_like(green, dtype=np.float32)
            blue_norm = np.zeros_like(blue, dtype=np.float32)
            
            # Remove extreme outliers before calculating percentiles
            p_low_r, p_high_r = np.percentile(red[red > 0], (0.5, 99.5))
            p_low_g, p_high_g = np.percentile(green[green > 0], (0.5, 99.5))
            p_low_b, p_high_b = np.percentile(blue[blue > 0], (0.5, 99.5))
            
            # Apply linear stretch with clip
            red_norm = np.clip((red - p_low_r) / (p_high_r - p_low_r), 0, 1)
            green_norm = np.clip((green - p_low_g) / (p_high_g - p_low_g), 0, 1)
            blue_norm = np.clip((blue - p_low_b) / (p_high_b - p_low_b), 0, 1)
            
            # Apply gamma correction
            gamma = 0.8
            red_norm = np.power(red_norm, gamma)
            green_norm = np.power(green_norm, gamma)
            blue_norm = np.power(blue_norm, gamma)
        else:
            # Simple normalization
            p_low_r, p_high_r = np.percentile(red, (2, 98))
            p_low_g, p_high_g = np.percentile(green, (2, 98))
            p_low_b, p_high_b = np.percentile(blue, (2, 98))
            
            red_norm = np.clip((red - p_low_r) / (p_high_r - p_low_r), 0, 1)
            green_norm = np.clip((green - p_low_g) / (p_high_g - p_low_g), 0, 1)
            blue_norm = np.clip((blue - p_low_b) / (p_high_b - p_low_b), 0, 1)
        
        # Convert to a scale appropriate for GeoTIFF storage (0-1 float32)
        red_out = red_norm.astype(np.float32)
        green_out = green_norm.astype(np.float32)
        blue_out = blue_norm.astype(np.float32)
        
        # Update file extension to .tiff if needed
        if not save_path.endswith(('.tif', '.tiff')):
            save_path = save_path.replace('.png', '.tiff')
        
        # Save as GeoTIFF
        with rasterio.open(
            save_path, 'w',
            driver='GTiff',
            height=height,
            width=width,
            count=3,
            dtype=np.float32,
            crs=crs,
            transform=transform
        ) as dst:
            dst.write(red_out, 1)
            dst.write(green_out, 2)
            dst.write(blue_out, 3)
            
            # Set band descriptions
            dst.set_band_description(1, 'Red')
            dst.set_band_description(2, 'Green')
            dst.set_band_description(3, 'Blue')
            
            # Add metadata
            dst.update_tags(
                created=datetime.now().isoformat(),
                description='RGB Composite (B04, B03, B02)',
                source_bands='B04,B03,B02'
            )
        
        print(f"RGB GeoTIFF saved to {save_path}")
    else:
        print("Required bands for RGB preview are not available")

def create_savi_image(band_data, save_path, transform, crs, L=0.5):
    """
    Create and save a Soil Adjusted Vegetation Index (SAVI) image as GeoTIFF with spatial reference.
    
    SAVI = ((NIR - RED) / (NIR + RED + L)) * (1 + L)
    where L is a soil brightness correction factor (default = 0.5)
    """
    # Extract NIR and RED bands
    nir = band_data['B08'].astype(np.float32)
    red = band_data['B04'].astype(np.float32)
    
    # Get dimensions
    height, width = nir.shape

    # Calculate SAVI with soil brightness correction factor
    savi = ((nir - red) / (nir + red + L)) * (1 + L)
    
    # Save as GeoTIFF
    with rasterio.open(
        save_path, 'w',
        driver='GTiff',
        height=height,
        width=width,
        count=1,
        dtype=np.float32,
        crs=crs,
        transform=transform
    ) as dst:
        dst.write(savi, 1)
        
        # Set band description
        dst.set_band_description(1, 'SAVI')
        
        # Add metadata
        dst.update_tags(
            created=datetime.now().isoformat(),
            description='Soil Adjusted Vegetation Index (SAVI)',
            source_bands='B08,B04',
            formula='((NIR - RED) / (NIR + RED + L)) * (1 + L)',
            L_factor=str(L)
        )
    
    print(f"SAVI GeoTIFF saved to {save_path}")


def calculate_average_indices(band_data):
    """
    Calculate average NDVI and SAVI values for the image.
    
    Parameters:
    -----------
    band_data : dict
        Dictionary containing band data
        
    Returns:
    --------
    dict
        Dictionary containing average NDVI and SAVI values
    """
    # Extract NIR and RED bands
    nir = band_data['B08'].astype(np.float32)
    red = band_data['B04'].astype(np.float32)
    
    # Calculate NDVI
    ndvi = (nir - red) / (nir + red + 1e-6)
    
    # Calculate SAVI with L=0.5
    L = 0.5
    savi = ((nir - red) / (nir + red + L)) * (1 + L)
    
    # Create masks for valid pixels (exclude extreme values)
    valid_mask = (ndvi >= -1.0) & (ndvi <= 1.0) & (savi >= -1.0) & (savi <= 1.0)
    
    # Calculate averages for valid pixels only
    avg_ndvi = np.mean(ndvi[valid_mask])
    avg_savi = np.mean(savi[valid_mask])
    
    return {
        'ndvi': avg_ndvi,
        'savi': avg_savi
    }

def create_ndvi_image(band_data, save_path, transform, crs):
    """
    Create and save an NDVI image as GeoTIFF with spatial reference.
    """
    # NDVI = (NIR - RED) / (NIR + RED)
    nir = band_data['B08'].astype(np.float32)
    red = band_data['B04'].astype(np.float32)
    
    # Get dimensions
    height, width = nir.shape

    # Prevent division by zero by adding a small constant
    ndvi = (nir - red) / (nir + red + 1e-6)
    
    # Keep NDVI in original scale [-1, 1] for GeoTIFF
    # Update file extension to .tiff if needed
    if not save_path.endswith(('.tif', '.tiff')):
        save_path = save_path.replace('.png', '.tiff')
    
    # Save as GeoTIFF
    with rasterio.open(
        save_path, 'w',
        driver='GTiff',
        height=height,
        width=width,
        count=1,
        dtype=np.float32,
        crs=crs,
        transform=transform
    ) as dst:
        dst.write(ndvi, 1)
        
        # Set band description
        dst.set_band_description(1, 'NDVI')
        
        # Add metadata
        dst.update_tags(
            created=datetime.now().isoformat(),
            description='Normalized Difference Vegetation Index (NDVI)',
            source_bands='B08,B04',
            formula='(NIR - RED) / (NIR + RED)'
        )
    
    print(f"NDVI GeoTIFF saved to {save_path}")


def create_false_color_composite(band_data, save_path, transform, crs, bands=None):
    """
    Create a false color composite image using specified bands and save as GeoTIFF
    
    Parameters:
    -----------
    band_data : dict
        Dictionary containing band data
    save_path : str
        Path to save the false color image
    transform : Affine
        Spatial transform information
    crs : str or CRS
        Coordinate Reference System
    bands : list, optional
        List of three bands to use for R, G, B channels
        Defaults to ['B08', 'B04', 'B03'] for NIR false color
    """
    if bands is None:
        # Default to NIR false color (vegetation appears red)
        bands = ['B08', 'B04', 'B03']
        
    if all(band in band_data for band in bands):
        # Extract the three bands
        r_band = band_data[bands[0]].copy()
        g_band = band_data[bands[1]].copy()
        b_band = band_data[bands[2]].copy()
        
        # Get dimensions
        height, width = r_band.shape
        
        # Normalize for better visualization
        r_norm = np.zeros_like(r_band, dtype=np.float32)
        g_norm = np.zeros_like(g_band, dtype=np.float32)
        b_norm = np.zeros_like(b_band, dtype=np.float32)
        
        # Remove extreme outliers before calculating percentiles
        p_low_r, p_high_r = np.percentile(r_band[r_band > 0], (0.5, 99.5))
        p_low_g, p_high_g = np.percentile(g_band[g_band > 0], (0.5, 99.5))
        p_low_b, p_high_b = np.percentile(b_band[b_band > 0], (0.5, 99.5))
        
        # Apply linear stretch with clip
        r_norm = np.clip((r_band - p_low_r) / (p_high_r - p_low_r), 0, 1)
        g_norm = np.clip((g_band - p_low_g) / (p_high_g - p_low_g), 0, 1)
        b_norm = np.clip((b_band - p_low_b) / (p_high_b - p_low_b), 0, 1)
        
        # Update file extension to .tiff if needed
        if not save_path.endswith(('.tif', '.tiff')):
            save_path = save_path.replace('.png', '.tiff')
        
        # Save as GeoTIFF
        with rasterio.open(
            save_path, 'w',
            driver='GTiff',
            height=height,
            width=width,
            count=3,
            dtype=np.float32,
            crs=crs,
            transform=transform
        ) as dst:
            dst.write(r_norm, 1)
            dst.write(g_norm, 2)
            dst.write(b_norm, 3)
            
            # Set band descriptions
            dst.set_band_description(1, bands[0])
            dst.set_band_description(2, bands[1])
            dst.set_band_description(3, bands[2])
            
            # Add metadata
            dst.update_tags(
                created=datetime.now().isoformat(),
                description=f'False Color Composite ({bands[0]}, {bands[1]}, {bands[2]})',
                source_bands=','.join(bands)
            )
        
        print(f"False color GeoTIFF saved to {save_path}")
    else:
        print(f"Required bands for false color composite ({', '.join(bands)}) are not available")


# Example usage
# if __name__ == "__main__":
#     # Example usage
#     # create bounding coordinates from Left: 73.1311899620134, Bottom: 33.67239849081358, Right: 73.13207589901494, Top: 33.673493285008185
#     polygon_coords = [
#         [73.1311899620134, 33.67239849081358],
#         [73.13207589901494, 33.67239849081358],
#         [73.13207589901494, 33.673493285008185],
#         [73.1311899620134, 33.673493285008185],
#         [73.1311899620134, 33.67239849081358]
#     ]
#     username = "test"
#     name = "test_field"
    
#     # Fetch the imagery with date range
#     start_date = '2025-03-01'
#     end_date = '2025-04-01'
#     result = fetch_sentinel_imagery(polygon_coords, username, name, start_date, end_date)
    
#     if isinstance(result, dict) and "error" in result:
#         print(f"Error: {result['error']}")
#     else:
#         print("All imagery successfully processed")