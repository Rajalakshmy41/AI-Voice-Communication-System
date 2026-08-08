import React, { useState } from 'react';
import { api } from '../services/api';
import { Headphones, ShieldAlert, KeyRound, User, Mail, Globe } from 'lucide-react';

export default function AuthScreen({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations matching FastAPI schemas
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await api.login(username, password);
        onLoginSuccess();
      } else {
        await api.register(username, email, password, preferredLanguage);
        // Automatically log in after registration
        await api.login(username, password);
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel animate-slide-up" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '40px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
            padding: '10px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)'
          }}>
            <Headphones size={28} color="white" />
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            fontWeight: 800,
            background: 'linear-gradient(to right, #ffffff, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            LingoCall
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px', textAlign: 'center' }}>
          Real-time translation for seamless voice calling.
        </p>

        {/* Title */}
        <h2 style={{ fontSize: '24px', marginBottom: '24px', fontWeight: 600, color: '#fff', alignSelf: 'flex-start' }}>
          {isLogin ? 'Sign In' : 'Create Account'}
        </h2>

        {/* Error Callout */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            width: '100%',
            color: '#f87171',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* Username */}
          <div className="input-group">
            <label className="input-label" htmlFor="username">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="username"
                className="input-field"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="enter username"
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          {/* Email (Register only) */}
          {!isLogin && (
            <div className="input-group">
              <label className="input-label" htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="email"
                  className="input-field"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{ paddingLeft: '44px' }}
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="password"
                className="input-field"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          {/* Language Selection (Register only) */}
          {!isLogin && (
            <div className="input-group">
              <label className="input-label" htmlFor="lang">Preferred Spoken Language</label>
              <div style={{ position: 'relative' }}>
                <Globe size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select
                  id="lang"
                  className="input-field"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  style={{ paddingLeft: '44px', appearance: 'none', background: 'rgba(0, 0, 0, 0.3) url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E") no-repeat right 16px center', backgroundSize: '16px' }}
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code} style={{ background: '#121824', color: '#fff' }}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px', padding: '14px' }}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle link */}
        <div style={{ marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
