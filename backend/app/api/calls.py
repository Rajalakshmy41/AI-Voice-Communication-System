import logging
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database.session import get_db, SessionLocal
from app.models.models import Call, User, Notification, TranslationHistory
from app.schemas.schemas import CallCreate, CallResponse, TranslationHistoryResponse
from app.authentication.jwt_handler import get_current_user, verify_token
from app.websocket.ws_manager import manager

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/initiate", response_model=CallResponse)
def initiate_call(call_in: CallCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Find receiver user
    receiver = db.query(User).filter(User.username == call_in.receiver_username).first()
    if not receiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receiver user not found"
        )
        
    if receiver.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot call yourself"
        )

    # Create call
    new_call = Call(
        caller_id=current_user.id,
        receiver_id=receiver.id,
        status="ringing",
        started_at=datetime.utcnow()
    )
    db.add(new_call)
    db.flush()

    # Create notification for receiver
    notification = Notification(
        user_id=receiver.id,
        title="Incoming Voice Call",
        body=f"Incoming translation call from {current_user.username}",
        type="call_invite"
    )
    db.add(notification)
    
    db.commit()
    db.refresh(new_call)
    return new_call

@router.post("/{call_id}/accept", response_model=CallResponse)
def accept_call(call_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )
        
    if call.receiver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot accept this call"
        )

    call.status = "active"
    call.started_at = datetime.utcnow()
    db.commit()
    db.refresh(call)
    return call

@router.post("/{call_id}/reject", response_model=CallResponse)
def reject_call(call_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )
        
    if call.receiver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot reject this call"
        )

    call.status = "rejected"
    call.ended_at = datetime.utcnow()
    db.commit()
    db.refresh(call)
    return call

@router.post("/{call_id}/end", response_model=CallResponse)
def end_call(call_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )
        
    if current_user.id not in [call.caller_id, call.receiver_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this call"
        )

    if call.status != "ended":
        call.status = "ended"
        call.ended_at = datetime.utcnow()
        duration = (call.ended_at - call.started_at).total_seconds()
        call.duration_seconds = int(duration)
        db.commit()
        
    db.refresh(call)
    return call

@router.get("/recent", response_model=List[CallResponse])
def get_recent_calls(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    calls = db.query(Call).filter(
        (Call.caller_id == current_user.id) | (Call.receiver_id == current_user.id)
    ).order_by(Call.started_at.desc()).all()
    return calls

@router.get("/{call_id}/history", response_model=List[TranslationHistoryResponse])
def get_call_history(call_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call session not found"
        )
        
    if current_user.id not in [call.caller_id, call.receiver_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this call"
        )
        
    history = db.query(TranslationHistory).filter(
        TranslationHistory.call_id == call_id
    ).order_by(TranslationHistory.created_at.asc()).all()
    
    return history


# WebSocket Call Audio Translation Protocol Endpoint
@router.websocket("/ws/{call_id}")
async def call_websocket_endpoint(websocket: WebSocket, call_id: str, token: str):
    """
    WebSocket endpoint for real-time voice segment streaming and translated subtitles.
    Accepts segment-based voice data and returns translation updates & TTS audio.
    """
    db = SessionLocal()
    user_id = None
    try:
        # 1. Verify token
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )
        token_data = verify_token(token, credentials_exception)
        user_id = token_data.user_id
        
        # 2. Check call validity
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call or call.status not in ["ringing", "active"]:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        # 3. Add connection to websocket manager
        await manager.connect(websocket, call_id, user_id)
        
        # Keep receiving audio frames or signaling messages
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "voice_segment":
                # Expecting format: {"type": "voice_segment", "audio": "BASE64_ENCODED_WAV"}
                audio_base64 = data.get("audio")
                if audio_base64:
                    # Run translation process in background/pipeline
                    await manager.process_voice_segment(call_id, user_id, audio_base64)
                    
            elif msg_type == "hangup":
                # Peer requested to end call
                logger.info(f"User {user_id} requested hangup in call {call_id}")
                break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id} on call {call_id}")
    except Exception as e:
        logger.error(f"Error in WebSocket handler: {e}")
    finally:
        db.close()
        if user_id:
            manager.disconnect(call_id, user_id)
            # Broadcast call end notice to remaining participant
            await manager.broadcast_to_call({"type": "peer_hung_up"}, call_id)
