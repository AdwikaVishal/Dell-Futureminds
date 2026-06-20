import asyncio

from core.llm_clients import call_llm


async def main():
    print("\n========== TESTING XAI (GROK) CONNECTION ==========\n")

    try:
        resp = await call_llm(
            prompt='Return a JSON object with a "status" field set to "ok"',
            json_mode=True,
        )
        print(f"Model: {resp.model}")
        print(f"Status: {resp.parsed_json}")
        print(f"Latency: {round(resp.latency_ms, 1)}ms")
        print("\n✓ xAI (Grok) connected and responding\n")
    except Exception as e:
        print(f"✗ xAI (Grok) connection failed: {e}")
        print("Falling back to heuristic mode.\n")


if __name__ == "__main__":
    asyncio.run(main())
