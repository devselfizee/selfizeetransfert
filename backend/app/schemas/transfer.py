import uuid
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr

from app.schemas.file import FileResponse


class TransferCreate(BaseModel):
    recipient_email: EmailStr
    message: Optional[str] = None
    expiry_hours: Literal[24, 72, 168, 336] = 72


class TransferResponse(BaseModel):
    id: uuid.UUID
    token: str
    recipient_email: str
    cc_emails: Optional[str] = None
    sender_name: str = ""
    sender_email: str = ""
    message: Optional[str] = None
    expires_at: datetime
    download_count: int
    total_size: int
    is_active: bool
    created_at: datetime
    files: List[FileResponse] = []
    download_url: str = ""

    model_config = {"from_attributes": True}


class TransferListResponse(BaseModel):
    transfers: List[TransferResponse]
    total: int
