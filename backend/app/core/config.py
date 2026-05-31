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
    
    # CORS
    ALLOWED_ORIGINS:str="*"
    ALLOWED_METHODS:str="*"
    
    model_config= SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )
    
settings=Settings()