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
    
    # Construct file path with proper path handling
    import os
    file_path = os.path.join("C:", os.sep, "New folder", "reports", f"{username}_{field_name}", f"{report_date}.txt")
    
    try:
        # Check if file exists and is accessible
        if not os.path.exists(file_path):
            return jsonify({'error': 'Report file does not exist'}), 404
            
        if not os.access(file_path, os.R_OK):
            return jsonify({'error': 'Permission denied: Cannot read report file'}), 403
            
        # Try different encodings if necessary
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                report_content = file.read()
        except UnicodeDecodeError:
            # Try with a different encoding if UTF-8 fails
            with open(file_path, 'r', encoding='latin-1') as file:
                report_content = file.read()
        
        print(f"Successfully read file with length: {len(report_content)}")
        
        return jsonify({
            'report_date': report_date,
            'field_name': field_name, 
            'content': report_content
        }), 200
        
    except FileNotFoundError:
        return jsonify({'error': 'Report file not found'}), 404
    except PermissionError:
        return jsonify({'error': 'Permission denied accessing the report file'}), 403
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error reading file: {str(e)}")
        print(f"Error details: {error_details}")
        return jsonify({'error': f'Failed to read report file: {str(e)}'}), 500
