import asyncio
import functools
import time
import logging

logger = logging.getLogger(__name__)


def trace(step_name: str):
    def decorator(func):
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            start = time.monotonic()
            try:
                result = func(*args, **kwargs)
                elapsed = (time.monotonic() - start) * 1000
                logger.info("[STUB TRACE] %s completed in %.1f ms", step_name, elapsed)
                return result
            except Exception as e:
                elapsed = (time.monotonic() - start) * 1000
                logger.error("[STUB TRACE] %s failed at %.1f ms: %s", step_name, elapsed, e)
                raise

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            start = time.monotonic()
            try:
                result = await func(*args, **kwargs)
                elapsed = (time.monotonic() - start) * 1000
                logger.info("[STUB TRACE] %s completed in %.1f ms", step_name, elapsed)
                return result
            except Exception as e:
                elapsed = (time.monotonic() - start) * 1000
                logger.error("[STUB TRACE] %s failed at %.1f ms: %s", step_name, elapsed, e)
                raise

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    return decorator
