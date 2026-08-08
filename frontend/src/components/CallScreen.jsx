import React, { useState, useEffect, useRef } from 'react';
import { getToken } from '../services/api';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Radio, Sparkles, Loader2 } from 'lucide-react';

export default function CallScreen({ callSession, role, onCallEnded }) {
  const [callStatus, setCallStatus] = useState(callSession.status); // ringing, active, ended
  const [isMuted, setIsMuted] = useState(false);
  const [isVolumeOn, setIsVolumeOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [captions, setCaptions] = useState([]); // [{sender, originalText, translatedText, sourceLang, targetLang}]
  const [isPeerConnected, setIsPeerConnected] = useState(false);

  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const captionsEndRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const isRecordingActiveRef = useRef(false);

  // Timer for call duration
  useEffect(() => {
    let timer;
    if (callStatus === 'active') {
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  // Scroll captions to bottom
  useEffect(() => {
    captionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [captions]);

  // Establish WebSocket connection
  useEffect(() => {
    const token = getToken();
    const wsUrl = `ws://localhost:8000/api/v1/calls/ws/${callSession.id}?token=${token}`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Call WebSocket connected');
      if (role === 'receiver') {
        setIsPeerConnected(true);
        setCallStatus('active');
      }
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'system') {
          // Toast or system message
          setCaptions((prev) => [...prev, { system: true, text: message.message }]);
        } 
        else if (message.type === 'caption_update' && message.role === 'sender') {
          // I spoke, show what I said
          setCaptions((prev) => [...prev, {
            isMe: true,
            originalText: message.original_text,
            translatedText: message.translated_text,
            sourceLang: message.source_lang,
            targetLang: message.target_lang
          }]);
          setIsPeerConnected(true);
          setCallStatus('active');
        } 
        else if (message.type === 'translated_voice') {
          // Peer spoke, display translations and play TTS audio
          setCaptions((prev) => [...prev, {
            isMe: false,
            originalText: message.original_text,
            translatedText: message.translated_text,
            sourceLang: message.source_lang,
            targetLang: message.target_lang
          }]);
          setIsPeerConnected(true);
          setCallStatus('active');

          if (isVolumeOn && message.audio) {
            playBase64Audio(message.audio);
          }
        } 
        else if (message.type === 'peer_hung_up') {
          setCallStatus('ended');
          setCaptions((prev) => [...prev, { system: true, text: 'Call ended by peer.' }]);
          stopRecording();
          setTimeout(onCallEnded, 2500);
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    socket.onclose = () => {
      console.log('Call WebSocket closed');
      setCallStatus('ended');
      stopRecording();
      setTimeout(onCallEnded, 1500);
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
      setCallStatus('ended');
      stopRecording();
      setTimeout(onCallEnded, 1500);
    };

    // Initialize microphone
    startMicrophone();

    return () => {
      stopRecording();
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Helper to play received TTS audio
  const playBase64Audio = (base64Data) => {
    try {
      const audioBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const audioBlob = new Blob([audioBytes], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (err) {
      console.error('Error playing translated audio:', err);
    }
  };

  // Start capturing audio from microphone
  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      isRecordingActiveRef.current = true;
      
      // Start chunked recording cycle
      startRecordingCycles();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setCaptions((prev) => [...prev, { system: true, text: 'Microphone access denied. You cannot speak.' }]);
    }
  };

  // Audio chunk cycle: record in 3-second intervals and send
  const startRecordingCycles = () => {
    if (!isRecordingActiveRef.current) return;

    let chunks = [];
    const mediaRecorder = new MediaRecorder(audioStreamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    });
    
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      if (chunks.length > 0 && !isMuted && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        const audioBlob = new Blob(chunks, { type: mediaRecorder.mimeType });
        
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result.split(',')[1];
          socketRef.current.send(JSON.stringify({
            type: 'voice_segment',
            audio: base64Data
          }));
        };
      }
      
      // Immediately start the next recording cycle if call is active
      if (isRecordingActiveRef.current && callStatus !== 'ended') {
        startRecordingCycles();
      }
    };

    // Record for 3 seconds, then stop to trigger onstop & start next chunk
    mediaRecorder.start();
    recordIntervalRef.current = setTimeout(() => {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    }, 3000);
  };

  const stopRecording = () => {
    isRecordingActiveRef.current = false;
    clearTimeout(recordIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleHangup = () => {
    stopRecording();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'hangup' }));
    }
    setCallStatus('ended');
    setTimeout(onCallEnded, 1000);
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const peerName = role === 'caller' ? callSession.receiver?.username : callSession.caller?.username;

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '24px',
      maxWidth: '800px',
      margin: '0 auto',
      gap: '20px'
    }}>
      
      {/* Top Banner Status */}
      <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            background: callStatus === 'ended' ? 'var(--color-danger)' : 'var(--color-success)',
            boxShadow: callStatus === 'ended' ? 'none' : '0 0 8px var(--color-success)'
          }}></div>
          <div>
            <h3 style={{ fontSize: '16px', color: '#fff' }}>Call with {peerName || 'User'}</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {callStatus === 'ringing' ? 'Ringing...' : callStatus === 'active' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ 
            fontSize: '18px', 
            fontFamily: 'monospace', 
            fontWeight: 'bold', 
            color: callStatus === 'active' ? '#fff' : 'var(--text-muted)' 
          }}>
            {formatTimer(duration)}
          </span>
        </div>
      </div>

      {/* Call Audio Visualizer Graphic */}
      <div className="flex-center" style={{ flex: 1, flexDirection: 'column', minHeight: 0 }}>
        {callStatus !== 'ended' ? (
          <div className="flex-center" style={{ position: 'relative', width: '180px', height: '180px', marginBottom: '24px' }}>
            <div className={callStatus === 'active' && !isMuted ? "animate-pulse-glow" : ""} style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2px solid rgba(99, 102, 241, 0.3)',
              background: 'rgba(99, 102, 241, 0.05)'
            }}></div>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)',
              zIndex: 1
            }}>
              {callStatus === 'ringing' ? (
                <Loader2 size={44} color="white" className="animate-fade-in" style={{ animation: 'spin 2s linear infinite' }} />
              ) : (
                <Radio size={44} color="white" />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-center" style={{ position: 'relative', width: '180px', height: '180px', marginBottom: '24px' }}>
            <div className="animate-pulse-glow-danger" style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.05)'
            }}></div>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1
            }}>
              <PhoneOff size={44} color="white" />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          <Sparkles size={14} color="var(--color-accent)" />
          <span>LingoCall real-time translation active</span>
        </div>
      </div>

      {/* Real-time Subtitles / Live Captions Board */}
      <div className="glass-panel" style={{ 
        height: '240px', 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '20px', 
        background: 'rgba(10, 15, 30, 0.75)',
        minHeight: '180px'
      }}>
        <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
          Live Audio Captions
        </h4>
        
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>
          {captions.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13.5px', fontStyle: 'italic' }}>
              Waiting for speech input...
            </div>
          ) : (
            captions.map((cap, idx) => {
              if (cap.system) {
                return (
                  <div key={idx} style={{ 
                    textAlign: 'center', 
                    color: 'var(--color-warning)', 
                    fontSize: '12px', 
                    fontStyle: 'italic', 
                    padding: '4px',
                    background: 'rgba(245, 158, 11, 0.05)',
                    borderRadius: '6px'
                  }}>
                    {cap.text}
                  </div>
                );
              }

              return (
                <div 
                  key={idx}
                  className="animate-slide-up"
                  style={{
                    alignSelf: cap.isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: cap.isMe ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '2px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <strong>{cap.isMe ? 'You' : peerName}</strong>
                    <span className="lang-badge" style={{ fontSize: '9px', padding: '1px 4px' }}>
                      {cap.sourceLang.toUpperCase()} ➡️ {cap.targetLang.toUpperCase()}
                    </span>
                  </div>

                  <div style={{
                    padding: '10px 14px',
                    borderRadius: cap.isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                    background: cap.isMe ? 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)' : 'rgba(255,255,255,0.05)',
                    border: cap.isMe ? 'none' : '1px solid var(--border-color)',
                    color: '#fff',
                    fontSize: '14px',
                    boxShadow: cap.isMe ? '0 4px 10px rgba(99, 102, 241, 0.2)' : 'none'
                  }}>
                    {cap.originalText}
                  </div>

                  <div style={{
                    fontSize: '12.5px',
                    color: 'var(--text-secondary)',
                    marginTop: '4px',
                    fontStyle: 'italic',
                    padding: '2px 8px',
                    textAlign: cap.isMe ? 'right' : 'left'
                  }}>
                    "{cap.translatedText}"
                  </div>
                </div>
              );
            })
          )}
          <div ref={captionsEndRef} />
        </div>
      </div>

      {/* Action Controller Buttons */}
      <div className="glass-panel flex-center" style={{ padding: '16px 32px', gap: '20px', background: 'rgba(22, 28, 45, 0.9)' }}>
        {/* Toggle Mic */}
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="btn btn-secondary btn-icon"
          style={{ 
            background: isMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
            borderColor: isMuted ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'
          }}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={20} color="var(--color-danger)" /> : <Mic size={20} color="white" />}
        </button>

        {/* Hangup */}
        <button 
          onClick={handleHangup}
          className="btn btn-danger btn-icon"
          style={{ width: '56px', height: '56px' }}
          title="Hang Up"
        >
          <PhoneOff size={24} />
        </button>

        {/* Toggle Speakers */}
        <button 
          onClick={() => setIsVolumeOn(!isVolumeOn)}
          className="btn btn-secondary btn-icon"
          style={{ 
            background: !isVolumeOn ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
            borderColor: !isVolumeOn ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'
          }}
          title={isVolumeOn ? 'Turn Speakers Off' : 'Turn Speakers On'}
        >
          {!isVolumeOn ? <VolumeX size={20} color="var(--color-danger)" /> : <Volume2 size={20} color="white" />}
        </button>
      </div>

    </div>
  );
}
