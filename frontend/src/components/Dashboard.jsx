import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  User, 
  LogOut, 
  Globe, 
  Plus, 
  Phone, 
  Trash2, 
  UserCheck, 
  UserX, 
  Clock, 
  ChevronRight, 
  FileText, 
  UserPlus, 
  Check, 
  X,
  MessageSquareOff
} from 'lucide-react';

const languages = [
  { code: 'en', name: 'English 🇺🇸' },
  { code: 'es', name: 'Spanish 🇪🇸' },
  { code: 'fr', name: 'French 🇫🇷' },
  { code: 'hi', name: 'Hindi 🇮🇳' },
  { code: 'de', name: 'German 🇩🇪' },
  { code: 'it', name: 'Italian 🇮🇹' },
  { code: 'zh', name: 'Chinese 🇨🇳' },
  { code: 'ja', name: 'Japanese 🇯🇵' }
];

export default function Dashboard({ user, onLogout, onStartCall, contacts, recentCalls, refreshData }) {
  const [newContactUsername, setNewContactUsername] = useState('');
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');
  const [selectedCallHistory, setSelectedCallHistory] = useState(null);
  const [callHistoryDetail, setCallHistoryDetail] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updatingLang, setUpdatingLang] = useState(false);

  // Auto-refresh data on component mount
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000); // Poll every 3 seconds for updates
    return () => clearInterval(interval);
  }, []);

  const handleLanguageChange = async (e) => {
    const lang = e.target.value;
    setUpdatingLang(true);
    try {
      await api.updatePreferredLanguage(lang);
      refreshData();
    } catch (err) {
      console.error("Language update error:", err);
    } finally {
      setUpdatingLang(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setContactError('');
    setContactSuccess('');
    
    if (!newContactUsername.trim()) return;

    try {
      await api.addContact(newContactUsername.trim());
      setContactSuccess(`Request sent to ${newContactUsername}!`);
      setNewContactUsername('');
      refreshData();
    } catch (err) {
      setContactError(err.message || 'Failed to add contact.');
    }
  };

  const handleRespondContact = async (contactId, status) => {
    try {
      await api.respondToContact(contactId, status);
      refreshData();
    } catch (err) {
      console.error("Contact response error:", err);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm('Are you sure you want to remove this contact?')) return;
    try {
      await api.deleteContact(contactId);
      refreshData();
    } catch (err) {
      console.error("Contact deletion error:", err);
    }
  };

  const handleViewCallHistory = async (call) => {
    setSelectedCallHistory(call);
    setLoadingHistory(true);
    try {
      const history = await api.getCallHistory(call.id);
      setCallHistoryDetail(history);
    } catch (err) {
      console.error("Error loading call history:", err);
      setCallHistoryDetail([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filter contacts
  const acceptedContacts = contacts.filter(c => c.status === 'accepted');
  const pendingRequests = contacts.filter(c => c.status === 'pending' && c.contact_id === user.id);
  const sentRequests = contacts.filter(c => c.status === 'pending' && c.user_id === user.id);

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + 
           date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Panel */}
      <header className="glass-panel" style={{ padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px var(--color-primary-glow)'
          }}>
            <User size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>
              Welcome back, {user.username}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user.email}</p>
          </div>
        </div>

        {/* Profile Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={18} color="var(--text-secondary)" />
            <select
              value={user.preferred_language}
              onChange={handleLanguageChange}
              disabled={updatingLang}
              className="input-field"
              style={{ 
                padding: '6px 12px', 
                fontSize: '13px', 
                width: '140px',
                borderRadius: '8px',
                borderWidth: '1px',
                background: 'rgba(0,0,0,0.4)',
                cursor: 'pointer'
              }}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} style={{ background: '#121824' }}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={onLogout} 
            className="btn btn-secondary" 
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', flex: 1, minHeight: 'calc(100vh - 160px)' }}>
        
        {/* Left Column: Contact Sidebar */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Add Contact form */}
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} color="var(--color-primary)" />
              Add Contact
            </h3>
            <form onSubmit={handleAddContact} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Username"
                value={newContactUsername}
                onChange={(e) => setNewContactUsername(e.target.value)}
                style={{ padding: '10px 12px', fontSize: '14px' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 12px', borderRadius: '8px' }}>
                <Plus size={20} />
              </button>
            </form>
            {contactError && <p style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '6px' }}>{contactError}</p>}
            {contactSuccess && <p style={{ color: 'var(--color-success)', fontSize: '12px', marginTop: '6px' }}>{contactSuccess}</p>}
          </div>

          <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />

          {/* Pending Invitations list */}
          {pendingRequests.length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Friend Requests ({pendingRequests.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingRequests.map((req) => (
                  <div key={req.id} className="glass-panel" style={{ padding: '10px 12px', background: 'rgba(245, 158, 11, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{req.creator?.username || 'User'}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => handleRespondContact(req.id, 'accepted')}
                        className="btn btn-success" 
                        style={{ width: '28px', height: '28px', padding: 0, borderRadius: '50%' }}
                        title="Accept"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={() => handleRespondContact(req.id, 'rejected')}
                        className="btn btn-danger" 
                        style={{ width: '28px', height: '28px', padding: 0, borderRadius: '50%' }}
                        title="Decline"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing pending list */}
          {sentRequests.length > 0 && (
            <div>
              <h4 style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Sent Requests
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {sentRequests.map((req) => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span>{req.contact?.username}</span>
                    <span style={{ fontStyle: 'italic', fontSize: '11px' }}>pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Contacts */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} color="var(--color-success)" />
              My Contacts ({acceptedContacts.length})
            </h3>
            
            {acceptedContacts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
                No contacts yet. Use the form above to add a contact by username.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
                {acceptedContacts.map((c) => {
                  const counterpart = c.user_id === user.id ? c.contact : c.creator;
                  if (!counterpart) return null;

                  return (
                    <div key={c.id} className="glass-panel glass-panel-hover" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                          {c.nickname || counterpart.username}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                          <span className="lang-badge">{(counterpart.preferred_language || 'en').toUpperCase()}</span>
                          {c.nickname && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{counterpart.username}</span>}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => onStartCall(counterpart.username)}
                          className="btn btn-success" 
                          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
                          title={`Call ${counterpart.username}`}
                        >
                          <Phone size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteContact(c.id)}
                          className="btn btn-secondary" 
                          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                          title="Remove Contact"
                        >
                          <Trash2 size={16} color="var(--color-danger)" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dialer dashboard & Call logs history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Main workspace action panel */}
          <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '220px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(22, 28, 45, 0.7) 0%, rgba(99, 102, 241, 0.05) 100%)' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
              Language-Agnostic Voice Calling
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', fontSize: '15px', marginBottom: '24px' }}>
              Speak in your language; your contact hears you in theirs. Real-time translation, voice synthesis, and dual interactive captions.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              {acceptedContacts.length > 0 ? (
                <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }}></span>
                  Select a contact on the left sidebar to start calling
                </span>
              ) : (
                <div style={{ display: 'inline-flex', padding: '10px 16px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', borderRadius: '8px', fontSize: '14px' }}>
                  Add your first contact to start real-time translation calls!
                </div>
              )}
            </div>
          </div>

          {/* Recent Call Logs & History Detail overlay */}
          <div style={{ display: 'grid', gridTemplateColumns: selectedCallHistory ? '1fr 340px' : '1fr', gap: '24px', flex: 1, minHeight: 0 }}>
            
            {/* Left table of recent call logs */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="var(--color-primary)" />
                Recent Call Sessions
              </h3>

              {recentCalls.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '12px' }}>
                  <MessageSquareOff size={32} />
                  <p style={{ fontSize: '14px', fontStyle: 'italic' }}>No call logs found.</p>
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        <th style={{ padding: '12px 8px' }}>Caller / Receiver</th>
                        <th style={{ padding: '12px 8px' }}>Date & Time</th>
                        <th style={{ padding: '12px 8px' }}>Duration</th>
                        <th style={{ padding: '12px 8px' }}>Status</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCalls.map((call) => {
                        const isCaller = call.caller_id === user.id;
                        const counterpartName = isCaller ? call.receiver?.username : call.caller?.username;
                        
                        return (
                          <tr 
                            key={call.id} 
                            style={{ 
                              borderBottom: '1px solid rgba(255,255,255,0.03)', 
                              fontSize: '14px',
                              cursor: 'pointer',
                              background: selectedCallHistory?.id === call.id ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                            }}
                            onClick={() => handleViewCallHistory(call)}
                          >
                            <td style={{ padding: '14px 8px', fontWeight: 600, color: '#fff' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px' }}>{isCaller ? '↗️' : '↙️'}</span>
                                <span>{counterpartName || 'Unknown User'}</span>
                              </div>
                            </td>
                            <td style={{ padding: '14px 8px', color: 'var(--text-secondary)' }}>
                              {formatDate(call.started_at)}
                            </td>
                            <td style={{ padding: '14px 8px', color: 'var(--text-secondary)' }}>
                              {formatDuration(call.duration_seconds)}
                            </td>
                            <td style={{ padding: '14px 8px' }}>
                              <span className={`status-badge status-badge-${
                                call.status === 'ended' ? 'success' : 
                                call.status === 'ringing' || call.status === 'active' ? 'warning' : 'danger'
                              }`}>
                                {call.status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                              <button 
                                className="btn btn-secondary"
                                style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <FileText size={12} />
                                Transcript
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right details panel detailing transcript */}
            {selectedCallHistory && (
              <div className="glass-panel animate-slide-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(99, 102, 241, 0.25)', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '15px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Transcript Review
                  </h4>
                  <button 
                    onClick={() => setSelectedCallHistory(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                  <strong>Session ID:</strong> <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{selectedCallHistory.id.substring(0, 8)}...</span><br />
                  <strong>User:</strong> {selectedCallHistory.caller_id === user.id ? selectedCallHistory.receiver?.username : selectedCallHistory.caller?.username}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {loadingHistory ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '40px' }}>Loading captions...</p>
                  ) : callHistoryDetail.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '40px' }}>No dialogue recorded for this call.</p>
                  ) : (
                    callHistoryDetail.map((item, idx) => {
                      const isMe = item.sender_id === user.id;
                      return (
                        <div 
                          key={item.id || idx}
                          style={{
                            padding: '10px 12px',
                            background: isMe ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '8px',
                            borderLeft: isMe ? '3px solid var(--color-primary)' : '3px solid var(--color-accent)',
                            alignSelf: 'stretch'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            <strong>{isMe ? 'You' : (selectedCallHistory.caller_id === user.id ? selectedCallHistory.receiver?.username : selectedCallHistory.caller?.username)}</strong>
                            <span>{item.source_lang.toUpperCase()} ➡️ {item.target_lang.toUpperCase()}</span>
                          </div>
                          <div style={{ fontSize: '13.5px', color: '#fff', marginBottom: '4px' }}>
                            {item.original_text}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                            {item.translated_text}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
