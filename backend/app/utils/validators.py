import os
import re
import unicodedata

from app.core.config import settings

# Simple RFC-5322-lite regex; good enough for UI input sanity check
_EMAIL_RE = re.compile(r"^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$", re.IGNORECASE)

MAX_EMAILS_PER_FIELD = 20


def parse_email_list(raw: str | None) -> list[str]:
    """
    Split a comma/semicolon-separated string into a deduplicated list of valid
    lowercase emails. Raises ValueError on any invalid address or if the list
    exceeds MAX_EMAILS_PER_FIELD.
    """
    if not raw:
        return []
    parts = [p.strip().lower() for p in re.split(r"[,;]", raw) if p.strip()]
    if len(parts) > MAX_EMAILS_PER_FIELD:
        raise ValueError(f"Too many recipients (max {MAX_EMAILS_PER_FIELD})")
    seen: set[str] = set()
    out: list[str] = []
    for p in parts:
        if not _EMAIL_RE.match(p):
            raise ValueError(f"Invalid email address: {p}")
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


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
