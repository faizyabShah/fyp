from flask import Flask
from flask_cors import CORS
from app.routes.auth import auth_bp
from app.routes.fields import fields_bp
from app.routes.requests import requests_bp
from app.routes.user import user_bp
from app.routes.reports import reports_bp
from app.database import init_db

app = Flask(__name__)
CORS(app)

# Initialize the database before starting the server
init_db()

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(fields_bp)
app.register_blueprint(requests_bp)
app.register_blueprint(user_bp)
app.register_blueprint(reports_bp)

if __name__ == '__main__':
    app.run(port=5000)
