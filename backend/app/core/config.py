import secrets
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/selfizee_transfer"
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/2"
    SECRET_KEY: str = secrets.token_urlsafe(64)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Keycloak SSO
    KEYCLOAK_URL: str = "https://plateform-auth.konitys.fr"
    KEYCLOAK_REALM: str = "konitys"
    KEYCLOAK_CLIENT_ID: str = "plateform-frontend"
    KEYCLOAK_JWKS_URL: str = "https://plateform-auth.konitys.fr/realms/konitys/protocol/openid-connect/certs"
    KEYCLOAK_ISSUER: str = "https://plateform-auth.konitys.fr/realms/konitys"

    STORAGE_PATH: str = "/storage/transfers"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024 * 1024  # 10 GB in bytes

    SMTP_HOST: str = "in-v3.mailjet.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = "4413cf13ca9e713fafba8cbd5e902da1"
    SMTP_PASSWORD: str = "4a12caacca18c678ac70f53faaed5a22"
    SMTP_FROM: str = "contact@selfizee.fr"

    BASE_URL: str = "https://transfert.konitys.fr"

    BLOCKED_EXTENSIONS: List[str] = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs"]
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://transfer.selfizee.local",
        "https://transfert.konitys.fr",
        "https://transfert-api.konitys.fr",
    ]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
