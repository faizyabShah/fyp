from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.middleware.auth_middleware import authenticate_request

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
    cursor.execute('INSERT INTO fields (user_email, coordinates, crop, plantation_date) VALUES (?, ?, ?, ?)',
                   (user['email'], data['coordinates'], data['crop'], data['plantation_date']))
    conn.commit()
    conn.close()
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
        SET coordinates = ?, crop = ?, plantation_date = ?
        WHERE id = ? AND user_email = ?
    ''', (data['coordinates'], data['crop'], data['plantation_date'], field_id, user['email']))
    
    conn.commit()
    conn.close()
    return jsonify({'message': 'Field updated successfully'}), 200


@requests_bp.route('/requests/<int:request_id>', methods=['PUT'])
def update_request(request_id):
    """Update a request's status or flight date if it belongs to the authenticated user."""
    user = authenticate_request()
    if isinstance(user, tuple):
        return user

    data = request.get_json()
    if 'status' not in data and 'date_for_flight' not in data:
        return jsonify({'error': 'No fields to update'}), 400

    allowed_statuses = ['pending', 'approved', 'rejected']
    if 'status' in data and data['status'] not in allowed_statuses:
        return jsonify({'error': 'Invalid status value'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if the request exists and belongs to the user
    cursor.execute('SELECT id FROM requests WHERE id = ? AND user_email = ?', (request_id, user['email']))
    request_record = cursor.fetchone()

    if not request_record:
        return jsonify({'error': 'Request not found or unauthorized'}), 403

    # Update request details dynamically
    update_fields = []
    update_values = []

    if 'status' in data:
        update_fields.append("status = ?")
        update_values.append(data['status'])
    
    if 'date_for_flight' in data:
        update_fields.append("date_for_flight = ?")
        update_values.append(data['date_for_flight'])
    
    update_values.append(request_id)
    update_values.append(user['email'])

    cursor.execute(f'''
        UPDATE requests
        SET {', '.join(update_fields)}
        WHERE id = ? AND user_email = ?
    ''', tuple(update_values))
    
    conn.commit()
    conn.close()
    return jsonify({'message': 'Request updated successfully'}), 200
