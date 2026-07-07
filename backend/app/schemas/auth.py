# Pydantic schemas for authentication login requests and token responses
from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    # Include basic user info so frontend doesn't need a second API call after login
    user: Optional[dict] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class GoogleAuthRequest(BaseModel):
    """Frontend sends the Google access_token from the useGoogleLogin hook."""
    credential: str