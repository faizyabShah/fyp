from sentinelhub import DataCollection, SHConfig, SentinelHubRequest, CRS, BBox, MimeType, bbox_to_dimensions
import os
import sys
# sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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

def fetch_sentinel_imagery(polygon_coords, username, name, days=5, max_cloud_coverage=0.1):
    """
    Fetch Sentinel-2 imagery based on the provided polygon coordinates.
    
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
    days : int
        Number of days to look ahead from start date
    max_cloud_coverage : float
        Maximum cloud coverage (0-1)
    
    Returns:
    --------
    str or dict
        Path to the saved image file or an error dictionary
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
    print("got bbxo")
    # Define a time range
    # end_date = datetime.now()
    end_date = datetime.now() - timedelta(days=1)

    # Calculate the start date based on the number of days
    start_date = end_date - timedelta(days=days)
    start_date_str = start_date.strftime('%Y-%m-%d')
    end_date_str = end_date.strftime('%Y-%m-%d')


    time_range = (start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
    
    # Calculate dimensions at 10m resolution
    bbox_size = bbox_to_dimensions(bbox, resolution=10)
    print("dimeed")
    # Check if dimensions are too large
    max_pixels = 4500 * 4500  # Reasonable maximum size to avoid memory issues
    if bbox_size[0] * bbox_size[1] > max_pixels:
        scale_factor = np.sqrt(max_pixels / (bbox_size[0] * bbox_size[1]))
        new_width = int(bbox_size[0] * scale_factor)
        new_height = int(bbox_size[1] * scale_factor)
        print(f"Warning: Image dimensions too large. Rescaling to {new_width}x{new_height}")
        bbox_size = (new_width, new_height)
    
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
    
    # Create a single request for all bands to ensure alignment
    request = SentinelHubRequest(
        evalscript=evalscript,
        input_data=[
            SentinelHubRequest.input_data(
                data_collection=DataCollection.SENTINEL2_L2A,
                time_interval=time_range,
                maxcc=max_cloud_coverage,
                mosaicking_order="leastCC"
            )
        ],
        responses=[
            SentinelHubRequest.output_response('default', MimeType.TIFF)
        ],
        bbox=bbox,
        size=bbox_size,
        config=config
    )
    
    # Attempt to get metadata
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
    print("someway in")
    metadata_request = SentinelHubRequest(
        evalscript=metadata_script,
        input_data=[
            SentinelHubRequest.input_data(
                data_collection=DataCollection.SENTINEL2_L2A,
                time_interval=time_range,
                mosaicking_order='leastCC',
                maxcc=max_cloud_coverage
            )
        ],
        responses=[
            SentinelHubRequest.output_response('default', MimeType.TIFF)
        ],
        bbox=bbox,
        size=(1, 1),
        config=config
    )
    
    # Get metadata
    metadata = None
    try:
        metadata_result = metadata_request.get_data()[0]
        if hasattr(metadata_result, 'metadata') and 'userData' in metadata_result.metadata:
            metadata = metadata_result.metadata['userData']
            print(f"Metadata successfully retrieved")
        else:
            print("Metadata structure not as expected")
    except Exception as e:
        print(f"Error retrieving metadata: {e}")
    
    # Fetch the data
    try:
        print("Retrieving all bands...")
        data = request.get_data()
        
        if not data or len(data) == 0:
            return {"error": "No data returned from Sentinel Hub"}
        
        # The data is returned as a multiband array
        multiband_data = data[0]

        print("non empty")
        # Separate into individual bands
        # The bands are in the order defined in the evalscript
        band_order = ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B8A', 'B09', 'B11', 'B12']
        band_data = {}
        
        for i, band_name in enumerate(band_order):
            band_data[band_name] = multiband_data[:, :, i]
            print(f"Extracted band {band_name}")
        
        # Get dimensions
        height, width = multiband_data.shape[:2]
        
        # Save as a multi-band GeoTIFF
        image_path = os.path.join(directory_path, f"{end_date_str}.tiff")
        
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
                metadata_dict = {
                    'date_generated': datetime.now().isoformat(),
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'band_order': ','.join(band_order)
                }
                
                # Add any additional metadata from Sentinel Hub
                if metadata:
                    metadata_dict.update({
                        'acquisition_date': metadata.get('acquisitionDate', 'Not available'),
                        'cloud_coverage': str(metadata.get('cloudCoverage', 'Not available')),
                    })
                    if 'tiles' in metadata:
                        metadata_dict['tiles'] = ','.join(metadata['tiles'])
                
                dst.update_tags(**metadata_dict)
            
            print(f"Successfully saved {len(band_order)} bands to {image_path}")
            
            # Generate and save RGB preview
            preview_path = os.path.join(directory_path, f"{end_date_str}_preview.tiff")
            create_rgb_preview(band_data, preview_path, transform, crs)

            ndvi_path = os.path.join(directory_path, f"{end_date_str}_NDVI.tiff")
            create_ndvi_image(band_data, ndvi_path, transform, crs)

            false_color_path = os.path.join(directory_path, f"{end_date_str}_false_color.tiff")
            create_false_color_composite(band_data, false_color_path, transform, crs, bands=['B08', 'B04', 'B03'])

            return True
            
        except Exception as e:
            error_message = f"Error saving image: {str(e)}"
            print(error_message)
            return {"error": error_message}
        
    except Exception as e:
        error_message = f"Error fetching data: {str(e)}"
        print(error_message)
        return {"error": error_message}

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
    
#     # Fetch the imagery
#     result = fetch_sentinel_imagery(polygon_coords, username, name)
    
#     if isinstance(result, dict) and "error" in result:
#         print(f"Error: {result['error']}")
#     else:
#         print(f"Imagery successfully saved to: {result}")