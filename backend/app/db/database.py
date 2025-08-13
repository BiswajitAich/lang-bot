import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

def get_db_connection():
    try:
        con = psycopg.connect(
            host=os.getenv("DB_HOST"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            port=os.getenv("DB_PORT"),
        )
        return con
    except:
        raise Exception(status_code=500, detail="Failed to connect to database.")