import logging
from typing import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.core.security import decode_keycloak_token
from app.models.user import User

logger = logging.getLogger(__name__)

security_scheme = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Provide an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extract and validate the current user from the Keycloak access token.
    Auto-provisions the user in the local DB if they don't exist yet.
    """
    token = credentials.credentials

    payload = await decode_keycloak_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # Extract user info from Keycloak claims
    keycloak_sub = payload.get("sub")
    email = payload.get("email")
    full_name = payload.get("name") or payload.get("preferred_username") or "Utilisateur"

    if not keycloak_sub or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required claims (sub, email)",
        )

    # Find user by email
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        # Auto-provision user from Keycloak
        user = User(
            email=email,
            full_name=full_name,
            password_hash="keycloak-sso",
            is_active=True,
        )
        db.add(user)
        await db.flush()
        logger.info("Auto-provisioned user %s from Keycloak (sub: %s)", email, keycloak_sub)
    else:
        # Update name if changed in Keycloak
        if user.full_name != full_name:
            user.full_name = full_name

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return user
