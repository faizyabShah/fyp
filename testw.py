import rasterio

def get_bounding_coordinates(geotiff_path):
    with rasterio.open(geotiff_path) as dataset:
        # Get the bounds of the image
        bounds = dataset.bounds
        # Extract the coordinates of the bounding box (left, bottom, right, top)
        left, bottom, right, top = bounds
        # Get the CRS (Coordinate Reference System)
        crs = dataset.crs
        return left, bottom, right, top, crs

# Example usage:
geotiff_path = r"C:\Users\PMYLS\Downloads\satellite code\sentinel-data-rotated\Sentinel2_2023-11-16_undefined.tif"

bounding_coords = get_bounding_coordinates(geotiff_path)
print(f"Bounding Coordinates: Left: {bounding_coords[0]}, Bottom: {bounding_coords[1]}, Right: {bounding_coords[2]}, Top: {bounding_coords[3]}")
print(f"CRS: {bounding_coords[4]}")

# convert the coordinates to wgs84 and print again
from rasterio.warp import transform_bounds
left, bottom, right, top, crs = bounding_coords
wgs84_bounds = transform_bounds(crs, 'EPSG:4326', left, bottom, right, top)
print(f"WGS84 Bounding Coordinates: Left: {wgs84_bounds[0]}, Bottom: {wgs84_bounds[1]}, Right: {wgs84_bounds[2]}, Top: {wgs84_bounds[3]}")
# Expected output:
# Bounding Coordinates: Left: 326750.0, Bottom: 3727400.0, Right: 326830.0, Top: 3727520.0
