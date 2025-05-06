from flask import Blueprint, request, jsonify, current_app
from app.database import get_db_connection
from app.middleware.auth_middleware import authenticate_request
import os
import base64

satellite_bp = Blueprint('satellite', __name__)

BASE_DIR = "C:/New folder/backend/app/data"

@satellite_bp.route('/satellite/<int:field_id>', methods=['GET'])
def get_satellite_data(field_id):
    """Return all available satellite data with GeoTIFF files encoded as Base64."""
    user = authenticate_request()
    if isinstance(user, tuple):
        # This means authentication failed
        return user  # Unauthorized response
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Fetch all satellite entries for this field
    cursor.execute('''
        SELECT user_email, field_name, observation_date
        FROM satellite
        WHERE field_id = ?
        ORDER BY observation_date DESC
    ''', (field_id,))
    satellite_records = cursor.fetchall()
    conn.close()
    
    if not satellite_records:
        # No satellite entries yet for this field
        return jsonify({'error': 'No satellite data found for this field'}), 404
    
    # Get user email and field name from the first record
    user_email = satellite_records[0]['user_email']
    field_name = satellite_records[0]['field_name']
    
    # Get all available dates
    available_dates = [record['observation_date'] for record in satellite_records]
    
    # Construct the data_dir
    data_dir = f"{user_email}_{field_name}"
    base_path = os.path.join(BASE_DIR, data_dir)
    
    # Check if directory exists
    if not os.path.exists(base_path):
        return jsonify({'error': 'Satellite data directory not found'}), 404
    
    # If a specific date is requested, get that date's data
    requested_date = request.args.get('date')
    
    # If a specific date was requested and it's valid, use that
    if requested_date and requested_date in available_dates:
        selected_date = requested_date
    else:
        # Otherwise use the most recent date
        selected_date = available_dates[0]
    
    # Define file paths for the selected date
    file_paths = {
        'preview': os.path.join(base_path, "preview", f"{selected_date}_preview.tiff"),
        'false_color': os.path.join(base_path, "false_color", f"{selected_date}_false_color.tiff"),
        'ndvi': os.path.join(base_path, "ndvi", f"{selected_date}_NDVI.tiff"),
        # 'savi': os.path.join(base_path, "savi", f"{selected_date}_SAVI.tiff"),  # Added SAVI file
        'phenology': os.path.join(base_path, "phenology", f"phenology_predictions_{selected_date}.tif"),
        'yield': os.path.join(base_path, "yield", f"yield_predictions_{selected_date}.tif"),
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
    
    # Return data with encoded files and all available dates
    return jsonify({
        'data_dir': data_dir,
        'date': selected_date,
        'available_dates': available_dates,
        'files': encoded_files
    }), 200

@satellite_bp.route('/satellite/<int:field_id>/timeseries', methods=['GET'])
def get_satellite_timeseries(field_id):
    """Return time series data of average NDVI and SAVI for a field."""
    user = authenticate_request()
    if isinstance(user, tuple):
        # This means authentication failed
        return user  # Unauthorized response
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Fetch field info
    cursor.execute('''
        SELECT user_email, name
        FROM fields
        WHERE id = ?
    ''', (field_id,))
    field = cursor.fetchone()
    conn.close()
    
    if not field:
        return jsonify({'error': 'Field not found'}), 404
    
    # Construct the data_dir
    user_email = field['user_email']
    field_name = field['name']
    data_dir = f"{user_email}_{field_name}"
    base_path = os.path.join(BASE_DIR, data_dir)
    
    # Check if directory exists
    if not os.path.exists(base_path):
        return jsonify({'error': 'Satellite data directory not found'}), 404
    
    # Path to the indices.csv file
    indices_path = os.path.join(base_path, "indices.csv")
    
    # Check if indices.csv exists
    if not os.path.exists(indices_path):
        return jsonify({'error': 'Indices data not found for this field'}), 404
    
    # Parse the CSV file
    import csv
    timeseries_data = []
    
    try:
        with open(indices_path, 'r', newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Convert string values to float
                ndvi_value = float(row['ndvi']) if row['ndvi'] else None
                savi_value = float(row['savi']) if row['savi'] else None
                
                timeseries_data.append({
                    'date': row['date'],
                    'ndvi': ndvi_value,
                    'savi': savi_value
                })
        
        # Sort by date
        timeseries_data.sort(key=lambda x: x['date'])
        
        return jsonify({
            'field_id': field_id,
            'data_dir': data_dir,
            'timeseries': timeseries_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error reading indices data: {str(e)}'}), 500