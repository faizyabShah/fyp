import datetime
import os
import numpy as np
import matplotlib.pyplot as plt
import rasterio
from sentinelhub import (
    SHConfig,
    BBox,
    CRS,
    DataCollection,
    MimeType,
    SentinelHubRequest,
    bbox_to_dimensions
)

def load_area_of_interest_from_geotiff(file_path):
    """
    Extract bounding box coordinates and CRS from a GeoTIFF file.
    
    Parameters:
    -----------
    file_path : str
        Path to the GeoTIFF file
        
    Returns:
    --------
    tuple
        (bbox, crs) where bbox is a list [min_x, min_y, max_x, max_y] and crs is a CRS object
    """
    try:
        with rasterio.open(file_path) as src:
            # Get the bounds (left, bottom, right, top)
            bounds = src.bounds
            bbox = [bounds.left, bounds.bottom, bounds.right, bounds.top]
            
            # Get the CRS
            src_crs = src.crs
            if src_crs:
                # Convert to EPSG code if available
                if src_crs.to_epsg():
                    crs = CRS(src_crs.to_epsg())
                else:
                    # Try to convert the CRS to a format SentinelHub understands
                    crs_wkt = src_crs.wkt
                    print(f"CRS WKT: {crs_wkt[:100]}...")  # Print first 100 chars for debugging
                    # For most cases, we'll default to the most common CRS types
                    if "WGS 84" in crs_wkt and "UTM" in crs_wkt:
                        # Try to extract UTM zone
                        import re
                        utm_match = re.search(r'UTM zone (\d+)', crs_wkt)
                        if utm_match:
                            zone = int(utm_match.group(1))
                            # Determine hemisphere
                            if "South" in crs_wkt:
                                epsg = 32700 + zone
                            else:
                                epsg = 32600 + zone
                            crs = CRS(epsg)
                        else:
                            # Default to WGS84
                            crs = CRS.WGS84
                    else:
                        # Default to WGS84 if we can't parse
                        print("WARNING: Could not determine CRS from GeoTIFF, defaulting to WGS84")
                        crs = CRS.WGS84
            else:
                # Default to WGS84 if no CRS information is found
                print("WARNING: No CRS found in GeoTIFF, defaulting to WGS84")
                crs = CRS.WGS84
            
            # Print original CRS information for verification
            print(f"Original GeoTIFF CRS: {src_crs}")
            print(f"Converted to SentinelHub CRS: {crs}")
            
            return bbox, crs
            
    except Exception as e:
        raise ValueError(f"Error reading GeoTIFF file: {str(e)}")

def fetch_sentinel2_imagery_for_area(geotiff_path, time_range=None, max_cloud_coverage=0.3):
    """
    Fetch Sentinel-2 imagery based on area of interest defined in a GeoTIFF file.
    
    Parameters:
    -----------
    geotiff_path : str
        Path to the GeoTIFF file
    time_range : tuple or None
        (start_date, end_date) as strings in format 'YYYY-MM-DD'
        If None, defaults to last month from current date
    max_cloud_coverage : float
        Maximum cloud coverage percentage (0-1)
        
    Returns:
    --------
    dict
        Dictionary containing the image data for all bands and metadata
    """
    # Configure the Sentinel Hub connection
    config = SHConfig()
    config.instance_id = 'b9daf03a-30ee-4e86-a566-c2348cc78bf5'
    config.sh_client_id = '2a8d049e-8c7a-4677-893f-fbbf5581e6c1'
    config.sh_client_secret = 'KjCxs153Bg5ae8FSWFaexv3hNgtUxMLn'
    
    # Set up time range if not provided
    if time_range is None:
        start_date = "2023-11-16"  # Default to current date
        start_date = datetime.datetime.strptime(start_date, '%Y-%m-%d')
        end_date = start_date + datetime.timedelta(days=5)
        time_range = (start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
    
    # Load bounding box and CRS from GeoTIFF
    print(f"Extracting area of interest from GeoTIFF: {geotiff_path}")
    bbox_coords, crs = load_area_of_interest_from_geotiff(geotiff_path)
    print(f"Extracted bbox: {bbox_coords}")
    
    # Create BBox object for SentinelHub
    bbox = BBox(bbox=bbox_coords, crs=crs)
    
    # Calculate dimensions at 10m resolution
    bbox_size = bbox_to_dimensions(bbox, resolution=10)
    print(f"Image dimensions: {bbox_size[0]}x{bbox_size[1]} pixels")
    
    # Check if dimensions are too large
    max_pixels = 2500 * 2500  # Reasonable maximum size to avoid memory issues
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
    
    # Create requests for each band
    band_requests = []
    
    for band_name, band_desc in sentinel2_bands.items():
        evalscript = f"""
        //VERSION=3
        function setup() {{
            return {{
                input: [{{
                    bands: ["{band_name}"],
                    units: "DN"
                }}],
                output: {{
                    bands: 1,
                    sampleType: "FLOAT32"
                }}
            }};
        }}

        function evaluatePixel(sample) {{
            return [sample.{band_name}];
        }}
        """
        
        request = SentinelHubRequest(
            evalscript=evalscript,
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
            size=bbox_size,
            config=config
        )
        
        band_requests.append((band_name, request))
    
    # Fetch all bands
    results = {}
    
    print(f"Downloading {len(band_requests)} bands...")
    for band_name, request in band_requests:
        print(f"Fetching band {band_name}...")
        try:
            data = request.get_data()
            if data and len(data) > 0:
                results[band_name] = data[0]
                print(f"  - Success: {band_name} shape: {data[0].shape}")
            else:
                print(f"  - No data returned for {band_name}")
        except Exception as e:
            print(f"  - Error fetching {band_name}: {str(e)}")
    
    # Get metadata
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

    try:
        metadata = metadata_request.get_data()[0]
        if hasattr(metadata, 'metadata') and 'userData' in metadata.metadata:
            results['metadata'] = metadata.metadata['userData']
            print(f"Metadata successfully retrieved")
        else:
            print("Metadata structure not as expected")
    except Exception as e:
        print(f"Error retrieving metadata: {e}")
        results['metadata'] = None
    
    # Save input parameters for reference
    results['parameters'] = {
        'bbox': bbox_coords,
        'crs': str(crs),
        'time_range': time_range,
        'max_cloud_coverage': max_cloud_coverage,
        'bbox_size': bbox_size
    }
    
    return results

def display_rgb_image(imagery_data, save_path=None):
    """
    Display RGB composite from the Sentinel-2 imagery data
    
    Parameters:
    -----------
    imagery_data : dict
        Dictionary containing band data
    save_path : str, optional
        Path to save the RGB image
    """
    if 'B04' in imagery_data and 'B03' in imagery_data and 'B02' in imagery_data:
        red = imagery_data['B04']
        green = imagery_data['B03']
        blue = imagery_data['B02']
        
        # Ensure all bands have the same shape
        if red.shape == green.shape == blue.shape:
            # Stack bands and transpose to correct shape
            rgb = np.stack([red, green, blue], axis=2)
            
            # Simple normalization for display
            # Using percentile-based normalization for better results
            p_low, p_high = np.percentile(rgb, (2, 98))
            rgb_norm = np.clip((rgb - p_low) / (p_high - p_low) * 255, 0, 255).astype(np.uint8)
            
            plt.figure(figsize=(10, 10))
            plt.imshow(rgb_norm)
            plt.title("RGB Composite (B4, B3, B2)")
            plt.axis('off')
            
            if save_path:
                plt.savefig(save_path, bbox_inches='tight', dpi=300)
                print(f"RGB image saved to {save_path}")
                
            plt.show()
        else:
            print(f"Band shapes do not match: R {red.shape}, G {green.shape}, B {blue.shape}")
    else:
        print("Required bands for RGB image are not available")

def save_bands_to_geotiff(imagery_data, output_dir, reference_geotiff):
    """
    Save each band as a separate GeoTIFF file with proper geospatial metadata
    
    Parameters:
    -----------
    imagery_data : dict
        Dictionary containing band data
    output_dir : str
        Directory to save the TIFF files
    reference_geotiff : str
        Path to the original GeoTIFF to get the transform and CRS
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Get georeferencing information from the reference GeoTIFF
    with rasterio.open(reference_geotiff) as src:
        ref_transform = src.transform
        ref_crs = src.crs
        ref_bounds = src.bounds
    
    # Get parameter info
    if 'parameters' in imagery_data:
        params = imagery_data['parameters']
        bbox = params['bbox']
        bbox_size = params['bbox_size']
    else:
        print("Warning: No parameter information found, georeference may be inaccurate")
        return
    
    # Calculate new transform based on bbox and image dimensions
    from rasterio.transform import from_bounds
    new_transform = from_bounds(bbox[0], bbox[1], bbox[2], bbox[3], bbox_size[0], bbox_size[1])
    
    for band_name, band_data in imagery_data.items():
        if band_name in ['metadata', 'parameters']:
            continue
            
        output_path = os.path.join(output_dir, f"sentinel2_{band_name}.tif")
        
        try:
            # Get band shape
            height, width = band_data.shape
            
            # Create a new raster file
            with rasterio.open(
                output_path,
                'w',
                driver='GTiff',
                height=height,
                width=width,
                count=1,
                dtype=band_data.dtype,
                crs=ref_crs,
                transform=new_transform
            ) as dst:
                dst.write(band_data, 1)
                
            print(f"Saved {band_name} to {output_path}")
        except Exception as e:
            print(f"Error saving {band_name}: {str(e)}")

def save_multiband_geotiff(imagery_data, output_path, reference_geotiff):
    """
    Save all bands to a single multiband GeoTIFF file
    
    Parameters:
    -----------
    imagery_data : dict
        Dictionary containing band data
    output_path : str
        Path to save the multiband GeoTIFF file
    reference_geotiff : str
        Path to the original GeoTIFF to get the transform and CRS
    """
    # Get georeferencing information from the reference GeoTIFF
    with rasterio.open(reference_geotiff) as src:
        ref_crs = src.crs
    
    # Get parameter info
    if 'parameters' in imagery_data:
        params = imagery_data['parameters']
        bbox = params['bbox']
        bbox_size = params['bbox_size']
    else:
        print("Warning: No parameter information found, georeference may be inaccurate")
        return
    
    # Calculate new transform based on bbox and image dimensions
    from rasterio.transform import from_bounds
    new_transform = from_bounds(bbox[0], bbox[1], bbox[2], bbox[3], bbox_size[0], bbox_size[1])
    
    # Filter out metadata and parameters
    bands = {k: v for k, v in imagery_data.items() if k not in ['metadata', 'parameters']}
    
    # Check if all bands have the same shape
    first_band = next(iter(bands.values()))
    height, width = first_band.shape
    
    if not all(band.shape == (height, width) for band in bands.values()):
        print("Error: Not all bands have the same dimensions")
        return
    
    # Create band list in order
    ordered_bands = []
    band_names = []
    
    # Try to order the bands in a standard way (if available)
    for band_key in ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B8A', 'B09', 'B10', 'B11', 'B12']:
        if band_key in bands:
            ordered_bands.append(bands[band_key])
            band_names.append(band_key)
    
    # Add any remaining bands that aren't in the standard order
    for band_key, band_data in bands.items():
        if band_key not in band_names:
            ordered_bands.append(band_data)
            band_names.append(band_key)
    
    try:
        # Create a new raster file with multiple bands
        with rasterio.open(
            output_path,
            'w',
            driver='GTiff',
            height=height,
            width=width,
            count=len(ordered_bands),
            dtype=first_band.dtype,
            crs=ref_crs,
            transform=new_transform
        ) as dst:
            for i, band_data in enumerate(ordered_bands, 1):
                dst.write(band_data, i)
                dst.set_band_description(i, band_names[i-1])
            
            # Add metadata
            if 'metadata' in imagery_data and imagery_data['metadata']:
                dst.update_tags(**{
                    'acquisition_date': imagery_data['metadata'].get('acquisitionDate', 'Not available'),
                    'cloud_coverage': str(imagery_data['metadata'].get('cloudCoverage', 'Not available')),
                    'band_order': ','.join(band_names)
                })
                
        print(f"Saved multiband GeoTIFF to {output_path} with {len(ordered_bands)} bands")
    except Exception as e:
        print(f"Error saving multiband GeoTIFF: {str(e)}")

def create_false_color_composite(imagery_data, save_path=None, bands=None):
    """
    Create a false color composite image using specified bands
    
    Parameters:
    -----------
    imagery_data : dict
        Dictionary containing band data
    save_path : str, optional
        Path to save the false color image
    bands : list, optional
        List of three bands to use for R, G, B channels
        Defaults to ['B08', 'B04', 'B03'] for NIR false color
    """
    if bands is None:
        # Default to NIR false color (vegetation appears red)
        bands = ['B08', 'B04', 'B03']
        
    if all(band in imagery_data for band in bands):
        # Extract the three bands
        r_band = imagery_data[bands[0]]
        g_band = imagery_data[bands[1]]
        b_band = imagery_data[bands[2]]
        
        # Ensure all bands have the same shape
        if r_band.shape == g_band.shape == b_band.shape:
            # Stack bands
            rgb = np.stack([r_band, g_band, b_band], axis=2)
            
            # Normalize for display
            p_low, p_high = np.percentile(rgb, (2, 98))
            rgb_norm = np.clip((rgb - p_low) / (p_high - p_low) * 255, 0, 255).astype(np.uint8)
            
            plt.figure(figsize=(10, 10))
            plt.imshow(rgb_norm)
            plt.title(f"False Color Composite ({bands[0]}, {bands[1]}, {bands[2]})")
            plt.axis('off')
            
            if save_path:
                plt.savefig(save_path, bbox_inches='tight', dpi=300)
                print(f"False color image saved to {save_path}")
                
            plt.show()
        else:
            print(f"Band shapes do not match")
    else:
        print(f"Required bands for false color composite ({', '.join(bands)}) are not available")

# Example usage
if __name__ == "__main__":
    # Path to your GeoTIFF file
    geotiff_path = r"C:\Users\PMYLS\Downloads\satellite code\sentinel-data-rotated\Sentinel2_2023-11-16_undefined.tif"
    
    # Set output directories
    output_dir = r"C:\New folder\sat_data"
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Set custom time range (optional)
        # For example, to get imagery from January 2023:
        # time_range = ("2023-01-01", "2023-01-31")
        
        # Use default time range (last 30 days)
        imagery = fetch_sentinel2_imagery_for_area(geotiff_path)
        
        # Display metadata if available
        if 'metadata' in imagery and imagery['metadata']:
            print("\nImage Metadata:")
            print(f"Acquisition Date: {imagery['metadata'].get('acquisitionDate', 'Not available')}")
            print(f"Cloud Coverage: {imagery['metadata'].get('cloudCoverage', 'Not available')}%")
            if 'tiles' in imagery['metadata']:
                print(f"Tiles: {', '.join(imagery['metadata']['tiles'])}")
        
        # Display the RGB composite
        rgb_path = os.path.join(output_dir, "sentinel2_rgb_composite.png")
        display_rgb_image(imagery, save_path=rgb_path)
        
        # Create a false color composite (NIR, Red, Green)
        false_color_path = os.path.join(output_dir, "sentinel2_false_color.png")
        create_false_color_composite(imagery, save_path=false_color_path)
        
        # Save each band as a separate GeoTIFF file with proper georeference
        separate_bands_dir = os.path.join(output_dir, "separate_bands")
        save_bands_to_geotiff(imagery, separate_bands_dir, geotiff_path)
        
        # Save all bands to a single multiband GeoTIFF
        multiband_path = os.path.join(output_dir, "sentinel2_multiband.tif")
        save_multiband_geotiff(imagery, multiband_path, geotiff_path)
        
        print(f"\nRetrieved {len(imagery) - 2} bands from Sentinel-2")  # -2 for metadata and parameters
        print("Available bands:", [band for band in imagery.keys() if band not in ['metadata', 'parameters']])
        print(f"\nAll data saved to {output_dir} directory:")
        print(f"- RGB composite: {rgb_path}")
        print(f"- False color composite: {false_color_path}")
        print(f"- Individual bands: {separate_bands_dir}")
        print(f"- Multiband GeoTIFF: {multiband_path}")
        
    except Exception as e:
        print(f"Error: {str(e)}")