import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import redis.asyncio as redis
from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    """Get or create a Redis client singleton."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


def hash_password(password: str) -> str:
    """Hash a plaintext password."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT access token. Returns None if invalid."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


async def is_token_blacklisted(token: str) -> bool:
    """Check if a token has been blacklisted (logged out)."""
    r = await get_redis()
    result = await r.get(f"blacklist:{token}")
    return result is not None


async def blacklist_token(token: str, expires_in_seconds: int) -> None:
    """Add a token to the blacklist with a TTL matching its expiry."""
    r = await get_redis()
    await r.setex(f"blacklist:{token}", expires_in_seconds, "1")


async def check_rate_limit(key: str, max_attempts: int, window_seconds: int) -> bool:
    """
    Check rate limit for a given key.
    Returns True if the request is allowed, False if rate limited.
    """
    r = await get_redis()
    pipe = r.pipeline()
    now = datetime.now(timezone.utc).timestamp()
    window_start = now - window_seconds

    rate_key = f"ratelimit:{key}"

    pipe.zremrangebyscore(rate_key, 0, window_start)
    pipe.zcard(rate_key)
    pipe.zadd(rate_key, {str(now): now})
    pipe.expire(rate_key, window_seconds)

    results = await pipe.execute()
    current_count = results[1]

    if current_count >= max_attempts:
        return False
    return True


def generate_transfer_token() -> str:
    """Generate a secure random token for transfer links."""
    return secrets.token_urlsafe(32)
