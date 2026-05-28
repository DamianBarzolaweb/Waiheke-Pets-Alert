"""Store alert photos: Cloudinary when configured, else local disk served at /uploads/."""

from __future__ import annotations

import mimetypes
import os
import uuid
from typing import IO

from werkzeug.utils import secure_filename

ALLOWED_MIME = frozenset(
    {"image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"}
)
MAX_PHOTO_BYTES = int(os.getenv("WPA_MAX_PHOTO_BYTES", str(8 * 1024 * 1024)))

UPLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "uploaded_photos")
)


def _cloudinary_configured() -> bool:
    return bool(
        (os.getenv("CLOUDINARY_CLOUD_NAME") or "").strip()
        and (os.getenv("CLOUDINARY_API_KEY") or "").strip()
        and (os.getenv("CLOUDINARY_API_SECRET") or "").strip()
    )


def _ext_for_mime(mime: str) -> str:
    ext = mimetypes.guess_extension(mime.split(";")[0].strip()) or ".jpg"
    if ext == ".jpe":
        ext = ".jpg"
    return ext


def validate_photo_file(storage) -> str | None:
    """Return error message or None if acceptable."""
    if not storage or not getattr(storage, "filename", None):
        return "Photo file is required."
    if not (storage.filename or "").strip():
        return "Photo file is required."
    mime = (getattr(storage, "mimetype", None) or "").lower()
    if mime and mime not in ALLOWED_MIME:
        return "Photo must be JPEG, PNG, WebP, or GIF."
    storage.stream.seek(0, os.SEEK_END)
    size = storage.stream.tell()
    storage.stream.seek(0)
    if size > MAX_PHOTO_BYTES:
        return f"Photo must be under {MAX_PHOTO_BYTES // (1024 * 1024)} MB."
    return None


def store_alert_photo(storage, *, public_base_url: str, alt_hint: str) -> tuple[str, str, str | None]:
    """
    Persist uploaded photo. Returns (image_url, image_alt, error_message).
    """
    err = validate_photo_file(storage)
    if err:
        return "", "", err

    mime = (storage.mimetype or "image/jpeg").split(";")[0].strip().lower()
    if mime not in ALLOWED_MIME:
        mime = "image/jpeg"

    if _cloudinary_configured():
        try:
            import cloudinary
            import cloudinary.uploader

            cloudinary.config(
                cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
                api_key=os.getenv("CLOUDINARY_API_KEY"),
                api_secret=os.getenv("CLOUDINARY_API_SECRET"),
                secure=True,
            )
            folder = (os.getenv("CLOUDINARY_FOLDER") or "wpa-alerts").strip()
            result = cloudinary.uploader.upload(
                storage,
                folder=folder,
                resource_type="image",
                overwrite=True,
            )
            url = (result.get("secure_url") or result.get("url") or "").strip()
            if not url:
                return "", "", "Cloudinary upload failed."
            alt = alt_hint or "Pet alert photo"
            return url, alt, None
        except Exception as e:
            print(f"Cloudinary upload error: {e}")
            return "", "", "Could not upload photo to storage."

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = _ext_for_mime(mime)
    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, name)
    storage.save(path)
    base = (public_base_url or "").rstrip("/")
    url = f"{base}/uploads/{name}"
    return url, alt_hint or "Pet alert photo", None


def local_upload_path(filename: str) -> str | None:
    """Safe path for serving a locally stored upload."""
    safe = secure_filename(filename)
    if not safe or safe != filename:
        return None
    path = os.path.join(UPLOAD_DIR, safe)
    if not os.path.isfile(path):
        return None
    return path
