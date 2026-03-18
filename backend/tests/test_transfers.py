import io
import json
import os
import uuid

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.models.user import User


@pytest.mark.asyncio
async def test_create_transfer(auth_client: AsyncClient, test_user: User, tmp_path):
    """Test creating a transfer with files."""
    # Override storage path for test
    original_path = settings.STORAGE_PATH
    settings.STORAGE_PATH = str(tmp_path)

    try:
        metadata = json.dumps({
            "recipient_email": "recipient@example.com",
            "message": "Here are the files!",
            "expiry_hours": 72,
        })

        file_content = b"Hello, this is a test file content."
        files = [
            ("files", ("test_document.txt", io.BytesIO(file_content), "text/plain")),
        ]

        response = await auth_client.post(
            "/api/transfers/create",
            data={"metadata": metadata},
            files=files,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["recipient_email"] == "recipient@example.com"
        assert data["message"] == "Here are the files!"
        assert data["is_active"] is True
        assert data["download_count"] == 0
        assert len(data["files"]) == 1
        assert data["files"][0]["filename"] == "test_document.txt"
        assert "download_url" in data
        assert "token" in data
    finally:
        settings.STORAGE_PATH = original_path


@pytest.mark.asyncio
async def test_create_transfer_blocked_extension(auth_client: AsyncClient, test_user: User, tmp_path):
    """Test that blocked file extensions are rejected."""
    original_path = settings.STORAGE_PATH
    settings.STORAGE_PATH = str(tmp_path)

    try:
        metadata = json.dumps({
            "recipient_email": "recipient@example.com",
            "expiry_hours": 24,
        })

        file_content = b"malicious content"
        files = [
            ("files", ("virus.exe", io.BytesIO(file_content), "application/octet-stream")),
        ]

        response = await auth_client.post(
            "/api/transfers/create",
            data={"metadata": metadata},
            files=files,
        )

        assert response.status_code == 400
        assert "extension not allowed" in response.json()["detail"].lower()
    finally:
        settings.STORAGE_PATH = original_path


@pytest.mark.asyncio
async def test_list_transfers_empty(auth_client: AsyncClient, test_user: User):
    """Test listing transfers when none exist."""
    response = await auth_client.get("/api/transfers/")
    assert response.status_code == 200
    data = response.json()
    assert data["transfers"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_transfers_with_data(auth_client: AsyncClient, test_user: User, tmp_path):
    """Test listing transfers after creating one."""
    original_path = settings.STORAGE_PATH
    settings.STORAGE_PATH = str(tmp_path)

    try:
        metadata = json.dumps({
            "recipient_email": "someone@example.com",
            "expiry_hours": 24,
        })

        files = [
            ("files", ("readme.txt", io.BytesIO(b"content"), "text/plain")),
        ]

        await auth_client.post(
            "/api/transfers/create",
            data={"metadata": metadata},
            files=files,
        )

        response = await auth_client.get("/api/transfers/")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["transfers"]) == 1
        assert data["transfers"][0]["recipient_email"] == "someone@example.com"
    finally:
        settings.STORAGE_PATH = original_path


@pytest.mark.asyncio
async def test_delete_transfer(auth_client: AsyncClient, test_user: User, tmp_path):
    """Test deleting a transfer."""
    original_path = settings.STORAGE_PATH
    settings.STORAGE_PATH = str(tmp_path)

    try:
        metadata = json.dumps({
            "recipient_email": "delete_me@example.com",
            "expiry_hours": 24,
        })

        files = [
            ("files", ("file.txt", io.BytesIO(b"delete me"), "text/plain")),
        ]

        create_response = await auth_client.post(
            "/api/transfers/create",
            data={"metadata": metadata},
            files=files,
        )
        transfer_id = create_response.json()["id"]

        # Delete the transfer
        delete_response = await auth_client.delete(f"/api/transfers/{transfer_id}")
        assert delete_response.status_code == 204

        # Verify it no longer appears in the list
        list_response = await auth_client.get("/api/transfers/")
        assert list_response.json()["total"] == 0
    finally:
        settings.STORAGE_PATH = original_path


@pytest.mark.asyncio
async def test_get_transfer_not_found(auth_client: AsyncClient, test_user: User):
    """Test getting a non-existent transfer returns 404."""
    fake_id = str(uuid.uuid4())
    response = await auth_client.get(f"/api/transfers/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_transfer_invalid_expiry(auth_client: AsyncClient, test_user: User):
    """Test creating a transfer with invalid expiry hours."""
    metadata = json.dumps({
        "recipient_email": "test@example.com",
        "expiry_hours": 999,
    })

    files = [
        ("files", ("test.txt", io.BytesIO(b"content"), "text/plain")),
    ]

    response = await auth_client.post(
        "/api/transfers/create",
        data={"metadata": metadata},
        files=files,
    )

    assert response.status_code == 400
    assert "expiry_hours" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_transfer_unauthenticated(client: AsyncClient):
    """Test creating a transfer without authentication returns 403."""
    metadata = json.dumps({
        "recipient_email": "test@example.com",
        "expiry_hours": 24,
    })

    files = [
        ("files", ("test.txt", io.BytesIO(b"content"), "text/plain")),
    ]

    response = await client.post(
        "/api/transfers/create",
        data={"metadata": metadata},
        files=files,
    )

    assert response.status_code == 403
