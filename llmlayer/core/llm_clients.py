from __future__ import annotations

import asyncio
import json
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any, Optional
from dotenv import load_dotenv
import httpx

load_dotenv()


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
    api_key = os.environ.get("LLM_API_KEY") or os.environ.get("XAI_API_KEY", "")
    base_url = os.environ.get("LLM_BASE_URL", "https://api.x.ai/v1").rstrip("/")
    model = os.environ.get("LLM_MODEL", "grok-4")

    if not api_key:
        raise LLMClientError("LLM_API_KEY / XAI_API_KEY is not set")

    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_output_tokens,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    last_error: Optional[Exception] = None

    for attempt in range(1, MAX_RETRIES + 1):
        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers=headers,
                    json=body,
                )
                response.raise_for_status()
                data = response.json()
            latency_ms = (time.monotonic() - start) * 1000

            choice = data["choices"][0]
            text = choice["message"]["content"] or ""

            usage = data.get("usage", {})
            input_tokens = usage.get("prompt_tokens", 0) or 0
            output_tokens = usage.get("completion_tokens", 0) or 0

            parsed_json = None
            json_parse_error = None
            if json_mode:
                parsed_json, json_parse_error = _extract_json(text)

            return LLMResponse(
                text=text,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                model=model,
                parsed_json=parsed_json,
                json_parse_error=json_parse_error,
            )

        except (httpx.TimeoutException, httpx.HTTPStatusError) as e:
            last_error = e
        except Exception as e:
            last_error = e

        if attempt < MAX_RETRIES:
            backoff = BASE_BACKOFF_SECONDS * (2 ** (attempt - 1))
            await asyncio.sleep(backoff)

    raise LLMClientError(
        f"call_llm failed after {MAX_RETRIES} attempts. Last error: {last_error}"
    )


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
