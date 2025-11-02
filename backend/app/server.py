from contextlib import asynccontextmanager
import io
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from psycopg_pool import AsyncConnectionPool
from app.routes import auth_routes, llm_routes
from app.db.init_db import initialize_database
from app.db.connection import set_pool
from app.db.database import get_db_url
from app.utils.workflow import workflow


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncConnectionPool(get_db_url()) as pool:
        set_pool(pool)
        print("connection.pool:", pool)
        try:
            await initialize_database()
            yield  
        finally:
            await pool.close()
            print("🧹 Connection pool closed cleanly.")


app = FastAPI(lifespan=lifespan)

app.include_router(auth_routes.router)
app.include_router(llm_routes.router)


@app.get("/")
def root():
    return {"message": "bot api is working!"}

@app.get("/check-workflow")
def run_workflow():
    png_bytes = workflow.get_graph().draw_mermaid_png()
    return StreamingResponse(io.BytesIO(png_bytes), media_type="image/png")