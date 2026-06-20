"""
core/llm_client.py
Owner: Aditi(LLM & intelligence layer)

Async wrapper around the chosen LLM API (Gemini Flash 3.5).
This is the ONLY file in the codebase that should ever import a provider SDK
(google.generativeai, anthropic, etc). Every other file -- including P3's
agent.py -- calls call_llm() and never touches the provider directly.
That means swapping providers later is a one-file change.(deciding to change the llm model is a one-file change)

Responsibilities:
  - async call_llm(prompt, system=None, json_mode=False) -> LLMResponse -> this is the core entry point for the llm.
  - automatic retries with exponential backoff on transient failures -> this is to handle transient failures and ensure the llm is able to handle the request.
  - token counting (input/output) for tracer.py (P5) to log -> this is to log the input and output tokens for the llm.
  - robust JSON extraction even if the model wraps output in markdown fences -> this is to handle the output from the llm and ensure it is a valid JSON object.
  - swappable provider so P5's tracer.py can wrap call_llm with @trace() -> this is to wrap the call_llm function with a trace function to log the input and output tokens for the llm.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any, Optional
from dotenv import load_dotenv

load_dotenv() #this is to load the environment variables from the .env file.
import google.generativeai as genai


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

GEMINI_MODEL = os.environ.get("TASKPILOT_GEMINI_MODEL", "gemini-2.0-flash-lite") #this is the gemini model we are using
API_KEY_ENV_VAR = "GEMINI_API_KEY"

MAX_RETRIES = 3 #this is the maximum number of retries for the llm.
BASE_BACKOFF_SECONDS = 1.5  # exponential: 1.5s, 3s, 6s #this is the base backoff time for the llm.
REQUEST_TIMEOUT_SECONDS = 30 #this is the request timeout for the llm.to ensure app demo wont fail due to rate limiting


class LLMClientError(Exception): #this is the error class for the llm.
    """Raised when the LLM call fails after all retries are exhausted."""


@dataclass
class LLMResponse: #this is the response class for the llm.
    """
    Standard return shape for every call_llm() invocation.
    P5's tracer.py wraps this -- step name, timestamps, and latency are
    added by the @trace decorator, not by this client, to keep concerns
    separated (this file does NOT know about SQLite or tracing).
    """
    text: str                     # raw text response from the model
    input_tokens: int
    output_tokens: int
    latency_ms: float
    model: str
    parsed_json: Optional[Any] = field(default=None)  # populated if json_mode=True and parsing succeeded
    json_parse_error: Optional[str] = field(default=None)  # populated if json_mode=True and parsing failed


# ---------------------------------------------------------------------------
# Provider setup
# ---------------------------------------------------------------------------

_configured = False #this is to check if the llm is configured.


def _ensure_configured() -> None: #this is to ensure the llm is configured.
    global _configured
    if _configured:
        return
    api_key = os.environ.get(API_KEY_ENV_VAR) #this is to get the api key from the environment variables.
    if not api_key:
        raise LLMClientError(
            f"{API_KEY_ENV_VAR} is not set. Export it before calling call_llm(), "
            f"e.g. `export {API_KEY_ENV_VAR}=your_key_here`." #this is to raise an error if the api key is not set.
        )
    genai.configure(api_key=api_key) #this is to configure the llm.
    _configured = True #this is to set the llm as configured.


def _extract_json(text: str) -> tuple[Optional[Any], Optional[str]]:
    """
    Best-effort JSON extraction. Handles three cases, in order:
      1. Clean JSON (Gemini's native JSON mode returns this almost always)
      2. JSON wrapped in ```json ... ``` or ``` ... ``` markdown fences
      3. JSON embedded in surrounding prose (find the first {...} or [...] block)
    Returns (parsed_object, None) on success, or (None, error_message) on failure.
    Never raises -- callers (extractor.py, prioritizer.py) decide how to handle
    a failed parse, since a partial/garbled response during a live demo should
    degrade gracefully, not crash the pipeline.
    """
    text = text.strip()

    # Case 1: direct parse
    try:
        return json.loads(text), None
    except json.JSONDecodeError:
        pass

    # Case 2: strip markdown fences
    fence_match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if fence_match:
        candidate = fence_match.group(1).strip()
        try:
            return json.loads(candidate), None
        except json.JSONDecodeError:
            pass

    # Case 3: grab the first balanced-looking {...} or [...] block
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
    """
    Core entry point. Every prompt function in prompts.py builds a prompt
    string and calls this. Retries on transient errors (rate limits, timeouts)
    with exponential backoff. Raises LLMClientError only after MAX_RETRIES
    is exhausted, so callers can decide on a final fallback.

    Args:
        prompt: the user-turn content (already filled in with data by the caller)
        system: optional system instruction (kept separate so the model treats
                 it with higher priority than the user turn)
        json_mode: if True, asks Gemini's native JSON mode AND attempts to parse
                 the result into response.parsed_json
        temperature: lower = more deterministic. Prioritization/extraction should
                 stay low (0.1-0.3); QA answers can go slightly higher.
        max_output_tokens: cap to control cost/latency; raise for weekly_summary.

    Returns:
        LLMResponse with .text always populated, and .parsed_json populated
        only when json_mode=True and parsing succeeded.
    """
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

            # token counts: Gemini exposes usage_metadata on the response
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
        except Exception as e:  # noqa: BLE001 -- provider SDK can raise various transient errors
            last_error = e

        if attempt < MAX_RETRIES:
            backoff = BASE_BACKOFF_SECONDS * (2 ** (attempt - 1))
            await asyncio.sleep(backoff)

    raise LLMClientError(
        f"call_llm failed after {MAX_RETRIES} attempts. Last error: {last_error}"
    )


# ---------------------------------------------------------------------------
# Manual smoke test: `python core/llm_client.py`
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    async def _smoke_test():
        resp = await call_llm(
            prompt='Return a JSON object: {"hello": "world", "n": 3}',
            json_mode=True,
        )
        print("text:", resp.text)
        print("parsed_json:", resp.parsed_json)
        print("input_tokens:", resp.input_tokens, "output_tokens:", resp.output_tokens)
        print("latency_ms:", round(resp.latency_ms, 1))

    asyncio.run(_smoke_test())