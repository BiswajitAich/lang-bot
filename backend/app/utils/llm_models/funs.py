from typing import List, TypedDict
from app.db.database import get_db_connection


class Message(TypedDict):
    role: str
    content: str

def create_thread_new(user_id: int, init_msg: str) -> str:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO threads (user_id) 
                VALUES (%s)  
                RETURNING thread_id;
                """,
                (user_id,),
            )
            thread_id = cur.fetchone()[0]
            if not thread_id:
                return ""

            cur.execute(
                """
                INSERT INTO messages (thread_id, role, content) 
                VALUES (%s, 'user', %s);
                """,
                (thread_id, init_msg),
            )
        conn.commit()  
    return str(thread_id)



def get_conversations_from_table(thread_id: str, last_index: int=0) -> List[Message]:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                    SELECT role, content, created_at
                    FROM messages
                    WHERE thread_id = %s
                    ORDER BY created_at ASC
                    LIMIT 10 OFFSET %s;
                """,
                (thread_id, last_index),
            )

            data = cur.fetchall()
    return [
        {"role": row[0], "content": row[1]}
        for row in data
    ]
    
    
def delete_conversation(thread_id: str):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                    DELETE FROM threads
                    WHERE thread_id = %s;
                """,
                (thread_id,)
            )
            deleted_count = cur.rowcount 
        conn.commit()
    if deleted_count > 0:
        print(f"✅ Deleted {deleted_count} thread(s) from threads table: {thread_id}.")
        return True
    else:
        print(f"⚠️ No thread found in threads table for ID: {thread_id}.")
        return False
        
        
def insert_user_conversation(thread_id: str, message: str):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                    INSERT INTO messages 
                    (thread_id, role, content ) 
                    VALUES (%s, 'user', %s);
                """,(thread_id, message),
            )
        conn.commit()

            
