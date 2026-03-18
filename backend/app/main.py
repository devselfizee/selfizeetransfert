import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.downloads import router as downloads_router
from app.api.transfers import router as transfers_router
from app.core.config import settings
from app.core.database import Base, engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Selfizee Transfer API",
    description="A secure file transfer service similar to WeTransfer",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
logger.info("CORS_ORIGINS configured: %s", settings.CORS_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(transfers_router)
app.include_router(downloads_router)


@app.on_event("startup")
async def startup_event() -> None:
    """Initialize database tables and storage directory on startup."""
    logger.info("Starting Selfizee Transfer API")

    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified")

    # Ensure storage directory exists
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    logger.info("Storage directory ready: %s", settings.STORAGE_PATH)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Clean up resources on shutdown."""
    await engine.dispose()
    logger.info("Selfizee Transfer API shut down")


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "selfizee-transfer",
        "version": "1.0.0",
    }
