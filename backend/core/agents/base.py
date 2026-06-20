from abc import ABC, abstractmethod
from typing import Any


class BaseAgent(ABC):
    name: str = "base"

    @abstractmethod
    async def process(self, context: dict[str, Any]) -> dict[str, Any]:
        ...

    def get_trace(self) -> dict[str, Any]:
        return {"agent": self.name, "status": "ok", "duration_ms": 0}
