import React, { useState } from 'react';
import { apiFetch } from '../services/apiConfig';

/* ── EyeIcon — defined OUTSIDE component so it never gets remounted ─────────
   Defining components inside another component causes React to treat them as
   new component types on every render, unmounting the input and losing focus.
   ─────────────────────────────────────────────────────────────────────────── */
const EyeIcon = ({ show, toggle }) => (
  <button
    type="button"
    onClick={toggle}
    style={{
      background: 'none', border: 'none', cursor: 'pointer',
      padding: '0 4px', color: '#9ca3af',
      display: 'flex', alignItems: 'center',
    }}
  >
    {show ? (
      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C7 20 2.73 16.11 1 12C1.69 10.24 2.81 8.69 4.19 7.44M9.9 4.24A9.12 9.12 0 0 1 12 4C17 4 21.27 7.89 23 12C22.57 13.07 21.97 14.04 21.25 14.89M1 1L23 23"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
        <path d="M1 12C2.73 7.89 7 4 12 4C17 4 21.27 7.89 23 12C21.27 16.11 17 20 12 20C7 20 2.73 16.11 1 12Z"
          stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )}
  </button>
);

/* ── FieldInput — defined OUTSIDE component ──────────────────────────────── */
const FieldInput = ({ label, hint, value, onChange, show, onToggle, placeholder }) => (
  <div>
    <label style={{
      display: 'block', fontSize: 12, fontWeight: 600,
      color: '#374151', marginBottom: 6,
    }}>
      {label}
      {hint && (
        <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 4 }}>{hint}</span>
      )}
    </label>
    <div style={{
      display: 'flex', alignItems: 'center',
      border: '1.5px solid #e5e7eb', borderRadius: 10,
      padding: '0 12px', background: '#fafafa',
    }}>
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1, border: 'none', background: 'none',
          padding: '10px 0', fontSize: 13,
          outline: 'none', color: '#111827',
        }}
      />
      <EyeIcon show={show} toggle={onToggle} />
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════ */
const ChangePasswordModal = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirm,         setConfirm]         = useState('');
  const [showCurrent,     setShowCurrent]     = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState(false);
  const [loading,         setLoading]         = useState(false);

  /* ── Password strength ── */
  const strength = (() => {
    if (!newPassword) return 0;
    let s = 0;
    if (newPassword.length >= 6)           s++;
    if (newPassword.length >= 10)          s++;
    if (/[A-Z]/.test(newPassword))         s++;
    if (/[0-9]/.test(newPassword))         s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#0d9488'][strength];

  const handleSubmit = async () => {
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match.'); return;
    }
    setLoading(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'PUT',
        body:   JSON.stringify({ currentPassword: currentPassword || null, newPassword }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="logout-overlay" onClick={onClose}>
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: 28,
          width: 420, maxWidth: '92vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          animation: 'fadeInUp 0.2s ease',
        }}
      >
        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:'linear-gradient(135deg,#0d9488,#0f766e)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="white" strokeWidth="2"/>
                <path d="M7 11V7C7 4.24 9.24 2 12 2C14.76 2 17 4.24 17 7V11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1.5" fill="white"/>
              </svg>
            </div>
            <div>
              <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'#111827' }}>Change Password</h3>
              <p style={{ margin:0, fontSize:12, color:'#6b7280' }}>Secure your account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background:'#f3f4f6', border:'none', borderRadius:8,
              width:30, height:30, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={{ height:1, background:'#f3f4f6', margin:'16px 0' }} />

        {/* ── Success ── */}
        {success ? (
          <div style={{ textAlign:'center', padding:'12px 0' }}>
            <div style={{
              width:56, height:56, borderRadius:'50%', background:'#dcfce7',
              display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px',
            }}>
              <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2"/>
                <path d="M8 12L11 15L16 9" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h4 style={{ margin:'0 0 6px', color:'#111827', fontSize:16 }}>Password Updated!</h4>
            <p style={{ margin:'0 0 20px', color:'#6b7280', fontSize:13 }}>
              You can now log in from any device using your new password.
            </p>
            <button
              onClick={onClose}
              style={{
                background:'linear-gradient(135deg,#0d9488,#0f766e)',
                color:'#fff', border:'none', borderRadius:10,
                padding:'10px 28px', fontSize:14, fontWeight:600, cursor:'pointer',
              }}
            >
              Done
            </button>
          </div>

        ) : (
          <>
            {/* ── Info banner ── */}
            <div style={{
              background:'#f0fdfa', border:'1px solid #99f6e4',
              borderRadius:10, padding:'10px 14px', marginBottom:16,
              display:'flex', gap:8, alignItems:'flex-start',
            }}>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ flexShrink:0, marginTop:1 }}>
                <circle cx="12" cy="12" r="10" stroke="#0d9488" strokeWidth="2"/>
                <path d="M12 8V12M12 16H12.01" stroke="#0d9488" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p style={{ margin:0, fontSize:12, color:'#0f766e', lineHeight:1.5 }}>
                Logged in via WhatsApp link? Leave <strong>current password</strong> blank
                and set a new one to enable login from other devices.
              </p>
            </div>

            {/* ── Error ── */}
            {error && (
              <div style={{
                background:'#fef2f2', border:'1px solid #fecaca',
                borderRadius:10, padding:'10px 14px', marginBottom:14,
                display:'flex', gap:8, alignItems:'center',
              }}>
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14" style={{ flexShrink:0 }}>
                  <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                  <path d="M12 8V12M12 16H12.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p style={{ margin:0, fontSize:12, color:'#dc2626' }}>{error}</p>
              </div>
            )}

            {/* ── Fields ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

              <FieldInput
                label="Current Password"
                hint="(optional if via WhatsApp)"
                placeholder="Leave blank if logged in via WhatsApp"
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrent}
                onToggle={() => setShowCurrent(p => !p)}
              />

              <div>
                <FieldInput
                  label="New Password"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={setNewPassword}
                  show={showNew}
                  onToggle={() => setShowNew(p => !p)}
                />
                {/* Strength meter */}
                {newPassword && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{
                          flex:1, height:3, borderRadius:2,
                          background: i <= strength ? strengthColor : '#e5e7eb',
                          transition: 'background 0.2s',
                        }} />
                      ))}
                    </div>
                    <p style={{ margin:0, fontSize:11, color:strengthColor, fontWeight:600 }}>
                      {strengthLabel}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <FieldInput
                  label="Confirm New Password"
                  placeholder="Re-enter new password"
                  value={confirm}
                  onChange={setConfirm}
                  show={showConfirm}
                  onToggle={() => setShowConfirm(p => !p)}
                />
                {confirm && confirm !== newPassword && (
                  <p style={{ margin:'4px 0 0', fontSize:11, color:'#ef4444' }}>
                    Passwords do not match
                  </p>
                )}
              </div>

            </div>

            <div style={{ height:1, background:'#f3f4f6', margin:'20px 0 16px' }} />

            {/* ── Actions ── */}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  background:'#f3f4f6', color:'#374151', border:'none',
                  borderRadius:10, padding:'10px 20px',
                  fontSize:13, fontWeight:600, cursor:'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  background: loading ? '#99f6e4' : 'linear-gradient(135deg,#0d9488,#0f766e)',
                  color:'#fff', border:'none', borderRadius:10,
                  padding:'10px 24px', fontSize:13, fontWeight:600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display:'flex', alignItems:'center', gap:8,
                }}
              >
                {loading && (
                  <div style={{
                    width:14, height:14,
                    border:'2px solid rgba(255,255,255,0.4)',
                    borderTopColor:'#fff', borderRadius:'50%',
                    animation:'spin 0.7s linear infinite',
                  }} />
                )}
                {loading ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;