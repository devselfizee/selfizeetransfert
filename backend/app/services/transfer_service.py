import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import generate_transfer_token
from app.models.file import File
from app.models.transfer import Transfer
from app.models.user import User
from app.services.email_service import send_transfer_email
from app.services.file_service import (
    delete_transfer_files,
    save_upload_file,
    validate_file,
)
from app.utils.validators import validate_file_extension

logger = logging.getLogger(__name__)


async def create_transfer(
    db: AsyncSession,
    user: User,
    recipients: List[str],
    cc_list: List[str],
    message: Optional[str],
    expiry_hours: int,
    files: List[UploadFile],
) -> Transfer:
    """
    Create a new transfer: validate files, save to disk, create DB records,
    and send notification email.
    """
    # Validate file extensions before saving
    for upload_file in files:
        filename = upload_file.filename or "unnamed_file"
        if not validate_file_extension(filename):
            raise ValueError(
                f"File extension not allowed for '{filename}'. "
                f"Blocked extensions: {', '.join(settings.BLOCKED_EXTENSIONS)}"
            )

    # Generate transfer token and create directory
    token = generate_transfer_token()
    transfer_dir = os.path.join(settings.STORAGE_PATH, token)
    os.makedirs(transfer_dir, exist_ok=True)

    total_size = 0
    saved_files: List[dict] = []

    try:
        # Save each file to disk
        for upload_file in files:
            safe_name, filepath, file_size = await save_upload_file(
                upload_file, transfer_dir
            )
            validate_file(safe_name, file_size)
            total_size += file_size
            saved_files.append(
                {
                    "filename": safe_name,
                    "filepath": filepath,
                    "size": file_size,
                }
            )

        # Validate total size
        if total_size > settings.MAX_UPLOAD_SIZE:
            raise ValueError(
                f"Total upload size ({total_size} bytes) exceeds maximum "
                f"allowed size of {settings.MAX_UPLOAD_SIZE} bytes"
            )

        # Create the transfer record
        transfer = Transfer(
            id=uuid.uuid4(),
            token=token,
            user_id=user.id,
            recipient_email=", ".join(recipients),
            cc_emails=", ".join(cc_list) if cc_list else None,
            message=message,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=expiry_hours),
            total_size=total_size,
            is_active=True,
        )
        db.add(transfer)
        await db.flush()

        # Create file records
        for file_info in saved_files:
            file_record = File(
                id=uuid.uuid4(),
                transfer_id=transfer.id,
                filename=file_info["filename"],
                filepath=file_info["filepath"],
                size=file_info["size"],
            )
            db.add(file_record)

        await db.flush()

        # Refresh to load relationships
        await db.refresh(transfer)

        # Send notification email to each recipient + each CC (fire-and-forget)
        download_url = f"{settings.BASE_URL}/download/{token}"
        for email in recipients + cc_list:
            asyncio.create_task(
                send_transfer_email(
                    recipient_email=email,
                    sender_name=user.full_name,
                    message=message,
                    download_url=download_url,
                    expires_at=transfer.expires_at,
                )
            )

        logger.info(
            "Transfer %s created by user %s for %d recipients + %d cc (%d files, %d bytes)",
            transfer.id,
            user.id,
            len(recipients),
            len(cc_list),
            len(saved_files),
            total_size,
        )

        return transfer

    except Exception:
        # Clean up saved files on any error
        delete_transfer_files(transfer_dir)
        raise


async def delete_transfer(
    db: AsyncSession, transfer: Transfer
) -> None:
    """Soft-delete a transfer and remove files from disk."""
    transfer.is_active = False

    # Delete files from disk
    transfer_dir = os.path.join(settings.STORAGE_PATH, transfer.token)
    delete_transfer_files(transfer_dir)

    await db.flush()

    logger.info("Transfer %s soft-deleted", transfer.id)


async def get_transfer_by_token(
    db: AsyncSession, token: str
) -> Optional[Transfer]:
    """
    Look up a transfer by its public token.
    Returns None if not found, inactive, or expired.
    """
    result = await db.execute(
        select(Transfer).where(
            Transfer.token == token,
            Transfer.is_active == True,
        )
    )
    transfer = result.scalar_one_or_none()

    if transfer is None:
        return None

    # Check expiry
    if transfer.expires_at < datetime.now(timezone.utc):
        logger.info("Transfer %s has expired", transfer.id)
        return None

    return transfer


async def get_user_transfers(
    db: AsyncSession, user_id: uuid.UUID, skip: int = 0, limit: int = 20
) -> tuple[List[Transfer], int]:
    """Get paginated list of transfers for a user."""
    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(Transfer).where(
            Transfer.user_id == user_id,
            Transfer.is_active == True,
        )
    )
    total = count_result.scalar() or 0

    # Get transfers
    result = await db.execute(
        select(Transfer)
        .where(
            Transfer.user_id == user_id,
            Transfer.is_active == True,
        )
        .order_by(Transfer.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    transfers = list(result.scalars().all())

    return transfers, total


async def get_transfer_by_id(
    db: AsyncSession, transfer_id: uuid.UUID, user_id: uuid.UUID
) -> Optional[Transfer]:
    """Get a specific transfer by ID, ensuring it belongs to the user."""
    result = await db.execute(
        select(Transfer).where(
            Transfer.id == transfer_id,
            Transfer.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()
