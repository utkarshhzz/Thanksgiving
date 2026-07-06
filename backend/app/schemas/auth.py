# Pydantic schemas for authentication login requests and token responses

from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class GoogleAuthRequest(BaseModel):
    """Frontend sends the Google credential (ID token) after user approves Google popup."""
    credential: str  # Google ID token (JWT signed by Google)