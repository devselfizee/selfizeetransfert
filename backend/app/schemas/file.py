import uuid

from pydantic import BaseModel


class FileResponse(BaseModel):
    id: uuid.UUID
    filename: str
    size: int

    model_config = {"from_attributes": True}
