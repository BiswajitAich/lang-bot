from typing import List, Optional, Tuple, TypedDict
from app.db.connection import get_pool


class Message(TypedDict):
    role: str
    content: str


async def create_thread_new(
    user_id: int, init_msg: str
) -> Tuple[str, int | None, bool]:
    pool = get_pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                    INSERT INTO threads (user_id) 
                    VALUES (%s)  
                    RETURNING thread_id;
                    """,
                (user_id,),
            )
            row = await cur.fetchone()
            if not row:
                return "", None, False

            thread_id = str(row[0])
            print("🍀", thread_id)
            await cur.execute(
                """
                INSERT INTO messages (thread_id, role, content) 
                VALUES (%s, 'user', %s) RETURNING id;
                """,
                (thread_id, init_msg),
            )
            rowMsg = await cur.fetchone()
            print("😶‍🌫️", rowMsg)
            parent_id = int(rowMsg[0]) if rowMsg else None
        return thread_id, parent_id, True


async def get_conversations_from_table(
    thread_id: str, last_index: int = 0
) -> List[Message]:
    pool = get_pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                        SELECT role, content, created_at
                        FROM messages
                        WHERE thread_id = %s
                        ORDER BY created_at ASC
                        LIMIT 10 OFFSET %s;
                    """,
                (thread_id, last_index),
            )

            data = await cur.fetchall()
    return [{"role": row[0], "content": row[1]} for row in data]


async def delete_conversation(thread_id: str):
    pool = get_pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                    DELETE FROM threads
                    WHERE thread_id = %s;
                """,
                (thread_id,),
            )
            deleted_count = cur.rowcount
    if deleted_count > 0:
        print(f"✅ Deleted {deleted_count} thread(s) from threads table: {thread_id}.")
        return True
    else:
        print(f"⚠️ No thread found in threads table for ID: {thread_id}.")
        return False


async def insert_user_conversation(thread_id: str, message: str):
    pool = get_pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                        INSERT INTO messages 
                        (thread_id, role, content ) 
                        VALUES (%s, 'user', %s) RETURNING id;
                    """,
                (thread_id, message),
            )
            row = await cur.fetchone()
            parent_id = row[0] if row else None
            if not parent_id:
                return None
        return int(parent_id)
