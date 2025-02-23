from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.middleware.auth_middleware import authenticate_request

requests_bp = Blueprint('requests', __name__)

@requests_bp.route('/requests', methods=['POST'])
def add_request():
    """Create a new request for a user's field."""
    user = authenticate_request()
    if isinstance(user, tuple):
        return user

    data = request.get_json()
    required_fields = ['field_id', 'date_for_flight']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM fields WHERE id = ? AND user_email = ?', (data['field_id'], user['email']))
    field = cursor.fetchone()
    if not field:
        return jsonify({'error': 'Field not found or unauthorized'}), 403

    cursor.execute('INSERT INTO requests (user_email, field_id, requested_date, status, date_for_flight) VALUES (?, ?, datetime("now"), ?, ?)',
                   (user['email'], data['field_id'], 'pending', data['date_for_flight']))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Request created'}), 201

@requests_bp.route('/requests', methods=['GET'])
def get_requests():
    """Get all requests made by the authenticated user."""
    user = authenticate_request()
    if isinstance(user, tuple):
        return user

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM requests WHERE user_email = ?', (user['email'],))
    requests = cursor.fetchall()
    conn.close()
    return jsonify([dict(req) for req in requests]), 200



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


@requests_bp.route('/requests/<int:request_id>', methods=['DELETE'])
def delete_request(request_id):
    """Delete a request if it belongs to the authenticated user."""
    user = authenticate_request()
    if isinstance(user, tuple):
        return user  # Unauthorized response

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if the request exists and belongs to the authenticated user
    cursor.execute('SELECT id FROM requests WHERE id = ? AND user_email = ?', (request_id, user['email']))
    request_record = cursor.fetchone()

    if not request_record:
        return jsonify({'error': 'Request not found or unauthorized'}), 403

    # Delete the request
    cursor.execute('DELETE FROM requests WHERE id = ? AND user_email = ?', (request_id, user['email']))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Request deleted successfully'}), 200
