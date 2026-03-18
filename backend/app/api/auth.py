import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.security import (
    blacklist_token,
    check_rate_limit,
    create_access_token,
    decode_access_token,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, TokenResponse, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Authenticate user and return a JWT access token."""
    client_ip = request.client.host if request.client else "unknown"

    # Rate limiting: 5 attempts per minute per IP
    try:
        allowed = await check_rate_limit(
            key=f"login:{client_ip}", max_attempts=5, window_seconds=60
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later.",
            )
    except HTTPException:
        raise
    except Exception:
        logger.warning("Rate limit check failed (Redis may be unavailable)")

    # Look up user by email
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    access_token = create_access_token(data={"sub": str(user.id)})

    logger.info("User %s logged in from %s", user.email, client_ip)

    return LoginResponse(
        token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> None:
    """Logout the current user by blacklisting the token."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "")

    if token:
        # Decode to get expiry, then blacklist for the remaining TTL
        payload = decode_access_token(token)
        if payload and "exp" in payload:
            exp = payload["exp"]
            now = int(datetime.now(timezone.utc).timestamp())
            ttl = max(exp - now, 0)
            try:
                await blacklist_token(token, ttl)
            except Exception:
                logger.warning("Failed to blacklist token (Redis may be unavailable)")

    logger.info("User %s logged out", current_user.email)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Return the current authenticated user's profile."""
    return UserResponse.model_validate(current_user)
