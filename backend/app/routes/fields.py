from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.middleware.auth_middleware import authenticate_request
from app.utils import fetch_sentinel_imagery
import re

fields_bp = Blueprint('fields', __name__)

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
    imagery_result = fetch_sentinel_imagery(coordinates, data['name'])

    conn.close()

    if 'error' in imagery_result:
        return jsonify({'error': imagery_result['error']}), 500
    
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



