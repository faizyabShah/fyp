from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.middleware.auth_middleware import authenticate_request
from app.utils import fetch_sentinel_imagery
from phenology_main import process_with_mask
from app.routes.generate import generate_text
import pandas as pd
import re
import datetime

fields_bp = Blueprint('fields', __name__)

bbch_dict = {
    "bbch_00": ["Germination"],
    "bbch_10": ["Tillering"],
    "bbch_31": ["Jointing"],
    "bbch_51": ["Booting", "Heading"],  # Both stages assigned to bbch_51
    "bbch_75": ["Anthesis"],
    "bbch_87": ["Grain Filling"],
    "bbch_99": ["Maturity"]
}


@fields_bp.route('/fields', methods=['POST'])
def add_field():
    """Add a new field for the authenticated user."""
    user = authenticate_request()
    if isinstance(user, tuple):
        return user  # Unauthorized response

    data = request.get_json()
    required_fields = ['coordinates', 'crop', 'plantation_date']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO fields (user_email, name, coordinates, crop, plantation_date, area, location) VALUES (?, ?, ?, ?, ?, ?, ?)',
                   (user['email'], data['name'], data['coordinates'], data['crop'], data['plantation_date'], data['area'], data['location']))
    conn.commit()

    coordinates_str = data['coordinates']
    coordinate_pattern = r"LatLng\(([-+]?\d*\.\d+|\d+),\s*([-\+]?\d*\.\d+|\d+)\)"
    
    # Find all lat, lon pairs in the string
    matches = re.findall(coordinate_pattern, coordinates_str)
    if not matches:
        return jsonify({'error': 'Invalid coordinates format'}), 400
    
    coordinates = [(float(lat), float(lon)) for lat, lon in matches]

    conn.close()

    # get the id of the filed just added
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM fields WHERE user_email = ? AND name = ?', (user['email'], data['name']))
    row = cursor.fetchone()
    if row:  # Means row is not None
        field_id = row[0]
    else:
        field_id = None
    conn.close()




    # import threading
    # thread = threading.Thread(
    #     target=process_sentinel_imagery,
    #     args=(coordinates, user.get('email', 'user'), data['name'], field_id)
    # )
    # thread.daemon = True
    # thread.start()

    process_sentinel_imagery(coordinates, user.get('email', 'user'), data['name'], field_id)

    
    return jsonify({'message': 'Field added successfully'}), 201

@fields_bp.route('/fields', methods=['GET'])
def get_fields():
    """Get all fields of the authenticated user."""
    user = authenticate_request()
    if isinstance(user, tuple):
        return user

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM fields WHERE user_email = ?', (user['email'],))
    fields = cursor.fetchall()
    conn.close()
    return jsonify([dict(field) for field in fields]), 200

@fields_bp.route('/fields/<int:field_id>', methods=['DELETE'])
def delete_field(field_id):
    """Delete a field if it belongs to the authenticated user."""
    user = authenticate_request()
    if isinstance(user, tuple):
        return user

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM fields WHERE id = ? AND user_email = ?', (field_id, user['email']))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Field deleted'}), 200

@fields_bp.route('/fields/<int:field_id>', methods=['PUT'])
def update_field(field_id):
    """Update a field's details (coordinates, crop, plantation_date) if it belongs to the authenticated user."""
    user = authenticate_request()
    if isinstance(user, tuple):
        return user

    data = request.get_json()
    required_fields = ['coordinates', 'crop', 'plantation_date']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if the field exists and belongs to the authenticated user
    cursor.execute('SELECT id FROM fields WHERE id = ? AND user_email = ?', (field_id, user['email']))
    field = cursor.fetchone()

    if not field:
        return jsonify({'error': 'Field not found or unauthorized'}), 403

    # Update the field
    cursor.execute('''
        UPDATE fields
        SET coordinates = ?, name = ?, crop = ?, plantation_date = ?, area = ?, location = ?
        WHERE id = ? AND user_email = ?
    ''', (data['coordinates'], data['name'], data['crop'], data['plantation_date'], data['area'], data['location'], field_id, user['email']))
    
    conn.commit()
    conn.close()
    return jsonify({'message': 'Field updated successfully'}), 200


@fields_bp.route('/fields/<int:field_id>/harvest', methods=['PUT'])
def mark_field_harvested(field_id):
    """Mark a field as harvested if it belongs to the authenticated user."""
    user = authenticate_request()
    if isinstance(user, tuple):
        return user  # Unauthorized response

    conn = get_db_connection()
    cursor = conn.cursor()

    data = request.get_json()
    if 'harvest' not in data:
        conn.close()
        return jsonify({'error': 'Missing required fields'}), 400
    
    harvest = int(data['harvest'])
    
    # Check if the field exists and belongs to the authenticated user
    cursor.execute('SELECT id FROM fields WHERE id = ? AND user_email = ?', (field_id, user['email']))
    field = cursor.fetchone()

    if not field:
        conn.close()
        return jsonify({'error': 'Field not found or unauthorized'}), 403

    # Update the field's harvest status
    cursor.execute('''
        UPDATE fields
        SET harvest = ?
        WHERE id = ? AND user_email = ?
    ''', (harvest, field_id, user['email']))
    
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Failed to update field'}), 500
    
    conn.commit()
    conn.close()
    return jsonify({'message': 'Field marked as harvested successfully'}), 200




def process_sentinel_imagery(polygon_coords, username, name, id):
    try:
        print(f"Starting fetch_sentinel_imagery for {username}_{name}")
        is_valid = fetch_sentinel_imagery(polygon_coords, username, name)
        print(f"fetch_sentinel_imagery completed with result: {is_valid}")

        if not is_valid:
            print(f"Invalid result from fetch_sentinel_imagery for {username}_{name}")
            return
        
        # Rest of the function...
    except Exception as e:
        print(f"Error in process_sentinel_imagery: {str(e)}")

    # end_date_str = datetime.datetime.now().strftime('%Y-%m-%d')

    # # insert this into the table satellite
    # conn = get_db_connection()
    # cursor = conn.cursor()

    # cursor.execute('INSERT INTO satellite (field_id, field_name, user_email, observation_date) VALUES (?, ?, ?, ?)',
    #                (id, name, username, end_date_str))
    # conn.commit()
    # conn.close()

    # process_with_mask(
    #     tiff_dir=f"C:/New folder/sat_data/{username}_{name}",
    #     output_dir=f"C:/New folder/sat_data/{username}_{name}",
    # )

    # csv_file_path =  f"C:/New folder/sat_data/{username}_{name}/{end_date_str}.csv"
    # df = pd.read_csv(csv_file_path)
    # stage_counts = df['stage_name'].value_counts()
    
    
    # stage = stage_counts.idxmax()

    # stage_name = bbch_dict.get(stage, ["Unknown"])

    
    # query = f"Give me recommendations for the crop at stage {stage} or {stage_name}"

    # generate_text(query, f"C:/New folder/reports/{username}_{name}", end_date_str)

