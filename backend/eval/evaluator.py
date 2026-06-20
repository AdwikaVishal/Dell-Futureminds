import json
import requests
import sys
from typing import Dict, List
from rapidfuzz import fuzz

API_BASE_URL = "http://localhost:8000"

def load_ground_truth():
    with open("eval/ground_truth.json", "r") as f:
        return json.load(f)

def fetch_data(endpoint: str):
    try:
        resp = requests.get(f"{API_BASE_URL}{endpoint}", timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"Failed to fetch {endpoint}: {e}")
        return None

def evaluate_extraction(gt: Dict, tasks: List) -> Dict:
    gt_items = gt.get("expected_action_items", [])
    if not gt_items:
        return {"recall": 1.0, "precision": 1.0, "matches": 0}

    gt_titles = [i["title"].lower() for i in gt_items]
    ext_titles = [t.get("title", "").lower() for t in tasks if t.get("source_type") in ["email", "transcript"]]

    matches = 0
    for gt_title in gt_titles:
        for ext_title in ext_titles:
            if fuzz.partial_ratio(gt_title, ext_title) > 70:
                matches += 1
                break

    recall = matches / len(gt_titles)
    precision = matches / len(ext_titles) if ext_titles else 0.0

    return {"recall": round(recall, 3), "precision": round(precision, 3), "matches": matches, "gt_count": len(gt_titles)}

def evaluate_deduplication(gt: Dict, tasks: List) -> Dict:
    gt_pairs = gt.get("expected_dedup_pairs", [])
    if not gt_pairs:
        return {"precision": 1.0}

    task_map = {t.get("id", ""): t for t in tasks}
    correct = 0
    total = len(gt_pairs)

    for pair in gt_pairs:
        t1 = task_map.get(pair["task1_id"])
        t2 = task_map.get(pair["task2_id"])
        if not t1 or not t2:
            continue
        title_sim = fuzz.partial_ratio(
            t1.get("title", "").lower(),
            t2.get("title", "").lower()
        ) / 100.0
        merged = title_sim > 0.8

        if merged == pair["should_merge"]:
            correct += 1

    precision = correct / total if total > 0 else 1.0
    return {"precision": round(precision, 3), "correct": correct, "total": total}

def evaluate_prioritization(gt: Dict, ranked: List) -> Dict:
    gt_order = gt.get("expected_priority_order", [])
    if not gt_order:
        return {"tau": 1.0, "acceptable": True}

    actual = [t.get("id", "") for t in ranked]
    common = [x for x in gt_order if x in actual]
    if len(common) < 2:
        return {"tau": 0.0, "acceptable": False}

    actual_rank = {t: i for i, t in enumerate(actual) if t in common}
    concordant = 0
    discordant = 0

    for i in range(len(common)):
        for j in range(i + 1, len(common)):
            if actual_rank.get(common[i], 0) < actual_rank.get(common[j], 0):
                concordant += 1
            else:
                discordant += 1

    tau = (concordant - discordant) / (concordant + discordant) if (concordant + discordant) > 0 else 0
    return {"tau": round(tau, 3), "acceptable": tau >= 0.8}

def evaluate_rationale(gt: Dict, ranked: List) -> Dict:
    gt_keywords = gt.get("expected_rationale_keywords", {})
    scores = []
    for task in ranked:
        task_id = task.get("id", "")
        rationale = task.get("rationale", "").lower()
        if task_id in gt_keywords:
            keywords = gt_keywords[task_id]
            found = sum(1 for kw in keywords if kw.lower() in rationale)
            scores.append(found / len(keywords) if keywords else 0)
    avg = sum(scores) / len(scores) if scores else 0
    return {"coverage": round(avg, 3)}

def run():
    print("=" * 60)
    print("TaskPilot AI - Evaluation Runner")
    print("=" * 60)

    gt = load_ground_truth()
    print(f"Ground truth loaded ({len(gt.get('expected_action_items', []))} items)")

    tasks_data = fetch_data("/api/tasks")
    plan_data = fetch_data("/api/plan")

    if not tasks_data or not plan_data:
        print("\nFailed to fetch API data. Is the backend running?")
        print("   Run: uvicorn api.main:app --reload")
        sys.exit(1)

    tasks = tasks_data if isinstance(tasks_data, list) else tasks_data.get("tasks", [])
    ranked = plan_data.get("ranked_tasks", [])
    print(f"API data: {len(tasks)} tasks, {len(ranked)} ranked")

    print("\n" + "=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)

    ext = evaluate_extraction(gt, tasks)
    print(f"\nExtraction (target: recall >= 0.95):")
    print(f"   Recall: {ext['recall']:.3f} | Precision: {ext['precision']:.3f}")
    print(f"   Matches: {ext['matches']}/{ext['gt_count']}")

    dedup = evaluate_deduplication(gt, tasks)
    print(f"\nDeduplication (target: precision >= 0.90):")
    print(f"   Precision: {dedup['precision']:.3f}")
    print(f"   Correct: {dedup.get('correct', 0)}/{dedup.get('total', 0)}")

    priority = evaluate_prioritization(gt, ranked)
    print(f"\nPrioritization (target: tau >= 0.80):")
    print(f"   Kendall's Tau: {priority['tau']:.3f} {'PASS' if priority['acceptable'] else 'FAIL'}")

    rationale = evaluate_rationale(gt, ranked)
    print(f"\nRationale Quality:")
    print(f"   Keyword Coverage: {rationale['coverage']:.3f}")

    print("\n" + "=" * 60)
    all_pass = ext['recall'] >= 0.95 and dedup['precision'] >= 0.90 and priority['acceptable']
    print(f"OVERALL: {'PASS' if all_pass else 'FAIL'}")
    print("=" * 60)
    return all_pass

if __name__ == "__main__":
    run()
