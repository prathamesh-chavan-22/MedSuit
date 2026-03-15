"""Mistral AI service for structuring clinical transcripts into SOAP format."""
import os
import json
import httpx
from typing import Optional


MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"

SYSTEM_PROMPT = """You are a clinical documentation assistant.
Convert the doctor's dictated transcript into a structured SOAP note.
Return ONLY valid JSON with keys: subjective, objective, assessment, plan, confidence (0.0-1.0).
- subjective: patient symptoms as reported
- objective: clinical findings/vitals mentioned
- assessment: diagnosis/impression
- plan: treatment plan
Keep each field concise and clinically accurate. If a field isn't in the transcript, write a short placeholder."""


def structure_transcript_to_soap(transcript: str, note_type: str = "general") -> dict:
    """Call Mistral to structure raw transcript into SOAP format."""
    if not MISTRAL_API_KEY:
        return _fallback_draft(transcript)

    prompt = f"Note type: {note_type}\nTranscript: {transcript}"

    try:
        response = httpx.post(
            MISTRAL_URL,
            headers={"Authorization": f"Bearer {MISTRAL_API_KEY}"},
            json={
                "model": "mistral-small-latest",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.3,
            },
            timeout=30.0,
        )
        response.raise_for_status()

        content = response.json()["choices"][0]["message"]["content"]
        result = json.loads(content)
        return {
            "subjective": result.get("subjective", transcript),
            "objective": result.get("objective", ""),
            "assessment": result.get("assessment", ""),
            "plan": result.get("plan", ""),
            "confidence": float(result.get("confidence", 0.75)),
        }
    except Exception as e:
        # Fall back to simple draft on any API error
        print(f"Warning: Mistral API error: {e}")
        return _fallback_draft(transcript)


def _fallback_draft(transcript: str) -> dict:
    """Fallback draft when Mistral is unavailable."""
    return {
        "subjective": transcript,
        "objective": "Bedside findings to be reviewed.",
        "assessment": "Clinician review required.",
        "plan": "Finalize treatment plan after clinician review.",
        "confidence": 0.55,
    }
