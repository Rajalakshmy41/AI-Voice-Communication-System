import base64
import os
import sys
# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.models.models import User, Call

def test_pipeline():
    # 1. Setup DB
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Clean up existing test users if any
    db.query(User).filter(User.username.in_(["test_caller", "test_receiver"])).delete(synchronize_session=False)
    db.commit()
    
    # 2. Register users
    client = TestClient(app)
    
    # Register Caller (English)
    response = client.post("/api/v1/auth/register", json={
        "username": "test_caller",
        "email": "caller@example.com",
        "password": "testpassword",
        "preferred_language": "en"
    })
    assert response.status_code == 201, f"Caller registration failed: {response.text}"
    caller_data = response.json()
    
    # Register Receiver (Spanish)
    response = client.post("/api/v1/auth/register", json={
        "username": "test_receiver",
        "email": "receiver@example.com",
        "password": "testpassword",
        "preferred_language": "es"
    })
    assert response.status_code == 201, f"Receiver registration failed: {response.text}"
    receiver_data = response.json()
    
    # 3. Log in caller to get token
    response = client.post("/api/v1/auth/login", json={
        "username": "test_caller",
        "password": "testpassword"
    })
    assert response.status_code == 200, f"Caller login failed: {response.text}"
    token = response.json()["access_token"]
    
    # 4. Log in receiver to get token
    response = client.post("/api/v1/auth/login", json={
        "username": "test_receiver",
        "password": "testpassword"
    })
    assert response.status_code == 200
    receiver_token = response.json()["access_token"]
    
    # 5. Initiate Call
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/v1/calls/initiate", json={
        "receiver_username": "test_receiver"
    }, headers=headers)
    assert response.status_code == 200, f"Call initiation failed: {response.text}"
    call_session = response.json()
    call_id = call_session["id"]
    
    # 6. Accept Call
    receiver_headers = {"Authorization": f"Bearer {receiver_token}"}
    response = client.post(f"/api/v1/calls/{call_id}/accept", headers=receiver_headers)
    assert response.status_code == 200, f"Call acceptance failed: {response.text}"
    
    print(f"Call {call_id} initiated and accepted successfully.")
    
    # 7. Connect WebSockets
    print("Connecting receiver WebSocket...")
    with client.websocket_connect(f"/api/v1/calls/ws/{call_id}?token={receiver_token}") as ws_receiver:
        print("Receiver WebSocket connected. Connecting caller WebSocket...")
        with client.websocket_connect(f"/api/v1/calls/ws/{call_id}?token={token}") as ws_caller:
            print("Caller WebSocket connected. Sending a voice segment...")
            
            # Send a mock base64 audio segment
            dummy_wav_base64 = base64.b64encode(b"RIFF....dummy WAV audio data....").decode("utf-8")
            
            ws_caller.send_json({
                "type": "voice_segment",
                "audio": dummy_wav_base64
            })
            
            # The sender should receive caption_update
            caller_msg = ws_caller.receive_json()
            print(f"Caller received update: {caller_msg}")
            assert caller_msg["type"] == "caption_update"
            assert caller_msg["role"] == "sender"
            
            # The receiver should receive translated_voice
            receiver_msg = ws_receiver.receive_json()
            print(f"Receiver received update: {receiver_msg}")
            assert receiver_msg["type"] == "translated_voice"
            assert "audio" in receiver_msg
            
            print("\nSuccess! VoIP Call Audio Translation pipeline verified successfully in-memory.")

if __name__ == "__main__":
    try:
        test_pipeline()
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
