from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.middleware.auth_middleware import authenticate_request
from app.utils import fetch_sentinel_imagery
import re
import datetime

satellite_bp = Blueprint('satellite', __name__)

@satellite_bp.route('/satellite/<int:field_id>', methods=['GET'])
def get_latest_satellite(field_id):
    """Return the latest satellite data for a given field, if owned by the authenticated user."""
    user = authenticate_request()
    if isinstance(user, tuple):
        # This means authentication failed, and the middleware returned a tuple (response, status_code).
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
    
    # Construct the data_dir as requested
    data_dir = f"{user_email}_{field_name}"
    
    return jsonify({
        'data_dir': data_dir,
        'date': latest_date
    }), 200
