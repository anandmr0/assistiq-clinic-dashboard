/**
 * QuickSendPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Matches the SAME pattern as the existing prescription send:
 *   • Files are read as base64 on the frontend (FileReader)
 *   • Sent as JSON:  { patientName, phone, clinicId, doctorId, files: [{name, base64, mimeType}] }
 *   • Backend decodes base64 → bytes → uploads to WhatsApp media API → sends
 *   • No multipart, no Content-Type issues, no separate upload step
 *
 * This is identical in principle to how prescriptionPdfBase64 works in PatientList.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../services/apiConfig';
import '../css/QuickSendPanel.css';

/* ══════════════════════════════  ICONS  ════════════════════════════════════ */
const IcWA = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.113.549 4.096 1.508 5.824L0 24l6.335-1.481A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.003-1.368l-.36-.213-3.731.872.936-3.62-.234-.373A9.775 9.775 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
  </svg>
);
const IcUser = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M4 20c0-2.2 3.6-4 8-4s8 1.8 8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IcPhone = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57-.11.35-.02.74-.24 1.02l-2.21 2.2z"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IcContacts = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M23 21V19C23 17.13 21.74 15.56 20 15.13M16 3.13C17.74 3.56 19 5.13 19 7C19 8.87 17.74 10.44 16 10.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IcClip = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IcClose = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const IcUpload = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M17 8L12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcFile = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IcCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ═══════════════════════════  CONSTANTS  ═══════════════════════════════════ */
const STATUS_CLS = {
  COMPLETED: 'qsp-chip--green', CONFIRMED: 'qsp-chip--blue',
  SCHEDULED: 'qsp-chip--amber', CANCELLED: 'qsp-chip--red', ACTIVE: 'qsp-chip--teal',
};
const ALLOWED   = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;   // 5 MB per file (same as PatientList report limit)
const MAX_FILES = 5;

/* ══════════════════════════  HELPER  ═══════════════════════════════════════ */
/**
 * readFileAsBase64 — mirrors the FileReader pattern in PatientList.jsx
 * Returns base64 string WITHOUT the data:mime;base64, prefix
 * (same as prescriptionPdfBase64 in PrescriptionPdfGenerator.jsx)
 */
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => {
      // e.target.result = "data:application/pdf;base64,JVBERi0..."
      const base64 = e.target.result.split(',')[1]; // strip prefix
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ═══════════════════════════  COMPONENT  ═══════════════════════════════════ */
export default function QuickSendPanel({ todayPatients = [], clinicId, doctorId, onClose }) {

  /* ── form state ── */
  const [name,       setName]       = useState('');
  const [phone,      setPhone]      = useState('');
  const [matched,    setMatched]    = useState(null);
  const [dropOpen,   setDropOpen]   = useState(false);

  /* ── file state (in-memory only, never uploaded to DB) ── */
  const [files,      setFiles]      = useState([]);   // { id, file, name, size, type, preview }
  const [dragOver,   setDragOver]   = useState(false);

  /* ── send state ── */
  const [sending,    setSending]    = useState(false);
  const [progress,   setProgress]   = useState('');   // reading / sending
  const [toast,      setToast]      = useState(null);
  const [sentLog,    setSentLog]    = useState([]);
  const [contactsOk, setContactsOk] = useState(false);

  const nameRef  = useRef(null);
  const phoneRef = useRef(null);
  const dropRef  = useRef(null);
  const fileRef  = useRef(null);

  /* ── mount ── */
  useEffect(() => {
    nameRef.current?.focus();
    setContactsOk('contacts' in navigator && 'ContactsManager' in window);
    // Lock background scroll
    const sy = window.scrollY;
    const prev = { overflow: document.body.style.overflow, position: document.body.style.position, top: document.body.style.top, width: document.body.style.width };
    Object.assign(document.body.style, { overflow: 'hidden', position: 'fixed', top: `-${sy}px`, width: '100%' });
    return () => { Object.assign(document.body.style, prev); window.scrollTo(0, sy); };
  }, []);

  useEffect(() => {
    const fn = e => { if (!dropRef.current?.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => () => files.forEach(f => f.preview && URL.revokeObjectURL(f.preview)), []); // eslint-disable-line

  /* ── suggestions ── */
  const suggestions = useMemo(() => {
    const q  = phone.trim().replace(/\D/g, '');
    const lo = name.trim().toLowerCase();
    if (!q && !lo) return todayPatients.slice(0, 8);
    return todayPatients.filter(p => {
      const ph = (p.phoneNumber || p.phone || '').toString().replace(/\D/g, '');
      return (q && ph.includes(q)) || (lo && (p.name || '').toLowerCase().includes(lo));
    }).slice(0, 8);
  }, [phone, name, todayPatients]);

  /* ── auto-match registered patient ── */
  const tryMatch = (nameVal, phoneVal) => {
    const dg = phoneVal.replace(/\D/g, '');
    if (dg.length >= 6) {
      const found = todayPatients.find(p =>
        (p.phoneNumber || p.phone || '').toString().replace(/\D/g, '').endsWith(dg.slice(-10))
      );
      if (found) { setMatched(found); if (!nameVal.trim()) setName(found.name || ''); return; }
    }
    setMatched(null);
  };

  const handleSelect = p => {
    setPhone((p.phoneNumber || p.phone || '').toString());
    setName(p.name || '');
    setMatched(p);
    setDropOpen(false);
    setToast(null);
  };

  /* ── contacts picker ── */
  const handleContacts = async () => {
    if (!contactsOk) return;
    try {
      const res   = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (!res?.length) return;
      const tel   = (res[0].tel?.[0] || '').replace(/\D/g, '');
      const cname = res[0].name?.[0] || '';
      if (!tel) { setToast({ type: 'error', msg: 'No phone number in selected contact.' }); return; }
      setPhone(tel);
      if (cname && !name.trim()) setName(cname);
      tryMatch(cname, tel);
      setDropOpen(true);
    } catch (err) {
      if (err.name !== 'AbortError') setToast({ type: 'error', msg: 'Could not access contacts.' });
    }
  };

  /* ── file helpers ── */
  const addFiles = rawFiles => {
    const added = [];
    for (const f of rawFiles) {
      if (!ALLOWED.includes(f.type))                { setToast({ type: 'error', msg: `${f.name}: PDF or image only.` }); continue; }
      if (f.size > MAX_BYTES)                       { setToast({ type: 'error', msg: `${f.name}: max 5 MB.` });          continue; }
      if (files.length + added.length >= MAX_FILES) { setToast({ type: 'error', msg: `Max ${MAX_FILES} files.` });       break; }
      added.push({
        id:      Math.random().toString(36).slice(2),
        file:    f,
        name:    f.name,
        size:    f.size,
        type:    f.type,
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      });
    }
    if (added.length) { setFiles(prev => [...prev, ...added]); setToast(null); }
  };

  const removeFile = id => setFiles(prev => {
    const f = prev.find(a => a.id === id);
    f?.preview && URL.revokeObjectURL(f.preview);
    return prev.filter(a => a.id !== id);
  });

  /* ══════════════════════════  SEND  ═════════════════════════════════════ */
  const handleSend = useCallback(async () => {
    if (sending) return;

    const trimName = name.trim();
    const digits   = phone.replace(/\D/g, '');

    if (!trimName)         { setToast({ type: 'error', msg: 'Please enter the patient name.' });         nameRef.current?.focus();  return; }
    if (digits.length < 7) { setToast({ type: 'error', msg: 'Please enter a valid phone number.' });     phoneRef.current?.focus(); return; }
    if (files.length === 0){ setToast({ type: 'error', msg: 'Please attach at least one report file.' });                            return; }

    setSending(true);

    try {
      /*
       * STEP 1 — Read each file as base64 (same pattern as PatientList.jsx / PrescriptionPdfGenerator)
       *
       * PatientList does:    reader.readAsDataURL(file)  → stores url: e.target.result  (with prefix)
       * PrescriptionPdfGen:  pdf.output('datauristring') → strips prefix → sends raw base64
       *
       * We do the same: readFileAsBase64() → strips "data:mime;base64," prefix → raw base64 string
       * This keeps the payload as plain JSON — no multipart, no Content-Type issues.
       */
      setProgress('Reading files…');
      const filePayloads = await Promise.all(
        files.map(async (f) => ({
          name:     f.name,
          mimeType: f.type,
          base64:   await readFileAsBase64(f.file),   // raw base64, no prefix
        }))
      );

      /*
       * STEP 2 — Single JSON POST (same as /appointments/complete)
       * Backend decodes base64 → bytes → uploads to WhatsApp media API → sends → stores mediaId
       */
      setProgress('Sending…');
      await apiFetch('/quick-send/report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName:   trimName,
          phone:         digits,
          clinicId:      clinicId,
          doctorId:      doctorId,
          appointmentId: matched?.appointmentId || null,
          patientId:     matched?.patientId     || null,
          isRegistered:  !!matched,
          files:         filePayloads,   // [{ name, mimeType, base64 }]
        }),
      });

      /* ── success ── */
      setSentLog(prev => [{
        name: trimName, phone: digits,
        files: files.length, registered: !!matched, time: new Date(),
      }, ...prev.slice(0, 4)]);

      setToast({ type: 'success', msg: `✓ Sent ${files.length} file${files.length > 1 ? 's' : ''} to ${trimName}` });

      setTimeout(() => {
        setName(''); setPhone(''); setMatched(null);
        setFiles([]); setToast(null); setDropOpen(false);
        nameRef.current?.focus();
      }, 2800);

    } catch (err) {
      console.error(err);
      setToast({ type: 'error', msg: err.message || 'Send failed. Try again.' });
    } finally {
      setSending(false);
      setProgress('');
    }
  }, [name, phone, matched, files, sending, clinicId, doctorId]);

  const onKey = e => { if (e.key === 'Escape') onClose(); };

  /* ── derived ── */
  const digits  = phone.replace(/\D/g, '');
  const phoneOk = digits.length >= 7;
  const nameOk  = name.trim().length > 0;
  const canSend = nameOk && phoneOk && files.length > 0 && !sending;
  const fmtSz   = b => b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;
  const fmtT    = d => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  /* ═══════════════════════════  RENDER  ══════════════════════════════════ */
  return (
    <div className="qsp-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="qsp-panel" onKeyDown={onKey}>

        {/* ── HEADER ── */}
        <div className="qsp-header">
          <div className="qsp-hd-left">
            <div className="qsp-hd-icon"><IcWA size={20} /></div>
            <div>
              <h2 className="qsp-title">Quick Send Report</h2>
              <p className="qsp-sub">Name · Phone · Attach · Send via WhatsApp</p>
            </div>
          </div>
          <button className="qsp-close" onClick={onClose} type="button"><IcClose size={14} /></button>
        </div>

        {/* ── BODY ── */}
        <div className="qsp-body">

          {/* ══ PATIENT DETAILS ══ */}
          <div className="qsp-form-card">
            <p className="qsp-card-heading"><IcUser /> Patient Details</p>

            {/* Name */}
            <div className="qsp-field">
              <label className="qsp-label" htmlFor="qsp-name">
                Patient Name <span className="qsp-req">*</span>
              </label>
              <input
                id="qsp-name"
                ref={nameRef}
                className={`qsp-input ${matched ? 'qsp-input--matched' : ''}`}
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  setToast(null);
                  if (phone) tryMatch(e.target.value, phone);
                  setDropOpen(true);
                }}
                autoComplete="off"
              />
            </div>

            {/* Phone + contacts + dropdown */}
            <div className="qsp-field" ref={dropRef}>
              <label className="qsp-label" htmlFor="qsp-phone">
                Phone Number <span className="qsp-req">*</span>
              </label>
              <div className="qsp-phone-row">
                <div className={`qsp-phone-box
                  ${dropOpen && suggestions.length ? 'qsp-phone-box--open' : ''}
                  ${matched ? 'qsp-phone-box--matched' : ''}
                `}>
                  <IcPhone />
                  <input
                    id="qsp-phone"
                    ref={phoneRef}
                    className="qsp-phone-input"
                    type="tel"
                    inputMode="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={e => {
                      setPhone(e.target.value);
                      setToast(null);
                      tryMatch(name, e.target.value);
                      setDropOpen(true);
                    }}
                    autoComplete="off"
                  />
                  {phone && (
                    <button className="qsp-icon-btn" type="button"
                      onClick={() => { setPhone(''); setMatched(null); phoneRef.current?.focus(); }}>
                      <IcClose size={12} />
                    </button>
                  )}
                </div>

                <button
                  className={`qsp-contacts-btn ${!contactsOk ? 'qsp-contacts-btn--off' : ''}`}
                  onClick={handleContacts}
                  title={contactsOk ? 'Browse phone contacts' : 'Available on mobile browser'}
                  type="button"
                >
                  <IcContacts />
                  <span>Contacts</span>
                </button>

                {/* Dropdown */}
                {dropOpen && suggestions.length > 0 && (
                  <ul className="qsp-dropdown">
                    {suggestions.map(p => (
                      <li key={p.appointmentId || p.patientId} className="qsp-dd-row" onMouseDown={() => handleSelect(p)}>
                        <div className="qsp-dd-av">{(p.name || '?')[0].toUpperCase()}</div>
                        <div className="qsp-dd-info">
                          <span className="qsp-dd-name">{p.name}</span>
                          <span className="qsp-dd-ph">{p.phoneNumber || p.phone || ''}</span>
                        </div>
                        <div className="qsp-dd-right">
                          <span className={`qsp-chip ${STATUS_CLS[(p.status || '').toUpperCase()] || 'qsp-chip--gray'}`}>
                            {p.status || 'SCHEDULED'}
                          </span>
                          {p.tokenNumber && <span className="qsp-token">#{p.tokenNumber}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {dropOpen && (phone.length >= 3 || name.length >= 2) && suggestions.length === 0 && (
                  <div className="qsp-dd-empty">No registered patient found</div>
                )}
              </div>

              {matched && (
                <div className="qsp-match-badge">
                  <IcCheck />
                  <span>Registered · Token #{matched.tokenNumber}</span>
                  <span className={`qsp-chip ${STATUS_CLS[(matched.status || '').toUpperCase()] || 'qsp-chip--gray'}`}>
                    {matched.status}
                  </span>
                </div>
              )}
              {phoneOk && !matched && (
                <div className="qsp-new-badge">⚠ New / unregistered patient</div>
              )}
            </div>
          </div>

          {/* ── TOAST ── */}
          {toast && (
            <div className={`qsp-toast qsp-toast--${toast.type}`}>
              {toast.type === 'error'   && '⚠ '}
              {toast.type === 'success' && '✓ '}
              {toast.type === 'info'    && <span className="qsp-spin">◌ </span>}
              {toast.msg}
            </div>
          )}

          {/* ══ ATTACHMENTS ══ */}
          <div className="qsp-form-card">
            <p className="qsp-card-heading">
              <IcClip /> Attach Report
              <span className="qsp-card-hint">PDF or image · max 5 MB · up to {MAX_FILES}</span>
            </p>

            <div
              className={`qsp-dz ${dragOver ? 'qsp-dz--over' : ''} ${files.length >= MAX_FILES ? 'qsp-dz--full' : ''}`}
              onClick={() => files.length < MAX_FILES && fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) addFiles([...e.dataTransfer.files]); }}
            >
              <IcUpload />
              <p className="qsp-dz-text">
                {dragOver ? 'Drop here' : files.length >= MAX_FILES ? 'Max 5 files' : 'Tap to attach or drag & drop'}
              </p>
              <p className="qsp-dz-sub">PDF, JPG, PNG, WEBP</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                multiple
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.length) addFiles([...e.target.files]); e.target.value = ''; }}
              />
            </div>

            {files.length > 0 && (
              <div className="qsp-attach-list">
                {files.map(f => (
                  <div key={f.id} className="qsp-attach-chip">
                    {f.preview
                      ? <img src={f.preview} alt={f.name} className="qsp-thumb" />
                      : <span className="qsp-file-icon"><IcFile /></span>}
                    <div className="qsp-attach-info">
                      <span className="qsp-attach-name" title={f.name}>{f.name}</span>
                      <span className="qsp-attach-sz">{fmtSz(f.size)}</span>
                    </div>
                    <button className="qsp-icon-btn" type="button" onClick={() => removeFile(f.id)}>
                      <IcClose size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ══ SEND BUTTON ══ */}
          <button
            className={`qsp-send-btn ${!canSend ? 'qsp-send-btn--off' : ''}`}
            onClick={handleSend}
            disabled={!canSend}
            type="button"
          >
            {sending ? (
              <><span className="qsp-spin-circle" /> {progress || 'Sending…'}</>
            ) : (
              <>
                <IcWA size={17} />
                Send Report via WhatsApp
                {files.length > 0 && (
                  <span className="qsp-send-badge">{files.length} file{files.length > 1 ? 's' : ''}</span>
                )}
              </>
            )}
          </button>

          {nameOk && phoneOk && files.length === 0 && (
            <p className="qsp-nudge">📎 Attach at least one report file to send</p>
          )}

          {/* ── Today's quick chips ── */}
          {!phoneOk && !name && todayPatients.length > 0 && (
            <div className="qsp-quick-wrap">
              <p className="qsp-quick-lbl">Today's Patients — tap to autofill</p>
              <div className="qsp-quick-grid">
                {[...todayPatients]
                  .sort((a, b) => (parseInt(a.tokenNumber) || 999) - (parseInt(b.tokenNumber) || 999))
                  .slice(0, 9)
                  .map(p => (
                    <button key={p.appointmentId || p.patientId} className="qsp-quick-chip" onClick={() => handleSelect(p)} type="button">
                      {p.tokenNumber && <span className="qsp-token">#{p.tokenNumber}</span>}
                      <span className="qsp-quick-nm">{p.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* ── Sent log ── */}
          {sentLog.length > 0 && (
            <div className="qsp-sent-log">
              <p className="qsp-quick-lbl">✓ Sent this session</p>
              {sentLog.map((s, i) => (
                <div key={i} className="qsp-sent-row">
                  <span className="qsp-sent-ck">✓</span>
                  <span className="qsp-sent-nm">{s.name}</span>
                  <span className="qsp-sent-ph">****{s.phone.slice(-4)}</span>
                  <span className="qsp-sent-att">{s.files} file{s.files > 1 ? 's' : ''}</span>
                  {s.registered && <span className="qsp-chip qsp-chip--green" style={{ fontSize: '9.5px' }}>Registered</span>}
                  <span className="qsp-sent-t">{fmtT(s.time)}</span>
                </div>
              ))}
            </div>
          )}

          <p className="qsp-hint"><kbd>Esc</kbd> to close</p>
        </div>
      </div>
    </div>
  );
}