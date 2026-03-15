from faster_whisper import WhisperModel


_model = None  # lazy-loaded singleton


def _get_model():
    """Load the Whisper model once and reuse it."""
    global _model
    if _model is None:
        _model = WhisperModel("small", device="cpu", compute_type="int8")
    return _model


def transcribe_with_google(file_path: str) -> str:
    """Transcribe audio using local Whisper model.

    Args:
        file_path: Path to audio file (WebM/OPUS, MP3, WAV, etc.)

    Returns:
        Transcribed text, or error message if transcription fails.
    """
    try:
        model = _get_model()
        segments, _ = model.transcribe(file_path, language="en")
        return " ".join(seg.text.strip() for seg in segments)
    except Exception as exc:
        return f"[Transcription failed: {exc}]"
