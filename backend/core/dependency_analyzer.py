from __future__ import annotations

import logging
from collections import defaultdict, deque
from typing import Any

import networkx as nx
from models.task import Task

logger = logging.getLogger(__name__)

ESTIMATE_KEYWORDS: dict[str, str] = {
    "critical": "High priority - do now",
    "urgent": "High priority - do now",
    "emergency": "High priority - do now",
    "review": "Quick review",
    "check": "Quick review",
    "inspect": "Quick review",
    "api": "Medium effort",
    "database": "Medium effort",
    "backend": "Medium effort",
}


class DependencyAnalyzer:
    @staticmethod
    def build_adjacency_lists(
        tasks: list[Task],
    ) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
        depends_on: dict[str, list[str]] = {
            t.id: list(t.dependencies or []) for t in tasks
        }
        blocked_by: dict[str, list[str]] = defaultdict(list)
        for t in tasks:
            for dep_id in t.dependencies or []:
                blocked_by[dep_id].append(t.id)
        return depends_on, blocked_by

    @staticmethod
    def find_critical_path(tasks: list[Task]) -> list[str]:
        if not tasks:
            return []

        depends_on, _ = DependencyAnalyzer.build_adjacency_lists(tasks)
        task_ids = {t.id for t in tasks}

        in_degree: dict[str, int] = {tid: 0 for tid in task_ids}
        for tid, deps in depends_on.items():
            in_degree[tid] = sum(1 for d in deps if d in task_ids)

        queue = deque([tid for tid, deg in in_degree.items() if deg == 0])
        topo_order = []

        while queue:
            node = queue.popleft()
            topo_order.append(node)
            for tid, deps in depends_on.items():
                if node in deps:
                    in_degree[tid] -= 1
                    if in_degree[tid] == 0:
                        queue.append(tid)

        return topo_order

    @staticmethod
    def compute_blocking_impact(tasks: list[Task]) -> dict[str, dict[str, Any]]:
        _, blocked_by = DependencyAnalyzer.build_adjacency_lists(tasks)
        task_map = {t.id: t for t in tasks}

        impacts: dict[str, dict[str, Any]] = {}
        for t in tasks:
            blockers = blocked_by.get(t.id, [])
            direct_blocked_count = len(blockers)
            transitive_count = 0
            visited = set(blockers)
            queue = deque(blockers)
            while queue:
                bid = queue.popleft()
                sub_blocked = blocked_by.get(bid, [])
                for sb in sub_blocked:
                    if sb not in visited:
                        visited.add(sb)
                        queue.append(sb)
                        transitive_count += 1

            total_impact = direct_blocked_count + transitive_count
            score = min(100.0, total_impact * 25)

            blocking_task_names = []
            for bid in blockers:
                bt = task_map.get(bid)
                if bt:
                    blocking_task_names.append(bt.title)

            blocked_by_ids = t.dependencies or []
            blocked_by_names = []
            for bid in blocked_by_ids:
                bt = task_map.get(bid)
                if bt:
                    blocked_by_names.append(bt.title)

            impacts[t.id] = {
                "task_id": t.id,
                "title": t.title,
                "blocks_directly": direct_blocked_count,
                "blocks_transitively": transitive_count,
                "total_impact_score": round(score, 1),
                "blocked_by_ids": blocked_by_ids,
                "blocked_by_names": blocked_by_names,
                "blocking_ids": blockers,
                "blocking_names": blocking_task_names,
            }

        return impacts

    @staticmethod
    def find_highest_leverage_tasks(
        tasks: list[Task], top_n: int = 3
    ) -> list[dict[str, Any]]:
        impacts = DependencyAnalyzer.compute_blocking_impact(tasks)
        open_tasks = [t for t in tasks if t.status != "done"]
        scored = []
        for t in open_tasks:
            imp = impacts.get(t.id, {})
            leverage_score = imp.get("total_impact_score", 0)
            if t.priority in ("P0", "P1"):
                leverage_score += 20
            if t.vp_escalation:
                leverage_score += 15
            scored.append(
                {
                    "task_id": t.id,
                    "title": t.title,
                    "leverage_score": round(leverage_score, 1),
                    "blocks_directly": imp.get("blocks_directly", 0),
                    "blocks_transitively": imp.get("blocks_transitively", 0),
                    "blocked_by": imp.get("blocked_by_names", []),
                }
            )

        scored.sort(key=lambda x: x["leverage_score"], reverse=True)
        return scored[:top_n]

    @staticmethod
    def get_unblocking_recommendations(tasks: list[Task]) -> list[dict[str, Any]]:
        impacts = DependencyAnalyzer.compute_blocking_impact(tasks)
        task_map = {t.id: t for t in tasks}
        recommendations = []

        for t in tasks:
            if t.status == "blocked" and t.dependencies:
                for dep_id in t.dependencies:
                    dep_task = task_map.get(dep_id)
                    if dep_task:
                        recommendations.append(
                            {
                                "blocked_task_id": t.id,
                                "blocked_task_title": t.title,
                                "blocking_task_id": dep_id,
                                "blocking_task_title": dep_task.title,
                                "blocking_task_status": dep_task.status,
                                "suggestion": f"Unblock '{t.title}' by completing/resolving '{dep_task.title}'",
                            }
                        )

        critical_path = DependencyAnalyzer.find_critical_path(tasks)
        if len(critical_path) >= 2:
            last_title = (
                task_map[critical_path[-1]].title
                if critical_path[-1] in task_map
                else critical_path[-1]
            )
            first_title = (
                task_map[critical_path[0]].title
                if critical_path[0] in task_map
                else critical_path[0]
            )
            recommendations.append(
                {
                    "blocked_task_id": critical_path[-1],
                    "blocked_task_title": last_title,
                    "blocking_task_id": critical_path[0],
                    "blocking_task_title": first_title,
                    "blocking_task_status": "open",
                    "suggestion": f"Critical path: start with '{first_title}' to unlock downstream tasks",
                }
            )

        return recommendations

    @staticmethod
    def get_dependency_insights(tasks: list[Task]) -> dict[str, Any]:
        if not tasks:
            return empty_insights()

        graph = DependencyAnalyzer._build_graph(tasks)
        task_map = {t.id: t for t in tasks}

        # 1. Build nodes for frontend
        dependency_nodes = []
        for t in tasks:
            try:
                level = len(nx.ancestors(graph, t.id))
            except Exception:
                level = 0
            dependency_nodes.append({
                "id": t.id,
                "title": t.title,
                "source_type": t.source_type,
                "priority": t.priority or "P2",
                "status": t.status or "open",
                "is_blocked": len(list(graph.in_edges(t.id))) > 0,
                "is_blocking": len(list(graph.out_edges(t.id))) > 0,
                "blocked_by_count": len(list(graph.in_edges(t.id))),
                "blocking_count": len(list(graph.out_edges(t.id))),
                "level": level,
            })

        # 2. Find critical path (longest path in DAG)
        critical_path = []
        try:
            critical_path = nx.dag_longest_path(graph)
        except Exception:
            critical_path = DependencyAnalyzer.find_critical_path(tasks)

        # 3. Build edges
        dependency_edges = []
        for source, target in graph.edges():
            data = graph.get_edge_data(source, target) or {}
            dependency_edges.append({
                "source": source,
                "target": target,
                "type": data.get("type", "depends_on"),
                "is_critical": source in critical_path and target in critical_path,
                "weight": data.get("weight", 1.0),
            })

        # 4. Identify blockers (nodes with outgoing edges to non-done tasks)
        blockers = []
        for node in graph.nodes():
            out_edges = list(graph.out_edges(node))
            if out_edges:
                t = task_map.get(node)
                if not t:
                    continue
                direct_blocks = len(out_edges)
                try:
                    descendants = nx.descendants(graph, node)
                    transitive_blocks = len(descendants) - direct_blocks
                except Exception:
                    transitive_blocks = 0
                total_blocks = direct_blocks + transitive_blocks
                impact_score = min(total_blocks * 2.5, 10)
                blocked_by = [p for p, _ in graph.in_edges(node)]

                blockers.append({
                    "task_id": node,
                    "title": t.title,
                    "priority": t.priority or "P2",
                    "status": t.status or "open",
                    "blocks_directly": direct_blocks,
                    "blocks_transitively": transitive_blocks,
                    "total_impact": total_blocks,
                    "blocked_by": blocked_by,
                    "blocking_path": [],
                    "impact_score": round(impact_score, 1),
                    "impact_percentage": round((impact_score / 10) * 100, 1),
                })

        blockers.sort(key=lambda x: x["total_impact"], reverse=True)

        # 5. Generate recommendations
        recommendations = []
        for blocker in blockers[:10]:
            blocked_tasks = []
            blocked_titles = []
            for _, target in graph.out_edges(blocker["task_id"]):
                bt = task_map.get(target)
                if bt:
                    blocked_tasks.append(target)
                    blocked_titles.append(bt.title)
            if blocked_tasks:
                suggestions = DependencyAnalyzer._generate_suggestions(
                    blocker, blocked_tasks, tasks
                )
                recommendations.append({
                    "blocking_task_id": blocker["task_id"],
                    "blocking_task_title": blocker["title"],
                    "blocking_task_priority": blocker["priority"],
                    "blocked_tasks": blocked_tasks,
                    "blocked_task_titles": blocked_titles,
                    "total_blocked_count": len(blocked_tasks),
                    "priority": blocker["priority"],
                    "effort_estimate": DependencyAnalyzer._estimate_effort(blocker["title"]),
                    "suggestion": suggestions,
                })

        # 6. Summary
        summary = {
            "total_tasks": len(tasks),
            "total_edges": len(dependency_edges),
            "blockers_count": len(blockers),
            "critical_path_length": len(critical_path),
            "has_critical_path": len(critical_path) > 0,
        }

        return {
            "tasks": dependency_nodes,
            "edges": dependency_edges,
            "blockers": blockers,
            "recommendations": recommendations[:6],
            "critical_path": critical_path,
            "summary": summary,
        }

    @staticmethod
    def _build_graph(tasks: list[Task]) -> nx.DiGraph:
        G = nx.DiGraph()
        task_ids = {t.id for t in tasks}
        for t in tasks:
            G.add_node(t.id)
            for dep in t.dependencies or []:
                if dep in task_ids:
                    G.add_edge(dep, t.id, type="depends_on", weight=1.0)
            for block in t.blocks or []:
                if block in task_ids:
                    G.add_edge(t.id, block, type="blocks", weight=1.5)
        return G

    @staticmethod
    def _generate_suggestions(
        blocker: dict, blocked_tasks: list[str], tasks: list[Task]
    ) -> str:
        count = len(blocked_tasks)
        if count == 1:
            return f"Complete '{blocker['title']}' to unblock the dependent task"
        elif count <= 3:
            return f"Prioritize '{blocker['title']}' to unblock {count} tasks"
        else:
            return f"Critical blocker: Unblock '{blocker['title']}' to enable {count} tasks to proceed"

    @staticmethod
    def _estimate_effort(title: str) -> str:
        for keyword, estimate in ESTIMATE_KEYWORDS.items():
            if keyword in title.lower():
                return estimate
        return "Standard effort"


def empty_insights() -> dict[str, Any]:
    return {
        "tasks": [],
        "edges": [],
        "blockers": [],
        "recommendations": [],
        "critical_path": [],
        "summary": {
            "total_tasks": 0,
            "total_edges": 0,
            "blockers_count": 0,
            "critical_path_length": 0,
            "has_critical_path": False,
        },
    }
