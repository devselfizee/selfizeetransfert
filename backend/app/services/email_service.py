import logging
from datetime import datetime

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)

MONTHS_FR = [
    "", "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]


def _format_date_fr(dt: datetime) -> str:
    return f"{dt.day} {MONTHS_FR[dt.month]} {dt.year} à {dt.strftime('%H:%M')} UTC"


def _build_transfer_email_html(
    sender_name: str,
    message: str | None,
    download_url: str,
    expires_at: datetime,
) -> str:
    """Build an HTML email body with Selfizee branding."""
    expiry_str = _format_date_fr(expires_at)
    message_block = ""
    if message:
        message_block = f"""
        <div style="background-color: #eef8ff; border-left: 4px solid #0693e3; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #333; font-style: italic;">&laquo; {message} &raquo;</p>
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #0693e3 0%, #9b51e0 100%); padding: 32px 40px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Selfizee Transfer</h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 16px 0; color: #1a1a2e; font-size: 22px; font-weight: 600;">
                                    Vous avez reçu des fichiers !
                                </h2>
                                <p style="margin: 0 0 8px 0; color: #555; font-size: 16px; line-height: 1.6;">
                                    <strong style="color: #0693e3;">{sender_name}</strong> vous a envoyé des fichiers via Selfizee Transfer.
                                </p>
                                {message_block}
                                <div style="text-align: center; margin: 32px 0;">
                                    <a href="{download_url}" style="display: inline-block; background: linear-gradient(135deg, #0693e3 0%, #9b51e0 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: 600; letter-spacing: 0.3px;">
                                        Télécharger les fichiers
                                    </a>
                                </div>
                                <p style="margin: 24px 0 0 0; color: #888; font-size: 14px; text-align: center;">
                                    Ce lien expire le <strong>{expiry_str}</strong>
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f0f8ff; padding: 24px 40px; text-align: center; border-top: 1px solid #d9f0ff;">
                                <p style="margin: 0; color: #999; font-size: 12px;">
                                    Propulsé par <strong style="color: #0693e3;">Selfizee Transfer</strong><br>
                                    Le partage de fichiers sécurisé, simplifié.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


async def send_transfer_email(
    recipient_email: str,
    sender_name: str,
    message: str | None,
    download_url: str,
    expires_at: datetime,
) -> None:
    """
    Send a transfer notification email to the recipient.
    Fails gracefully -- logs the error but does not raise.
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"Selfizee Transfer <{settings.SMTP_FROM}>"
        msg["Reply-To"] = "noreply@konitys.fr"
        msg["To"] = recipient_email
        msg["Subject"] = f"{sender_name} vous a envoyé des fichiers via Selfizee Transfer"

        # Plain text fallback
        expiry_str = _format_date_fr(expires_at)
        plain_text = (
            f"{sender_name} vous a envoyé des fichiers via Selfizee Transfer.\n\n"
            f"Téléchargez-les ici : {download_url}\n\n"
        )
        if message:
            plain_text += f'Message : « {message} »\n\n'
        plain_text += f"Ce lien expire le {expiry_str}."

        html_body = _build_transfer_email_html(
            sender_name=sender_name,
            message=message,
            download_url=download_url,
            expires_at=expires_at,
        )

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        if not settings.SMTP_HOST:
            logger.warning("SMTP_HOST not configured, skipping email to %s", recipient_email)
            return

        smtp_kwargs = {
            "hostname": settings.SMTP_HOST,
            "port": settings.SMTP_PORT,
            "username": settings.SMTP_USER or None,
            "password": settings.SMTP_PASSWORD or None,
            "timeout": 15,
        }
        if settings.SMTP_PORT == 465:
            smtp_kwargs["use_tls"] = True
        elif settings.SMTP_PORT == 587:
            smtp_kwargs["start_tls"] = True

        await aiosmtplib.send(msg, **smtp_kwargs)

        logger.info("Transfer email sent to %s", recipient_email)

    except Exception as exc:
        logger.error(
            "Failed to send transfer email to %s: %s",
            recipient_email,
            str(exc),
        )


def _build_first_download_email_html(
    recipient_email: str,
    download_url: str,
    expires_at: datetime,
    file_count: int,
    total_size_str: str,
    files_html: str,
) -> str:
    """Build an HTML email notifying the sender that their transfer was downloaded."""
    expiry_str = _format_date_fr(expires_at)

    return f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #0693e3 0%, #9b51e0 100%); padding: 32px 40px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Selfizee Transfer</h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 16px 0; color: #1a1a2e; font-size: 22px; font-weight: 600;">
                                    Vos fichiers ont été téléchargés
                                </h2>
                                <p style="margin: 0 0 16px 0; color: #555; font-size: 16px; line-height: 1.6;">
                                    {file_count} élément{"s" if file_count > 1 else ""}, {total_size_str} au total &bull; Expire le {expiry_str}
                                </p>
                                <div style="background-color: #eef8ff; border-left: 4px solid #0693e3; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                    <p style="margin: 0; color: #333; font-size: 14px;">
                                        Nous vous informons la première fois que votre transfert est téléchargé (nous ne vous enverrons pas d'email à chaque fois).
                                        Vous pouvez voir si ce transfert est téléchargé à nouveau dans votre compte.
                                    </p>
                                </div>
                                <div style="text-align: center; margin: 32px 0;">
                                    <a href="{settings.BASE_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #0693e3 0%, #9b51e0 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: 600; letter-spacing: 0.3px;">
                                        Vérifiez vos transferts
                                    </a>
                                </div>
                                <div style="margin: 24px 0; padding: 16px; background-color: #f9f9fb; border-radius: 8px;">
                                    <p style="margin: 0 0 8px 0; color: #888; font-size: 12px; font-weight: 600; text-transform: uppercase;">Lien de téléchargement</p>
                                    <p style="margin: 0 0 16px 0;"><a href="{download_url}" style="color: #0693e3; font-size: 14px; word-break: break-all;">{download_url}</a></p>
                                    <p style="margin: 0 0 8px 0; color: #888; font-size: 12px; font-weight: 600; text-transform: uppercase;">{file_count} élément{"s" if file_count > 1 else ""}</p>
                                    {files_html}
                                </div>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f0f8ff; padding: 24px 40px; text-align: center; border-top: 1px solid #d9f0ff;">
                                <p style="margin: 0; color: #999; font-size: 12px;">
                                    Propulsé par <strong style="color: #0693e3;">Selfizee Transfer</strong><br>
                                    Le partage de fichiers sécurisé, simplifié.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def _format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format."""
    if size_bytes < 1024:
        return f"{size_bytes} o"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} Ko"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} Mo"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} Go"


async def send_first_download_email(
    sender_email: str,
    recipient_email: str,
    download_url: str,
    expires_at: datetime,
    files: list,
    total_size: int,
) -> None:
    """
    Send an email to the transfer creator when their files are downloaded for the first time.
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"Selfizee Transfer <{settings.SMTP_FROM}>"
        msg["Reply-To"] = "noreply@konitys.fr"
        msg["To"] = sender_email
        msg["Subject"] = "Vos fichiers ont été téléchargés - Selfizee Transfer"

        file_count = len(files)
        total_size_str = _format_file_size(total_size)

        files_html = ""
        for f in files:
            size_str = _format_file_size(f.size) if hasattr(f, 'size') else ""
            files_html += f'<p style="margin: 4px 0; color: #555; font-size: 14px;">{f.filename} <span style="color: #999;">{size_str}</span></p>'

        plain_text = (
            f"Vos fichiers ont été téléchargés\n\n"
            f"{file_count} élément{'s' if file_count > 1 else ''}, {total_size_str} au total\n\n"
            f"Nous vous informons la première fois que votre transfert est téléchargé.\n\n"
            f"Lien : {download_url}\n"
        )

        html_body = _build_first_download_email_html(
            recipient_email=recipient_email,
            download_url=download_url,
            expires_at=expires_at,
            file_count=file_count,
            total_size_str=total_size_str,
            files_html=files_html,
        )

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        if not settings.SMTP_HOST:
            logger.warning("SMTP_HOST not configured, skipping first download email to %s", sender_email)
            return

        smtp_kwargs = {
            "hostname": settings.SMTP_HOST,
            "port": settings.SMTP_PORT,
            "username": settings.SMTP_USER or None,
            "password": settings.SMTP_PASSWORD or None,
            "timeout": 15,
        }
        if settings.SMTP_PORT == 465:
            smtp_kwargs["use_tls"] = True
        elif settings.SMTP_PORT == 587:
            smtp_kwargs["start_tls"] = True

        await aiosmtplib.send(msg, **smtp_kwargs)

        logger.info("First download notification email sent to %s", sender_email)

    except Exception as exc:
        logger.error(
            "Failed to send first download notification email to %s: %s",
            sender_email,
            str(exc),
        )


def _build_expiry_notification_html(
    sender_name: str,
    download_url: str,
    expires_at: datetime,
    is_sender: bool,
    transfer_recipient_email: str | None,
) -> str:
    """Build an HTML email for expiry warning notification."""
    expiry_str = _format_date_fr(expires_at)

    if is_sender:
        title = "Votre transfert expire bientôt"
        intro = f"Votre transfert envoyé à <strong style=\"color: #0693e3;\">{transfer_recipient_email}</strong> n'a pas encore été téléchargé et expire le <strong>{expiry_str}</strong>."
        cta_text = "Voir le transfert"
    else:
        title = "Un transfert va bientôt expirer"
        intro = f"<strong style=\"color: #0693e3;\">{sender_name}</strong> vous a envoyé des fichiers que vous n'avez pas encore téléchargés. Ce lien expire le <strong>{expiry_str}</strong>."
        cta_text = "Télécharger les fichiers"

    return f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #e67e22 0%, #f39c12 100%); padding: 32px 40px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Selfizee Transfer</h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 16px 0; color: #1a1a2e; font-size: 22px; font-weight: 600;">
                                    {title}
                                </h2>
                                <p style="margin: 0 0 8px 0; color: #555; font-size: 16px; line-height: 1.6;">
                                    {intro}
                                </p>
                                <div style="background-color: #fef3e2; border-left: 4px solid #e67e22; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                    <p style="margin: 0; color: #333; font-size: 14px;">
                                        Aucun téléchargement n'a été effectué pour le moment.
                                    </p>
                                </div>
                                <div style="text-align: center; margin: 32px 0;">
                                    <a href="{download_url}" style="display: inline-block; background: linear-gradient(135deg, #e67e22 0%, #f39c12 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: 600; letter-spacing: 0.3px;">
                                        {cta_text}
                                    </a>
                                </div>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #fdf8f3; padding: 24px 40px; text-align: center; border-top: 1px solid #f5e6d3;">
                                <p style="margin: 0; color: #999; font-size: 12px;">
                                    Propulsé par <strong style="color: #0693e3;">Selfizee Transfer</strong><br>
                                    Le partage de fichiers sécurisé, simplifié.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


async def send_expiry_notification_email(
    recipient_email: str,
    recipient_name: str | None,
    sender_name: str,
    download_url: str,
    expires_at: datetime,
    is_sender: bool,
    transfer_recipient_email: str | None,
) -> None:
    """
    Send an expiry warning email to the transfer creator or recipient.
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"Selfizee Transfer <{settings.SMTP_FROM}>"
        msg["Reply-To"] = "noreply@konitys.fr"
        msg["To"] = recipient_email

        if is_sender:
            msg["Subject"] = "Votre transfert Selfizee expire bientôt sans téléchargement"
        else:
            msg["Subject"] = f"{sender_name} vous a envoyé des fichiers - expiration imminente"

        expiry_str = _format_date_fr(expires_at)

        if is_sender:
            plain_text = (
                f"Votre transfert envoyé à {transfer_recipient_email} n'a pas encore été téléchargé.\n\n"
                f"Il expire le {expiry_str}.\n\n"
                f"Lien : {download_url}\n"
            )
        else:
            plain_text = (
                f"{sender_name} vous a envoyé des fichiers que vous n'avez pas encore téléchargés.\n\n"
                f"Ce lien expire le {expiry_str}.\n\n"
                f"Téléchargez-les ici : {download_url}\n"
            )

        html_body = _build_expiry_notification_html(
            sender_name=sender_name,
            download_url=download_url,
            expires_at=expires_at,
            is_sender=is_sender,
            transfer_recipient_email=transfer_recipient_email,
        )

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        if not settings.SMTP_HOST:
            logger.warning("SMTP_HOST not configured, skipping expiry email to %s", recipient_email)
            return

        smtp_kwargs = {
            "hostname": settings.SMTP_HOST,
            "port": settings.SMTP_PORT,
            "username": settings.SMTP_USER or None,
            "password": settings.SMTP_PASSWORD or None,
            "timeout": 15,
        }
        if settings.SMTP_PORT == 465:
            smtp_kwargs["use_tls"] = True
        elif settings.SMTP_PORT == 587:
            smtp_kwargs["start_tls"] = True

        await aiosmtplib.send(msg, **smtp_kwargs)

        logger.info("Expiry notification email sent to %s", recipient_email)

    except Exception as exc:
        logger.error(
            "Failed to send expiry notification email to %s: %s",
            recipient_email,
            str(exc),
        )
