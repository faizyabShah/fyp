import os

class Config:
    JWT_SECRET = os.environ.get('JWT_SECRET', 'thisisahugesecret')
    DATABASE_PATH = "./users.db"
