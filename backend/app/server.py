from contextlib import asynccontextmanager

from fastapi import FastAPI
from psycopg_pool import AsyncConnectionPool
from app.routes import auth_routes, llm_routes
from app.db.init_db import initialize_database
from app.db.connection import set_pool
from app.db.database import get_db_url


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Use the recommended context manager approach
    async with AsyncConnectionPool(get_db_url()) as pool:
        set_pool(pool)
        print("connection.pool:", pool)
        await initialize_database()
        yield


app = FastAPI(lifespan=lifespan)

app.include_router(auth_routes.router)
app.include_router(llm_routes.router)


@app.get("/")
def root():
    return {"message": "bot api is working!"}
