from functools import lru_cache
from dotenv import load_dotenv
import os

load_dotenv()

@lru_cache()
def get_db_url() -> str:
    return (
        f"user={os.getenv('DB_USER')} "
        f"password={os.getenv('DB_PASSWORD')} "
        f"host={os.getenv('DB_HOST')} "
        f"port={os.getenv('DB_PORT')} "
        f"dbname={os.getenv('DB_NAME')} "
        f"sslmode={os.getenv('DB_SSLMODE')} "
        f"channel_binding={os.getenv('DB_CHANNEL_BINDING')}"
    )
