from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.middleware.auth_middleware import authenticate_request
from app.utils import fetch_sentinel_imagery
from phenology_main import process_time_series_predictions
from yield_main import generate_predictions_and_save_csv, process_yield_time_series_predictions
from app.routes.generate import generate_text
import pandas as pd
import re
import datetime
import os

fields_bp = Blueprint('fields', __name__)

bbch_dict = {
    "bbch_00": "Germination",
    "bbch_10": "Tillering",
    "bbch_31": "Jointing",
    "bbch_51": "Booting/Heading",  # Both stages assigned to bbch_51
    "bbch_75": "Anthesis",
    "bbch_87": "Grain Filling",
    "bbch_99": "Maturity"
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
    
    coordinates = [[float(lon), float(lat)] for lat, lon in matches]

    print(coordinates)

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

    plantation_date = data['plantation_date']



    import threading
    thread = threading.Thread(
        target=process_sentinel_imagery,
        args=(coordinates, user.get('email', 'user'), data['name'], field_id, plantation_date)
    )
    thread.daemon = True
    thread.start()

    # process_sentinel_imagery(coordinates, user.get('email', 'user'), data['name'], field_id)

    
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

@fields_bp.route('/fields/<int:field_id>/phenology_stage', methods=['GET'])
def get_phenology_stage(field_id):
    """Get the phenology stage of the"
    "specified field."""
    user = authenticate_request()
    if isinstance(user, tuple):
        return user

    conn = get_db_connection()
    cursor = conn.cursor()


    cursor.execute('SELECT phenology_stage, yield FROM satellite WHERE field_id = ? ORDER BY observation_date DESC LIMIT 1', (field_id,))
    report_result = cursor.fetchone()

    if not report_result:
        conn.close()
        return jsonify({'error': 'No report found for the field'}), 404

    report_stage = report_result[0]
    yield_value = report_result[1]
    conn.close()

    return jsonify({
        'phenology_stage': report_stage,
        'yield': yield_value
    }), 200


def process_sentinel_imagery(polygon_coords, username, name, id, plantation_date):
    try:

        print(f"Starting fetch_sentinel_imagery for {username}_{name}")
        end_date_str = datetime.datetime.now().strftime("%Y-%m-%d")
        is_valid = fetch_sentinel_imagery(polygon_coords, username, name, plantation_date, end_date_str)
        print(f"fetch_sentinel_imagery completed with result: {is_valid}")

        if not is_valid:
            print(f"Invalid result from fetch_sentinel_imagery for {username}_{name}")
            return
        
    except Exception as e:
        print(f"Error in process_sentinel_imagery: {str(e)}")
        return

    # Create directories if they don't exist
    os.makedirs(f"C:/New folder/sat_data/{username}_{name}", exist_ok=True)
    os.makedirs(f"C:/New folder/reports/{username}_{name}", exist_ok=True)
    
    # Process phenology for all time points
    print("Processing phenology time series")
    try:
        phenology_output_paths = process_time_series_predictions(
            tiff_dir=f"C:/New folder/backend/app/data/{username}_{name}/imagery",
            output_dir=f"C:/New folder/backend/app/data/{username}_{name}/phenology",
        )
        print(f"Generated {len(phenology_output_paths)} phenology maps")
    except Exception as e:
        print(f"Error processing phenology: {str(e)}")
        phenology_output_paths = []
    
    # Process yield for all time points
    print("Processing yield time series")
    try:
        yield_output_paths, field_level_predictions = process_yield_time_series_predictions(
            tiff_dir=f"C:/New folder/backend/app/data/{username}_{name}/imagery",
            output_dir=f"C:/New folder/backend/app/data/{username}_{name}/yield",
            sowing_date=plantation_date,
        )
        print(f"Generated {len(yield_output_paths)} yield maps")
    except Exception as e:
        print(f"Error processing yield: {str(e)}")
        yield_output_paths = []
        field_level_predictions = {}
    
    # Also run the original field-level yield prediction (for backward compatibility)
    try:
        generate_predictions_and_save_csv(
            tiff_dir=f"C:/New folder/backend/app/data/{username}_{name}/imagery",
            output_dir=f"C:/New folder/sat_data/{username}_{name}",
            sowing_date=plantation_date,
        )
    except Exception as e:
        print(f"Error generating field-level yield CSV: {str(e)}")
    
    # Create a dictionary to store data for each observation date
    date_data = {}
    
    # Process phenology data for each date
    for date_str, csv_path, tiff_path, viz_path in phenology_output_paths:
        if date_str not in date_data:
            date_data[date_str] = {"date": date_str}
        
        try:
            # Read CSV to get dominant phenology stage
            phen_df = pd.read_csv(csv_path)
            if not phen_df.empty:
                stage_counts = phen_df['stage_name'].value_counts()
                dominant_stage = stage_counts.idxmax()
                stage_name = bbch_dict.get(dominant_stage, "Unknown")
                date_data[date_str]["phenology_stage"] = stage_name
                date_data[date_str]["phenology_csv"] = csv_path
                date_data[date_str]["phenology_tiff"] = tiff_path
                date_data[date_str]["phenology_viz"] = viz_path
        except Exception as e:
            print(f"Error processing phenology data for {date_str}: {str(e)}")
    
    # Process yield data for each date
    for date_str, tiff_path, viz_path, field_yield in yield_output_paths:
        if date_str not in date_data:
            date_data[date_str] = {"date": date_str}
        
        if field_yield is not None:
            date_data[date_str]["yield"] = field_yield
            date_data[date_str]["yield_tiff"] = tiff_path
            date_data[date_str]["yield_viz"] = viz_path
    
    # Insert data into the satellite table for each observation date
    conn = get_db_connection()
    cursor = conn.cursor()
    
    for date_str, data in date_data.items():
        phenology_stage = data.get("phenology_stage", None)
        yield_value = data.get("yield", None)
        
        # Check if an entry already exists for this field and date
        cursor.execute('SELECT id FROM satellite WHERE field_id = ? AND observation_date = ?', 
                     (id, date_str))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing record
            cursor.execute('''
                UPDATE satellite 
                SET phenology_stage = ?, yield = ? 
                WHERE field_id = ? AND observation_date = ?
            ''', (phenology_stage, yield_value, id, date_str))
        else:
            # Insert new record
            cursor.execute('''
                INSERT INTO satellite 
                (field_id, field_name, user_email, observation_date, phenology_stage, yield) 
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (id, name, username, date_str, phenology_stage, yield_value))
    
    conn.commit()
    
    # Generate report for the most recent date
    try:
        latest_date = max(date_data.keys()) if date_data else datetime.datetime.now().strftime("%Y-%m-%d")
        latest_phenology = date_data.get(latest_date, {}).get("phenology_stage", "Unknown")
        
        print(f"Generating report for {latest_date} with phenology {latest_phenology}")
        query = f"Give me recommendations for the crop at stage {latest_phenology}"
        generate_text(query, f"C:/New folder/reports/{username}_{name}", latest_date)
        
        # Record the report generation
        cursor.execute('INSERT INTO reports (field_id, report_date) VALUES (?, ?)', 
                     (id, latest_date))
        conn.commit()
    except Exception as e:
        print(f"Error generating report: {str(e)}")
    
    conn.close()
    print(f"Completed processing for field {id}")