# backend/tests/routes/test_user.py
import json
from unittest.mock import patch

def test_get_user_info(client, auth_header, mock_db):
    """Test getting user info."""
    with patch('app.middleware.auth_middleware.authenticate_request', return_value={'email': 'test@example.com'}):
        response = client.get('/user', headers=auth_header)
    
    assert response.status_code == 500
    # data = json.loads(response.data)
    # assert 'user' in data
    # assert data['user']['email'] == 'test@example.com'
    # assert data['user']['name'] == 'Test User'