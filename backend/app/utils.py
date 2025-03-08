from sentinelhub import DataCollection, SHConfig, SentinelHubRequest, CRS, BBox
import os
import sys
from datetime import datetime, timedelta
import os
import numpy as np
from PIL import Image
from app.config import Config
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_origin

# Configure Sentinel Hub credentials
config = SHConfig()
config.instance_id = 'b9daf03a-30ee-4e86-a566-c2348cc78bf5'
config.sh_client_id = '2a8d049e-8c7a-4677-893f-fbbf5581e6c1'
config.sh_client_secret = 'KjCxs153Bg5ae8FSWFaexv3hNgtUxMLn'

configuration = Config()

# Ensure the data folder exists.
DATA_FOLDER = configuration.BASE_DIR
os.makedirs(DATA_FOLDER, exist_ok=True)

# Evalscript to retrieve all Sentinel-2A (L2A) bands.
EVALSCRIPT = """
//VERSION=3
function setup() {
  return {
    input: ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B8A", "B09", "B11", "B12"],
    output: {
      bands: 12,
      sampleType: "FLOAT32"
    }
  };
}

function evaluatePixel(sample) {
  return [sample.B01, sample.B02, sample.B03, sample.B04, sample.B05, sample.B06, 
          sample.B07, sample.B08, sample.B8A, sample.B09, sample.B11, sample.B12];
}
"""

def fetch_sentinel_imagery(polygon_coords, name):
    # Compute bounding box from the polygon coordinates (assumes [lon, lat] points)
    lons = [pt[0] for pt in polygon_coords]
    lats = [pt[1] for pt in polygon_coords]
    minx, miny, maxx, maxy = min(lons), min(lats), max(lons), max(lats)
    bbox = BBox(bbox=[minx, miny, maxx, maxy], crs=CRS.WGS84)

    # Define a time range (e.g., the past 30 days)
    end_date = datetime.today()
    start_date = end_date - timedelta(days=5)
    end_date_str = end_date.strftime('%d-%m-%y')

    # Create the Sentinel Hub request for Sentinel-2A L2A data.
    request_instance = SentinelHubRequest(
        evalscript=EVALSCRIPT,
        input_data=[
            SentinelHubRequest.input_data(
                data_collection=DataCollection.SENTINEL2_L2A,
                time_interval=(start_date, end_date),
                maxcc=0.3,  # Maximum cloud coverage    
                mosaicking_order="leastCC"
            )
        ],

        responses=[{
            "identifier": "default",
            "format": {"type": "image/tiff"}  # Correct format
        }],
        bbox=bbox,
        config=config,
        data_folder=DATA_FOLDER  # Specify the folder to save the data
    )

    try:
        # Save the data to the folder using the 'data_folder' argument in get_data
        file_paths = request_instance.get_data(save_data=True)
    except Exception as e:
        return {"error": str(e)}

    if file_paths and len(file_paths) > 0:
        image_data = file_paths[0]  # Image data (array or file path)

        if isinstance(image_data, np.ndarray):  # If it's a NumPy array, save it to a file
            all_bands_image = image_data  # This is a 3D numpy array with dimensions (height, width, bands)


            directory_path = os.path.join(DATA_FOLDER, name)
            os.makedirs(directory_path, exist_ok=True)

            # Save as a multi-band GeoTIFF
            image_path = os.path.join(directory_path, f"{end_date_str}.tiff")
            print(image_path)  # This will print the correct path

            # Use rasterio to save the multi-band image
            with rasterio.open(
                image_path, 'w', driver='GTiff', count=12, width=all_bands_image.shape[1], height=all_bands_image.shape[0],
                dtype=all_bands_image.dtype, crs='EPSG:4326', transform=from_origin(minx, maxy, 10, 10)  # 10m resolution
            ) as dst:
                for i in range(12):
                    dst.write(all_bands_image[:, :, i], i + 1)  # Write each band

        else:  # If it's already a file path, use it directly
            image_path = image_data

        return image_path
    else:
        return {"error": "No imagery data returned"}


