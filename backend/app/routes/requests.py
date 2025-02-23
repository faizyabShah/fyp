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
