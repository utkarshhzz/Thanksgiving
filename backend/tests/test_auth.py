# tests for registration,login,token refresh ,potected routes

import pytest
from httpx import AsyncClient

class TestRegister:
    async def test_register_success(self,client:AsyncClient):
        response= await client.post("/api/v1/auth/register", json={
            "email": "newuser@example.com",
            "password": "strongpassword123",
            "first_name": "Jane",
            "last_name": "Doe",
        })

        assert response.status_code==201
        data=response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"]=="bearer"

        assert len(data["access_token"])>10
        assert len(data["refresh_token"])>10

    async def test_register_duplicate_email(self,client:AsyncClient,test_user):
        response= await client.post("/api/v1/auth/register", json={
            "email": "testuser@example.com",  # already created by test_user fixture
            "password": "anotherpassword123",
        })
        assert response.status_code == 409
        assert "already registered" in response.json()["error"]["message"].lower()

    async def test_register_weak_password(self,client:AsyncClient):
        # password shorter than 8 char is rejected
        response= await client.post("/api/v1/auth/register",json={
            "email": "weakpass@example.com",
            "password": "short",   # less than 8 chars
        })
        assert response.status_code == 422 
        
    async def test_register_invalid_email(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/register", json={
            "email": "notanemail",
            "password": "validpassword123",
        })
        assert response.status_code == 422

class TestLogin:
    async def test_login_success(self,client:AsyncClient,test_user):
        response=await client.post("/api/v1/auth/login", json={
            "email": "testuser@example.com",
            "password": "testpassword123",
        })

        assert response.status_code==200
        assert "access_token" in response.json()

    async def test_login_wrong_password(self,client:AsyncClient,test_user):
        response=await client.post("/api/v1/auth/login", json={
            "email": "testuser@example.com",
            "password": "wrongpassword",
        })
        assert response.status_code == 401

    async def test_login_nonexistent_email(self,client:AsyncClient):
        response=await client.post("/api/v1/auth/login", json={
            "email": "nonexistentuser@example.com",
            "password": "somepassword",
        })
        assert response.status_code == 401

    async def test_login_wrong_and_right_same_message(self, client: AsyncClient, test_user):
        """
        Wrong email and wrong password return IDENTICAL error messages.
        This is a security test — we must not reveal which field is wrong.
        An attacker should not be able to enumerate valid emails.
        """
        wrong_email_response = await client.post("/api/v1/auth/login", json={
            "email": "doesnotexist@example.com",
            "password": "testpassword123",
        })
        wrong_pass_response = await client.post("/api/v1/auth/login", json={
            "email": "testuser@example.com",
            "password": "wrongpassword",
        })
        assert wrong_email_response.json()["error"]["message"] == wrong_pass_response.json()["error"]["message"]


class TestProtectedRoutes:
    async def test_get_me_authenticated(self, client: AsyncClient, user_token: str):
        """Authenticated user can access /auth/me."""
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "testuser@example.com"
        assert "password_hash" not in data   # Security: password never returned
    async def test_get_me_unauthenticated(self, client: AsyncClient):
        """Request without token gets 401."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401
    async def test_get_me_invalid_token(self, client: AsyncClient):
        """Request with garbage token gets 401."""
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer this.is.not.a.valid.token"},
        )
        assert response.status_code == 401