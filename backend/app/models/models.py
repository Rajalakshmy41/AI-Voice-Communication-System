import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(100), nullable=False)
    preferred_language = Column(String(10), default="en")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    contacts = relationship("Contact", foreign_keys="Contact.user_id", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    contact_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    nickname = Column(String(50), nullable=True)
    status = Column(String(20), default="pending")  # pending, accepted, blocked
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="contacts")
    contact_user = relationship("User", foreign_keys=[contact_user_id])

class Call(Base):
    __tablename__ = "calls"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    caller_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    receiver_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="ringing")  # ringing, active, ended, missed, rejected
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)
    
    # Relationships
    caller = relationship("User", foreign_keys=[caller_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    translations = relationship("TranslationHistory", back_populates="call")

class TranslationHistory(Base):
    __tablename__ = "translation_history"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id = Column(String(36), ForeignKey("calls.id"), nullable=False)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    source_lang = Column(String(10), nullable=False)
    target_lang = Column(String(10), nullable=False)
    original_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    call = relationship("Call", back_populates="translations")
    sender = relationship("User", foreign_keys=[sender_id])
    voice_log = relationship("VoiceLog", uselist=False, back_populates="translation")

class VoiceLog(Base):
    __tablename__ = "voice_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    translation_id = Column(String(36), ForeignKey("translation_history.id"), nullable=False)
    original_audio_path = Column(String(255), nullable=True)
    translated_audio_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    translation = relationship("TranslationHistory", back_populates="voice_log")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(100), nullable=False)
    body = Column(String(255), nullable=False)
    is_read = Column(Boolean, default=False)
    type = Column(String(20), nullable=False)  # call_invite, contact_request, general
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="notifications")
