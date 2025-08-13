from app.db.database import get_db_connection

def get_conversations(username: str, last_num: int=0):
    if last_num < 0:  
        last_num = 0
        print("'last_num' must be atleast 0 or more! \n last_num reset to 0.")
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                    SELECT thread_id, title, created_at 
                    FROM conversations WHERE user_id=%s
                    OFFSET %s ROWS 
                    FETCH NEXT 10 ROWS ONLY; 
                """,
                (username, last_num)
            )
            return cur.fetchall()
        
# print(get_conversations('', -1))
