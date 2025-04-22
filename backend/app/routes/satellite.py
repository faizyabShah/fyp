from flask import Blueprint, request, jsonify, current_app
from app.database import get_db_connection
from app.middleware.auth_middleware import authenticate_request
import os
import base64

satellite_bp = Blueprint('satellite', __name__)

BASE_DIR = "C:/New folder/backend/app/data"

@satellite_bp.route('/satellite/<int:field_id>', methods=['GET'])
def get_latest_satellite(field_id):
    """Return the latest satellite data with GeoTIFF files encoded as Base64."""
    user = authenticate_request()
    if isinstance(user, tuple):
        # This means authentication failed
        return user  # Unauthorized response
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Fetch the latest satellite entry for this field
    cursor.execute('''
        SELECT user_email, field_name, observation_date
        FROM satellite
        WHERE field_id = ?
        ORDER BY observation_date DESC
        LIMIT 1
    ''', (field_id,))
    satellite_record = cursor.fetchone()
    conn.close()
    
    if not satellite_record:
        # No satellite entries yet for this field
        return jsonify({'error': 'No satellite data found for this field'}), 404
    
    user_email = satellite_record['user_email']
    field_name = satellite_record['field_name']
    latest_date = satellite_record['observation_date']
    
    # Construct the data_dir
    data_dir = f"{user_email}_{field_name}"
    base_path = os.path.join(BASE_DIR, data_dir)
    
    # Check if directory exists
    if not os.path.exists(base_path):
        return jsonify({'error': 'Satellite data directory not found'}), 404
    
    # Define file paths for each type
    file_paths = {
        'preview': os.path.join(base_path, f"{latest_date}_preview.tiff"),
        'false_color': os.path.join(base_path, f"{latest_date}_false_color.tiff"),
        'ndvi': os.path.join(base_path, f"{latest_date}_NDVI.tiff"),
        'phenology': os.path.join(base_path, f"phenology_predictions.tif")
    }
    
    # Read and encode files
    encoded_files = {}
    for file_type, file_path in file_paths.items():
        if os.path.exists(file_path):
            try:
                with open(file_path, 'rb') as file:
                    file_data = file.read()
                    encoded_data = base64.b64encode(file_data).decode('utf-8')
                    encoded_files[file_type] = encoded_data
            except Exception as e:
                print(f"Error reading file {file_path}: {str(e)}")
    
    # Return data with encoded files
    return jsonify({
        'data_dir': data_dir,
        'date': latest_date,
        'files': encoded_files
    }), 200