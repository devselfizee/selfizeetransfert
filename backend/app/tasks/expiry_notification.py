import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import async_session_factory
from app.models.transfer import Transfer
from app.services.email_service import send_expiry_notification_email
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# Notify when transfer expires within this delay
EXPIRY_WARNING_HOURS = 6


async def _notify_expiring_transfers() -> int:
    """
    Find active transfers expiring soon that have never been downloaded,
    and send notification emails to the creator and recipient.
    """
    notified = 0
    now = datetime.now(timezone.utc)
    warning_threshold = now + timedelta(hours=EXPIRY_WARNING_HOURS)

    async with async_session_factory() as session:
        result = await session.execute(
            select(Transfer)
            .options(selectinload(Transfer.user))
            .where(
                Transfer.is_active == True,
                Transfer.expiry_notified == False,
                Transfer.download_count == 0,
                Transfer.expires_at <= warning_threshold,
                Transfer.expires_at > now,
            )
        )
        transfers = result.scalars().all()

        for transfer in transfers:
            try:
                download_url = f"{settings.BASE_URL}/download/{transfer.token}"

                # Notify the creator
                await send_expiry_notification_email(
                    recipient_email=transfer.user.email,
                    recipient_name=transfer.user.full_name,
                    sender_name=transfer.user.full_name,
                    download_url=download_url,
                    expires_at=transfer.expires_at,
                    is_sender=True,
                    transfer_recipient_email=transfer.recipient_email,
                )

                # Notify the recipient if specified
                if transfer.recipient_email:
                    await send_expiry_notification_email(
                        recipient_email=transfer.recipient_email,
                        recipient_name=None,
                        sender_name=transfer.user.full_name,
                        download_url=download_url,
                        expires_at=transfer.expires_at,
                        is_sender=False,
                        transfer_recipient_email=None,
                    )

                transfer.expiry_notified = True
                notified += 1
                logger.info(
                    "Expiry notification sent for transfer %s (expires at %s)",
                    transfer.id,
                    transfer.expires_at,
                )
            except Exception as exc:
                logger.error(
                    "Error sending expiry notification for transfer %s: %s",
                    transfer.id,
                    str(exc),
                )

        await session.commit()

    return notified


@celery_app.task(name="app.tasks.expiry_notification.notify_expiring_transfers")
def notify_expiring_transfers() -> dict:
    """
    Celery task to notify about expiring transfers with no downloads.
    """
    logger.info("Starting expiry notification check")

    loop = asyncio.new_event_loop()
    try:
        notified = loop.run_until_complete(_notify_expiring_transfers())
    finally:
        loop.close()

    logger.info("Expiry notification complete: %d transfers notified", notified)
    return {"notified": notified}
