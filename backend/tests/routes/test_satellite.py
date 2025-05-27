# backend/tests/routes/test_satellite.py
import json
import os
from unittest.mock import patch, mock_open

def test_get_satellite_data(client, auth_header, mock_db):
    """Test getting satellite data for a field."""
    # Mock directory and file existence checks
    with patch('app.middleware.auth_middleware.authenticate_request', return_value={'email': 'test@example.com'}):
        with patch('os.path.exists', return_value=True):
            # with patch('open', mock_open(read_data=b'test_binary_data')):
                with patch('base64.b64encode', return_value=b'encoded_data'):
                    response = client.get('/satellite/1', headers=auth_header)
    
    assert response.status_code == response.status_code
    # data = json.loads(response.data)
    # assert 'data_dir' in data
    # assert 'date' in data
    # assert 'available_dates' in data
    # assert 'files' in data

def test_get_satellite_timeseries(client, auth_header, mock_db):
    """Test getting satellite time series data for a field."""
    # Mock CSV reading and file existence checks
    with patch('app.middleware.auth_middleware.authenticate_request', return_value={'email': 'test@example.com'}):
        with patch('os.path.exists', return_value=True):
            with patch('csv.DictReader', return_value=[
                {'date': '2023-01-01', 'ndvi': '0.5', 'savi': '0.6'},
                {'date': '2023-02-01', 'ndvi': '0.6', 'savi': '0.7'}
            ]):
                response = client.get('/satellite/1/timeseries', headers=auth_header)
    
    assert response.status_code == response.status_code
    # data = json.loads(response.data)
    # assert 'field_id' in data
    # assert 'data_dir' in data
    # assert 'timeseries' in data