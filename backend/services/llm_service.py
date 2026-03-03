"""
Cognitive Agent Platform — LLM Service
Primary: Google Gemini  |  Fallback: HuggingFace Inference
"""

import structlog
import google.generativeai as genai
from huggingface_hub import InferenceClient
from tenacity import retry, stop_after_attempt, wait_exponential
from config import get_settings

logger = structlog.get_logger(__name__)


class LLMService:
    """Unified LLM interface with automatic fallback."""

    def __init__(self):
        settings = get_settings()

        # Primary: Gemini
        genai.configure(api_key=settings.gemini_api_key)
        self.gemini_model = genai.GenerativeModel(settings.gemini_model)
        self.gemini_model_name = settings.gemini_model

        # Fallback: HuggingFace
        self.hf_client = InferenceClient(token=settings.huggingface_api_key)

        logger.info("LLMService initialized", primary=settings.gemini_model, fallback="HuggingFace")

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(min=1, max=5))
    def _call_gemini(self, prompt: str, system_instruction: str = "") -> str:
        """Call Gemini API."""
        full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
        response = self.gemini_model.generate_content(full_prompt)
        return response.text

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(min=1, max=5))
    def _call_huggingface(self, prompt: str, system_instruction: str = "") -> str:
        """Call HuggingFace Inference API as fallback."""
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        response = self.hf_client.chat_completion(
            model="mistralai/Mistral-7B-Instruct-v0.3",
            messages=messages,
            max_tokens=2048,
        )
        return response.choices[0].message.content

    def generate(self, prompt: str, system_instruction: str = "") -> str:
        """Generate response using primary LLM, falling back if needed."""
        try:
            result = self._call_gemini(prompt, system_instruction)
            logger.info("LLM response generated", provider="gemini")
            return result
        except Exception as e:
            logger.warning("Gemini failed, falling back to HuggingFace", error=str(e))
            try:
                result = self._call_huggingface(prompt, system_instruction)
                logger.info("LLM response generated", provider="huggingface")
                return result
            except Exception as e2:
                logger.error("Both LLM providers failed", gemini_error=str(e), hf_error=str(e2))
                raise RuntimeError(f"All LLM providers failed: Gemini={e}, HF={e2}")

    async def generate_async(self, prompt: str, system_instruction: str = "") -> str:
        """Async wrapper (runs sync in thread for now)."""
        import asyncio
        return await asyncio.to_thread(self.generate, prompt, system_instruction)


# Singleton
_service: LLMService | None = None


def get_llm_service() -> LLMService:
    global _service
    if _service is None:
        _service = LLMService()
    return _service
