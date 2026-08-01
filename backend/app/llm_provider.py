from abc import ABC, abstractmethod
import os
import httpx
from typing import Optional, Dict, Any

class BaseLLMProvider(ABC):
    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Unique identifier for the LLM provider."""
        pass

    @abstractmethod
    async def generate_text(self, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        """Generates text completion based on system and user prompts."""
        pass


class OllamaProvider(BaseLLMProvider):
    """
    Connects to the local Ollama sidecar container on port 11434.
    Utilizes OpenAI-compatible /v1/chat/completions endpoint.
    """

    def __init__(
        self, 
        base_url: Optional[str] = None, 
        model_name: Optional[str] = None
    ):
        self.base_url = base_url or os.getenv("OLLAMA_BASE_URL", "http://ollama:11434/v1")
        self.model_name = model_name or os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")

    @property
    def provider_id(self) -> str:
        return f"ollama-sidecar ({self.model_name})"

    async def generate_text(self, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        endpoint = f"{self.base_url.rstrip('/')}/chat/completions"
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": 0.7
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(endpoint, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]


class OVMSProvider(BaseLLMProvider):
    """
    Connects to the OpenVINO Model Server (OVMS) sidecar container on port 9001.
    """

    def __init__(
        self, 
        base_url: Optional[str] = None, 
        model_name: Optional[str] = None
    ):
        self.base_url = base_url or os.getenv("OVMS_BASE_URL", "http://ovms:9001/v1")
        self.model_name = model_name or os.getenv("OVMS_MODEL", "qwen2.5-coder:7b")

    @property
    def provider_id(self) -> str:
        return f"openvino-ovms ({self.model_name})"

    async def generate_text(self, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        endpoint = f"{self.base_url.rstrip('/')}/chat/completions"
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": max_tokens
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(endpoint, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
