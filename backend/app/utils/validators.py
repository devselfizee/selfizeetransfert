import os
import re
import unicodedata

from app.core.config import settings


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent path traversal and remove special characters.
    Preserves the file extension and replaces unsafe characters with underscores.
    """
    # Normalize unicode characters
    filename = unicodedata.normalize("NFKD", filename)

    # Strip any directory components (path traversal prevention)
    filename = os.path.basename(filename)

    # Remove null bytes
    filename = filename.replace("\x00", "")

    # Split name and extension
    name, ext = os.path.splitext(filename)

    # Remove any characters that are not alphanumeric, hyphens, underscores, dots, or spaces
    name = re.sub(r"[^\w\s\-.]", "_", name)

    # Collapse multiple underscores/spaces
    name = re.sub(r"[\s_]+", "_", name)

    # Strip leading/trailing underscores and dots
    name = name.strip("_.")

    # Ensure the filename is not empty
    if not name:
        name = "unnamed_file"

    # Limit the filename length (preserving extension)
    max_name_length = 200
    if len(name) > max_name_length:
        name = name[:max_name_length]

    return f"{name}{ext}"


def validate_file_extension(filename: str) -> bool:
    """
    Check if the file extension is allowed.
    Returns True if the extension is allowed, False if it is blocked.
    """
    _, ext = os.path.splitext(filename)
    ext = ext.lower()
    return ext not in settings.BLOCKED_EXTENSIONS


def validate_file_size(size: int) -> bool:
    """
    Check if the file size is within the allowed limit.
    Returns True if the size is acceptable.
    """
    return 0 < size <= settings.MAX_UPLOAD_SIZE
