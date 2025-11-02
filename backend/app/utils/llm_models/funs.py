import asyncio
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, TypedDict
from app.db.connection import get_pool


class Message(TypedDict):
    role: str
    content: str
    created_at: datetime


async def create_thread_new(
    user_id: int, init_msg: str
) -> Tuple[str, int | None, bool]:
    pool = await get_pool()
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
            await conn.commit()
        return thread_id, parent_id, True


async def get_conversations_from_table(
    thread_id: str, created_at: Optional[datetime] = None
) -> Dict[str, Any]:
    max_retries = 2
    page_size = 4
    limit = page_size + 1
    for retry_count in range(max_retries):
        try:
            pool = await get_pool()
            async with pool.connection() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(
                        f"""
                            SELECT id, role, content, created_at
                            FROM messages
                            WHERE thread_id = %s
                            { 'AND created_at < %s' if created_at else '' }
                            ORDER BY created_at DESC
                            LIMIT {limit};
                        """,
                        (thread_id, created_at) if created_at else (thread_id,),
                    )

                    messages_data = await cur.fetchall()
                    has_more = len(messages_data) > page_size
                    messages_to_return = messages_data[:page_size]
                    if not messages_to_return:
                        return {"messages": [], "has_more": False}

                    parent_ids = [row[0] for row in messages_to_return]

                    # Fetch images for these messages
                    await cur.execute(
                        """
                            SELECT parent_id, role, url_id, description, created_at
                            FROM images
                            WHERE thread_id = %s AND parent_id = ANY(%s);
                        """,
                        (thread_id, parent_ids),
                    )
                    images_data = await cur.fetchall()

            # Group images by parent message
            images_by_message = defaultdict(list)
            for img in images_data[:4]:
                images_by_message[img[0]].append(
                    {
                        "role": img[1],
                        "url_id": img[2],
                        "description": img[3],
                        "created_at": img[4].isoformat() if img[4] else None,
                    }
                )

            # Build result in chronological order (oldest first)
            result = [
                {
                    "id": row[0],
                    "role": row[1],
                    "content": row[2],
                    "created_at": row[3].isoformat() if row[3] else None,
                    "images": images_by_message.get(row[0], []),
                }
                for row in reversed(
                    messages_to_return
                )  # Reverse to get chronological order
            ]

            # has_more is true if we got a full page
            return {"messages": result, "has_more": has_more}

        except Exception as e:
            print(
                f"Error fetching conversations (attempt {retry_count + 1}/{max_retries}): {e}"
            )

            if retry_count + 1 == max_retries:
                print(f"Failed to fetch conversations after {max_retries} attempts")
                raise
            await asyncio.sleep(0.5 * (retry_count + 1))


async def delete_conversation(thread_id: str):
    pool = await get_pool()
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
    pool = await get_pool()
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
