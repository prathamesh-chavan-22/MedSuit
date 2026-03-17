"""Audio transcription wrapper – uses Sarvam AI STT (replaces faster-whisper)."""
from app.services.sarvam_ai import transcribe_audio_sarvam


def transcribe_with_google(file_path: str, language_code: str = "en-IN") -> str:
    """Transcribe audio using Sarvam AI STT.

    Args:
        file_path: Path to audio file (WebM/OPUS, MP3, WAV, etc.)
        language_code: BCP-47 language code (default: en-IN).

    Returns:
        Transcribed text, or error message if transcription fails.
    """
    return transcribe_audio_sarvam(file_path, language_code=language_code)
