"""
upload_service.py
=================
Handles uploading images to Cloudinary and returning the secure URL.

WHY Cloudinary instead of storing on the server?
- Render free tier has NO persistent storage — files disappear on redeploy
- Cloudinary is free up to 25GB and has a worldwide CDN
- They auto-optimize: compress, convert to WebP, resize
"""
import cloudinary
import cloudinary.uploader
from fastapi import UploadFile, HTTPException
from app.core.config import settings

# Configure once when this module is imported
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

MAX_FILE_SIZE = 5 * 1024 * 1024   # 5MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


async def upload_image(
    file: UploadFile,
    folder: str = "general",
    public_id: str | None = None,
) -> str:
    """
    Upload an image to Cloudinary, return the secure URL.

    Parameters:
        file      - the uploaded file from FastAPI
        folder    - Cloudinary folder ("campaigns", "avatars", etc.)
        public_id - optional filename in Cloudinary (we use the DB record UUID)

    Returns: https URL to the image

    Raises:
        400 if wrong file type or too large
        500 if Cloudinary upload fails
    """
    # 1. Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: JPEG, PNG, WebP, GIF"
        )

    # 2. Read bytes into memory
    contents = await file.read()

    # 3. Validate size
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max 5MB, got {len(contents) // 1024}KB"
        )

    # 4. Upload to Cloudinary
    try:
        result = cloudinary.uploader.upload(
            contents,
            folder=f"thanksgiving/{folder}",
            public_id=public_id,
            overwrite=True,
            resource_type="image",
            transformation=[
                {"quality": "auto"},           # auto-compress
                {"fetch_format": "auto"},      # convert to WebP if supported
                {"width": 1200, "crop": "limit"},  # max 1200px wide
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    return result["secure_url"]
