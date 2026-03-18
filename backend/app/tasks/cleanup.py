import asyncio
import logging
import os
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import async_session_factory
from app.models.transfer import Transfer
from app.services.file_service import delete_transfer_files
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _cleanup_expired() -> int:
    """
    Find all expired and active transfers, delete their files from disk,
    and mark them as inactive. Returns the number of cleaned-up transfers.
    """
    cleaned = 0
    now = datetime.now(timezone.utc)

    async with async_session_factory() as session:
        result = await session.execute(
            select(Transfer).where(
                Transfer.is_active == True,
                Transfer.expires_at < now,
            )
        )
        expired_transfers = result.scalars().all()

        for transfer in expired_transfers:
            try:
                transfer_dir = os.path.join(settings.STORAGE_PATH, transfer.token)
                delete_transfer_files(transfer_dir)
                transfer.is_active = False
                cleaned += 1
                logger.info(
                    "Cleaned up expired transfer %s (expired at %s)",
                    transfer.id,
                    transfer.expires_at,
                )
            except Exception as exc:
                logger.error(
                    "Error cleaning up transfer %s: %s",
                    transfer.id,
                    str(exc),
                )

        await session.commit()

    return cleaned


@celery_app.task(name="app.tasks.cleanup.cleanup_expired_transfers")
def cleanup_expired_transfers() -> dict:
    """
    Celery task to clean up expired transfers.
    Runs the async cleanup function in a new event loop.
    """
    logger.info("Starting expired transfer cleanup")

    loop = asyncio.new_event_loop()
    try:
        cleaned = loop.run_until_complete(_cleanup_expired())
    finally:
        loop.close()

    logger.info("Cleanup complete: %d transfers cleaned up", cleaned)
    return {"cleaned": cleaned}
