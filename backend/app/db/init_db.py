from app.db.database import get_db_connection

def initialize_database():
    """Initialize database tables"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
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
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS threads (
                        thread_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        title VARCHAR(20),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS messages (
                        id SERIAL PRIMARY KEY,
                        thread_id UUID NOT NULL REFERENCES threads(thread_id) ON DELETE CASCADE,
                        role TEXT CHECK (role IN ('user', 'assistant')),
                        content TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                    );
                """)

                    
                    # CREATE EXTENSION IF NOT EXISTS vector;

                    # CREATE TABLE embeddings (
                    #     id SERIAL PRIMARY KEY,
                    #     message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
                    #     embedding vector(1536),
                    #     created_at TIMESTAMP DEFAULT NOW()
                    # );

                    # CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops)
                    # WITH (lists = 10);
                    
                   
                
        print("Database tables initialized successfully")
    except Exception as e:
        print(f"Database initialization failed: {e}")