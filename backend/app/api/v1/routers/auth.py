# HTTP endpoints for authentication
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_current_active_user
from app.core.security import create_access_token, create_refresh_token, decode_access_token
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, RefreshTokenRequest, GoogleAuthRequest
from app.schemas.user import UserCreate, UserRead
from app.services.auth_service import register_user, authenticate_user, get_or_create_google_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register",
response_model=TokenResponse,
status_code=status.HTTP_201_CREATED,
summary="register a new user account"
)
async def register(
    user_data:UserCreate,
    db:AsyncSession=Depends(get_db)
):
    # register a new user and return jwt tokens
    try:
        user= await register_user(db,user_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )

    # str(user.id) converts UUID to string for the JWT payload
    access_token=create_access_token(subject=str(user.id))
    refresh_token=create_refresh_token(subject=str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email and password"
)
async def login(
    login_data:LoginRequest,
    db:AsyncSession=Depends(get_db),
):
    """
    Authentiate with email password,return JWT tokens
    """
    user= await authenticate_user(db,login_data.email,login_data.password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="incorrect email or pasword",
            headers={"WWWW-Authenticate":"Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    access_token=create_access_token(subject=str(user.id))
    refresh_token=create_refresh_token(subject=str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Get a new access token using a refresh token"
)
async def refresh_token(
    token_data:RefreshTokenRequest,
    db:AsyncSession=Depends(get_db),
):
    """
    Exchnage a valid refresh token for a new acces token
    """
    from app.core.security import decode_access_token
    from jose import jwt, JWTError
    from app.core.config import settings
    from uuid import UUID
    try:
        payload = jwt.decode(
            token_data.refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id_str = payload.get("sub")
        token_type = payload.get("type")
        if user_id_str is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    user = await db.get(User, UUID(user_id_str))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    new_access_token = create_access_token(subject=str(user.id))
    new_refresh_token = create_refresh_token(subject=str(user.id))
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
    )

# ─── Google OAuth ──────────────────────────────────────────────────────────────
@router.post(
    "/google",
    response_model=TokenResponse,
    summary="Sign in or register with Google",
)
async def google_auth(
    body: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Accepts a Google OAuth access_token (from the implicit flow / useGoogleLogin hook).
    Verifies it by calling Google's userinfo endpoint, then finds or creates the user.
    """
    # Verify with Google's userinfo endpoint (works with access_token from implicit flow)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {body.credential}"},
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credential — could not verify with Google.",
        )

    google_data = resp.json()

    # Extract user info from Google's userinfo response
    google_id  = google_data.get("sub")
    email      = google_data.get("email")
    first_name = google_data.get("given_name", "")
    last_name  = google_data.get("family_name", "")

    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token missing required fields (sub, email).",
        )

    user = await get_or_create_google_user(db, google_id, email, first_name, last_name)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated.")

    access_token  = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


# ─── User profile route ────────────────────────────────────────────────────────
@router.get(
    "/me",
    response_model=UserRead,
    summary="Get current authenticated user profile",
)
async def get_me(
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns the profile of the currently authenticated user.
    No DB query needed — get_current_active_user already fetched the user.
    """
    return current_user