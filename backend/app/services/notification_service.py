"""Future notification delivery interface."""

import logging

logger = logging.getLogger(__name__)


async def send_notification(recipient: str, title: str, message: str) -> bool:
    """Development placeholder for push/SMS/email notification delivery."""

    logger.info("Development notification queued for recipient")
    return True
