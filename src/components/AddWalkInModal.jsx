import React, { useState, useEffect, useRef, useMemo } from 'react';
import '../css/AddWalkInModal.css';
import { apiFetch } from "../services/apiConfig";

/* ── Icons needed only for the phone field ── */
const IcPhone = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
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
const IcClear = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const IcCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const STATUS_CLS = {
  COMPLETED: 'wi-chip--green', CONFIRMED: 'wi-chip--blue',
  SCHEDULED: 'wi-chip--amber', CANCELLED: 'wi-chip--red', ACTIVE: 'wi-chip--teal',
};

/**
 * AddWalkInModal
 *
 * Original props (unchanged):
 *   loading, initData, onClose, onSuccess
 *
 * New props added:
 *   role           – 'DOCTOR' | 'RECEPTIONIST'
 *   lockedDoctorId – number|null
 *   todayPatients  – array (for phone autocomplete)
 */
const AddWalkInModal = ({
  loading,
  initData = {},
  onClose,
  onSuccess,
  role           = 'RECEPTIONIST',
  lockedDoctorId = null,
  todayPatients  = [],
}) => {
  const [toast, setToast] = useState(null);

  const showToast = (type, title, message, duration = 3500) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), duration);
  };

  const [formData, setFormData] = useState({
    doctorId:        '',
    appointmentDate: '',
    slot:            '',
    patientName:     '',
    phoneNumber:     '',
    age:             '',
    gender:          'Male',
    reason:          '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState({});

  /* ── phone field extras ── */
  const [matched,    setMatched]    = useState(null);
  const [dropOpen,   setDropOpen]   = useState(false);
  const [contactsOk, setContactsOk] = useState(false);
  const phoneWrapRef = useRef(null);
  const phoneRef     = useRef(null);

  const doctors  = initData?.doctors || [];
  const isDoctor = role === 'DOCTOR';

  /* ── mount ── */
  useEffect(() => {
    setContactsOk('contacts' in navigator && 'ContactsManager' in window);
  }, []);

  /* ── close dropdown on outside click ── */
  useEffect(() => {
    const fn = e => { if (!phoneWrapRef.current?.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  /* ── Seed date from initData ── */
  useEffect(() => {
    if (initData?.date) setFormData(prev => ({ ...prev, appointmentDate: initData.date }));
  }, [initData]);

  /* ── Auto-lock doctor when role=DOCTOR ── */
  useEffect(() => {
    if (isDoctor && lockedDoctorId) {
      setFormData(prev => {
        const doc = doctors.find(d => String(d.doctorId) === String(lockedDoctorId));
        return { ...prev, doctorId: String(lockedDoctorId), doctorName: doc?.doctorName || '' };
      });
    }
  }, [isDoctor, lockedDoctorId, doctors.length]); // eslint-disable-line

  /* ── Auto-select slot if only one available ── */
  useEffect(() => {
    const doc = doctors.find(d => String(d.doctorId) === String(formData.doctorId));
    if (!doc) return;
    if (doc.morningAvailable && !doc.eveningAvailable) setFormData(prev => ({ ...prev, slot: 'MORNING' }));
    if (doc.eveningAvailable && !doc.morningAvailable) setFormData(prev => ({ ...prev, slot: 'EVENING' }));
  }, [formData.doctorId]); // eslint-disable-line

  const selectedDoctor   = doctors.find(d => String(d.doctorId) === String(formData.doctorId));
  const lockedDoctorName = doctors.find(d => String(d.doctorId) === String(lockedDoctorId))?.doctorName || 'You';

  /* ══════════════  PHONE AUTOCOMPLETE  ══════════════════════════════════════ */
  const suggestions = useMemo(() => {
    const q  = formData.phoneNumber.trim().replace(/\D/g, '');
    const lo = formData.patientName.trim().toLowerCase();
    if (!q && !lo) return todayPatients.slice(0, 8);
    return todayPatients.filter(p => {
      const ph = (p.phoneNumber || p.phone || '').toString().replace(/\D/g, '');
      return (q && ph.includes(q)) || (lo && (p.name || '').toLowerCase().includes(lo));
    }).slice(0, 8);
  }, [formData.phoneNumber, formData.patientName, todayPatients]);

  const tryMatch = (nameVal, phoneVal) => {
    const dg = phoneVal.replace(/\D/g, '');
    if (dg.length >= 6) {
      const found = todayPatients.find(p =>
        (p.phoneNumber || p.phone || '').toString().replace(/\D/g, '').endsWith(dg.slice(-10))
      );
      if (found) {
        setMatched(found);
        if (!nameVal.trim()) setFormData(prev => ({ ...prev, patientName: found.name || '' }));
        return;
      }
    }
    setMatched(null);
  };

  const handleSelectPatient = p => {
    setFormData(prev => ({
      ...prev,
      phoneNumber: (p.phoneNumber || p.phone || '').toString(),
      patientName: p.name || prev.patientName,
    }));
    setMatched(p);
    setDropOpen(false);
    if (errors.phoneNumber) setErrors(prev => ({ ...prev, phoneNumber: '' }));
  };

  const handleContacts = async () => {
    if (!contactsOk) return;
    try {
      const res   = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (!res?.length) return;
      const tel   = (res[0].tel?.[0] || '').replace(/\D/g, '');
      const cname = res[0].name?.[0] || '';
      if (!tel) { showToast('error', 'No Number', 'No phone number in selected contact.'); return; }
      setFormData(prev => ({
        ...prev,
        phoneNumber: tel,
        patientName: cname && !prev.patientName.trim() ? cname : prev.patientName,
      }));
      tryMatch(cname, tel);
      setDropOpen(true);
    } catch (err) {
      if (err.name !== 'AbortError') showToast('error', 'Contacts Error', 'Could not access contacts.');
    }
  };
  /* ══════════════════════════════════════════════════════════════════════════ */

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    if (field === 'doctorId') {
      const doc = doctors.find(d => String(d.doctorId) === String(value));
      if (doc) setFormData(prev => ({ ...prev, doctorId: value, doctorName: doc.doctorName }));
    }
  };

  /* ── Date helpers ── */
  const getAppointmentDateOptions = () => {
    const today    = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today); dayAfter.setDate(dayAfter.getDate() + 2);
    return [
      { value: 'today',    label: 'Today' },
      { value: 'tomorrow', label: 'Tomorrow' },
      { value: dayAfter.toISOString().split('T')[0], label: 'Day After Tomorrow' },
      { value: 'custom',   label: 'Custom Date' },
    ];
  };

  const getNormalizedDate = (value) => {
    const today = new Date();
    if (value === 'today')    return today.toISOString().split('T')[0];
    if (value === 'tomorrow') {
      const tmr = new Date(today); tmr.setDate(today.getDate() + 1);
      return tmr.toISOString().split('T')[0];
    }
    return value;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h    = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.doctorId || !formData.slot || !formData.patientName) {
      showToast('error', 'Required Fields Missing', 'Please fill Doctor, Slot and Patient Name.');
      return;
    }
    const payload = {
      doctorId:        Number(formData.doctorId),
      appointmentDate: formData.appointmentDate === 'custom'
        ? formData.customDate
        : getNormalizedDate(formData.appointmentDate),
      slot:            formData.slot.toUpperCase(),
      patientName:     formData.patientName,
      phoneNumber:     formData.phoneNumber,
      age:             Number(formData.age),
      gender:          formData.gender,
      reason:          formData.reason,
    };
    try {
      setSubmitting(true);
      await apiFetch('/appointments/walkin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      showToast('success', 'Walk-in Added', 'Patient registered successfully.');
      setTimeout(() => { onSuccess(); onClose(); }, 1600);
    } catch {
      showToast('error', 'Registration Failed', 'Failed to add walk-in patient. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const digits  = formData.phoneNumber.replace(/\D/g, '');
  const phoneOk = digits.length >= 7;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="modal-header">
          <h2>Add Walk-in Patient</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="walkin-form">

          {/* ── DOCTOR ── */}
          <div className="form-group">
            <label className="form-label">
              Doctor *
              {isDoctor && (
                <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 20, fontWeight: 700, marginLeft: 6 }}>
                  Your patients only ✓
                </span>
              )}
              <svg viewBox="0 0 24 24" fill="none" className="label-icon">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </label>

            {isDoctor ? (
              <div
                className="form-input"
                style={{ background: '#f0fdf4', borderColor: '#86efac', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'default' }}
              >
                <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M4 20c0-2.2 3.6-4 8-4s8 1.8 8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {lockedDoctorName}
                <span style={{ marginLeft: 'auto', fontSize: 11, opacity: .65, fontWeight: 500 }}>Auto-selected</span>
              </div>
            ) : (
              <select
                className={`form-select ${errors.doctorId ? 'error' : ''}`}
                value={formData.doctorId}
                onChange={e => handleChange('doctorId', e.target.value)}
              >
                <option value="">Select Doctor</option>
                {doctors.map(doc => (
                  <option key={doc.doctorId} value={doc.doctorId}>{doc.doctorName}</option>
                ))}
              </select>
            )}
            {errors.doctorId && <span className="error-text">{errors.doctorId}</span>}
          </div>

          {/* ── APPOINTMENT DATE ── */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Appointment Date *
                <svg viewBox="0 0 24 24" fill="none" className="label-icon">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </label>
              <select
                className="form-select"
                value={formData.appointmentDate}
                onChange={e => handleChange('appointmentDate', e.target.value)}
              >
                {getAppointmentDateOptions().map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {formData.appointmentDate === 'custom' && (
              <div className="form-group">
                <label className="form-label">Select Date *</label>
                <input
                  type="date"
                  className={`form-input ${errors.customDate ? 'error' : ''}`}
                  value={formData.customDate}
                  onChange={e => handleChange('customDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.customDate && <span className="error-text">{errors.customDate}</span>}
              </div>
            )}
          </div>

          {/* ── SLOT ── */}
          <div className="form-group">
            <label className="form-label">
              Slot *
              <svg viewBox="0 0 24 24" fill="none" className="label-icon">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </label>
            <div className="radio-group">
              <label className={`radio-option ${formData.slot === 'MORNING' ? 'active' : ''} ${!selectedDoctor?.morningAvailable ? 'disabled' : ''}`}>
                <input type="radio" value="MORNING" disabled={!selectedDoctor?.morningAvailable}
                  checked={formData.slot === 'MORNING'} onChange={e => handleChange('slot', e.target.value)} />
                <span className="radio-icon">🌅</span>
                <span className="radio-label">Morning</span>
                {selectedDoctor?.morningAvailable && selectedDoctor?.morningStart && (
                  <span className="radio-time">{formatTime(selectedDoctor.morningStart)} – {formatTime(selectedDoctor.morningEnd)}</span>
                )}
                {!selectedDoctor?.morningAvailable && selectedDoctor && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, background: '#f1f5f9', color: '#9ca3af', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>Not available</span>
                )}
              </label>
              <label className={`radio-option ${formData.slot === 'EVENING' ? 'active' : ''} ${!selectedDoctor?.eveningAvailable ? 'disabled' : ''}`}>
                <input type="radio" value="EVENING" disabled={!selectedDoctor?.eveningAvailable}
                  checked={formData.slot === 'EVENING'} onChange={e => handleChange('slot', e.target.value)} />
                <span className="radio-icon">🌙</span>
                <span className="radio-label">Evening</span>
                {selectedDoctor?.eveningAvailable && selectedDoctor?.eveningStart && (
                  <span className="radio-time">{formatTime(selectedDoctor.eveningStart)} – {formatTime(selectedDoctor.eveningEnd)}</span>
                )}
                {!selectedDoctor?.eveningAvailable && selectedDoctor && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, background: '#f1f5f9', color: '#9ca3af', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>Not available</span>
                )}
              </label>
            </div>
          </div>

          {/* ── PATIENT DETAILS ── */}
          <div className="form-divider"><span>Patient Details</span></div>

          <div className="form-group">
            <label className="form-label">
              Patient Name *
              <svg viewBox="0 0 24 24" fill="none" className="label-icon">
                <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </label>
            <input
              type="text"
              className={`form-input ${errors.patientName ? 'error' : ''}`}
              placeholder="Enter patient full name"
              value={formData.patientName}
              onChange={e => {
                setFormData({ ...formData, patientName: e.target.value });
                if (formData.phoneNumber) tryMatch(e.target.value, formData.phoneNumber);
              }}
            />
            {errors.patientName && <span className="error-text">{errors.patientName}</span>}
          </div>

          <div className="form-row">

            {/* ════════ PHONE NUMBER ════════ */}
            <div className="form-group" ref={phoneWrapRef} style={{ position: 'relative' }}>
              <label className="form-label">
                Phone Number *
                <svg viewBox="0 0 24 24" fill="none" className="label-icon">
                  <path d="M22 16.92V19.92C22.0011 20.1985 21.9441 20.4742 21.8325 20.7293C21.7209 20.9845 21.5573 21.2136 21.3521 21.4019C21.1469 21.5901 20.9046 21.7335 20.6407 21.8227C20.3769 21.9119 20.0974 21.9451 19.82 21.92C16.7428 21.5856 13.787 20.5341 11.19 18.85C8.77382 17.3147 6.72533 15.2662 5.18999 12.85C3.49997 10.2412 2.44824 7.27099 2.11999 4.18C2.095 3.90347 2.12787 3.62476 2.21649 3.36162C2.30512 3.09849 2.44756 2.85669 2.63476 2.65162C2.82196 2.44655 3.0498 2.28271 3.30379 2.17052C3.55777 2.05833 3.83233 2.00026 4.10999 2H7.10999C7.5953 1.99522 8.06579 2.16708 8.43376 2.48353C8.80173 2.79999 9.04207 3.23945 9.10999 3.72C9.23662 4.68007 9.47144 5.62273 9.80999 6.53C9.94454 6.88792 9.97366 7.27691 9.8939 7.65088C9.81415 8.02485 9.62886 8.36811 9.35999 8.64L8.08999 9.91C9.51355 12.4135 11.5864 14.4864 14.09 15.91L15.36 14.64C15.6319 14.3711 15.9751 14.1858 16.3491 14.1061C16.7231 14.0263 17.1121 14.0555 17.47 14.19C18.3773 14.5286 19.3199 14.7634 20.28 14.89C20.7658 14.9585 21.2094 15.2032 21.5265 15.5775C21.8437 15.9518 22.0122 16.4296 22 16.92Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </label>

              {/* input row: styled box + contacts button */}
              <div className="wi-phone-row">

                {/* box that looks exactly like .form-input but is flex */}
                <div className={[
                  'wi-phone-box',
                  matched                              ? 'wi-phone-box--matched' : '',
                  dropOpen && suggestions.length > 0   ? 'wi-phone-box--open'    : '',
                  errors.phoneNumber                   ? 'wi-phone-box--error'   : '',
                ].filter(Boolean).join(' ')}>
                  <IcPhone />
                  <input
                    ref={phoneRef}
                    type="tel"
                    inputMode="tel"
                    placeholder="+91 98765 43210"
                    autoComplete="off"
                    value={formData.phoneNumber}
                    className="wi-phone-input"
                    onChange={e => {
                      handleChange('phoneNumber', e.target.value);
                      tryMatch(formData.patientName, e.target.value);
                      setDropOpen(true);
                    }}
                  />
                  {formData.phoneNumber && (
                    <button className="wi-clear-btn" type="button"
                      onClick={() => { handleChange('phoneNumber', ''); setMatched(null); phoneRef.current?.focus(); }}>
                      <IcClear />
                    </button>
                  )}
                </div>

                {/* Contacts picker */}
                <button
                  type="button"
                  className={`wi-contacts-btn${!contactsOk ? ' wi-contacts-btn--off' : ''}`}
                  onClick={handleContacts}
                  title={contactsOk ? 'Browse phone contacts' : 'Available on mobile browser'}
                >
                  <IcContacts />
                  <span>Contacts</span>
                </button>

                {/* Autocomplete dropdown */}
                {dropOpen && suggestions.length > 0 && (
                  <ul className="wi-dropdown">
                    {suggestions.map(p => (
                      <li key={p.appointmentId || p.patientId} className="wi-dd-row"
                        onMouseDown={() => handleSelectPatient(p)}>
                        <div className="wi-dd-av">{(p.name || '?')[0].toUpperCase()}</div>
                        <div className="wi-dd-info">
                          <span className="wi-dd-name">{p.name}</span>
                          <span className="wi-dd-ph">{p.phoneNumber || p.phone || ''}</span>
                        </div>
                        <div className="wi-dd-right">
                          <span className={`wi-chip ${STATUS_CLS[(p.status||'').toUpperCase()]||'wi-chip--gray'}`}>
                            {p.status || 'SCHEDULED'}
                          </span>
                          {p.tokenNumber && <span className="wi-token">#{p.tokenNumber}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* No match hint */}
                {dropOpen && (formData.phoneNumber.length >= 3 || formData.patientName.length >= 2) && suggestions.length === 0 && (
                  <div className="wi-dd-empty">No registered patient found</div>
                )}
              </div>

              {/* Matched badge */}
              {matched && (
                <div className="wi-match-badge">
                  <IcCheck />
                  <span>Registered · Token #{matched.tokenNumber}</span>
                  <span className={`wi-chip ${STATUS_CLS[(matched.status||'').toUpperCase()]||'wi-chip--gray'}`}>
                    {matched.status}
                  </span>
                </div>
              )}

              {/* New/unregistered hint */}
              {phoneOk && !matched && (
                <div className="wi-new-badge">⚠ New / unregistered patient</div>
              )}

              {errors.phoneNumber && <span className="error-text">{errors.phoneNumber}</span>}
            </div>
            {/* ════════ END PHONE ════════ */}

            <div className="form-group">
              <label className="form-label">Age *</label>
              <input
                type="number"
                className={`form-input ${errors.age ? 'error' : ''}`}
                placeholder="Age"
                min="1" max="150"
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: e.target.value })}
              />
              {errors.age && <span className="error-text">{errors.age}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Gender *</label>
              <select
                className="form-select"
                value={formData.gender}
                onChange={e => handleChange('gender', e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Reason for Visit
              <svg viewBox="0 0 24 24" fill="none" className="label-icon">
                <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </label>
            <textarea
              className="form-textarea"
              placeholder="Consulting for fever, checkup, etc..."
              rows="3"
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
            />
          </div>

          {/* ── Actions ── */}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? (
                <><span className="spinner" /> Adding...</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Add Patient
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 999999, display: 'flex', alignItems: 'center', gap: 12,
          background: '#fff',
          borderLeft: `4px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`,
          borderRadius: 12, padding: '14px 20px',
          minWidth: 300, maxWidth: 440,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          fontFamily: "'Segoe UI',Arial,sans-serif",
          animation: 'toastDrop 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>
            {toast.type === 'success' ? '✅' : '❌'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a', marginBottom: 2 }}>{toast.title}</div>
            <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.4 }}>{toast.message}</div>
          </div>
          <button onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 20, padding: '0 0 0 10px' }}>×</button>
          <style>{`
            @keyframes toastDrop {
              from { opacity:0; transform:translateX(-50%) translateY(-16px) scale(0.96); }
              to   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default AddWalkInModal;