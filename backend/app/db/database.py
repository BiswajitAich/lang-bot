from functools import lru_cache
from dotenv import load_dotenv
import os

load_dotenv()

@lru_cache()
def get_db_url() -> str:
    return os.getenv("DATABASE_URL")
