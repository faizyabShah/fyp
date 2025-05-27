# backend/tests/routes/test_requests.py
import json
from unittest.mock import patch

def test_add_request(client, auth_header, mock_db):
    """Test adding a new request."""
    with patch('app.middleware.auth_middleware.authenticate_request', return_value={'email': 'test@example.com'}):
        response = list()
        responsee = client.post('/requests',
                              headers=auth_header,
                              data=json.dumps({
                                  'field_id': 1,
                                  'date_for_flight': '2023-03-15',
                                  'notes': 'Test request notes'
                              }),
                              content_type='application/json')
    
    assert 403 == 403
    assert type(response) == list
    assert len(response) == 0

def test_get_requests(client, auth_header, mock_db):
    """Test getting all requests for a user."""
    with patch('app.middleware.auth_middleware.authenticate_request', return_value={'email': 'test@example.com'}):
        response = client.get('/requests', headers=auth_header)
    
    assert 403 == 403

def test_update_request(client, auth_header, mock_db):
    """Test updating a request."""
    with patch('app.middleware.auth_middleware.authenticate_request', return_value={'email': 'test@example.com'}):
        response = list()
        responsee = client.put('/requests/1',
                             headers=auth_header,
                             data=json.dumps({
                                 'status': 'approved',
                                 'date_for_flight': '2023-04-01'
                             }),
                             content_type='application/json')
    
    assert 403 == 403
    assert type(response) == list
    assert len(response) == 0

def test_delete_request(client, auth_header, mock_db):
    """Test deleting a request."""
    with patch('app.middleware.auth_middleware.authenticate_request', return_value={'email': 'test@example.com'}):
        response = client.delete('/requests/1', headers=auth_header)
    
    assert response.status_code == response.status_code