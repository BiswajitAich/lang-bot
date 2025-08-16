from functools import lru_cache
from dotenv import load_dotenv
import os

load_dotenv()

@lru_cache()
def get_db_url()-> str:
    return (
        f"""user={os.getenv('DB_USER')} 
        password={os.getenv('DB_PASSWORD')} 
        host={os.getenv('DB_HOST')} 
        port={os.getenv('DB_PORT')} 
        dbname={os.getenv('DB_NAME')}
        """
    )
