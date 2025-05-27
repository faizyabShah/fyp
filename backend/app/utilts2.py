import os
import numpy as np
from datetime import datetime, timedelta
from sentinelhub import (
    SHConfig,
    BBox,
    CRS,
    DataCollection,
    SentinelHubCatalog,
    SentinelHubRequest,
    MimeType,
    bbox_to_dimensions,
    filter_times
)
import rasterio
from rasterio.transform import from_bounds

# Configure Sentinel Hub credentials
config = SHConfig()
config.instance_id = '0a26c1fc-c12a-456f-b795-28ebeba0e142'
config.sh_client_id = 'a3265009-a113-42de-b298-6722d4bbbb7c'
config.sh_client_secret = 'IpUFFJJn3ihYofil3FcH4Fat7Wd6Ptau'

# Define the area of interest (AOI) in WGS84 coordinates
aoi_coords = [73.1311899620134, 33.67239849081358, 73.13207589901494, 33.673493285008185]
bbox = BBox(bbox=aoi_coords, crs=CRS.WGS84)

# Define the time interval
start_date = '2025-03-01'
end_date = '2025-04-01'
time_interval = (start_date, end_date)

# Create a directory to save the outputs
output_dir = './sentinel_outputs'
os.makedirs(output_dir, exist_ok=True)

# Initialize the Sentinel Hub Catalog
catalog = SentinelHubCatalog(config=config)

# Search for available data
search_iterator = catalog.search(
    collection=DataCollection.SENTINEL2_L2A,
    bbox=bbox,
    time=time_interval
)

# Get all timestamps
all_timestamps = search_iterator.get_timestamps()

# Filter unique acquisition times (e.g., within 1 hour difference)
unique_acquisitions = filter_times(all_timestamps, timedelta(hours=1))

# Define the evalscript to retrieve all 12 bands
evalscript = """
//VERSION=3
function setup() {
    return {
        input: [{
            bands: ["B01", "B02", "B03", "B04", "B05", "B06",
                    "B07", "B08", "B8A", "B09", "B11", "B12"],
            units: "DN"
        }],
        output: {
            bands: 12,
            sampleType: "FLOAT32"
        }
    };
}

function evaluatePixel(sample) {
    return [sample.B01, sample.B02, sample.B03, sample.B04,
            sample.B05, sample.B06, sample.B07, sample.B08,
            sample.B8A, sample.B09, sample.B11, sample.B12];
}
"""

# Process each unique acquisition
for timestamp in unique_acquisitions:
    date_str = timestamp.strftime('%Y-%m-%d')
    print(f'Processing date: {date_str}')

    # Define the request
    request = SentinelHubRequest(
        evalscript=evalscript,
        input_data=[
            SentinelHubRequest.input_data(
                data_collection=DataCollection.SENTINEL2_L2A,
                time_interval=(timestamp, timestamp + timedelta(days=1))
            )
        ],
        responses=[
            SentinelHubRequest.output_response('default', MimeType.TIFF)
        ],
        bbox=bbox,
        size=bbox_to_dimensions(bbox, resolution=10),
        config=config
    )

    # Get the data
    data = request.get_data()
    if not data:
        print(f'No data for date: {date_str}')
        continue

    # Save the multiband image
    multiband_image = data[0]
    height, width, bands = multiband_image.shape
    transform = from_bounds(*bbox, width=width, height=height)
    output_path = os.path.join(output_dir, f'sentinel_{date_str}.tif')

    with rasterio.open(
        output_path,
        'w',
        driver='GTiff',
        height=height,
        width=width,
        count=bands,
        dtype=multiband_image.dtype,
        crs=bbox.crs.pyproj_crs(),
        transform=transform
    ) as dst:
        for i in range(bands):
            dst.write(multiband_image[:, :, i], i + 1)
            dst.set_band_description(i + 1, f'B{str(i+1).zfill(2)}')

    print(f'Saved image for date: {date_str} at {output_path}')
