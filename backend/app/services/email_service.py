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
        <div style="background-color: #f5f0ff; border-left: 4px solid #6C3FC5; padding: 16px; margin: 24px 0; border-radius: 4px;">
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
                            <td style="background: linear-gradient(135deg, #6C3FC5 0%, #8B5CF6 100%); padding: 32px 40px; text-align: center;">
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
                                    <strong style="color: #6C3FC5;">{sender_name}</strong> vous a envoyé des fichiers via Selfizee Transfer.
                                </p>
                                {message_block}
                                <div style="text-align: center; margin: 32px 0;">
                                    <a href="{download_url}" style="display: inline-block; background: linear-gradient(135deg, #6C3FC5 0%, #8B5CF6 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: 600; letter-spacing: 0.3px;">
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
                            <td style="background-color: #f9f7fc; padding: 24px 40px; text-align: center; border-top: 1px solid #ede8f5;">
                                <p style="margin: 0; color: #999; font-size: 12px;">
                                    Propulsé par <strong style="color: #6C3FC5;">Selfizee Transfer</strong><br>
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
        msg["From"] = settings.SMTP_FROM
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

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            start_tls=True if settings.SMTP_PORT == 587 else False,
        )

        logger.info("Transfer email sent to %s", recipient_email)

    except Exception as exc:
        logger.error(
            "Failed to send transfer email to %s: %s",
            recipient_email,
            str(exc),
        )
