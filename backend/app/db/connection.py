from psycopg_pool import AsyncConnectionPool

pool: AsyncConnectionPool | None = None


def get_pool() -> AsyncConnectionPool:
    """Get the global database pool instance"""
    global pool
    if pool is None:
        raise Exception(
            "Database pool not initialized. Make sure the app lifespan has started."
        )
    return pool


def set_pool(new_pool: AsyncConnectionPool) -> None:
    """Set the global database pool instance"""
    global pool
    pool = new_pool
