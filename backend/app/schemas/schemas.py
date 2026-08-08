from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    preferred_language: str = Field("en", min_length=2, max_length=10)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdateLang(BaseModel):
    preferred_language: str = Field(..., min_length=2, max_length=10)

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[str] = None

# Contact Schemas
class ContactBase(BaseModel):
    contact_username: str
    nickname: Optional[str] = None

class ContactCreate(ContactBase):
    pass

class ContactUpdate(BaseModel):
    status: str  # accepted, blocked, rejected

class ContactResponse(BaseModel):
    id: str
    user_id: str
    contact_user: UserResponse
    nickname: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Call Schemas
class CallCreate(BaseModel):
    receiver_username: str

class CallResponse(BaseModel):
    id: str
    caller_id: str
    receiver_id: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime]
    duration_seconds: int
    caller: Optional[UserResponse] = None
    receiver: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# Translation Schemas
class TranslationHistoryResponse(BaseModel):
    id: str
    call_id: str
    sender_id: str
    source_lang: str
    target_lang: str
    original_text: str
    translated_text: str
    created_at: datetime

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    body: str
    is_read: bool
    type: str
    created_at: datetime

    class Config:
        from_attributes = True
