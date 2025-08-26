from app.db.connection import get_pool


async def initialize_database():
    """Initialize database tables"""
    try:
        pool = get_pool()
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username VARCHAR(20) UNIQUE NOT NULL,
                        email VARCHAR(254) UNIQUE NOT NULL,
                        encoded_password TEXT NOT NULL,
                        first_name VARCHAR(20),
                        last_name VARCHAR(20), 
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                    );
                """
                )

                await cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS threads (
                        thread_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        title VARCHAR(20),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                    );
                """
                )

                await cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS messages (
                        id SERIAL PRIMARY KEY,
                        thread_id UUID NOT NULL REFERENCES threads(thread_id) ON DELETE CASCADE,
                        parent_id INT REFERENCES messages(id),
                        role TEXT CHECK (role IN ('user', 'assistant', 'tool')),
                        content TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                    );
                """
                )

                await cur.execute(
                    """
                        CREATE TABLE IF NOT EXISTS tool_logs (
                            id SERIAL PRIMARY KEY,
                            message_id INT REFERENCES messages(id) ON DELETE CASCADE,
                            tool_name TEXT NOT NULL,
                            input TEXT NOT NULL,
                            output TEXT,
                            used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                        );
                    """
                )

                # await cur.execute(
                #     """
                #     CREATE TABLE IF NOT EXISTS embedded_messages (
                #         id SERIAL PRIMARY KEY,
                #         message_id INT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
                #         embedding FLOAT8[],
                #         created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                #     );
                # """
                # )

        print("Database tables initialized successfully")
    except Exception as e:
        print(f"Database initialization failed: {e}")
