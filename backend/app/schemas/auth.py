import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str = Field(validation_alias="full_name", serialization_alias="name")
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True, "serialize_by_alias": True}
