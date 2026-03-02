import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/apiConfig';
import '../css/LoginPage.css';

const LoginPage = () => {
  const [username, setUsername]             = useState('');
  const [password, setPassword]             = useState('');
  const [showPass, setShowPass]             = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [autoLoginChecked, setAutoLoginChecked] = useState(false); // ← controls render

  const [searchParams] = useSearchParams();
  const { login }      = useAuth();
  const navigate       = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setAutoLoginChecked(true); // no token → show login form immediately
      return;
    }
  localStorage.removeItem('assistiq_auth');
    // Token present → attempt auto-login before rendering anything
    setLoading(true);
    apiFetch(`/auth/autologin?token=${token}`)
      .then(data => {
         // store JWT in localStorage via AuthContext
        console.log('AUTOLOGIN RESPONSE:', JSON.stringify(data)); // ← add this
       login(data);
        const stored = localStorage.getItem('assistiq_auth');
    console.log('STORED AFTER LOGIN:', stored); // ← add this
        if (data.role === 'DOCTOR')       navigate('/doctor',       { replace: true });
        if (data.role === 'RECEPTIONIST') navigate('/receptionist', { replace: true });
      })
      .catch(() => {
        setError('Login link expired or already used. Please login manually.');
        setAutoLoginChecked(true); // ← show form so doctor can login manually
        setLoading(false);
      });
  }, []);

  // ── Block render until autologin check is done ──────────────────────────────
  if (!autoLoginChecked) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: 'sans-serif'
      }}>
        <div style={{
          width: 44, height: 44,
          border: '4px solid #e5e7eb',
          borderTopColor: '#0d9488',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ marginTop: 16, color: '#666', fontSize: 15 }}>Signing you in…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Normal login form ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      login(data);
      if (data.role === 'DOCTOR')       navigate('/doctor',       { replace: true });
      if (data.role === 'RECEPTIONIST') navigate('/receptionist', { replace: true });
    } catch (err) {
      setError('Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">

      {/* Left panel — branding */}
      <div className="login-panel-left">
        <div className="login-brand">
          <div className="login-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" width="36" height="36">
              <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
                fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
              <path d="M12 8V12M12 12V16M12 12H8M12 12H16"
                stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="login-brand-name">AssistIQ</h1>
          <p className="login-brand-sub">Smart Clinic Management</p>
        </div>

        <div className="login-features">
          <div className="login-feature-item">
            <span className="login-feature-icon">🩺</span>
            <div>
              <strong>Doctor Dashboard</strong>
              <p>Consultations, prescriptions & patient history</p>
            </div>
          </div>
          <div className="login-feature-item">
            <span className="login-feature-icon">📋</span>
            <div>
              <strong>Receptionist Portal</strong>
              <p>Appointments, walk-ins & token management</p>
            </div>
          </div>
          <div className="login-feature-item">
            <span className="login-feature-icon">💬</span>
            <div>
              <strong>WhatsApp Integration</strong>
              <p>Send prescriptions & reminders automatically</p>
            </div>
          </div>
        </div>

        <p className="login-panel-footer">Trusted by clinics across India</p>
      </div>

      {/* Right panel — form */}
      <div className="login-panel-right">
        <div className="login-form-wrap">

          <div className="login-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your clinic account</p>
          </div>

          {error && (
            <div className="login-error">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" autoComplete="off">

            <div className="login-field">
              <label htmlFor="username">Username / Phone</label>
              <div className="login-input-wrap">
                <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" width="17" height="17">
                  <path d="M20 21V19C20 16.79 18.21 15 16 15H8C5.79 15 4 16.79 4 19V21"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="login-input-wrap">
                <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" width="17" height="17">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M7 11V7C7 4.24 9.24 2 12 2C14.76 2 17 4.24 17 7V11"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
                </svg>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPass(p => !p)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass
                    ? <svg viewBox="0 0 24 24" fill="none" width="17" height="17">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C7 20 2.73 16.11 1 12C1.69 10.24 2.81 8.69 4.19 7.44M9.9 4.24A9.12 9.12 0 0 1 12 4C17 4 21.27 7.89 23 12C22.57 13.07 21.97 14.04 21.25 14.89M1 1L23 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    : <svg viewBox="0 0 24 24" fill="none" width="17" height="17">
                        <path d="M1 12C2.73 7.89 7 4 12 4C17 4 21.27 7.89 23 12C21.27 16.11 17 20 12 20C7 20 2.73 16.11 1 12Z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading
                ? <><span className="login-spinner"/> Signing in…</>
                : 'Sign In →'
              }
            </button>

          </form>

          <div className="login-role-hint">
            <div className="login-role-chip login-role-chip--doctor">
              <span>🩺</span> Doctor login
            </div>
            <div className="login-role-chip login-role-chip--reception">
              <span>📋</span> Receptionist login
            </div>
          </div>
          <p className="login-role-hint-text">
            Your role is detected automatically from your account.
          </p>

          <p className="login-footer-text">Need help? Contact your clinic admin.</p>

        </div>
      </div>

    </div>
  );
};

export default LoginPage;