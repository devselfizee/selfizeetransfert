import asyncio
import logging
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse as FastAPIFileResponse
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.models.file import File
from app.schemas.file import FileResponse
from app.schemas.transfer import TransferResponse
from app.services.file_service import create_zip
from app.services.transfer_service import get_transfer_by_token
from app.services.email_service import send_first_download_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/download", tags=["downloads"])


def _build_public_transfer_response(transfer) -> TransferResponse:
    """Build a public TransferResponse (no auth context)."""
    download_url = f"{settings.BASE_URL}/download/{transfer.token}"
    resp = TransferResponse.model_validate(transfer)
    resp.download_url = download_url
    if transfer.user:
        resp.sender_name = transfer.user.full_name
        resp.sender_email = transfer.user.email
    return resp


@router.get("/{token}", response_model=TransferResponse)
async def get_transfer_info(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> TransferResponse:
    """
    Get public transfer info for the download page.
    No authentication required.
    """
    transfer = await get_transfer_by_token(db=db, token=token)

    if transfer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer not found, expired, or inactive",
        )

    return _build_public_transfer_response(transfer)


@router.get("/{token}/file/{file_id}")
async def download_file(
    token: str,
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Download an individual file from a transfer.
    Increments the download count. No authentication required.
    """
    transfer = await get_transfer_by_token(db=db, token=token)

    if transfer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer not found, expired, or inactive",
        )

    # Find the requested file
    result = await db.execute(
        select(File).where(
            File.id == file_id,
            File.transfer_id == transfer.id,
        )
    )
    file_record = result.scalar_one_or_none()

    if file_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in this transfer",
        )

    if not os.path.exists(file_record.filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk",
        )

    # Increment download count
    is_first_download = transfer.download_count == 0
    transfer.download_count += 1
    await db.flush()

    # Notify sender on first download
    if is_first_download and not transfer.first_download_notified and transfer.user:
        transfer.first_download_notified = True
        await db.flush()
        download_url = f"{settings.BASE_URL}/download/{transfer.token}"
        asyncio.create_task(
            send_first_download_email(
                sender_email=transfer.user.email,
                recipient_email=transfer.recipient_email,
                download_url=download_url,
                expires_at=transfer.expires_at,
                files=list(transfer.files),
                total_size=transfer.total_size,
            )
        )

    logger.info(
        "File %s downloaded from transfer %s (download #%d)",
        file_record.filename,
        transfer.token,
        transfer.download_count,
    )

    return FastAPIFileResponse(
        path=file_record.filepath,
        filename=file_record.filename,
        media_type="application/octet-stream",
    )


@router.get("/{token}/zip")
async def download_zip(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Download all files in a transfer as a ZIP archive.
    Increments the download count. No authentication required.
    """
    transfer = await get_transfer_by_token(db=db, token=token)

    if transfer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer not found, expired, or inactive",
        )

    if not transfer.files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No files found in this transfer",
        )

    # Build file list for ZIP creation
    file_list = [
        {"filepath": f.filepath, "filename": f.filename}
        for f in transfer.files
    ]

    zip_buffer = await create_zip(file_list, transfer.token)

    # Increment download count
    is_first_download = transfer.download_count == 0
    transfer.download_count += 1
    await db.flush()

    # Notify sender on first download
    if is_first_download and not transfer.first_download_notified and transfer.user:
        transfer.first_download_notified = True
        await db.flush()
        download_url = f"{settings.BASE_URL}/download/{transfer.token}"
        asyncio.create_task(
            send_first_download_email(
                sender_email=transfer.user.email,
                recipient_email=transfer.recipient_email,
                download_url=download_url,
                expires_at=transfer.expires_at,
                files=list(transfer.files),
                total_size=transfer.total_size,
            )
        )

    logger.info(
        "ZIP download for transfer %s (download #%d)",
        transfer.token,
        transfer.download_count,
    )

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="selfizee-transfer-{transfer.token[:8]}.zip"',
        },
    )
