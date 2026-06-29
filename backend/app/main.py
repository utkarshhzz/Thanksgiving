from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine
from app.db.base import Base
from app.api.v1.api import api_router
from app.core.error_handlers import register_exception_handlers

from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup-> runs once when server starts
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"Environment: {settings.APP_ENV}")
    print(f"Debug: {settings.DEBUG}")
    print(f"   Docs URL    : http://localhost:8000/docs\n")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables verified")
    
    yield # app runs and serves all requests here
    
    await engine.dispose() #closing all connections
    # Shutdown-> runs once when server stops
    print(f"Shutting down {settings.APP_NAME} v{settings.APP_VERSION}")
    print("🛑 Database connections closed. Goodbye.")

app = FastAPI(
    title=settings.APP_NAME,
    description="""
## 🤝 ThankGiving Platform API
A production-grade social-good platform connecting donors, volunteers,
and nonprofits across India and beyond.
### What You Can Do
* 💰 **Crowdfunding** — Create and fund social impact campaigns
* 🙋 **Volunteering** — Post and apply for volunteer opportunities
* 📦 **In-Kind Donations** — Offer and receive physical item donations
* 📊 **Impact Reports** — Track volunteer hours, funds raised, and beneficiaries
### Authentication
All protected endpoints require a **Bearer JWT token**.
1. Register at `/api/v1/auth/register`
2. Login at `/api/v1/auth/login`
3. Copy the `access_token`
4. Click **Authorize** above and paste the token
### Error Format
All errors return a consistent JSON shape:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Campaign not found",
    "details": null
  },
  "status_code": 404,
  "path": "/api/v1/campaigns/abc",
  "timestamp": "2026-06-29T22:00:00Z"
}
```
""",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)
register_exception_handlers(app)
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
        "status": "Healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }

app.include_router(api_router, prefix="/api/v1")
