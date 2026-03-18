import json
import logging
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.transfer import TransferListResponse, TransferResponse
from app.services.transfer_service import (
    create_transfer,
    delete_transfer,
    get_transfer_by_id,
    get_user_transfers,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transfers", tags=["transfers"])


def _build_transfer_response(transfer) -> TransferResponse:
    """Build a TransferResponse from a Transfer model instance."""
    download_url = f"{settings.BASE_URL}/download/{transfer.token}"
    resp = TransferResponse.model_validate(transfer)
    resp.download_url = download_url
    if transfer.user:
        resp.sender_name = transfer.user.full_name
        resp.sender_email = transfer.user.email
    return resp


@router.post("/create", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def create_new_transfer(
    files: List[UploadFile] = File(...),
    metadata: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransferResponse:
    """
    Create a new file transfer.

    Accepts multipart form data with:
    - files: one or more files to transfer
    - metadata: JSON string with recipient_email, message (optional), expiry_hours
    """
    # Parse metadata JSON
    try:
        meta = json.loads(metadata)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid metadata JSON",
        )

    recipient_email = meta.get("recipient_email")
    if not recipient_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="recipient_email is required in metadata",
        )

    message: Optional[str] = meta.get("message")
    expiry_hours: int = meta.get("expiry_hours", 72)

    if expiry_hours not in (24, 72, 168, 336):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="expiry_hours must be one of: 24, 72, 168, 336",
        )

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file is required",
        )

    try:
        transfer = await create_transfer(
            db=db,
            user=current_user,
            recipient_email=recipient_email,
            message=message,
            expiry_hours=expiry_hours,
            files=files,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return _build_transfer_response(transfer)


@router.get("", response_model=TransferListResponse)
async def list_transfers(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransferListResponse:
    """List the current user's transfers with pagination."""
    if limit > 100:
        limit = 100

    transfers, total = await get_user_transfers(
        db=db, user_id=current_user.id, skip=skip, limit=limit
    )

    return TransferListResponse(
        transfers=[_build_transfer_response(t) for t in transfers],
        total=total,
    )


@router.get("/{transfer_id}", response_model=TransferResponse)
async def get_transfer(
    transfer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransferResponse:
    """Get details of a specific transfer."""
    transfer = await get_transfer_by_id(db=db, transfer_id=transfer_id, user_id=current_user.id)

    if transfer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer not found",
        )

    return _build_transfer_response(transfer)


@router.delete("/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_transfer(
    transfer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Soft-delete a transfer and remove its files from disk."""
    transfer = await get_transfer_by_id(db=db, transfer_id=transfer_id, user_id=current_user.id)

    if transfer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer not found",
        )

    await delete_transfer(db=db, transfer=transfer)

    logger.info("Transfer %s deleted by user %s", transfer_id, current_user.id)
