"""Safe, application-wide logging configuration."""

import logging


def configure_logging(debug: bool = False) -> None:
    """Configure concise logs without adding secrets or request bodies."""

    logging.basicConfig(
        level=logging.DEBUG if debug else logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
