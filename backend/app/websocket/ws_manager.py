import base64
import os
import uuid
import logging
from typing import Dict, List, Set
from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.models import Call, TranslationHistory, VoiceLog, User
from app.ai.whisper_stt import transcribe_audio
from app.ai.translator import translate_text
from app.ai.tts import generate_tts
from app.ai.lang_detector import detect_language
from app.utils.config import settings

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps call_id -> dict of {user_id: WebSocket}
        self.active_calls: Dict[str, Dict[str, WebSocket]] = {}
        # Keep track of active users online/in-call
        self.user_calls: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, call_id: str, user_id: str):
        await websocket.accept()
        if call_id not in self.active_calls:
            self.active_calls[call_id] = {}
        self.active_calls[call_id][user_id] = websocket
        self.user_calls[user_id] = call_id
        logger.info(f"User {user_id} connected to call {call_id}")

    def disconnect(self, call_id: str, user_id: str):
        if call_id in self.active_calls:
            if user_id in self.active_calls[call_id]:
                del self.active_calls[call_id][user_id]
                logger.info(f"User {user_id} disconnected from call {call_id}")
            if not self.active_calls[call_id]:
                del self.active_calls[call_id]
                logger.info(f"Call {call_id} is now empty and removed.")
        if user_id in self.user_calls:
            del self.user_calls[user_id]

    async def send_to_user(self, message: dict, call_id: str, user_id: str):
        if call_id in self.active_calls and user_id in self.active_calls[call_id]:
            websocket = self.active_calls[call_id][user_id]
            await websocket.send_json(message)

    async def broadcast_to_call(self, message: dict, call_id: str):
        if call_id in self.active_calls:
            for user_id, websocket in self.active_calls[call_id].items():
                await websocket.send_json(message)

    async def process_voice_segment(self, call_id: str, sender_id: str, audio_base64: str):
        """
        Main pipeline execution:
        1. Decode original audio segment and save to disk
        2. Transcribe using Whisper (STT)
        3. Detect Language (if needed)
        4. Translate text to receiver's preferred language
        5. Generate translated TTS audio
        6. Persist records in DB
        7. Stream results to the receiver
        """
        # Get receiver_id
        if call_id not in self.active_calls:
            logger.warning(f"No active call session for {call_id}")
            return
            
        participants = list(self.active_calls[call_id].keys())
        if len(participants) < 2:
            logger.warning(f"Waiting for peer to join call {call_id}")
            await self.send_to_user(
                {"type": "system", "message": "Peer is not connected yet. Cannot translate speech."},
                call_id, sender_id
            )
            return

        receiver_id = [p for p in participants if p != sender_id][0]

        # 0. Setup DB context
        db: Session = SessionLocal()
        try:
            sender = db.query(User).filter(User.id == sender_id).first()
            receiver = db.query(User).filter(User.id == receiver_id).first()
            if not sender or not receiver:
                logger.error("Sender or receiver not found in database.")
                return

            # Save incoming audio segment to file
            segment_id = str(uuid.uuid4())
            original_audio_filename = f"orig_{segment_id}.wav"
            original_audio_path = os.path.join(settings.UPLOAD_DIR, "original", original_audio_filename)

            audio_bytes = base64.b64decode(audio_base64)
            with open(original_audio_path, "wb") as f:
                f.write(audio_bytes)

            # 1. Speech-to-Text (STT)
            # Use sender's preferred language as hint for Whisper if they have set it
            source_lang = sender.preferred_language or "en"
            transcription_text = transcribe_audio(original_audio_path, source_lang=source_lang)
            
            if not transcription_text or transcription_text.strip() == "":
                logger.info("Empty transcription; ignoring voice segment.")
                return

            # 2. Language Detection
            detected_lang = detect_language(transcription_text)
            
            # 3. Translation
            target_lang = receiver.preferred_language or "es"
            translated_text = translate_text(transcription_text, source_lang=detected_lang, target_lang=target_lang)

            # 4. Text-to-Speech (TTS)
            translated_audio_filename = f"trans_{segment_id}.mp3"
            translated_audio_path = os.path.join(settings.UPLOAD_DIR, "translated", translated_audio_filename)
            await generate_tts(translated_text, target_lang, translated_audio_path)

            # 5. Persist to DB
            translation_record = TranslationHistory(
                id=segment_id,
                call_id=call_id,
                sender_id=sender_id,
                source_lang=detected_lang,
                target_lang=target_lang,
                original_text=transcription_text,
                translated_text=translated_text
            )
            db.add(translation_record)
            db.flush()

            voice_log = VoiceLog(
                translation_id=segment_id,
                original_audio_path=original_audio_path,
                translated_audio_path=translated_audio_path
            )
            db.add(voice_log)
            db.commit()

            # 6. Read translated audio, encode to base64, and transmit
            with open(translated_audio_path, "rb") as f:
                translated_audio_base64 = base64.b64encode(f.read()).decode("utf-8")

            # Update Sender (show they successfully spoke + original subtitle)
            await self.send_to_user({
                "type": "caption_update",
                "role": "sender",
                "original_text": transcription_text,
                "translated_text": translated_text,
                "source_lang": detected_lang,
                "target_lang": target_lang
            }, call_id, sender_id)

            # Update Receiver (show translated subtitles + play translated audio)
            await self.send_to_user({
                "type": "translated_voice",
                "sender_id": sender_id,
                "original_text": transcription_text,
                "translated_text": translated_text,
                "source_lang": detected_lang,
                "target_lang": target_lang,
                "audio": translated_audio_base64
            }, call_id, receiver_id)

        except Exception as e:
            logger.error(f"Error in processing voice segment: {e}")
            db.rollback()
        finally:
            db.close()

manager = ConnectionManager()
