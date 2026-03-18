import pytest
from httpx import AsyncClient

from app.models.user import User


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user: User):
    """Test successful login returns a valid JWT token."""
    response = await client.post(
        "/api/auth/login",
        json={
            "email": "test@selfizee.local",
            "password": "testpassword123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 0


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user: User):
    """Test login with wrong password returns 401."""
    response = await client.post(
        "/api/auth/login",
        json={
            "email": "test@selfizee.local",
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Test login with non-existent email returns 401."""
    response = await client.post(
        "/api/auth/login",
        json={
            "email": "nobody@selfizee.local",
            "password": "testpassword123",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


@pytest.mark.asyncio
async def test_get_me_authenticated(auth_client: AsyncClient, test_user: User):
    """Test /me endpoint returns current user info."""
    response = await auth_client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@selfizee.local"
    assert data["full_name"] == "Test User"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    """Test /me endpoint without token returns 403."""
    response = await client.get("/api/auth/me")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_login_invalid_email_format(client: AsyncClient):
    """Test login with invalid email format returns 422."""
    response = await client.post(
        "/api/auth/login",
        json={
            "email": "not-an-email",
            "password": "testpassword123",
        },
    )
    assert response.status_code == 422
