from google.cloud import speech


def transcribe_with_google(file_path: str) -> str:
    """Send audio to Google Speech-to-Text and return transcript."""
    try:
        client = speech.SpeechClient()

        with open(file_path, "rb") as f:
            content = f.read()

        audio = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code="en-US",
            enable_automatic_punctuation=True,
        )
        response = client.recognize(config=config, audio=audio)
        return " ".join(r.alternatives[0].transcript for r in response.results)
    except Exception as exc:
        return f"[Transcription failed: {exc}]"
