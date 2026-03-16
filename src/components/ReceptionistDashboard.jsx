// ─────────────────────────────────────────────────────────────────────────────
// ReceptionistDashboard.jsx
// src/components/ReceptionistDashboard.jsx
//
// What a receptionist can do (mirrors real clinic software like Practo/Clinicx):
//   ✅ View today's appointment queue with token numbers
//   ✅ Mark patients as Arrived / Called / No-show
//   ✅ Add walk-in patients
//   ✅ Search patients by name / phone
//   ✅ See stats: total scheduled, arrived, waiting, no-show
//   ✅ View patient visit history (queue + history)
//   ✅ View prescriptions — READ-ONLY (cannot edit or delete)
//   ✅ Print prescription
//   ✅ Download prescription as PDF
//   ✅ Send prescription via WhatsApp / SMS
//   ✅ Attach lab reports (PDF only) to patient
//   ✅ Send reports / prescriptions in absence of doctor
//   ✅ Logout
//
// What a receptionist CANNOT do:
//   ❌ Edit or delete prescription details or clinical notes
//   ❌ Complete consultations
//   ❌ Access the canvas/prescription pad
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/apiConfig';
import AddWalkInModal from './AddWalkInModal';
import '../css/ReceptionistDashboard.css';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  SCHEDULED:  { label: 'Scheduled',  color: '#6366f1', bg: '#eef2ff' },
  CONFIRMED:  { label: 'Confirmed',  color: '#0891b2', bg: '#e0f2fe' },
  ARRIVED:    { label: 'Arrived',    color: '#0f766e', bg: '#f0fdf4' },
  IN_CONSULT: { label: 'In Consult', color: '#f59e0b', bg: '#fffbeb' },
  COMPLETED:  { label: 'Completed',  color: '#10b981', bg: '#d1fae5' },
  NO_SHOW:    { label: 'No Show',    color: '#ef4444', bg: '#fee2e2' },
  CANCELLED:  { label: 'Cancelled',  color: '#94a3b8', bg: '#f1f5f9' },
};

const getStatusStyle = (status) =>
  STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.SCHEDULED;

// ── Avatar color ──────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#0f766e,#0891b2)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#10b981,#0891b2)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#3b82f6,#6366f1)',
];
const avatarColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ── Inline SVG helpers ────────────────────────────────────────────────────────
const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" width="11" height="11" style={{ marginRight: 3 }}>
    <path d="M22 16.92V19.92A2 2 0 0 1 20.46 21.87C17.39 21.55 14.44 20.5 11.86 18.83C9.47 17.31 7.43 15.27 5.92 12.88C4.24 10.29 3.19 7.32 2.88 4.24A2 2 0 0 1 4.82 2H7.82A2 2 0 0 1 9.82 3.72C10.06 5.01 10.44 6.26 10.97 7.44A2 2 0 0 1 10.52 9.42L9.3 10.64C10.74 13.18 12.82 15.26 15.36 16.7L16.58 15.48A2 2 0 0 1 18.56 15.03C19.74 15.56 20.99 15.94 22.28 16.18A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ── PatientDrawer ─────────────────────────────────────────────────────────────
// Slide-in right panel showing Info / History / Prescriptions / Reports / Send
const PatientDrawer = ({ appt, onClose, clinicId }) => {
  const [activeTab, setActiveTab]           = useState('info');
  const [history, setHistory]               = useState([]);
  const [prescriptions, setPrescriptions]   = useState([]);
  const [reports, setReports]               = useState([]);
  const [newFiles, setNewFiles]             = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingRx, setLoadingRx]           = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [sendChannel, setSendChannel]       = useState('WHATSAPP');
  const [sending, setSending]               = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [sendSelections, setSendSelections] = useState({ rx: true, reports: {} });
  const fileInputRef = useRef();

  // Lazy-load each tab's data on first open
  useEffect(() => {
    if (activeTab === 'history' && history.length === 0) fetchHistory();
    if (activeTab === 'rx'      && prescriptions.length === 0) fetchPrescriptions();
    if (activeTab === 'reports') fetchReports();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await apiFetch(`/patients/${appt.patientId}/history?clinicId=${clinicId}`);
      setHistory(data || []);
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchPrescriptions = async () => {
    setLoadingRx(true);
    try {
      const data = await apiFetch(`/patients/${appt.patientId}/prescriptions?clinicId=${clinicId}`);
      setPrescriptions(data || []);
    } catch (e) {
      console.error('Failed to load prescriptions', e);
    } finally {
      setLoadingRx(false);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const data = await apiFetch(`/patients/${appt.patientId}/reports?clinicId=${clinicId}`);
      setReports(data || []);
    } catch (e) {
      console.error('Failed to load reports', e);
    } finally {
      setLoadingReports(false);
    }
  };

  // ── Print prescription ───────────────────────────────────────────────────────
  const handlePrint = (rx) => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Prescription – ${appt.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
        h2   { margin: 0 0 4px; }
        p    { margin: 2px 0; color: #64748b; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th   { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 13px; }
        td   { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
      </style></head><body>
      <h2>${appt.name}</h2>
      <p>${appt.age ? appt.age + ' yrs' : ''} ${appt.gender ? '· ' + appt.gender : ''} · ${appt.phone}</p>
      <p style="margin-top:8px">Date: ${rx.date || rx.prescriptionDate || ''} &nbsp;|&nbsp; Doctor: ${rx.doctorName || appt.doctorName}</p>
      <table>
        <tr><th>Medicine</th><th>Dosage</th><th>Duration</th><th>Instructions</th></tr>
        ${(rx.medicines || rx.drugs || []).map(m => `
          <tr>
            <td>${m.name || m.medicineName || ''}</td>
            <td>${m.dose || m.dosage || ''}</td>
            <td>${m.duration || ''}</td>
            <td>${m.instructions || m.note || ''}</td>
          </tr>`).join('')}
      </table>
      ${rx.notes ? `<p style="margin-top:16px"><strong>Notes:</strong> ${rx.notes}</p>` : ''}
      <div class="footer">Printed by Receptionist &nbsp;|&nbsp; ${new Date().toLocaleString('en-IN')}</div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  // ── Download prescription as PDF ─────────────────────────────────────────────
  const handleDownloadPDF = async (rxId) => {
    try {
      const blob = await apiFetch(`/prescriptions/${rxId}/pdf`, { responseType: 'blob' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Prescription_${appt.name}_${rxId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to download PDF. Please try again.');
    }
  };

  // ── Send single prescription via WhatsApp / SMS ───────────────────────────────
  const handleSendRx = async (rxId, channel) => {
    try {
      await apiFetch(`/prescriptions/${rxId}/send`, {
        method: 'POST',
        body: JSON.stringify({ channel, patientId: appt.patientId, phone: appt.phone }),
      });
      alert(`Prescription sent via ${channel} to ${appt.phone}`);
    } catch (e) {
      alert(`Failed to send via ${channel}. Please try again.`);
    }
  };

  // ── Attach lab report (PDF only) ─────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { alert('Only PDF files are allowed.'); return; }
    if (file.size > 10 * 1024 * 1024)   { alert('File size must be under 10 MB.'); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', appt.patientId);
      formData.append('clinicId', clinicId);
      formData.append('appointmentId', appt.appointmentId);
      const uploaded = await apiFetch('/patients/reports/upload', {
        method: 'POST',
        body: formData,
        isFormData: true,
      });
      setNewFiles(prev => [...prev, uploaded]);
      setReports(prev => [...prev, uploaded]);
    } catch (e) {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ── Bulk send (doctor-absent flow) ───────────────────────────────────────────
  const handleBulkSend = async () => {
    setSending(true);
    try {
      const payload = {
        patientId:     appt.patientId,
        phone:         appt.phone,
        channel:       sendChannel,
        sendLatestRx:  sendSelections.rx,
        reportIds:     Object.entries(sendSelections.reports)
                         .filter(([, v]) => v)
                         .map(([id]) => id),
      };
      await apiFetch('/patients/send-documents', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      alert(`Documents sent via ${sendChannel} to ${appt.phone}`);
    } catch (e) {
      alert('Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const TABS = [
    { key: 'info',    label: 'Info' },
    { key: 'history', label: 'History' },
    { key: 'rx',      label: 'Prescriptions' },
    { key: 'reports', label: 'Reports' },
    { key: 'send',    label: '📤 Send' },
  ];

  return (
    <div className="recep-drawer-overlay" onClick={onClose}>
      <div className="recep-drawer" onClick={e => e.stopPropagation()}>

        {/* Drawer header */}
        <div className="recep-drawer-header">
          <div className="recep-drawer-avatar" style={{ background: avatarColor(appt.name) }}>
            {appt.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="recep-drawer-meta">
            <div className="recep-drawer-name">{appt.name}</div>
            <div className="recep-drawer-sub">
              {appt.age    && <span>{appt.age} yrs</span>}
              {appt.gender && <span>· {appt.gender}</span>}
              {appt.phone  && <span>· {appt.phone}</span>}
              {appt.token  && <span className="recep-drawer-token">{appt.token}</span>}
            </div>
          </div>
          <button className="recep-drawer-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="recep-drawer-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`recep-drawer-tab ${activeTab === t.key ? 'recep-drawer-tab--active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="recep-drawer-body">

          {/* ── INFO ── */}
          {activeTab === 'info' && (
            <div className="recep-drawer-section">
              <div className="recep-info-grid">
                <div className="recep-info-item">
                  <span className="recep-info-label">Full Name</span>
                  <span className="recep-info-val">{appt.name}</span>
                </div>
                <div className="recep-info-item">
                  <span className="recep-info-label">Age / Gender</span>
                  <span className="recep-info-val">{appt.age || '—'}{appt.gender ? ` / ${appt.gender}` : ''}</span>
                </div>
                <div className="recep-info-item">
                  <span className="recep-info-label">Phone</span>
                  <span className="recep-info-val">{appt.phone || '—'}</span>
                </div>
                <div className="recep-info-item">
                  <span className="recep-info-label">Token</span>
                  <span className="recep-info-val">{appt.token || '—'}</span>
                </div>
                <div className="recep-info-item">
                  <span className="recep-info-label">Doctor</span>
                  <span className="recep-info-val">{appt.doctorName || '—'}</span>
                </div>
                <div className="recep-info-item">
                  <span className="recep-info-label">Status</span>
                  <span
                    className="recep-status-badge"
                    style={{ color: getStatusStyle(appt.status).color, background: getStatusStyle(appt.status).bg }}
                  >
                    {getStatusStyle(appt.status).label}
                  </span>
                </div>
                {appt.reason && (
                  <div className="recep-info-item recep-info-item--full">
                    <span className="recep-info-label">Reason</span>
                    <span className="recep-info-val">{appt.reason}</span>
                  </div>
                )}
              </div>
              <div className="recep-info-shortcuts">
                <button className="recep-walkin-btn recep-walkin-btn--sm" onClick={() => setActiveTab('rx')}>
                  View Prescriptions
                </button>
                <button className="recep-walkin-btn recep-walkin-btn--sm" onClick={() => setActiveTab('send')}>
                  📤 Send to Patient
                </button>
              </div>
            </div>
          )}

          {/* ── HISTORY ── */}
          {activeTab === 'history' && (
            <div className="recep-drawer-section">
              {loadingHistory ? (
                <div className="recep-drawer-loading"><div className="recep-spinner" /></div>
              ) : history.length === 0 ? (
                <div className="recep-drawer-empty">No visit history found</div>
              ) : (
                history.map((h, i) => (
                  <div className="recep-history-card" key={i}>
                    <div className="recep-history-date">
                      {h.date || h.visitDate || '—'} &nbsp;·&nbsp; {h.type || 'OPD'}
                    </div>
                    <div className="recep-history-doc">🩺 {h.doctorName || appt.doctorName}</div>
                    {h.note && <div className="recep-history-note">{h.note}</div>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── PRESCRIPTIONS (READ-ONLY) ── */}
          {activeTab === 'rx' && (
            <div className="recep-drawer-section">
              <div className="recep-readonly-notice">
                <IconLock />
                Read-only — prescriptions cannot be edited or deleted by receptionist
              </div>
              {loadingRx ? (
                <div className="recep-drawer-loading"><div className="recep-spinner" /></div>
              ) : prescriptions.length === 0 ? (
                <div className="recep-drawer-empty">No prescriptions on record</div>
              ) : (
                prescriptions.map((rx, i) => (
                  <div className="recep-rx-card" key={i}>
                    <div className="recep-rx-meta">
                      <div className="recep-rx-date">{rx.date || rx.prescriptionDate || '—'}</div>
                      <div className="recep-rx-doc">Prescribed by {rx.doctorName || appt.doctorName}</div>
                    </div>
                    <div className="recep-rx-drugs">
                      {(rx.medicines || rx.drugs || []).map((m, j) => (
                        <div className="recep-drug-row" key={j}>
                          <span className="recep-drug-name">{m.name || m.medicineName}</span>
                          <span className="recep-drug-dose">{m.dose || m.dosage}</span>
                        </div>
                      ))}
                    </div>
                    {rx.notes && <div className="recep-rx-notes">{rx.notes}</div>}
                    <div className="recep-rx-actions">
                      <button className="recep-rx-btn recep-rx-btn--print" onClick={() => handlePrint(rx)}>
                        🖨️ Print
                      </button>
                      <button className="recep-rx-btn recep-rx-btn--pdf" onClick={() => handleDownloadPDF(rx.id || rx.prescriptionId)}>
                        ⬇ PDF
                      </button>
                      <button className="recep-rx-btn recep-rx-btn--wa" onClick={() => handleSendRx(rx.id || rx.prescriptionId, 'WHATSAPP')}>
                        💬 WhatsApp
                      </button>
                      <button className="recep-rx-btn recep-rx-btn--sms" onClick={() => handleSendRx(rx.id || rx.prescriptionId, 'SMS')}>
                        📱 SMS
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── REPORTS ── */}
          {activeTab === 'reports' && (
            <div className="recep-drawer-section">
              <p className="recep-section-label">Lab Reports (PDF only)</p>

              {loadingReports ? (
                <div className="recep-drawer-loading"><div className="recep-spinner" /></div>
              ) : (
                <>
                  {reports.map((r, i) => (
                    <div className="recep-file-row" key={r.id || i}>
                      <span className="recep-file-icon">📄</span>
                      <span className="recep-file-name">{r.fileName || r.name}</span>
                      <span className={`recep-file-tag ${newFiles.some(f => f.id === r.id) ? 'recep-file-tag--new' : 'recep-file-tag--existing'}`}>
                        {newFiles.some(f => f.id === r.id) ? 'new' : 'existing'}
                      </span>
                      <button
                        className="recep-rx-btn recep-rx-btn--pdf"
                        onClick={() => window.open(r.url || r.fileUrl, '_blank')}
                      >
                        ⬇ Download
                      </button>
                    </div>
                  ))}

                  {/* Upload drop zone */}
                  <div className="recep-upload-drop" onClick={() => fileInputRef.current?.click()}>
                    {uploading ? (
                      <>
                        <div className="recep-spinner" style={{ borderTopColor: '#1d4ed8', width: 22, height: 22 }} />
                        <span>Uploading…</span>
                      </>
                    ) : (
                      <>
                        <div className="recep-upload-icon">📁</div>
                        <span>Click to attach lab report</span>
                        <small>PDF only · max 10 MB</small>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />

                  {newFiles.length > 0 && (
                    <button
                      className="recep-walkin-btn"
                      style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                      onClick={() => setActiveTab('send')}
                    >
                      Send Reports to Patient →
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── SEND (doctor-absent flow) ── */}
          {activeTab === 'send' && (
            <div className="recep-drawer-section">
              <div className="recep-send-notice">
                ℹ️ Doctor absent? You can still send prescriptions &amp; reports directly to the patient.
              </div>

              <p className="recep-section-label">Send channel</p>
              <div className="recep-channel-tabs">
                {[
                  { key: 'WHATSAPP', label: '💬 WhatsApp' },
                  { key: 'SMS',      label: '📱 SMS' },
                  { key: 'EMAIL',    label: '📧 Email' },
                ].map(c => (
                  <button
                    key={c.key}
                    className={`recep-channel-btn ${sendChannel === c.key ? 'recep-channel-btn--active' : ''}`}
                    onClick={() => setSendChannel(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <p className="recep-section-label" style={{ marginTop: 16 }}>What to send</p>

              {prescriptions.length > 0 && (
                <label className="recep-send-check">
                  <input
                    type="checkbox"
                    checked={sendSelections.rx}
                    onChange={e => setSendSelections(s => ({ ...s, rx: e.target.checked }))}
                  />
                  Latest Prescription ({prescriptions[0]?.date || prescriptions[0]?.prescriptionDate || '—'})
                </label>
              )}

              {reports.map(r => (
                <label className="recep-send-check" key={r.id}>
                  <input
                    type="checkbox"
                    checked={!!sendSelections.reports[r.id]}
                    onChange={e => setSendSelections(s => ({
                      ...s,
                      reports: { ...s.reports, [r.id]: e.target.checked },
                    }))}
                  />
                  {r.fileName || r.name}
                </label>
              ))}

              {prescriptions.length === 0 && reports.length === 0 && (
                <div className="recep-drawer-empty">
                  No prescriptions or reports available. Attach a report first.
                </div>
              )}

              <div className="recep-send-recipient">
                Sending to: <strong>{appt.phone}</strong>
              </div>

              <button
                className="recep-walkin-btn"
                style={{ width: '100%', justifyContent: 'center', opacity: sending ? 0.7 : 1 }}
                onClick={handleBulkSend}
                disabled={sending}
              >
                {sending && <span className="recep-btn-spinner" />}
                {sendChannel === 'WHATSAPP' ? '💬 Send via WhatsApp'
                  : sendChannel === 'SMS'   ? '📱 Send SMS'
                  :                           '📧 Send Email'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const ReceptionistDashboard = ({ clinicId }) => {
  const { auth, logout }                     = useAuth();
  const [appointments, setAppointments]      = useState([]);
  const [loading, setLoading]                = useState(true);
  const [search, setSearch]                  = useState('');
  const [filter, setFilter]                  = useState('ALL');
  const [currentTime, setCurrentTime]        = useState(new Date());
  const [showWalkIn, setShowWalkIn]          = useState(false);
  const [updatingId, setUpdatingId]          = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [walkInInitData, setWalkInInitData]  = useState(null);
  const [loadingWalkIn, setLoadingWalkIn]    = useState(false);
  const [selectedAppt, setSelectedAppt]     = useState(null); // drawer

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (clinicId) load();
  }, [clinicId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openWalkInModal = async () => {
    setLoadingWalkIn(true);
    setShowWalkIn(true);
    try {
      const data = await apiFetch(`/dashboard/walkin/init?clinicId=${clinicId}`);
      setWalkInInitData(data);
    } catch (err) {
      alert('Failed to load doctors');
      setShowWalkIn(false);
    } finally {
      setLoadingWalkIn(false);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const data     = await apiFetch(`/dashboard/appointments?clinicId=${clinicId}`);
      const todayStr = new Date().toISOString().split('T')[0];
      const today    = (data || []).filter(a => {
        const d = a.appointmentDate;
        return d && new Date(d).toISOString().split('T')[0] === todayStr;
      });
      setAppointments(today.map(a => ({
        appointmentId:   a.id,
        patientId:       a.patient?.id || a.patientId,
        name:            a.patient?.name            || 'Unknown',
        phone:           a.patient?.phone           || a.patient?.phoneNumber || '',
        age:             a.patient?.age             || '',
        gender:          a.patient?.gender          || '',
        token:           a.tokenNumber              || '',
        status:          a.status                   || 'SCHEDULED',
        reason:          a.notes                    || '',
        appointmentDate: a.appointmentDate,
        doctorName:      a.doctor?.name             || '',
        doctorSpec:      a.doctor?.specialization   || '',
        slot:            a.slot                     || '',
        startTime:       a.startTime                || '',
      })));
    } catch (e) {
      console.error('Failed to load appointments:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Status change ─────────────────────────────────────────────────────────────
  const handleStatusChange = async (appointmentId, newStatus) => {
    setUpdatingId(appointmentId);
    try {
      await apiFetch(`/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setAppointments(prev =>
        prev.map(a => a.appointmentId === appointmentId ? { ...a, status: newStatus } : a)
      );
    } catch (e) {
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     appointments.length,
    arrived:   appointments.filter(a => ['ARRIVED','IN_CONSULT'].includes(a.status?.toUpperCase())).length,
    completed: appointments.filter(a => a.status?.toUpperCase() === 'COMPLETED').length,
    waiting:   appointments.filter(a => ['SCHEDULED','CONFIRMED'].includes(a.status?.toUpperCase())).length,
    noShow:    appointments.filter(a => a.status?.toUpperCase() === 'NO_SHOW').length,
  }), [appointments]);

  // ── Filtered + searched list ──────────────────────────────────────────────────
  const visible = useMemo(() => {
    let list = [...appointments].sort((a, b) => {
      const oa = parseInt(a.token?.replace('#', '')) || 999;
      const ob = parseInt(b.token?.replace('#', '')) || 999;
      return oa - ob;
    });
    if (filter === 'WAITING')   list = list.filter(a => ['SCHEDULED','CONFIRMED'].includes(a.status?.toUpperCase()));
    if (filter === 'ARRIVED')   list = list.filter(a => ['ARRIVED','IN_CONSULT'].includes(a.status?.toUpperCase()));
    if (filter === 'COMPLETED') list = list.filter(a => a.status?.toUpperCase() === 'COMPLETED');
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.phone?.includes(q) ||
        a.token?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [appointments, filter, search]);

  // ── Time helpers ──────────────────────────────────────────────────────────────
  const hour     = currentTime.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr  = currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr  = currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // ── Next actions per status ───────────────────────────────────────────────────
  const nextActions = (status) => {
    const s = status?.toUpperCase();
    if (s === 'SCHEDULED' || s === 'CONFIRMED')
      return [{ label: '✓ Mark Arrived', value: 'ARRIVED' }, { label: '✗ No Show', value: 'NO_SHOW' }];
    if (s === 'ARRIVED')
      return [{ label: '→ In Consult', value: 'IN_CONSULT' }];
    return [];
  };

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="recep-loading">
        <div className="recep-spinner" />
        <p>Loading appointments…</p>
      </div>
    );
  }

  return (
    <div className="recep-root">

      {/* ── HEADER ── */}
      <header className="recep-header">
        <div className="recep-header-inner">

          <div className="recep-header-left">
            <div className="recep-role-badge">
              <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M9 9H15M9 13H15M9 17H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Receptionist
            </div>
            <div className="recep-header-text">
              <p className="recep-greeting">{greeting} 👋</p>
              <h1 className="recep-name">{auth?.displayName || 'Receptionist'}</h1>
              <p className="recep-clinic">{auth?.clinicName || ''}</p>
            </div>
          </div>

          <div className="recep-header-right">
            <div className="recep-date-badge">
              <svg viewBox="0 0 24 24" fill="none" width="13" height="13" style={{ flexShrink: 0 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {dateStr} · {timeStr}
            </div>
            <button
              className="recep-logout-btn"
              onClick={() => setShowLogoutConfirm(true)}
              title="Sign out"
            >
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M16 17L21 12L16 7M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sign Out
            </button>
          </div>

        </div>

        {/* Stats strip */}
        <div className="recep-stats-strip">
          <div className="recep-stat">
            <span className="recep-stat-num">{stats.total}</span>
            <span className="recep-stat-lbl">Total</span>
          </div>
          <div className="recep-stat-divider" />
          <div className="recep-stat">
            <span className="recep-stat-num recep-stat-num--waiting">{stats.waiting}</span>
            <span className="recep-stat-lbl">Waiting</span>
          </div>
          <div className="recep-stat-divider" />
          <div className="recep-stat">
            <span className="recep-stat-num recep-stat-num--arrived">{stats.arrived}</span>
            <span className="recep-stat-lbl">In Clinic</span>
          </div>
          <div className="recep-stat-divider" />
          <div className="recep-stat">
            <span className="recep-stat-num recep-stat-num--done">{stats.completed}</span>
            <span className="recep-stat-lbl">Done</span>
          </div>
          <div className="recep-stat-divider" />
          <div className="recep-stat">
            <span className="recep-stat-num recep-stat-num--noshow">{stats.noShow}</span>
            <span className="recep-stat-lbl">No Show</span>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="recep-main">

        {/* Toolbar */}
        <div className="recep-toolbar">
          <div className="recep-toolbar-left">
            <div className="recep-title-wrap">
              <span className="recep-section-title">Today's Queue</span>
              <span className="recep-count-badge">{visible.length} shown</span>
            </div>
          </div>
          <div className="recep-toolbar-right">
            <button className="recep-walkin-btn" onClick={openWalkInModal}>
              <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Add Walk-in
            </button>
            <button className="recep-refresh-btn" onClick={load}>
              <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                <path d="M1 4V10H7M23 20V14H17M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="recep-controls">
          <div className="recep-search-wrap">
            <svg className="recep-search-icon" viewBox="0 0 24 24" fill="none" width="16" height="16">
              <circle cx="11" cy="11" r="8" stroke="#94a3b8" strokeWidth="2" />
              <path d="M21 21L16.65 16.65" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              className="recep-search"
              placeholder="Search by name, phone or token…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="recep-filter-tabs">
            {[
              { key: 'ALL',       label: 'All' },
              { key: 'WAITING',   label: 'Waiting' },
              { key: 'ARRIVED',   label: 'In Clinic' },
              { key: 'COMPLETED', label: 'Done' },
            ].map(f => (
              <button
                key={f.key}
                className={`recep-filter-tab ${filter === f.key ? 'recep-filter-tab--active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Queue */}
        {visible.length === 0 ? (
          <div className="recep-empty">
            <div className="recep-empty-icon">📋</div>
            <p>No appointments found</p>
            <small>Try a different filter or add a walk-in</small>
          </div>
        ) : (
          <div className="recep-queue">
            {visible.map((appt) => {
              const s          = getStatusStyle(appt.status);
              const actions    = nextActions(appt.status);
              const isUpdating = updatingId === appt.appointmentId;
              return (
                <div
                  className="recep-card"
                  key={appt.appointmentId}
                  onClick={() => setSelectedAppt(appt)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Token */}
                  <div className="recep-token">
                    <span className="recep-token-num">{appt.token || '—'}</span>
                    <span className="recep-token-lbl">Token</span>
                  </div>

                  {/* Avatar */}
                  <div className="recep-avatar" style={{ background: avatarColor(appt.name) }}>
                    {appt.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  {/* Patient info */}
                  <div className="recep-card-body">
                    <div className="recep-card-top">
                      <span className="recep-patient-name">{appt.name}</span>
                      <span className="recep-status-badge" style={{ color: s.color, background: s.bg }}>
                        {s.label}
                      </span>
                    </div>
                    <div className="recep-card-meta">
                      {appt.age    && <span>{appt.age} yrs</span>}
                      {appt.gender && <span>· {appt.gender}</span>}
                      {appt.phone  && <span><IconPhone />****{appt.phone.slice(-4)}</span>}
                      {appt.doctorName && (
                        <span className="recep-doctor-pill">🩺 {appt.doctorName}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions — stopPropagation so drawer doesn't open on btn click */}
                  <div className="recep-actions" onClick={e => e.stopPropagation()}>
                    {actions.map(action => (
                      <button
                        key={action.value}
                        className={`recep-action-btn ${action.value === 'NO_SHOW' ? 'recep-action-btn--danger' : 'recep-action-btn--primary'}`}
                        onClick={() => handleStatusChange(appt.appointmentId, action.value)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <span className="recep-btn-spinner" /> : action.label}
                      </button>
                    ))}
                    <button
                      className="recep-action-btn recep-action-btn--outline"
                      onClick={(e) => { e.stopPropagation(); setSelectedAppt(appt); }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Patient Drawer ── */}
      {selectedAppt && (
        <PatientDrawer
          appt={selectedAppt}
          clinicId={clinicId}
          onClose={() => setSelectedAppt(null)}
        />
      )}

      {/* ── Walk-in modal ── */}
      {showWalkIn && (
        <AddWalkInModal
          loading={loadingWalkIn}
          initData={walkInInitData}
          onClose={() => setShowWalkIn(false)}
          onSuccess={() => { setShowWalkIn(false); load(); }}
          clinicId={clinicId}
        />
      )}

      {/* ── Logout confirm ── */}
      {showLogoutConfirm && (
        <div className="recep-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="recep-modal" onClick={e => e.stopPropagation()}>
            <h3>Sign out?</h3>
            <p>You'll need to sign in again to access the receptionist portal.</p>
            <div className="recep-modal-actions">
              <button className="recep-modal-cancel" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="recep-modal-confirm" onClick={logout}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReceptionistDashboard;