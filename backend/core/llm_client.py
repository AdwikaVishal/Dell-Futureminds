from __future__ import annotations

import json
import logging
import os
import re
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from dotenv import load_dotenv
import httpx

load_dotenv()

logger = logging.getLogger(__name__)


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


class LLMBackend(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.2,
        max_output_tokens: int = 2048,
    ) -> LLMResponse: ...


class OpenAICompatibleBackend(LLMBackend):
    def __init__(self) -> None:
        self.api_key = os.environ.get("LLM_API_KEY") or os.environ.get("XAI_API_KEY", "")
        self.base_url = os.environ.get("LLM_BASE_URL", "https://api.x.ai/v1").rstrip("/")
        self.model = self._sanitize_model(os.environ.get("LLM_MODEL", "grok-4"))

    @staticmethod
    def _sanitize_model(model: str) -> str:
        """Normalize model names like 'grok 3.0' -> 'grok-3'."""
        m = model.strip().lower()
        # 'grok 3.0' or 'grok 3' -> grok-3
        import re
        m = re.sub(r"\s+", "-", m)
        m = re.sub(r"\.0$", "", m)
        return m

    @classmethod
    async def list_available_models(cls) -> list[str]:
        """Fetch available models from the xAI API."""
        api_key = os.environ.get("LLM_API_KEY") or os.environ.get("XAI_API_KEY", "")
        base_url = os.environ.get("LLM_BASE_URL", "https://api.x.ai/v1").rstrip("/")
        if not api_key:
            return ["grok-4", "grok-3", "grok-2"]
        headers = {"Authorization": f"Bearer {api_key}"}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(f"{base_url}/models", headers=headers)
                resp.raise_for_status()
                data = resp.json()
                models_list = data.get("data") or data.get("models") or []
                return [m.get("id") or m.get("name", "") for m in models_list if m.get("id") or m.get("name")]
        except Exception:
            return ["grok-4", "grok-3", "grok-2"]

    @classmethod
    async def check_connectivity(cls) -> tuple[bool, str, list[str]]:
        """Check if the LLM backend is reachable. Returns (ok, message, available_models)."""
        api_key = os.environ.get("LLM_API_KEY") or os.environ.get("XAI_API_KEY", "")
        if not api_key:
            return False, "LLM_API_KEY not set", []
        base_url = os.environ.get("LLM_BASE_URL", "https://api.x.ai/v1").rstrip("/")
        model = OpenAICompatibleBackend._sanitize_model(os.environ.get("LLM_MODEL", "grok-4"))
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers=headers,
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": "ping"}],
                        "max_tokens": 1,
                    },
                )
                resp.raise_for_status()
                models = await cls.list_available_models()
                return True, f"LLM available (model={model})", models
        except httpx.HTTPStatusError as e:
            body = ""
            if e.response is not None:
                try:
                    body = e.response.json().get("error", e.response.text[:200])
                except Exception:
                    body = e.response.text[:200]
            models = await cls.list_available_models()
            if e.response.status_code == 403:
                return False, f"LLM unavailable: {body}", models
            return False, f"LLM error {e.response.status_code}: {body}", models
        except Exception as e:
            models = await cls.list_available_models()
            return False, f"LLM unreachable: {e}", models

    @property
    def name(self) -> str:
        return f"OpenAICompatible({self.model})"

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.2,
        max_output_tokens: int = 2048,
    ) -> LLMResponse:
        if not self.api_key:
            raise LLMClientError("LLM_API_KEY is not set")

        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        body: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_output_tokens,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        start = time.monotonic()
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
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
            model=self.model,
            parsed_json=parsed_json,
            json_parse_error=json_parse_error,
        )


class HeuristicBackend(LLMBackend):
    @property
    def name(self) -> str:
        return "Heuristic"

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.2,
        max_output_tokens: int = 2048,
    ) -> LLMResponse:
        start = time.monotonic()
        system_lower = (system or "").lower()

        if json_mode:
            if "prioritization" in system_lower or "prioritisation" in system_lower:
                scored = self._heuristic_prioritize(prompt)
                text = json.dumps(scored)
                parsed_json = scored
            elif "extract" in system_lower:
                text = json.dumps(self._heuristic_extract(prompt))
                parsed_json = json.loads(text)
            else:
                text = json.dumps({
                    "answer": "Heuristic mode: Unable to answer questions. Please check your task list manually.",
                    "citations": [],
                })
                parsed_json = json.loads(text)
        else:
            if "planning" in system_lower:
                text = self._heuristic_daily_plan(prompt)
            elif "weekly summary" in system_lower or "standup" in system_lower:
                text = (
                    "## Accomplished This Week\n\n"
                    "LLM summary unavailable in heuristic mode. Check your task history manually.\n\n"
                    "## In Progress / Carried Over\n\n"
                    "Review your active task list for current priorities.\n\n"
                    "## Blockers & Deferred\n\n"
                    "Alerts panel shows any active blockers."
                )
            else:
                text = "Heuristic mode: Unable to answer questions. Please check your task list manually."

        latency_ms = (time.monotonic() - start) * 1000
        return LLMResponse(
            text=text,
            input_tokens=0,
            output_tokens=0,
            latency_ms=latency_ms,
            model="heuristic",
            parsed_json=parsed_json if json_mode else None,
            json_parse_error=None,
        )

    def _heuristic_prioritize(self, prompt: str) -> list[dict[str, Any]]:
        tasks, _ = _extract_json(prompt)
        if not isinstance(tasks, list):
            return []
        scored = []
        for task in tasks:
            score = self._compute_score(task)
            rationale = self._build_rationale(task, score)
            scored.append({
                "id": task.get("id", ""),
                "score": round(score, 1),
                "rationale": rationale,
            })
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored

    def _compute_score(self, task: dict[str, Any]) -> float:
        du = self._deadline_urgency(task.get("deadline"))
        sv = self._severity_score(task.get("priority"))
        bi = self._business_impact(task.get("vp_escalation", False), task.get("customer_facing", False))
        db = self._dependency_blocking(task.get("blocks", []))
        return du * 0.35 + sv * 0.30 + bi * 0.20 + db * 0.15

    def _deadline_urgency(self, deadline: Optional[str]) -> float:
        if not deadline:
            return 30.0
        try:
            dt = datetime.fromisoformat(deadline)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            diff_hours = (dt - now).total_seconds() / 3600
            if diff_hours <= 24:
                return 100.0
            diff_days = diff_hours / 24
            if diff_days >= 14:
                return 0.0
            return 100.0 * (1 - diff_days / 14)
        except (ValueError, TypeError):
            return 30.0

    def _severity_score(self, priority: Optional[str]) -> float:
        mapping = {"P0": 100, "P1": 75, "P2": 50, "P3": 25}
        return mapping.get(priority or "", 25)

    def _business_impact(self, vp_escalation: bool, customer_facing: bool) -> float:
        if vp_escalation:
            return 100.0
        if customer_facing:
            return 70.0
        return 40.0

    def _dependency_blocking(self, blocks: Any) -> float:
        count = len(blocks) if isinstance(blocks, list) else 0
        if count >= 2:
            return 100.0
        if count == 1:
            return 60.0
        return 0.0

    def _build_rationale(self, task: dict[str, Any], score: float) -> str:
        du = self._deadline_urgency(task.get("deadline"))
        sv = self._severity_score(task.get("priority"))
        bi = self._business_impact(task.get("vp_escalation", False), task.get("customer_facing", False))
        db = self._dependency_blocking(task.get("blocks", []))
        components = {"deadline urgency": du, "severity": sv, "business impact": bi, "dependency blocking": db}
        biggest = max(components, key=components.get)
        return (
            f"Score breakdown: deadline_urgency={du:.0f}*0.35, severity={sv:.0f}*0.30, "
            f"business_impact={bi:.0f}*0.20, dependency_blocking={db:.0f}*0.15 = {score:.1f}. "
            f"Biggest driver: {biggest}."
        )

    def _heuristic_daily_plan(self, prompt: str) -> str:
        tasks, _ = _extract_json(prompt)
        if not isinstance(tasks, list) or not tasks:
            return "## Top 3 for Today\n\nNo tasks found.\n"
        scored = [(task, self._compute_score(task)) for task in tasks]
        scored.sort(key=lambda x: x[1], reverse=True)
        top3 = scored[:3]
        do_next = scored[3:7]
        deferred = [t for t, _ in scored[7:]]
        lines = ["## Top 3 for Today\n"]
        for task, score in top3:
            lines.append(f"- **{task.get('title', 'Untitled')}** (score: {score:.1f})")
        lines.append("\n## Do Next\n")
        for task, score in do_next:
            lines.append(f"- {task.get('title', 'Untitled')} (score: {score:.1f})")
        lines.append("\n## Defer to Tomorrow\n")
        for task, _ in deferred:
            lines.append(f"- {task.get('title', 'Untitled')}")
        return "\n".join(lines)

    def _heuristic_extract(self, prompt: str) -> list[dict[str, Any]]:
        """Extract tasks from unstructured text using pattern matching."""
        import re
        tasks = []
        seen_titles = set()
        lines = prompt.split("\n")

        # Pattern: numbered or bulleted action items
        patterns = [
            re.compile(r"(?:^|\s)(?:\d+[.)]\s*|[-*]\s+)(.+?)(?:\s*\(([^)]*)\))?\s*$", re.MULTILINE),
            re.compile(r"(?:^|\s)(?:TODO|FIXME|HACK|XXX)[:\s]+(.+)$", re.MULTILINE),
            re.compile(r"action\s*item[s:]*\s*\n?\s*[-*\d.)\s]*(.+)$", re.IGNORECASE | re.MULTILINE),
        ]

        for pattern in patterns:
            for match in pattern.finditer(prompt):
                title = match.group(1).strip()
                if not title or len(title) < 3:
                    continue
                # Skip lines that look like section headers, agenda items, or meeting notes
                skip_words = {"agenda", "opening", "blockers", "capacity", "attendees", "duration",
                              "next meeting", "action items", "review", "discussion", "closing",
                              "welcome", "introduction"}
                if title.lower().rstrip(":").strip() in skip_words:
                    continue
                if title.lower().startswith(("agenda:", "topic:", "item:", "note:", "from ")):
                    continue
                key = title.lower().rstrip(".")
                if key not in seen_titles:
                    seen_titles.add(key)
                    task = {
                        "id": f"heuristic_{len(tasks) + 1:03d}",
                        "title": title.rstrip("."),
                        "description": "",
                        "source": "heuristic_extraction",
                        "source_type": "extracted",
                        "priority": "P2",
                        "deadline": None,
                        "owner": None,
                        "status": "open",
                        "dependencies": [],
                        "blocks": [],
                        "raw_text": title,
                    }
                    # Check for owner/assignee — prefer @mention before "by " to avoid
                    # false positives like "by EOD"
                    owner_from_at = None
                    owner_from_by = None
                    for prefix in ["@"]:
                        idx = title.find(prefix)
                        if idx != -1:
                            # Extract the word after @ until space, parens, or end
                            rest = title[idx + 1:]
                            match = re.match(r"(\w[\w.\-]*)", rest)
                            if match:
                                owner_from_at = match.group(1)
                    for prefix in ["by ", "assigned to "]:
                        idx = title.lower().find(prefix)
                        if idx != -1:
                            rest = title[idx + len(prefix):]
                            # Get the next word (possibly a name)
                            match = re.match(r"(\w[\w.\-]*)", rest)
                            if match and match.group(1).lower() not in {"eod", "today", "tomorrow", "friday", "monday", "tuesday", "wednesday", "thursday", "next", "this"}:
                                owner_from_by = match.group(1)
                    if owner_from_at:
                        task["owner"] = owner_from_at
                        title_clean = title.rsplit("(@" + owner_from_at + ")", 1)[0].strip()
                        title_clean = title_clean.rsplit("(@" + owner_from_at, 1)[0].strip()
                        if title_clean:
                            task["title"] = title_clean.rstrip(" ,;")
                    elif owner_from_by:
                        task["owner"] = owner_from_by
                        title_clean = re.split(rf"\s+by\s+{re.escape(owner_from_by)}", title, flags=re.IGNORECASE)[0].strip()
                        if title_clean:
                            task["title"] = title_clean.rstrip(" ,;")

                    # Check for deadline patterns like "by Friday" or "(due: date)"
                    deadline_match = re.search(r"by\s+(\w+(?:\s+\d+)?(?:\s*(?:st|nd|rd|th))?(?:\s*,?\s*\d{4})?)", title, re.IGNORECASE)
                    if deadline_match and not re.search(r"(?:stand|near|close|pass|go|fly)", deadline_match.group(0), re.IGNORECASE):
                        pass  # store raw deadline text
                    if "p0" in title.lower():
                        task["priority"] = "P0"
                    elif "p1" in title.lower():
                        task["priority"] = "P1"
                    elif "p3" in title.lower():
                        task["priority"] = "P3"
                    elif "p4" in title.lower():
                        task["priority"] = "P4"
                    elif re.search(r"\burge?n?t\b|\bcritical\b|\bblocker\b", title, re.IGNORECASE):
                        task["priority"] = "P0"
                    elif re.search(r"\bhigh\b|\bimportant\b", title, re.IGNORECASE):
                        task["priority"] = "P1"

                    tasks.append(task)

        if not tasks:
            # Fallback: create a single extracted item from raw text
            tasks.append({
                "id": "heuristic_001",
                "title": prompt.strip()[:100] if prompt.strip() else "Extracted task",
                "description": prompt.strip()[:500],
                "source": "heuristic_extraction",
                "source_type": "extracted",
                "priority": "P2",
                "deadline": None,
                "owner": None,
                "status": "open",
                "dependencies": [],
                "blocks": [],
                "raw_text": prompt.strip()[:500],
            })

        return tasks


class RulesEngineBackend(LLMBackend):
    HIGH_KEYWORDS = {"critical", "urgent", "production", "hotfix", "p0", "severe", "outage"}
    MEDIUM_KEYWORDS = {"review", "meeting", "docs", "documentation", "refactor", "cleanup", "test"}

    @property
    def name(self) -> str:
        return "RulesEngine"

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.2,
        max_output_tokens: int = 2048,
    ) -> LLMResponse:
        start = time.monotonic()
        system_lower = (system or "").lower()

        if json_mode and ("prioritization" in system_lower or "prioritisation" in system_lower):
            scored = self._rules_prioritize(prompt)
            text = json.dumps(scored)
            parsed_json = scored
        elif json_mode and "extract" in system_lower:
            text = json.dumps(self._rules_extract(prompt))
            parsed_json = json.loads(text)
        elif json_mode:
            text = json.dumps({
                "answer": "Rules engine: Unable to answer questions. Please check your task list manually.",
                "citations": [],
            })
            parsed_json = json.loads(text)
        else:
            text = (
                "Rules engine mode: Unable to generate narrative responses. "
                "Please check your task list manually."
            )
            parsed_json = None

        latency_ms = (time.monotonic() - start) * 1000
        return LLMResponse(
            text=text,
            input_tokens=0,
            output_tokens=0,
            latency_ms=latency_ms,
            model="rules-engine",
            parsed_json=parsed_json,
            json_parse_error=None,
        )

    def _rules_prioritize(self, prompt: str) -> list[dict[str, Any]]:
        tasks, _ = _extract_json(prompt)
        if not isinstance(tasks, list):
            return []
        scored = []
        for task in tasks:
            title = (task.get("title", "") or "").lower()
            if any(kw in title for kw in self.HIGH_KEYWORDS):
                score = 90.0
            elif any(kw in title for kw in self.MEDIUM_KEYWORDS):
                score = 60.0
            else:
                score = 25.0
            scored.append({
                "id": task.get("id", ""),
                "score": round(score, 1),
                "rationale": f"Rules engine: keyword-based score of {score:.0f}.",
            })
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored

    def _rules_extract(self, prompt: str) -> list[dict[str, Any]]:
        """Reuse heuristic extraction as the final fallback."""
        heur = HeuristicBackend()
        return heur._heuristic_extract(prompt)


class ResilientLLMClient:
    def __init__(self) -> None:
        self.backends: list[LLMBackend] = [
            OpenAICompatibleBackend(),
            HeuristicBackend(),
            RulesEngineBackend(),
        ]

    async def call_llm(
        self,
        prompt: str,
        system: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.2,
        max_output_tokens: int = 2048,
    ) -> LLMResponse:
        last_error: Optional[Exception] = None
        for backend in self.backends:
            try:
                return await backend.generate(
                    prompt=prompt,
                    system=system,
                    json_mode=json_mode,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                )
            except Exception as e:
                logger.warning("Backend %s failed: %s", backend.name, e)
                last_error = e
                continue
        raise LLMClientError(f"All backends failed. Last error: {last_error}")


_client = ResilientLLMClient()


async def call_llm(
    prompt: str,
    system: Optional[str] = None,
    json_mode: bool = False,
    temperature: float = 0.2,
    max_output_tokens: int = 2048,
) -> LLMResponse:
    return await _client.call_llm(
        prompt=prompt,
        system=system,
        json_mode=json_mode,
        temperature=temperature,
        max_output_tokens=max_output_tokens,
    )
