import os
import logging
import random
from typing import Optional
from app.utils.config import settings

logger = logging.getLogger(__name__)

# Try importing whisper for production mode
model_instance = None

if not settings.USE_MOCK_AI:
    try:
        # We prefer faster-whisper for efficiency on CPU/GPU
        from faster_whisper import WhisperModel
        logger.info(f"Loading Whisper model '{settings.WHISPER_MODEL}' on device '{settings.WHISPER_DEVICE}'...")
        model_instance = WhisperModel(settings.WHISPER_MODEL, device=settings.WHISPER_DEVICE, compute_type="float32")
        logger.info("Whisper model loaded successfully.")
    except Exception as e:
        logger.warning(f"Could not load faster-whisper model: {e}. Falling back to Mock AI mode.")
        settings.USE_MOCK_AI = True

def transcribe_audio(audio_path: str, source_lang: Optional[str] = None) -> str:
    """
    Transcribes audio file to text.
    If USE_MOCK_AI is True, returns a mock translation-friendly phrase.
    """
    if settings.USE_MOCK_AI or model_instance is None:
        logger.info(f"[MOCK STT] Transcribing audio file: {audio_path}")
        
        # Mock phrases by language to simulate conversation
        mock_phrases = {
            "en": [
                "Hello, can you hear me clearly?",
                "I am doing great, how is the weather over there?",
                "Yes, we should definitely schedule a meeting tomorrow.",
                "Have a wonderful day, goodbye!",
                "Real-time voice translation is working perfectly."
            ],
            "es": [
                "Hola, ¿puedes escucharme claramente?",
                "Estoy muy bien, ¿cómo está el clima por allá?",
                "Sí, definitivamente deberíamos programar una reunión mañana.",
                "¡Que tengas un día maravilloso, adiós!",
                "La traducción de voz en tiempo real está funcionando perfectamente."
            ],
            "fr": [
                "Bonjour, pouvez-vous m'entendre clairement?",
                "Je vais très bien, comment est le temps là-bas?",
                "Oui, nous devrions absolument planifier une réunion demain.",
                "Passez une excellente journée, au revoir!",
                "La traduction vocale en temps réel fonctionne parfaitement."
            ],
            "hi": [
                "नमस्ते, क्या आप मुझे स्पष्ट रूप से सुन सकते हैं?",
                "मैं बहुत अच्छा कर रहा हूँ, वहाँ मौसम कैसा है?",
                "हाँ, हमें निश्चित रूप से कल एक बैठक निर्धारित करनी चाहिए।",
                "आपका दिन शुभ हो, अलविदा!",
                "रीयल-टाइम वॉयस ट्रांसलेशन पूरी तरह से काम कर रहा है।"
            ]
        }
        
        lang = source_lang if source_lang in mock_phrases else "en"
        return random.choice(mock_phrases[lang])

    try:
        # Production execution using faster-whisper
        segments, info = model_instance.transcribe(audio_path, beam_size=5, language=source_lang)
        transcription = " ".join([segment.text for segment in segments])
        logger.info(f"Whisper transcribed: {transcription} (language={info.language}, probability={info.language_probability:.2f})")
        return transcription.strip()
    except Exception as e:
        logger.error(f"Error during Whisper transcription: {e}")
        return "Error transcribing audio."
