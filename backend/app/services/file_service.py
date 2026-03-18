import io
import logging
import os
import shutil
import zipfile
from typing import List

import aiofiles
from fastapi import UploadFile

from app.core.config import settings
from app.utils.validators import sanitize_filename, validate_file_extension, validate_file_size

logger = logging.getLogger(__name__)


async def save_upload_file(
    upload_file: UploadFile, transfer_dir: str
) -> tuple[str, str, int]:
    """
    Save an uploaded file to disk with a sanitized filename.
    Returns (sanitized_filename, filepath, file_size).
    """
    safe_name = sanitize_filename(upload_file.filename or "unnamed_file")

    # Ensure unique filename if collision
    filepath = os.path.join(transfer_dir, safe_name)
    counter = 1
    base_name, ext = os.path.splitext(safe_name)
    while os.path.exists(filepath):
        safe_name = f"{base_name}_{counter}{ext}"
        filepath = os.path.join(transfer_dir, safe_name)
        counter += 1

    file_size = 0
    async with aiofiles.open(filepath, "wb") as out_file:
        while True:
            chunk = await upload_file.read(1024 * 1024)  # 1MB chunks
            if not chunk:
                break
            file_size += len(chunk)
            if file_size > settings.MAX_UPLOAD_SIZE:
                # Clean up partial file
                await out_file.close()
                os.remove(filepath)
                raise ValueError(
                    f"File {safe_name} exceeds maximum upload size of {settings.MAX_UPLOAD_SIZE} bytes"
                )
            await out_file.write(chunk)

    logger.info("Saved file %s (%d bytes) to %s", safe_name, file_size, filepath)
    return safe_name, filepath, file_size


def delete_transfer_files(transfer_dir: str) -> None:
    """Remove an entire transfer directory from disk."""
    if os.path.exists(transfer_dir) and os.path.isdir(transfer_dir):
        shutil.rmtree(transfer_dir)
        logger.info("Deleted transfer directory: %s", transfer_dir)
    else:
        logger.warning("Transfer directory not found: %s", transfer_dir)


def validate_file(filename: str, size: int) -> None:
    """
    Validate a file's extension and size.
    Raises ValueError if validation fails.
    """
    if not validate_file_extension(filename):
        raise ValueError(
            f"File extension not allowed for '{filename}'. "
            f"Blocked extensions: {', '.join(settings.BLOCKED_EXTENSIONS)}"
        )
    if not validate_file_size(size):
        raise ValueError(
            f"File '{filename}' size ({size} bytes) exceeds the maximum allowed size "
            f"of {settings.MAX_UPLOAD_SIZE} bytes"
        )


async def create_zip(filepaths: List[dict], transfer_token: str) -> io.BytesIO:
    """
    Create a ZIP archive from a list of file records.
    Each item in filepaths should have 'filepath' and 'filename' keys.
    Returns a BytesIO buffer containing the ZIP data.
    """
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_info in filepaths:
            filepath = file_info["filepath"]
            filename = file_info["filename"]
            if os.path.exists(filepath):
                zf.write(filepath, arcname=filename)
            else:
                logger.warning("File not found during ZIP creation: %s", filepath)

    zip_buffer.seek(0)
    logger.info(
        "Created ZIP archive for transfer %s (%d bytes)",
        transfer_token,
        zip_buffer.getbuffer().nbytes,
    )
    return zip_buffer
