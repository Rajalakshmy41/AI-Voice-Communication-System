import logging

logger = logging.getLogger(__name__)

def detect_language(text: str) -> str:
    """
    Detects the language of the provided text.
    Returns ISO 639-1 language code (e.g. 'en', 'es', 'fr').
    Falls back to 'en' on failure or if langdetect is not available.
    """
    if not text or len(text.strip()) < 2:
        return "en"
        
    try:
        from langdetect import detect
        lang = detect(text)
        logger.info(f"Detected language: {lang} for text snippet")
        return lang
    except Exception as e:
        logger.warning(f"Failed to detect language using langdetect: {e}. Falling back to default 'en'.")
        # Simple rule-based fallbacks for demonstration/safety
        text_lower = text.lower()
        if any(w in text_lower for w in ["hola", "buenos", "gracias", "amigo", "como"]):
            return "es"
        if any(w in text_lower for w in ["bonjour", "merci", "oui", "salut"]):
            return "fr"
        if any(w in text_lower for w in ["namaste", "aap", "kaise", "haan"]):
            return "hi"
        return "en"
