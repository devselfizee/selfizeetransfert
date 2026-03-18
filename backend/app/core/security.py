import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
import redis.asyncio as redis
from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: Optional[redis.Redis] = None

# JWKS cache
_jwks_cache: Optional[dict] = None
_jwks_cache_time: float = 0
JWKS_CACHE_TTL = 3600  # 1 hour


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


async def fetch_jwks() -> dict:
    """Fetch JWKS from Keycloak, with caching."""
    global _jwks_cache, _jwks_cache_time

    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache

    async with httpx.AsyncClient() as client:
        response = await client.get(settings.KEYCLOAK_JWKS_URL)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cache_time = now
        logger.info("JWKS keys fetched from Keycloak")
        return _jwks_cache


async def decode_keycloak_token(token: str) -> Optional[dict]:
    """
    Decode and validate a Keycloak access token using JWKS.
    Returns the token payload or None if invalid.
    """
    try:
        jwks = await fetch_jwks()

        # Get the key ID from the token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        if not kid:
            logger.warning("Token has no kid in header")
            return None

        # Find the matching key
        rsa_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                rsa_key = key
                break

        if not rsa_key:
            # Key not found, maybe keys rotated — force refresh
            global _jwks_cache_time
            _jwks_cache_time = 0
            jwks = await fetch_jwks()
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    rsa_key = key
                    break

        if not rsa_key:
            logger.warning("No matching key found for kid: %s", kid)
            return None

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.KEYCLOAK_CLIENT_ID,
            issuer=settings.KEYCLOAK_ISSUER,
            options={"verify_aud": True, "verify_iss": True},
        )
        return payload

    except JWTError as e:
        logger.warning("Keycloak token validation failed: %s", str(e))
        return None
    except Exception as e:
        logger.error("Error decoding Keycloak token: %s", str(e))
        return None


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
