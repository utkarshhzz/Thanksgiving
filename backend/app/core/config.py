from pydantic_settings import BaseSettings,SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # app info
    APP_NAME:str="ThankGiving API"
    APP_ENV: str="development"
    APP_VERSION: str="1.0.0"
    DEBUG:bool= False
    
    # security
    SECRET_KEY:str
    ALGORITHM:str="HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES:int=30
    REFRESH_TOKEN_EXPIRE_DAYS:int=90
    
    # Database
    DATABASE_URL:str
    DB_POOL_SIZE: int=10
    DB_MAX_OVERFLOW: int=20
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    # Comma-separated emails that are auto-promoted to ADMIN on Google login
    # Example in .env:  GOOGLE_ADMIN_EMAILS=you@gmail.com,partner@gmail.com
    GOOGLE_ADMIN_EMAILS: str = ""

    # Cloudinary image uploads
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Email — Brevo (free 300/day, signup at brevo.com)
    BREVO_API_KEY: str = ""

    # AI — Google Gemini (free tier at aistudio.google.com)
    GEMINI_API_KEY: str = ""

    # Payments — Razorpay (signup at razorpay.com, use test keys)
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # Frontend URL (for CORS)
    FRONTEND_URL: str = "http://localhost:5173"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173"
    ALLOWED_METHODS: str = "*"

    
    model_config= SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )
    
settings=Settings()