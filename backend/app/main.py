from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine
from app.db.base import Base

from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup-> runs once when server starts
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"Environment: {settings.APP_ENV}")
    print(f"Debug: {settings.DEBUG}")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables verified")
    
    yield # app runs and serves all requests here
    
    # await engine.dispose() closing all connections
    # Shutdown-> runs once when server stops
    print(f"Shutting down {settings.APP_NAME} v{settings.APP_VERSION}")
     print("🛑 Database connections closed. Goodbye.")

app = FastAPI(
    title=settings.APP_NAME,
    description="Social-good platform for crowdfunding, volunteering, in-kind donations and space sharing",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development; restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

@app.get("/",tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "docs": "/docs",
    }
    
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }