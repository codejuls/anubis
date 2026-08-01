import pytest
from app.llm_provider import OllamaProvider, OVMSProvider

def test_ollama_provider_init():
    provider = OllamaProvider()
    assert "ollama-sidecar" in provider.provider_id
    assert provider.model_name == "qwen2.5-coder:7b"

def test_ovms_provider_init():
    provider = OVMSProvider()
    assert "openvino-ovms" in provider.provider_id

@pytest.mark.asyncio
async def test_ollama_generate_text_integration():
    """Live integration test against the local Ollama sidecar container"""
    provider = OllamaProvider()
    res = await provider.generate_text(
        system_prompt="You are a medical coding assistant. Respond concisely.",
        user_prompt="Explain what ICD-10 code A41.9 represents in 1 sentence.",
        max_tokens=60
    )
    assert isinstance(res, str)
    assert len(res) > 0
    assert "sepsis" in res.lower() or "icd" in res.lower() or "a41.9" in res.lower()
