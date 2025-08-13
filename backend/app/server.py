from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routes import auth_routes, llm_routes
from app.db.init_db import initialize_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield
    
app = FastAPI(lifespan=lifespan)

app.include_router(auth_routes.router)
app.include_router(llm_routes.router)


@app.get("/")
def root():
    return {"message": "bot api is working!"}

