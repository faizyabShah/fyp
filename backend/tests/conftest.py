# backend/tests/conftest.py
import pytest
from flask import Flask
import jwt
import datetime
from app.config import Config
from app.database import get_db_connection

@pytest.fixture
def app():
    """Create and configure a Flask app for testing."""
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.fields import fields_bp
    from app.routes.generate import generate_bp
    from app.routes.requests import requests_bp
    from app.routes.satellite import satellite_bp
    from app.routes.user import user_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(fields_bp)
    app.register_blueprint(generate_bp)
    app.register_blueprint(requests_bp)
    app.register_blueprint(satellite_bp)
    app.register_blueprint(user_bp)
    
    return app

@pytest.fixture
def client(app):
    """Create a test client for the app."""
    return app.test_client()

@pytest.fixture
def auth_header():
    """Create a valid authentication header."""
    token = jwt.encode(
        {'email': 'test@example.com', 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
        Config.JWT_SECRET, algorithm='HS256'
    )
    return {'Authorization': f'Bearer {token}'}

@pytest.fixture
def mock_db(monkeypatch):
    """Mock the database connection and cursor."""
    class MockCursor:
        def __init__(self):
            self.rowcount = 1
            self.executed_queries = []
            self.fetch_returns = {}
        
        def execute(self, query, params=None):
            self.executed_queries.append((query, params))
            return self
        
        def fetchone(self):
            query = self.executed_queries[-1][0] if self.executed_queries else None
            return self.fetch_returns.get(query, {'id': 1, 'email': 'test@example.com', 'name': 'Test User', 'password': '$2b$12$Test', 'phone': '1234567890', 'language': 'en', 'address': 'Test Address'})
        
        def fetchall(self):
            return [{'id': 1, 'email': 'test@example.com', 'name': 'Test User'}]
    
    class MockConnection:
        def __init__(self):
            self.cursor_obj = MockCursor()
        
        def cursor(self):
            return self.cursor_obj
        
        def commit(self):
            pass
        
        def close(self):
            pass
    
    mock_conn = MockConnection()
    
    def mock_get_db_connection():
        return mock_conn
    
    monkeypatch.setattr('app.database.get_db_connection', mock_get_db_connection)
    
    return mock_conn