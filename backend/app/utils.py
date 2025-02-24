from flask import Flask, request, jsonify, send_file
from sentinelhub import SHConfig, SentinelHubRequest, CRS, BBox
from datetime import datetime, timedelta
import os
import numpy as np
from PIL import Image

app = Flask(__name__)

# Configure Sentinel Hub credentials
config = SHConfig()
config.instance_id = 'b9daf03a-30ee-4e86-a566-c2348cc78bf5'
config.sh_client_id = '2a8d049e-8c7a-4677-893f-fbbf5581e6c1'
config.sh_client_secret = 'KjCxs153Bg5ae8FSWFaexv3hNgtUxMLn'

# Ensure the data folder exists.
DATA_FOLDER = "data"
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

@app.route('/fetch-sentinel2a', methods=['POST'])
def fetch_sentinel2a():
    data = request.get_json()
    polygon_coords = data.get('polygon')
    if not polygon_coords:
        return jsonify({"error": "Missing polygon coordinates"}), 400

    # Compute bounding box from the polygon coordinates (assumes [lon, lat] points)
    lons = [pt[0] for pt in polygon_coords]
    lats = [pt[1] for pt in polygon_coords]
    minx, miny, maxx, maxy = min(lons), min(lats), max(lons), max(lats)
    bbox = BBox(bbox=[minx, miny, maxx, maxy], crs=CRS.WGS84)

    # Define a time range (e.g., the past 30 days)
    end_date = datetime.today()
    start_date = end_date - timedelta(days=30)

    # Create the Sentinel Hub request for Sentinel-2A L2A data.
    request_instance = SentinelHubRequest(
        evalscript=EVALSCRIPT,
        input_data=[{
            "type": "sentinel-2-l2a",
            "dataCollection": "S2L2A",
            "timeRange": {
                "from": start_date.strftime('%Y-%m-%d'),
                "to": end_date.strftime('%Y-%m-%d')
            }
        }],
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
        return jsonify({"error": str(e)}), 500

    if file_paths and len(file_paths) > 0:
        image_data = file_paths[0]  # Image data (array or file path)

        if isinstance(image_data, np.ndarray):  # If it's a NumPy array, save it to a file
            # Select the first 3 bands for a true-color image (e.g., B04, B03, B02)
            true_color_image = image_data[..., [3, 2, 1]]  # B04, B03, B02 (RGB)

            # Normalize the array to 8-bit (0-255)
            true_color_image = np.clip(true_color_image, 0, 1) * 255
            true_color_image = true_color_image.astype(np.uint8)

            # Save to a .tiff file
            image_path = os.path.join(DATA_FOLDER, "sentinel2a.tiff")
            image = Image.fromarray(true_color_image)
            image.save(image_path)
        else:  # If it's already a file path, use it directly
            image_path = image_data

        # Return the image as a downloadable TIFF file
        return send_file(image_path, mimetype='image/tiff', as_attachment=True, download_name='sentinel2a.tiff')
    else:
        return jsonify({"error": "No imagery data returned"}), 500

if __name__ == '__main__':
    app.run(debug=True)
