from __future__ import annotations

import asyncio
import json
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any, Optional
from dotenv import load_dotenv

load_dotenv()
import google.generativeai as genai

GEMINI_MODEL = os.environ.get("TASKPILOT_GEMINI_MODEL", "gemini-2.0-flash-lite")
API_KEY_ENV_VAR = "GEMINI_API_KEY"

MAX_RETRIES = 3
BASE_BACKOFF_SECONDS = 1.5
REQUEST_TIMEOUT_SECONDS = 30


class LLMClientError(Exception):
    pass


@dataclass
class LLMResponse:
    text: str
    input_tokens: int
    output_tokens: int
    latency_ms: float
    model: str
    parsed_json: Optional[Any] = field(default=None)
    json_parse_error: Optional[str] = field(default=None)


_configured = False


def _ensure_configured() -> None:
    global _configured
    if _configured:
        return
    api_key = os.environ.get(API_KEY_ENV_VAR)
    if not api_key:
        raise LLMClientError(
            f"{API_KEY_ENV_VAR} is not set. Export it before calling call_llm(), "
            f"e.g. `export {API_KEY_ENV_VAR}=your_key_here`."
        )
    genai.configure(api_key=api_key)
    _configured = True


def _extract_json(text: str) -> tuple[Optional[Any], Optional[str]]:
    text = text.strip()
    try:
        return json.loads(text), None
    except json.JSONDecodeError:
        pass
    fence_match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if fence_match:
        candidate = fence_match.group(1).strip()
        try:
            return json.loads(candidate), None
        except json.JSONDecodeError:
            pass
    for open_char, close_char in (("[", "]"), ("{", "}")):
        start = text.find(open_char)
        end = text.rfind(close_char)
        if start != -1 and end != -1 and end > start:
            candidate = text[start:end + 1]
            try:
                return json.loads(candidate), None
            except json.JSONDecodeError:
                continue
    return None, f"Could not extract valid JSON from response (length={len(text)} chars)"


async def call_llm(
    prompt: str,
    system: Optional[str] = None,
    json_mode: bool = False,
    temperature: float = 0.2,
    max_output_tokens: int = 2048,
) -> LLMResponse:
    _ensure_configured()
    generation_config: dict[str, Any] = {
        "temperature": temperature,
        "max_output_tokens": max_output_tokens,
    }
    if json_mode:
        generation_config["response_mime_type"] = "application/json"

    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=system,
        generation_config=generation_config,
    )

    last_error: Optional[Exception] = None
    for attempt in range(1, MAX_RETRIES + 1):
        start = time.monotonic()
        try:
            response = await asyncio.wait_for(
                model.generate_content_async(prompt),
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            latency_ms = (time.monotonic() - start) * 1000
            text = response.text or ""
            usage = getattr(response, "usage_metadata", None)
            input_tokens = getattr(usage, "prompt_token_count", 0) if usage else 0
            output_tokens = getattr(usage, "candidates_token_count", 0) if usage else 0
            parsed_json = None
            json_parse_error = None
            if json_mode:
                parsed_json, json_parse_error = _extract_json(text)
            return LLMResponse(
                text=text,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                model=GEMINI_MODEL,
                parsed_json=parsed_json,
                json_parse_error=json_parse_error,
            )
        except asyncio.TimeoutError as e:
            last_error = e
        except Exception as e:
            last_error = e
        if attempt < MAX_RETRIES:
            backoff = BASE_BACKOFF_SECONDS * (2 ** (attempt - 1))
            await asyncio.sleep(backoff)

    raise LLMClientError(
        f"call_llm failed after {MAX_RETRIES} attempts. Last error: {last_error}"
    )
