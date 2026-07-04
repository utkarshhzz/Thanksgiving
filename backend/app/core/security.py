# Password ahshing and jwt management

from datetime import datetime,timedelta,timezone
from typing import Optional
from jose import JWTError,jwt
from passlib.context import CryptContext
from app.core.config import settings

# cryptcontext manages password hashing schemes
# schemes[bcrypt] this is our password hasing scheme

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
    bcrypt__truncate_error=False,
)

def hash_password(plain_password:str) -> str:
    return pwd_context.hash(plain_password)

def verify_password(plain_password:str,hashed_password:str)-> bool:
    return pwd_context.verify(plain_password,hashed_password)

# JWT token functiioms

def create_access_token(subject:str,
                        expires_delta:Optional[timedelta]=None,)-> str:
    # create a short lived jwt access token
    # called after successful login/registration
    # client storesthis and sends in Authorisation header on every requesst
    
    # for input we ask subjcect ie users id
    if expires_delta is None:
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    expire=datetime.now(timezone.utc) + expires_delta
    payload= {
        "sub": subject,
        "exp": expire,
        "type": "access",
    }
    # jwt.encode signs the payload with our Secret key using the HS256 algorithm
    
    token=jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return token

def create_refresh_token(
    subject:str,
    expires_delta:Optional[timedelta]=None,
) -> str:
    # create a long lived JWT refresh token
    
    if expires_delta is None:
        expires_delta= timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    expire=datetime.now(timezone.utc)+ expires_delta
    payload = {
        "sub": subject,
        "exp": expire,
        "type": "refresh",       # Different from access token
    }
    token=jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return token


def decode_access_token(token: str) -> Optional[str]:
    """
    Decode and validate a JWT access token.
    This is called on every protected API request to identify who is asking.
    Returns:
        The user ID (the "sub" claim) if the token is valid.
        None if the token is expired, tampered with, or invalid.
    Why return None instead of raising an exception here?
    Because the caller (our dependency in deps.py) decides what HTTP error
    to raise. This function just says "valid or not".
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        # Extract the subject (user ID)
        user_id: Optional[str] = payload.get("sub")
        # Ensure this is an access token, not a refresh token
        token_type: Optional[str] = payload.get("type")
        if user_id is None or token_type != "access":
            return None
        return user_id
    except JWTError:
        # JWTError covers: expired tokens, invalid signatures, malformed tokens
        # We catch all of them and return None — the caller handles the error
        return None
            
        
        
        