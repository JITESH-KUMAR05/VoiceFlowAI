"""Logging setup.

Replaces the print statements scattered through the services. Model and speech
latency in particular need to be greppable: they are the numbers that justify
the streaming design, so they should be readable out of a log rather than only
visible on a terminal someone happened to be watching.
"""

from __future__ import annotations

import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)-8s %(name)-28s %(message)s",
            datefmt="%H:%M:%S",
        )
    )

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())

    # These log every HTTP request they make, at volume, during a call.
    for noisy in ("httpx", "urllib3", "simple_salesforce"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
