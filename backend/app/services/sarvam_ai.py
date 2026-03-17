"""Sarvam AI integration for Speech-to-Text (STT) and Text-to-Speech (TTS)."""
import os
import tempfile
import requests

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")

STT_URL = "https://api.sarvam.ai/speech-to-text"
TTS_STREAM_URL = "https://api.sarvam.ai/text-to-speech/stream"


def transcribe_audio_sarvam(file_path: str, language_code: str = "en-IN") -> str:
    """Transcribe audio using Sarvam AI STT.

    Args:
        file_path: Path to audio file (WebM, MP3, WAV, etc.)
        language_code: BCP-47 language code, defaults to 'en-IN'.

    Returns:
        Transcribed text, or an error message if transcription fails.
    """
    if not SARVAM_API_KEY:
        return "[Transcription failed: SARVAM_API_KEY is not set]"

    headers = {
        "api-subscription-key": SARVAM_API_KEY,
    }
    try:
        with open(file_path, "rb") as audio_file:
            filename = os.path.basename(file_path)
            # Determine MIME type for the file
            ext = os.path.splitext(filename)[-1].lower()
            mime_map = {
                ".webm": "audio/webm",
                ".mp3": "audio/mpeg",
                ".wav": "audio/wav",
                ".ogg": "audio/ogg",
                ".m4a": "audio/mp4",
            }
            mime_type = mime_map.get(ext, "audio/webm")

            files = {
                "file": (filename, audio_file, mime_type),
            }
            data = {
                "model": "saarika:v2",
                "language_code": language_code,
            }
            response = requests.post(STT_URL, headers=headers, files=files, data=data, timeout=60)
            response.raise_for_status()
            result = response.json()
            # Sarvam AI STT returns {"transcript": "...", ...}
            return result.get("transcript", "")
    except requests.HTTPError as exc:
        return f"[Transcription failed: HTTP {exc.response.status_code} — {exc.response.text}]"
    except Exception as exc:
        return f"[Transcription failed: {exc}]"


def stream_tts_to_file(text: str, output_path: str, language_code: str = "en-IN") -> bool:
    """Generate TTS audio from Sarvam AI and save it to a file.

    Args:
        text: Text to synthesize.
        output_path: Absolute path to save the audio file.
        language_code: BCP-47 language code.

    Returns:
        True on success, False on failure.
    """
    if not SARVAM_API_KEY:
        return False

    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "target_language_code": language_code,
        "speaker": "shruti",
        "model": "bulbul:v3",
        "pace": 1.0,
        "speech_sample_rate": 22050,
        "output_audio_codec": "mp3",
        "enable_preprocessing": True,
    }
    try:
        with requests.post(
            TTS_STREAM_URL, headers=headers, json=payload, stream=True, timeout=60
        ) as response:
            response.raise_for_status()
            with open(output_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
        return True
    except Exception:
        return False


def generate_tts_bytes(text: str, language_code: str = "en-IN") -> bytes | None:
    """Generate TTS audio bytes from Sarvam AI.

    Args:
        text: Text to synthesize.
        language_code: BCP-47 language code.

    Returns:
        Raw audio bytes (mp3) or None on failure.
    """
    if not SARVAM_API_KEY:
        return None

    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "target_language_code": language_code,
        "speaker": "shruti",
        "model": "bulbul:v3",
        "pace": 1.0,
        "speech_sample_rate": 22050,
        "output_audio_codec": "mp3",
        "enable_preprocessing": True,
    }
    try:
        with requests.post(
            TTS_STREAM_URL, headers=headers, json=payload, stream=True, timeout=60
        ) as response:
            response.raise_for_status()
            return response.content
    except Exception:
        return None
