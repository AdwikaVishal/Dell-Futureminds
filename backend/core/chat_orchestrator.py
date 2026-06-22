from __future__ import annotations

import hashlib
import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

from core.llm_client import call_llm, LLMResponse
from core.state import store
from core.redis_cache import cache_manager
from core.memory import memory_system
from core.dependency_analyzer import DependencyAnalyzer

logger = logging.getLogger(__name__)


@dataclass
class ChatContext:
    tasks: list[dict[str, Any]] = field(default_factory=list)
    plan: dict[str, Any] = field(default_factory=dict)
    alerts: list[dict[str, Any]] = field(default_factory=list)
    hidden_tasks: list[dict[str, Any]] = field(default_factory=list)
    dependencies: dict[str, Any] = field(default_factory=dict)
    user_preferences: dict[str, Any] = field(default_factory=dict)
    summary_stats: dict[str, Any] = field(default_factory=dict)

    def to_full_context(self) -> str:
        context_lines = []

        context_lines.append("TASK ECOSYSTEM OVERVIEW")
        context_lines.append(f"Total Tasks: {len(self.tasks)}")
        context_lines.append(f"Completed: {self.summary_stats.get('completed', 0)}")
        context_lines.append(f"In Progress: {self.summary_stats.get('in_progress', 0)}")
        context_lines.append(f"Blocked: {self.summary_stats.get('blocked', 0)}")
        context_lines.append(f"Deferred: {self.summary_stats.get('deferred', 0)}")
        context_lines.append("")

        context_lines.append("ALL TASKS (with full details):")
        for i, task in enumerate(self.tasks[:50], 1):
            context_lines.append(f"{i}. ID: {task.get('id', 'N/A')}")
            context_lines.append(f"   Title: {task.get('title', 'Untitled')}")
            context_lines.append(f"   Priority: {task.get('priority', 'P2')}")
            context_lines.append(f"   Status: {task.get('status', 'open')}")
            context_lines.append(f"   Source: {task.get('source_type', 'unknown')}")
            if task.get('description'):
                context_lines.append(f"   Description: {task.get('description', '')[:200]}")
            if task.get('deadline'):
                context_lines.append(f"   Deadline: {task.get('deadline')}")
            if task.get('score'):
                context_lines.append(f"   Score: {task.get('score')}")
            if task.get('score_breakdown'):
                context_lines.append(f"   Score Breakdown: {json.dumps(task.get('score_breakdown'))}")
            if task.get('rationale'):
                context_lines.append(f"   Rationale: {task.get('rationale')}")
            if task.get('dependencies'):
                context_lines.append(f"   Dependencies: {', '.join(task.get('dependencies'))}")
            if task.get('blocks'):
                context_lines.append(f"   Blocks: {', '.join(task.get('blocks'))}")
            context_lines.append("")

        if self.alerts:
            context_lines.append("ACTIVE ALERTS:")
            for alert in self.alerts:
                context_lines.append(f"  - {alert.get('title')}: {alert.get('message')}")
            context_lines.append("")

        if self.hidden_tasks:
            context_lines.append("HIDDEN TASKS (Extracted from emails/meetings):")
            for ht in self.hidden_tasks:
                context_lines.append(
                    f"  - {ht.get('extracted_summary', '')} (Confidence: {ht.get('confidence', 0)*100:.0f}%)"
                )
                context_lines.append(f"    Source: {ht.get('source_type', 'unknown')}")
            context_lines.append("")

        if self.dependencies:
            blockers = self.dependencies.get('blockers', [])
            if blockers:
                context_lines.append("BLOCKERS:")
                for blocker in blockers:
                    context_lines.append(
                        f"  - {blocker.get('title')} blocks {blocker.get('blocks_directly', 0)} tasks"
                    )
            context_lines.append("")

        top = self.plan.get('top_priorities', []) if self.plan else []
        if top:
            context_lines.append("TOP 3 PRIORITIES:")
            for i, task in enumerate(top, 1):
                context_lines.append(f"  {i}. {task.get('title')} (Score: {task.get('score', 0)})")
            context_lines.append("")

        return "\n".join(context_lines)

    def to_dict(self) -> dict[str, Any]:
        return {
            'tasks': self.tasks[:50],
            'plan': self.plan,
            'alerts': self.alerts[:10],
            'hidden_tasks': self.hidden_tasks[:10],
            'dependencies': self.dependencies,
            'user_preferences': self.user_preferences,
            'summary_stats': self.summary_stats,
        }


class ChatOrchestrator:
    def __init__(self):
        self.cache = cache_manager

    async def process_query(
        self,
        query: str,
        user_id: str = "default",
        session_id: Optional[str] = None,
    ) -> dict[str, Any]:
        try:
            cache_key = self._cache_key(query, user_id)
            cached = await self.cache.get(cache_key)
            if cached:
                logger.info("Cache hit for query: %s", query[:40])
                return cached

            context = await self._build_context(user_id)

            if not context.tasks:
                return {
                    "response": "No tasks found yet. Run the pipeline to load tasks from your connected sources (Jira, GitHub, email, etc.), or ask me for help getting started.",
                    "referenced_tasks": [],
                    "context_used": {"timestamp": datetime.now(timezone.utc).isoformat()},
                    "suggestions": ["How do I load tasks?", "Refresh my tasks", "What sources are connected?", "Run the pipeline"],
                    "status": "warning",
                }

            prompt = self._build_intelligent_prompt(query, context)
            response_text = await self._generate_with_llm(prompt, query, context)
            final = self._enhance_response(response_text, context)
            await self.cache.set(cache_key, final, ttl=86400)
            await self._log_interaction(user_id, query, final)
            return final

        except Exception as e:
            logger.exception("Chat processing error: %s", e)
            return {
                "response": "I encountered an error processing your request. Please try again.",
                "referenced_tasks": [],
                "context_used": {"timestamp": datetime.now(timezone.utc).isoformat()},
                "error": str(e),
                "status": "error",
            }

    async def _build_context(self, user_id: str) -> ChatContext:
        cached = await self.cache.get_context(user_id, "full")
        if cached:
            try:
                return ChatContext(**cached)
            except Exception:
                pass

        try:
            raw_tasks = store.current_tasks or []
            plan = store.current_plan

            ranked = getattr(plan, "ranked_tasks", []) if plan else []
            ranked_dicts = []
            for t in (ranked or []):
                try:
                    ranked_dicts.append(t.model_dump(mode="json") if hasattr(t, "model_dump") else dict(t))
                except Exception:
                    ranked_dicts.append({"id": str(getattr(t, "id", "")), "title": str(getattr(t, "title", ""))})

            if not ranked_dicts and raw_tasks:
                for t in raw_tasks:
                    try:
                        ranked_dicts.append(t.model_dump(mode="json") if hasattr(t, "model_dump") else dict(t))
                    except Exception:
                        ranked_dicts.append({"id": str(getattr(t, "id", "")), "title": str(getattr(t, "title", ""))})
                if ranked_dicts:
                    logger.info("Fell back to raw_tasks for context (%d tasks)", len(ranked_dicts))

            plan_dict = {}
            if plan and hasattr(plan, "model_dump"):
                try:
                    plan_dict = plan.model_dump(mode="json")
                except Exception:
                    plan_dict = {"generated_at": str(getattr(plan, "generated_at", ""))}

            alerts = plan_dict.get("alerts", [])
            hidden_tasks = getattr(store, "hidden_tasks", [])

            deps_result = {}
            if raw_tasks:
                try:
                    blocking = DependencyAnalyzer.compute_blocking_impact(raw_tasks)
                    deps_result = {"blockers": blocking} if blocking else {}
                except Exception:
                    pass

            preferences = {}
            try:
                preferences = memory_system.get_all_preferences() if memory_system else {}
            except Exception:
                pass

            summary_stats = {
                "total_tasks": len(ranked_dicts),
                "completed": sum(1 for t in ranked_dicts if isinstance(t, dict) and t.get("status") == "done"),
                "in_progress": sum(1 for t in ranked_dicts if isinstance(t, dict) and t.get("status") == "in_progress"),
                "blocked": sum(1 for t in ranked_dicts if isinstance(t, dict) and t.get("status") == "blocked"),
                "deferred": sum(1 for t in ranked_dicts if isinstance(t, dict) and t.get("status") == "deferred"),
                "p0_count": sum(1 for t in ranked_dicts if isinstance(t, dict) and t.get("priority") == "P0"),
                "p1_count": sum(1 for t in ranked_dicts if isinstance(t, dict) and t.get("priority") == "P1"),
                "p2_count": sum(1 for t in ranked_dicts if isinstance(t, dict) and t.get("priority") == "P2"),
                "p3_count": sum(1 for t in ranked_dicts if isinstance(t, dict) and t.get("priority") == "P3"),
                "avg_score": (
                    sum(t.get("score", 0) for t in ranked_dicts if isinstance(t, dict))
                    / len(ranked_dicts) if ranked_dicts else 0
                ),
            }

            context = ChatContext(
                tasks=ranked_dicts,
                plan=plan_dict,
                alerts=alerts,
                hidden_tasks=hidden_tasks,
                dependencies=deps_result,
                user_preferences=preferences,
                summary_stats=summary_stats,
            )

            await self.cache.cache_context(user_id, "full", context.to_dict())
            return context

        except Exception as e:
            logger.error("Context building failed: %s", e)
            return ChatContext()

    def _build_intelligent_prompt(self, query: str, context: ChatContext) -> str:
        context_text = context.to_full_context()

        return (
            "You are TaskPilot AI, an intelligent task assistant for software engineers. "
            "You have access to ALL task data and can answer ANY question about tasks.\n\n"
            "CONTEXT (Complete Task Ecosystem):\n"
            f"{context_text}\n\n"
            f"USER QUESTION: {query}\n\n"
            "INSTRUCTIONS:\n"
            "1. Answer the question based EXCLUSIVELY on the context provided above\n"
            "2. If the answer is not in the context, say 'I don't have information about that in your tasks'\n"
            "3. Be specific - reference actual task IDs, titles, and details\n"
            "4. For comparisons, analyze the data provided\n"
            "5. For complex questions, synthesize information from multiple tasks\n"
            "6. Provide actionable insights and recommendations\n"
            "7. Include priority, status, and deadline information when relevant\n"
            "8. Format responses with clear structure (bullet points for lists)\n\n"
            "RESPONSE:"
        )

    GENERIC_PATTERNS = [
        "unable to answer",
        "unable to generate",
        "i can answer questions about",
        "please check your task list manually",
        "heuristic mode:",
        "rules engine mode:",
        "no task data available",
    ]

    async def _generate_with_llm(self, prompt: str, query: str, context: ChatContext) -> str:
        cached = await self.cache.get_llm_response(prompt)
        if cached:
            if not any(p in cached.lower() for p in self.GENERIC_PATTERNS):
                return cached

        try:
            logger.info("Generating response via LLM for: %s", query[:50])
            response: LLMResponse = await call_llm(
                prompt=query,
                system=prompt,
                json_mode=False,
                temperature=0.3,
                max_output_tokens=1500,
            )
            text = response.text.strip()
            if text and not any(p in text.lower() for p in self.GENERIC_PATTERNS):
                await self.cache.cache_llm_response(prompt, text, ttl=86400)
                return text

            logger.warning("LLM returned generic response, using structured fallback")
            return self._generate_structured_fallback(query, context)
        except Exception as e:
            logger.error("LLM generation failed: %s", e)
            return self._generate_structured_fallback(query, context)

    def _generate_structured_fallback(self, query: str, context: ChatContext) -> str:
        q = query.lower()
        tasks = context.tasks

        # Blocked queries
        if any(w in q for w in ["block", "blocker", "stuck", "waiting", "prevent"]):
            blocked = [t for t in tasks if t.get("status") == "blocked"]
            if blocked:
                lines = ["**Blocked Tasks:**\n"]
                for t in blocked[:10]:
                    lines.append(f"• {t.get('title')} (ID: {t.get('id')})")
                    if t.get("deadline"):
                        lines.append(f"  Deadline: {t.get('deadline')}")
                    lines.append(f"  Priority: {t.get('priority', 'P2')}")
                return "\n".join(lines)
            return "No tasks are currently blocked. Great progress! 🎉"

        # Priority queries
        if any(w in q for w in ["priority", "important", "top", "what should i do", "what do i do", "next", "today"]):
            if not tasks:
                return "No tasks found. Please run the pipeline first."
            top = tasks[0]
            lines = [f"**Your top priority is:**\n"]
            lines.append(f"🎯 {top.get('title')} (ID: {top.get('id')})")
            lines.append(f"• Priority: {top.get('priority', 'P2')}")
            lines.append(f"• Status: {top.get('status', 'open')}")
            if top.get("score"):
                lines.append(f"• Score: {top.get('score')}")
            if top.get("deadline"):
                lines.append(f"• Deadline: {top.get('deadline')}")
            if top.get("rationale"):
                lines.append(f"• Why: {top.get('rationale')}")
            if len(tasks) > 1:
                lines.append(f"\n**Next up:** {tasks[1].get('title')} (Score: {tasks[1].get('score', 0)})")
            return "\n".join(lines)

        # Count queries
        if any(w in q for w in ["how many", "count", "total", "number of"]):
            stats = context.summary_stats
            return (
                f"**Task Summary:**\n\n"
                f"• Total: {stats.get('total_tasks', 0)}\n"
                f"• Completed: {stats.get('completed', 0)}\n"
                f"• In Progress: {stats.get('in_progress', 0)}\n"
                f"• Blocked: {stats.get('blocked', 0)}\n"
                f"• Deferred: {stats.get('deferred', 0)}\n"
                f"• P0 (Critical): {stats.get('p0_count', 0)}\n"
                f"• P1 (High): {stats.get('p1_count', 0)}"
            )

        # Difficulty/complexity queries
        if any(w in q for w in ["difficult", "complex", "hard", "hardest", "effort", "challenging"]):
            scored = [t for t in tasks if t.get("score", 0) > 0]
            scored.sort(key=lambda t: t.get("score", 0), reverse=True)
            hard = scored[:5] if scored else []
            if hard:
                lines = ["**Most Difficult/Complex Tasks:**\n"]
                for t in hard:
                    desc = t.get("description", "")
                    complexity = "High"
                    if t.get("score", 0) < 50:
                        complexity = "Medium"
                    if t.get("score", 0) < 30:
                        complexity = "Low"
                    lines.append(f"• {t.get('title')} (ID: {t.get('id')})")
                    lines.append(f"  Priority: {t.get('priority', 'P2')}, Score: {t.get('score', 0)}, Complexity: {complexity}")
                    if desc:
                        lines.append(f"  Description: {desc[:100]}")
                return "\n".join(lines)
            return "No tasks with complexity data available."

        # P0/Critical queries
        if any(w in q for w in ["p0", "p1", "critical", "urgent", "sever"]):
            urgent = [t for t in tasks if t.get("priority") in ("P0", "P1")]
            if urgent:
                lines = [f"**Critical/Urgent Tasks ({len(urgent)}):**\n"]
                for t in urgent[:10]:
                    lines.append(f"• {t.get('title')} (ID: {t.get('id')}) [{t.get('priority')}]")
                    if t.get("deadline"):
                        lines.append(f"  Due: {t.get('deadline')}")
                    if t.get("status"):
                        lines.append(f"  Status: {t.get('status')}")
                return "\n".join(lines)
            return "No P0 or P1 tasks found."

        # Deadline queries
        if any(w in q for w in ["deadline", "due", "overdue", "sla"]):
            with_deadlines = [t for t in tasks if t.get("deadline")]
            if with_deadlines:
                with_deadlines.sort(key=lambda t: t.get("deadline", ""))
                lines = [f"**Tasks with Deadlines ({len(with_deadlines)}):**\n"]
                for t in with_deadlines[:10]:
                    lines.append(f"• {t.get('title')} (ID: {t.get('id')})")
                    lines.append(f"  Due: {t.get('deadline')}, Priority: {t.get('priority', 'P2')}")
                return "\n".join(lines)
            return "No tasks with deadlines found."

        # Hidden tasks queries
        if any(w in q for w in ["hidden", "extracted", "email", "meeting", "transcript", "slack"]):
            hidden = context.hidden_tasks
            if hidden:
                lines = [f"**Hidden Tasks Found ({len(hidden)}):**\n"]
                for ht in hidden[:10]:
                    lines.append(f"• {ht.get('extracted_summary', '')}")
                    lines.append(f"  Confidence: {ht.get('confidence', 0)*100:.0f}%, Source: {ht.get('source_type', 'unknown')}")
                return "\n".join(lines)
            return "No hidden tasks found. Emails and meetings have not been processed yet."

        # Dependency queries
        if any(w in q for w in ["depend", "dependency", "blocking", "critical path"]):
            deps = context.dependencies
            blockers = deps.get("blockers", []) if deps else []
            if blockers:
                lines = [f"**Dependency Analysis - Blockers ({len(blockers)}):**\n"]
                for b in blockers[:10]:
                    lines.append(f"• {b.get('title')} blocks {b.get('blocks_directly', 0)} tasks")
                return "\n".join(lines)
            return "No blocking dependencies detected."

        # Summary/Overview
        if any(w in q for w in ["summary", "summarize", "overview", "status", "what's happening", "what's going on"]):
            return self._build_summary(context)

        # Status queries
        if any(w in q for w in ["in progress", "completed", "done", "open tasks"]):
            for status_val, status_label in [("in_progress", "In Progress"), ("done", "Completed"), ("open", "Open"), ("deferred", "Deferred")]:
                if status_val in q or status_label.lower() in q:
                    filtered = [t for t in tasks if t.get("status") == status_val]
                    if filtered:
                        lines = [f"**{status_label} Tasks ({len(filtered)}):**\n"]
                        for t in filtered[:10]:
                            lines.append(f"• {t.get('title')} (ID: {t.get('id')}) [{t.get('priority', 'P2')}]")
                        return "\n".join(lines)
                    return f"No tasks with status '{status_label}'."

        # List / show all tasks
        if any(w in q for w in ["list", "show all", "show me", "what are", "display", "all tasks", "my tasks", "list tasks"]):
            if not tasks:
                return "No tasks found."
            lines = [f"**All Tasks ({len(tasks)}):**\n"]
            for i, t in enumerate(tasks[:20], 1):
                lines.append(f"{i}. **{t.get('title')}** (ID: {t.get('id')})")
                lines.append(f"   Priority: {t.get('priority', 'P2')}, Status: {t.get('status', 'open')}, Score: {t.get('score', 0)}")
                if t.get('deadline'):
                    lines.append(f"   Due: {t.get('deadline')}")
            if len(tasks) > 20:
                lines.append(f"\n... and {len(tasks) - 20} more tasks")
            return "\n".join(lines)

        # Comparison queries
        if any(w in q for w in ["compare", "difference", "vs", "versus", "more important"]):
            lines = ["**Task Comparison:**\n"]
            if len(tasks) >= 2:
                for i, t in enumerate(tasks[:3], 1):
                    lines.append(f"{i}. {t.get('title')} (ID: {t.get('id')})")
                    lines.append(f"   Priority: {t.get('priority', 'P2')}, Score: {t.get('score', 0)}, Status: {t.get('status')}")
                lines.append("\nThe highest-scored task is the top priority based on deadline urgency, severity, business impact, and dependency blocking.")
            else:
                lines.append("Not enough tasks to compare.")
            return "\n".join(lines)

        # Help
        if any(w in q for w in ["help", "what can you do", "capabilities"]):
            return (
                "I can help you with:\n\n"
                "**Task Management**\n"
                '- "What\'s my top priority?"\n'
                '- "What should I work on next?"\n'
                '- "Show all my tasks"\n\n'
                "**Insights**\n"
                '- "Summarize my tasks"\n'
                '- "What\'s blocking me?"\n'
                '- "Which tasks are most difficult?"\n\n'
                "**Planning**\n"
                '- "Show my plan for today"\n'
                '- "What\'s due this week?"\n'
                '- "Generate weekly summary"'
            )

        # Default: show actual task data
        stats = context.summary_stats
        if tasks:
            top_3 = tasks[:3]
            lines = [f"I found **{stats.get('total_tasks', 0)} tasks** in your ecosystem:\n"]
            lines.append(f"📊 **Overview:** {stats.get('completed', 0)} done, {stats.get('in_progress', 0)} in progress, {stats.get('blocked', 0)} blocked, {stats.get('deferred', 0)} deferred")
            lines.append(f"🔴 **Critical (P0):** {stats.get('p0_count', 0)} | **High (P1):** {stats.get('p1_count', 0)} | **Medium (P2):** {stats.get('p2_count', 0)}\n")
            lines.append("**Top tasks:**")
            for i, t in enumerate(top_3, 1):
                lines.append(f"  {i}. **{t.get('title')}** — {t.get('priority', 'P2')} | Score: {t.get('score', 0)} | Status: {t.get('status', 'open')}")
                if i == 1 and t.get('rationale'):
                    lines.append(f"     Why: {t.get('rationale')}")
            lines.append("")
            if context.hidden_tasks:
                lines.append(f"👻 **Hidden tasks:** {len(context.hidden_tasks)} extracted from emails/meetings")
            lines.append("\nTry asking me about priorities, blockers, difficulty, deadlines, or specific tasks!")
            return "\n".join(lines)
        else:
            return (
                "I don't see any tasks in your workspace. Try running the pipeline first to load your tasks, "
                "or connect a source like Jira, GitHub, or email."
            )

    def _build_summary(self, context: ChatContext) -> str:
        tasks = context.tasks
        if not tasks:
            return "No tasks found."

        stats = context.summary_stats
        total = stats.get("total_tasks", 0)
        done = stats.get("completed", 0)
        in_progress = stats.get("in_progress", 0)
        blocked = stats.get("blocked", 0)
        deferred = stats.get("deferred", 0)
        p0 = stats.get("p0_count", 0)
        p1 = stats.get("p1_count", 0)
        p2 = stats.get("p2_count", 0)
        p3 = stats.get("p3_count", 0)

        lines = ["**Complete Task Summary:**\n"]
        lines.append(f"**Total:** {total} tasks")
        lines.append(f"**Completed:** {done}")
        lines.append(f"**In Progress:** {in_progress}")
        lines.append(f"**Blocked:** {blocked}")
        lines.append(f"**Deferred:** {deferred}\n")
        lines.append(f"**Priority Breakdown:**")
        lines.append(f"• P0 (Critical): {p0}")
        lines.append(f"• P1 (High): {p1}")
        lines.append(f"• P2 (Medium): {p2}")
        lines.append(f"• P3 (Low): {p3}")

        if context.alerts:
            lines.append(f"\n**Alerts:** {len(context.alerts)} active")
            for a in context.alerts[:5]:
                lines.append(f"• {a.get('title')}: {a.get('message')}")

        if context.hidden_tasks:
            lines.append(f"\n**Hidden Tasks Found:** {len(context.hidden_tasks)}")
            for ht in context.hidden_tasks[:5]:
                lines.append(f"• {ht.get('extracted_summary', '')} (Confidence: {ht.get('confidence', 0)*100:.0f}%)")

        top = context.plan.get("top_priorities", []) if context.plan else []
        if top:
            lines.append(f"\n**Top Priority:** {top[0].get('title')} (Score: {top[0].get('score', 0)})")
        elif tasks:
            lines.append(f"\n**Top Task:** {tasks[0].get('title')} (Score: {tasks[0].get('score', 0)})")
            if len(tasks) > 1:
                lines.append(f"**Next:** {tasks[1].get('title')} (Score: {tasks[1].get('score', 0)})")

        return "\n".join(lines)

    def _enhance_response(self, response: str, context: ChatContext) -> dict[str, Any]:
        task_pattern = r"([A-Z]{2,}-\d+|task_\d+)"
        mentioned = re.findall(task_pattern, response)

        referenced = []
        for tid in mentioned:
            task = next((t for t in context.tasks if t.get("id") == tid), None)
            if task:
                referenced.append({
                    "id": tid,
                    "title": task.get("title", ""),
                    "source": task.get("source_type", "unknown"),
                })

        suggestions = self._generate_dynamic_suggestions(response, context)

        return {
            "response": response,
            "referenced_tasks": referenced,
            "context_used": {
                "task_count": len(context.tasks),
                "alert_count": len(context.alerts),
                "hidden_task_count": len(context.hidden_tasks),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            "suggestions": suggestions,
            "status": "success",
        }

    def _generate_dynamic_suggestions(self, response: str, context: ChatContext) -> list[str]:
        suggestions = []
        tasks = context.tasks

        if tasks:
            suggestions.append(f"Tell me about {tasks[0].get('title', 'my top task')}")

        suggestions.append("What's my top priority?")
        suggestions.append("Summarize my tasks")

        blocked = [t for t in tasks if t.get("status") == "blocked"]
        if blocked:
            suggestions.append(f"How do I unblock {blocked[0].get('title', 'blocked tasks')}?")
        else:
            suggestions.append("What's blocking me?")

        if context.hidden_tasks:
            suggestions.append("Show me hidden tasks from emails")

        suggestions.append("Which tasks are most difficult?")
        suggestions.append("What should I work on next?")

        has_deadlines = any(t.get("deadline") for t in tasks)
        if has_deadlines:
            suggestions.append("What's due this week?")

        seen = set()
        unique = []
        for s in suggestions:
            if s not in seen:
                seen.add(s)
                unique.append(s)
        return unique[:8]

    def _cache_key(self, query: str, user_id: str) -> str:
        raw = f"{user_id}:{query.lower().strip()}"
        h = hashlib.md5(raw.encode()).hexdigest()[:16]
        return f"taskpilot:chat:response:{h}"

    async def _log_interaction(self, user_id: str, query: str, response: dict[str, Any]):
        try:
            store.add_chat_entry(
                query,
                response.get("response", ""),
                [r["id"] for r in response.get("referenced_tasks", [])],
            )
        except Exception as e:
            logger.warning("Failed to log chat interaction: %s", e)


orchestrator = ChatOrchestrator()
