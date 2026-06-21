from __future__ import annotations

import asyncio
import functools
import logging
import time

from core.state import save_trace as _persist_trace

logger = logging.getLogger(__name__)


def trace(step_name: str):
    def decorator(func):
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            start = time.monotonic()
            try:
                result = func(*args, **kwargs)
                elapsed = (time.monotonic() - start) * 1000
                logger.info("[TRACE] %s completed in %.1f ms", step_name, elapsed)
                try:
                    _persist_trace(step_name, elapsed)
                except Exception as e:
                    logger.warning("Failed to persist trace: %s", e)
                return result
            except Exception as e:
                elapsed = (time.monotonic() - start) * 1000
                logger.error("[TRACE] %s failed at %.1f ms: %s", step_name, elapsed, e)
                try:
                    _persist_trace(step_name, elapsed, status="error")
                except Exception:
                    pass
                raise

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            start = time.monotonic()
            try:
                result = await func(*args, **kwargs)
                elapsed = (time.monotonic() - start) * 1000
                logger.info("[TRACE] %s completed in %.1f ms", step_name, elapsed)
                try:
                    _persist_trace(step_name, elapsed)
                except Exception as e:
                    logger.warning("Failed to persist trace: %s", e)
                return result
            except Exception as e:
                elapsed = (time.monotonic() - start) * 1000
                logger.error("[TRACE] %s failed at %.1f ms: %s", step_name, elapsed, e)
                try:
                    _persist_trace(step_name, elapsed, status="error")
                except Exception:
                    pass
                raise

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    return decorator
