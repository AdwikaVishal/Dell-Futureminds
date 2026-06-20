import requests
import time

API_BASE = "http://localhost:8000"

def test_inject():
    print("=" * 60)
    print("Testing /api/inject")
    print("=" * 60)

    plan = requests.get(f"{API_BASE}/api/plan").json()
    top_before = [t.get("title", "")[:30] for t in plan.get("top_priorities", [])]
    print(f"Before injection - Top 3: {top_before}")

    new_task = {
        "id": "INJECT-P5-001",
        "title": "P1: Production login service down",
        "description": "Users cannot authenticate. All customers affected.",
        "severity": "P1",
        "priority": "P1",
        "source": "injected",
        "status": "open",
        "deadline": "2026-06-21T12:00:00Z"
    }

    resp = requests.post(f"{API_BASE}/api/inject", json=new_task)
    if resp.status_code != 200:
        print(f"Inject failed: {resp.status_code}")
        return False

    updated = resp.json()
    top_after = [t.get("title", "")[:30] for t in updated.get("top_priorities", [])]
    print(f"After injection - Top 3: {top_after}")

    top_titles = [t.get("title", "") for t in updated.get("top_priorities", [])]
    if top_titles and "P1: Production login service" in top_titles[0]:
        print("New task is ranked #1! (Re-prioritization works)")
    else:
        print(f"New task not #1. Top title: {top_titles[0] if top_titles else 'None'}")

    print("=" * 60)
    return True

if __name__ == "__main__":
    test_inject()
