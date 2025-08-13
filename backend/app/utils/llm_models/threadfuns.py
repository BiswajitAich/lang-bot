from app.db.database import get_db_connection


def get_thread_ids(user_id: int, row_index: int = 0):
    print('/get_thread_ids', {'user_id': user_id, 'row_index': row_index})
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                        SELECT thread_id FROM threads 
                        WHERE user_id=%s ORDER BY thread_id 
                        LIMIT 20 OFFSET %s;
                    """,
                    (user_id, row_index),
                )
                rows = cur.fetchall()
                print(f'Rows fetched: {rows}')
                thread_ids = [str(row[0]) for row in rows]
        print('Returning thread_ids:', thread_ids)
        return thread_ids
    except Exception as e:
        print(f"Error in get_thread_ids: {str(e)}")
        import traceback
        traceback.print_exc()
        raise