import React, { useState, useEffect } from 'react';
import { api, clearToken } from './services/api';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import CallScreen from './components/CallScreen';
import { PhoneCall, PhoneOff, Check, X, Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Call states
  const [callSession, setCallSession] = useState(null); // Call object
  const [callRole, setCallRole] = useState(null); // 'caller' | 'receiver'
  
  // Data states
  const [contacts, setContacts] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  
  // Incoming invitation modal
  const [incomingCall, setIncomingCall] = useState(null);

  // 1. Initial authentication check
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const profile = await api.getMe();
      setUser(profile);
    } catch (err) {
      console.log('No valid session or session expired.');
      clearToken();
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  // 2. Fetch contacts and recent calls from backend
  const refreshData = async () => {
    if (!user) return;
    try {
      const contactsList = await api.getContacts();
      const callsList = await api.getRecentCalls();
      setContacts(contactsList);
      setRecentCalls(callsList);

      // Check if there is an incoming ringing call
      const myId = user.id;
      const ringing = callsList.find(
        (call) => call.receiver_id === myId && call.status === 'ringing'
      );

      if (ringing && !callSession && !incomingCall) {
        setIncomingCall(ringing);
      }
    } catch (err) {
      console.error('Error refreshing backend data:', err);
    }
  };

  // Background polling for incoming calls and contacts
  useEffect(() => {
    let pollingInterval;
    if (user && !callSession) {
      refreshData();
      pollingInterval = setInterval(refreshData, 3000);
    }
    return () => clearInterval(pollingInterval);
  }, [user, callSession, incomingCall]);

  const handleLoginSuccess = () => {
    setCheckingAuth(true);
    checkAuthentication();
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setCallSession(null);
    setCallRole(null);
    setIncomingCall(null);
  };

  // Initiate call to counterpart
  const handleStartCall = async (receiverUsername) => {
    try {
      const call = await api.initiateCall(receiverUsername);
      setCallSession(call);
      setCallRole('caller');
    } catch (err) {
      alert(err.message || 'Could not place call');
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    try {
      const acceptedCall = await api.acceptCall(incomingCall.id);
      setCallSession(acceptedCall);
      setCallRole('receiver');
      setIncomingCall(null);
    } catch (err) {
      alert('Could not accept call: ' + err.message);
      setIncomingCall(null);
    }
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;
    try {
      await api.rejectCall(incomingCall.id);
    } catch (err) {
      console.error('Error rejecting call:', err);
    } finally {
      setIncomingCall(null);
    }
  };

  const handleCallEnded = async () => {
    if (callSession) {
      try {
        await api.endCall(callSession.id);
      } catch (err) {
        console.error('Error ending call session:', err);
      }
    }
    setCallSession(null);
    setCallRole(null);
    setIncomingCall(null);
    refreshData();
  };

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <Loader2 size={48} color="var(--color-primary)" className="animate-fade-in" style={{ animation: 'spin 2s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontStyle: 'italic' }}>Initializing secure connection...</p>
      </div>
    );
  }

  // Not Authenticated
  if (!user) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Authenticated
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      
      {/* Active Call Interface */}
      {callSession ? (
        <CallScreen 
          callSession={callSession} 
          role={callRole} 
          onCallEnded={handleCallEnded} 
        />
      ) : (
        /* Dashboard view */
        <Dashboard 
          user={user} 
          onLogout={handleLogout} 
          onStartCall={handleStartCall}
          contacts={contacts}
          recentCalls={recentCalls}
          refreshData={refreshData}
        />
      )}

      {/* Incoming Call Toast/Modal Overlay */}
      {incomingCall && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '24px'
        }}>
          <div className="glass-panel animate-slide-up animate-pulse-glow" style={{
            width: '100%',
            maxWidth: '440px',
            padding: '32px',
            textAlign: 'center',
            background: '#121824',
            border: '1.5px solid rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.2)'
            }}>
              <PhoneCall size={32} />
            </div>

            <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: '8px' }}>
              Incoming Call
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', marginBottom: '28px' }}>
              <strong>{incomingCall.caller?.username || 'Counterpart'}</strong> is calling you for real-time translated voice communication.
            </p>

            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
              <button 
                onClick={handleRejectCall}
                className="btn btn-danger" 
                style={{ flex: 1, padding: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
                Decline
              </button>
              <button 
                onClick={handleAcceptCall}
                className="btn btn-success" 
                style={{ flex: 1, padding: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}
              >
                <Check size={16} />
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
