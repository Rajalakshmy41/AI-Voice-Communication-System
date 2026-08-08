import os
import wave
import struct
import logging
import asyncio
from app.utils.config import settings

logger = logging.getLogger(__name__)

# Map language codes to Microsoft Edge TTS neural voices
VOICE_MAP = {
    "en": "en-US-AriaNeural",
    "es": "es-ES-ElviraNeural",
    "fr": "fr-FR-DeniseNeural",
    "hi": "hi-IN-SwaraNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "de": "de-DE-KatjaNeural",
    "it": "it-IT-ElsaNeural",
    "ja": "ja-JP-NanamiNeural",
    "pt": "pt-BR-FranciscaNeural"
}

def get_voice_for_lang(lang_code: str) -> str:
    lang_prefix = lang_code.split("-")[0].lower()
    return VOICE_MAP.get(lang_prefix, "en-US-AriaNeural")

def generate_silent_wav(output_path: str, duration_seconds: float = 0.5):
    """
    Generates a valid minimal silent mono WAV file (16kHz, 16-bit PCM).
    Used as an offline or error fallback.
    """
    sample_rate = 16000
    num_samples = int(sample_rate * duration_seconds)
    
    with wave.open(output_path, 'wb') as wav_file:
        # Mono, 2 bytes per sample (16-bit), 16000Hz
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        # Write silence (zeroes)
        for _ in range(num_samples):
            data = struct.pack('<h', 0)
            wav_file.writeframesraw(data)

async def generate_tts(text: str, lang_code: str, output_path: str) -> bool:
    """
    Generates TTS speech file (MP3) from text.
    Returns True if successful, False if fallback was used.
    """
    if not text or text.strip() == "":
        generate_silent_wav(output_path)
        return False
        
    voice = get_voice_for_lang(lang_code)
    
    try:
        import edge_tts
        logger.info(f"Generating TTS for language '{lang_code}' using voice '{voice}' to {output_path}")
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output_path)
        return True
    except Exception as e:
        logger.warning(f"Failed to generate TTS via edge-tts: {e}. Generating fallback WAV silence.")
        # Ensure path directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        generate_silent_wav(output_path)
        return False
