# Pydantic schemas for authentication login requests and token responses

from pydantic import BaseModel,EmailStr

class LoginRequest(BaseModel):
    email:EmailStr
    password: str
    
class TokenResponse(BaseModel):
    access_token:str
    refresh_token:str
    token_type: str="bearer"
    
class RefreshTokenRequest(BaseModel):  #Client send s to POST /auth/refresh
    refresh_token:str