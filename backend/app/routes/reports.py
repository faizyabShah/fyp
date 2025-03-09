from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from app.middleware.auth_middleware import authenticate_request

reports_bp = Blueprint('reports', __name__)

# write route to get a report for a field
@reports_bp.route('/reports/<int:field_id>', methods=['GET'])
def get_report(field_id):
    """Get a report for the specified field."""
    user = authenticate_request()
    if isinstance(user, tuple):
        return user
    
    user_email = user['email']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get field name
    cursor.execute('SELECT name FROM fields WHERE id = ? AND user_email = ?', (field_id, user_email))
    field_result = cursor.fetchone()
    
    if not field_result:
        conn.close()
        return jsonify({'error': 'Field not found or you do not have access'}), 404
    
    field_name = field_result[0]
    
    # Get the latest report_date for the field from reports table
    cursor.execute('SELECT report_date FROM reports WHERE field_id = ? ORDER BY report_date DESC LIMIT 1', (field_id,))
    report_result = cursor.fetchone()

    if not report_result:
        conn.close()
        return jsonify({'error': 'No report found for the field'}), 404
    
    report_date = report_result[0]
    conn.close()
    
    # Username from email (assuming username is part before @)
    username = user_email.split('@')[0]
    
    # Construct file path
    file_path = f"C:\\New folder\\reports\\{username}_{field_name}\\{report_date}.txt"
    
    try:
        with open(file_path, 'r') as file:
            report_content = file.read()
        
        return jsonify({
            'report_date': report_date,
            'field_name': field_name, 
            'content': report_content
        }), 200
    except FileNotFoundError:
        return jsonify({'error': f'Report file not found at {file_path}'}), 404
    except Exception as e:
        return jsonify({'error': f'Failed to read report file: {str(e)}'}), 500
