import logging
from app.utils.config import settings

logger = logging.getLogger(__name__)

# Basic dictionary of translations for offline/fallback mock mode
FALLBACK_TRANSLATIONS = {
    # English -> Spanish
    ("en", "es", "Hello, can you hear me clearly?"): "Hola, ¿puedes escucharme claramente?",
    ("en", "es", "I am doing great, how is the weather over there?"): "Estoy muy bien, ¿cómo está el clima por allá?",
    ("en", "es", "Yes, we should definitely schedule a meeting tomorrow."): "Sí, definitivamente deberíamos programar una reunión mañana.",
    ("en", "es", "Have a wonderful day, goodbye!"): "¡Que tengas un día maravilloso, adiós!",
    ("en", "es", "Real-time voice translation is working perfectly."): "La traducción de voz en tiempo real está funcionando perfectamente.",
    
    # Spanish -> English
    ("es", "en", "Hola, ¿puedes escucharme claramente?"): "Hello, can you hear me clearly?",
    ("es", "en", "Estoy muy bien, ¿cómo está el clima por allá?"): "I am doing great, how is the weather over there?",
    ("es", "en", "Sí, definitivamente deberíamos programar una reunión mañana."): "Yes, we should definitely schedule a meeting tomorrow.",
    ("es", "en", "¡Que tengas un día maravilloso, adiós!"): "Have a wonderful day, goodbye!",
    ("es", "en", "La traducción de voz en tiempo real está funcionando perfectamente."): "Real-time voice translation is working perfectly.",
    
    # English -> French
    ("en", "fr", "Hello, can you hear me clearly?"): "Bonjour, pouvez-vous m'entendre clairement?",
    ("en", "fr", "I am doing great, how is the weather over there?"): "Je vais très bien, comment est le temps là-bas?",
    ("en", "fr", "Yes, we should definitely schedule a meeting tomorrow."): "Oui, nous devrions absolument planifier une réunion demain.",
    ("en", "fr", "Have a wonderful day, goodbye!"): "Passez une excellente journée, au revoir!",
    ("en", "fr", "Real-time voice translation is working perfectly."): "La traduction vocale en temps réel fonctionne parfaitement.",
    
    # French -> English
    ("fr", "en", "Bonjour, pouvez-vous m'entendre clairement?"): "Hello, can you hear me clearly?",
    ("fr", "en", "Je vais très bien, comment est le temps là-bas?"): "I am doing great, how is the weather over there?",
    ("fr", "en", "Oui, nous devrions absolument planifier une réunion demain."): "Yes, we should definitely schedule a meeting tomorrow.",
    ("fr", "en", "Passez une excellente journée, au revoir!"): "Have a wonderful day, goodbye!",
    ("fr", "en", "La traduction vocale en temps réel fonctionne parfaitement."): "Real-time voice translation is working perfectly.",
    
    # English -> Hindi
    ("en", "hi", "Hello, can you hear me clearly?"): "नमस्ते, क्या आप मुझे स्पष्ट रूप से सुन सकते हैं?",
    ("en", "hi", "I am doing great, how is the weather over there?"): "मैं बहुत अच्छा कर रहा हूँ, वहाँ मौसम कैसा है?",
    ("en", "hi", "Yes, we should definitely schedule a meeting tomorrow."): "हाँ, हमें निश्चित रूप से कल एक बैठक निर्धारित करनी चाहिए।",
    ("en", "hi", "Have a wonderful day, goodbye!"): "आपका दिन शुभ हो, अलविदा!",
    ("en", "hi", "Real-time voice translation is working perfectly."): "रीयल-टाइम वॉयस ट्रांसलेशन पूरी तरह से काम कर रहा है।",
    
    # Hindi -> English
    ("hi", "en", "नमस्ते, क्या आप मुझे स्पष्ट रूप से सुन सकते हैं?"): "Hello, can you hear me clearly?",
    ("hi", "en", "मैं बहुत अच्छा कर रहा हूँ, वहाँ मौसम कैसा है?"): "I am doing great, how is the weather over there?",
    ("hi", "en", "हाँ, हमें निश्चित रूप से कल एक बैठक निर्धारित करनी चाहिए।"): "Yes, we should definitely schedule a meeting tomorrow.",
    ("hi", "en", "आपका दिन शुभ हो, अलविदा!"): "Have a wonderful day, goodbye!",
    ("hi", "en", "रीयल-टाइम वॉयस ट्रांसलेशन पूरी तरह से काम कर रहा है।"): "Real-time voice translation is working perfectly."
}

def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """
    Translates text from source_lang to target_lang.
    Falls back to dictionary lookups or mock translations if deep-translator is unavailable/fails.
    """
    if not text or text.strip() == "":
        return ""
        
    source_lang = source_lang.lower()
    target_lang = target_lang.lower()
    
    if source_lang == target_lang:
        return text

    # Try deep-translator first
    try:
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        translated = translator.translate(text)
        logger.info(f"Translated via Google Translate: '{text}' ({source_lang}) -> '{translated}' ({target_lang})")
        return translated
    except Exception as e:
        logger.warning(f"Google Translate API failed or deep-translator not installed: {e}. Checking offline mock fallback...")
        
        # Check dictionary fallback
        lookup_key = (source_lang, target_lang, text.strip())
        if lookup_key in FALLBACK_TRANSLATIONS:
            val = FALLBACK_TRANSLATIONS[lookup_key]
            logger.info(f"Fallback translated: {val}")
            return val
            
        # Basic heuristic fallback: prefix the text to show translation target
        simulated_translation = f"[{target_lang.upper()}] {text}"
        logger.info(f"Generated pseudo-translation: '{simulated_translation}'")
        return simulated_translation
