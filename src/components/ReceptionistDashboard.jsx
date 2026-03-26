// ─────────────────────────────────────────────────────────────────────────────
// ReceptionistDashboard.jsx  —  complete rewrite
//
// ✅ All original CSS class names preserved (recep-* prefix)
// ✅ Change Password modal
// ✅ Prescription tab — full medicine table (read-only), print + download
// ✅ Lab Reports tab — attach (base64) + send WhatsApp
// ✅ History tab — PatientHistoryPanel component
// ✅ Send tab — WhatsApp ONLY (no SMS / email)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth }           from '../context/AuthContext';
import { apiFetch }          from '../services/apiConfig';
import AddWalkInModal        from './AddWalkInModal';
import '../css/ReceptionistDashboard.css';

// React.lazy must come AFTER all import statements (eslint: import/first)
const PatientHistoryPanel = React.lazy(() =>
  import('./PatientHistoryPanel').catch(() => ({
    default: () => (
      <div style={{ padding:20, color:'#6b7280', fontSize:13, textAlign:'center' }}>
        History panel unavailable. Please refresh.
      </div>
    ),
  }))
);

/* ── Status config ─────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  SCHEDULED:  { label: 'Scheduled',  color: '#6366f1', bg: '#eef2ff' },
  CONFIRMED:  { label: 'Confirmed',  color: '#0891b2', bg: '#e0f2fe' },
  ARRIVED:    { label: 'Arrived',    color: '#0f766e', bg: '#f0fdf4' },
  IN_CONSULT: { label: 'In Consult', color: '#f59e0b', bg: '#fffbeb' },
  COMPLETED:  { label: 'Completed',  color: '#10b981', bg: '#d1fae5' },
  NO_SHOW:    { label: 'No Show',    color: '#ef4444', bg: '#fee2e2' },
  CANCELLED:  { label: 'Cancelled',  color: '#94a3b8', bg: '#f1f5f9' },
};
const getStatusStyle = (s) => STATUS_CONFIG[s?.toUpperCase()] || STATUS_CONFIG.SCHEDULED;

const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#0f766e,#0891b2)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#10b981,#0891b2)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#3b82f6,#6366f1)',
];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

/* ── Inline SVG icons ──────────────────────────────────────────────────────── */
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

/* ── readFileAsBase64 ── same pattern as PrescriptionPdfGenerator ───────────── */
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Prescription formatters ─────────────────────────────────────────────────  */
const fmtFreq   = (f) => ({ once_daily:'1-0-0', twice_daily:'1-0-1', thrice_daily:'1-1-1', four_times:'1-1-1-1', every_6_hours:'Every 6hrs', every_8_hours:'Every 8hrs', as_needed:'As needed' }[f] || f || '—');
const fmtTiming = (t) => ({ after_food:'After Food', before_food:'Before Food', with_food:'With Food', empty_stomach:'Empty Stomach' }[t] || t || '—');
const fmtDur    = (d) => (d || '').replace(/_/g, ' ') || '—';
const fmtDate   = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—';

/* ══════════════════════════════════════════════════════════════════════════════
   ChangePasswordModal
══════════════════════════════════════════════════════════════════════════════ */
const ChangePasswordModal = ({ onClose }) => {
  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showC,    setShowC]    = useState(false);
  const [showN,    setShowN]    = useState(false);
  const [showCf,   setShowCf]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (next.length < 6)   { setError('New password must be at least 6 characters.'); return; }
    if (next !== confirm)  { setError('Passwords do not match.'); return; }
    if (next === current)  { setError('New password must differ from current.'); return; }
    setSaving(true);
    try {
      await apiFetch('/auth/change-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      setSuccess(true);
      setTimeout(onClose, 1800);
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="recep-modal-overlay" onClick={onClose}>
      <div className="recep-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, paddingBottom:14, borderBottom:'1px solid #e5e7eb' }}>
          <IconLock />
          <h3 style={{ flex:1, margin:0, fontSize:16, fontWeight:700, color:'#1e293b' }}>Change Password</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#94a3b8', lineHeight:1 }}>✕</button>
        </div>

        {success ? (
          <div style={{ textAlign:'center', padding:'24px 0 12px' }}>
            <div style={{ width:48, height:48, background:'#dcfce7', color:'#16a34a', borderRadius:'50%', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>✓</div>
            <p style={{ fontSize:14, fontWeight:600, color:'#166534' }}>Password updated successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {[
              { label:'Current Password', val:current, set:setCurrent, show:showC, toggle:() => setShowC(p => !p) },
              { label:'New Password',     val:next,    set:setNext,    show:showN, toggle:() => setShowN(p => !p) },
              { label:'Confirm Password', val:confirm, set:setConfirm, show:showCf, toggle:() => setShowCf(p => !p) },
            ].map(({ label, val, set, show, toggle }) => (
              <div key={label} style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:5 }}>{label}</label>
                <div style={{ position:'relative' }}>
                  <input
                    type={show ? 'text' : 'password'}
                    value={val}
                    onChange={e => set(e.target.value)}
                    required
                    style={{ width:'100%', boxSizing:'border-box', padding:'10px 40px 10px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:14, color:'#1e293b', background:'#f9fafb', outline:'none' }}
                  />
                  <button type="button" onClick={toggle}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:4 }}>
                    {show ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
            ))}
            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', fontSize:12.5, padding:'9px 12px', borderRadius:7, marginBottom:14 }}>
                {error}
              </div>
            )}
            <div className="recep-modal-actions">
              <button type="button" className="recep-modal-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="recep-modal-confirm" disabled={saving}>
                {saving && <span className="recep-btn-spinner" />}
                {saving ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   PatientDrawer
══════════════════════════════════════════════════════════════════════════════ */
const PatientDrawer = ({ appt, onClose, clinicId, doctorInfo }) => {
  const [activeTab,      setActiveTab]      = useState('info');
  const [prescriptions,  setPrescriptions]  = useState([]);
  const [reports,        setReports]        = useState([]);
  const [pendingFiles,   setPendingFiles]   = useState([]);  // in-memory files, never stored in DB
  const [loadingRx,      setLoadingRx]      = useState(false);
  const [drawerDoctorInfo, setDrawerDoctorInfo] = useState(doctorInfo || null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [sending,        setSending]        = useState(false);
  const [uploadMsg,      setUploadMsg]      = useState(null);   // { ok, text }
  const [sendMsg,        setSendMsg]        = useState(null);   // { ok, text }
  const [sendSelections, setSendSelections] = useState({ rx: true });
  const fileInputRef = useRef();

  // Fetch doctor details for full print header (clinicName, address, regNo, etc.)
  useEffect(() => {
    if (drawerDoctorInfo) return; // already have it
    if (!appt.doctorId)   return; // no doctorId available
    apiFetch(`/doctors/${appt.doctorId}`)
      .then(d => { if (d) setDrawerDoctorInfo(d); })
      .catch(() => {}); // silently fail — print will use appt fields as fallback
  }, []); // eslint-disable-line

  // Lazy-load each tab once
  useEffect(() => {
    if (activeTab === 'rx'      && !loadingRx      && prescriptions.length === 0) loadRx();
    if (activeTab === 'reports' && !loadingReports)                                loadReports();
  }, [activeTab]); // eslint-disable-line

  // Auto-dismiss messages
  useEffect(() => { if (!uploadMsg) return; const t = setTimeout(() => setUploadMsg(null), 3500); return () => clearTimeout(t); }, [uploadMsg]);
  useEffect(() => { if (!sendMsg)   return; const t = setTimeout(() => setSendMsg(null),   4000); return () => clearTimeout(t); }, [sendMsg]);

  /* ── Load prescriptions (3 strategies) ──────────────────────────────────── */
  const loadRx = async () => {
    setLoadingRx(true);
    try {
      // Strategy 1: prescriptions embedded on today's appointment (after doctor completes)
      if (appt.prescriptions && appt.prescriptions.length > 0) {
        setPrescriptions([{
          id:              appt.appointmentId,
          appointmentDate: appt.appointmentDate,
          doctorName:    appt.doctorName,
          doctorSpec:    appt.doctorSpec    || '',
          doctorRegNo:   appt.doctorRegNo   || '',
          clinicName:    appt.clinicName    || '',
          clinicAddress: appt.clinicAddress || '',
          clinicPhone:   appt.clinicPhone   || '',
          diagnosis:       appt.diagnosis || appt.chiefComplaint,
          nextVisitDate:   appt.nextVisitDate,
          generalAdvice:   appt.generalAdvice,
          medicines:       appt.prescriptions,
        }]);
        return;
      }

      // Strategy 2: patient history API (has prescriptions per past visit)
      const doctorIdParam = appt.doctorId ? `&doctorId=${appt.doctorId}` : '';
      const history = await apiFetch(`/dashboard/patient/${appt.patientId}/history?clinicId=${clinicId}${doctorIdParam}`);
      const withRx = (history || [])
        .filter(h => (h.prescriptions || []).length > 0)
        .map(h => ({
          id:              h.id || h.appointmentId,
          appointmentDate: h.appointmentDate,
          doctorName:    h.doctor?.name          || h.doctorName    || appt.doctorName,
          doctorSpec:    h.doctor?.specialization || appt.doctorSpec || '',
          doctorRegNo:   h.doctor?.regNo          || appt.doctorRegNo || '',
          clinicName:    h.doctor?.clinicName     || appt.clinicName  || '',
          clinicAddress: h.doctor?.address        || appt.clinicAddress || '',
          clinicPhone:   h.doctor?.phoneNumber    || appt.clinicPhone || '',
          diagnosis:       h.diagnosis || h.chiefComplaint,
          nextVisitDate:   h.nextVisitDate,
          generalAdvice:   h.generalInstructions || h.generalAdvice,
          medicines:       h.prescriptions || [],
        }));

      if (withRx.length > 0) { setPrescriptions(withRx); return; }

      // Strategy 3: dedicated prescriptions endpoint
      const data = await apiFetch(`/patients/${appt.patientId}/prescriptions?clinicId=${clinicId}`);
      setPrescriptions(data || []);
    } catch (e) {
      console.error('loadRx failed', e);
    } finally {
      setLoadingRx(false);
    }
  };

  /* ── Load reports ────────────────────────────────────────────────────────── */
  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const data = await apiFetch(`/patients/${appt.patientId}/reports?clinicId=${clinicId}`);
      setReports(data || []);
    } catch { /* silently fail */ }
    finally { setLoadingReports(false); }
  };

  /* ── Print prescription ──────────────────────────────────────────────────── */
  const handlePrint = (rx) => {
    const meds = rx.medicines || rx.prescriptions || rx.drugs || [];
    // Open a small popup — NOT a new tab. The popup auto-prints and auto-closes.
    const win = window.open(
      '',
      'PrintPrescription',
      'width=860,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no'
    );
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups for this site to print prescriptions.');
      return;
    }
    // Resolve doctor/clinic info — priority: doctorInfo prop > rx > appt
    // Priority: fetched doctorInfo → rx object fields → appt fields
    const drName = drawerDoctorInfo?.name          || rx.doctorName    || appt.doctorName    || '';
    const drSpec = drawerDoctorInfo?.specialization || rx.doctorSpec    || appt.doctorSpec    || '';
    const drReg  = drawerDoctorInfo?.regNo          || rx.doctorRegNo   || appt.doctorRegNo   || '';
    const clName = drawerDoctorInfo?.clinicName     || rx.clinicName    || appt.clinicName    || '';
    const clAddr = drawerDoctorInfo?.address        || rx.clinicAddress || appt.clinicAddress || '';
    const clPhone= drawerDoctorInfo?.phoneNumber    || rx.clinicPhone   || appt.clinicPhone   || '';

    win.document.write(`<!DOCTYPE html><html><head>
      <title>Prescription – ${appt.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Georgia,'Times New Roman',serif;padding:56px 72px;color:#1e293b;max-width:800px;background:#fff;position:relative}
        /* Header */
        .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px}
        .hdr-left{flex:1}
        .dr-name{font-size:1.125rem;color:#1a56db;font-weight:700;line-height:1.2;margin-bottom:3px}
        .dr-qual{font-size:13px;color:#374151;margin-bottom:2px}
        .dr-reg{font-size:12px;color:#6b7280}
        .clinic-right{text-align:right;max-width:260px}
        .clinic-name{font-size:16px;font-weight:700;color:#1f2937;margin-bottom:3px}
        .clinic-addr,.clinic-ph{font-size:12px;color:#6b7280;margin-bottom:2px}
        /* Divider */
        .divider{height:2px;background:linear-gradient(to right,#1a56db,#7c3aed);margin:12px 0;border-radius:1px}
        /* Patient bar */
        .pbar{display:flex;gap:28px;background:#eff6ff;border-left:4px solid #1a56db;padding:9px 14px;margin-bottom:16px;border-radius:0 6px 6px 0;font-size:13px}
        .lbl{font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-right:5px}
        .val{font-size:13px;color:#1f2937;font-weight:600}
        /* Rx symbol */
        .rx-sym{font-family:'Times New Roman',serif;font-size:2.8rem;font-weight:700;font-style:italic;color:#1a56db;margin-bottom:8px}
        /* Sections */
        .section{margin-bottom:14px}
        .sec-title{font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px;border-left:3px solid #1a56db;padding-left:8px;margin-bottom:8px}
        /* Vitals */
        .vitals{display:flex;gap:20px;flex-wrap:wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 14px;margin-bottom:14px;font-size:13px;color:#374151}
        /* Medicines */
        .meds{background:#f0fdf4;border-left:3px solid #10b981;border-radius:0 8px 8px 0;padding:12px 14px}
        .med-row{display:flex;align-items:flex-start;gap:12px;background:#fff;border-radius:6px;padding:8px 10px;border:1px solid #d1fae5;margin-bottom:8px}
        .med-num{font-weight:700;color:#10b981;font-size:15px;min-width:22px}
        .med-name{font-weight:700;font-size:14px;color:#1f2937;margin-bottom:4px;font-family:'Segoe UI',Arial,sans-serif}
        .med-tags{display:flex;flex-wrap:wrap;gap:5px}
        .tag{font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600}
        .tag-dose{background:#eff6ff;color:#1a56db}
        .tag-freq{background:#f0fdf4;color:#065f46}
        .tag-dur{background:#fff7ed;color:#92400e}
        .tag-time{background:#fdf4ff;color:#6b21a8}
        /* Follow-up */
        .fu{background:#fff7ed;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;padding:8px 12px;font-size:13px;color:#92400e;font-weight:500;margin-top:8px}
        /* Footer */
        .footer{margin-top:48px;display:flex;justify-content:flex-end}
        .sig-line{width:160px;height:1px;background:#374151;margin-bottom:4px}
        .sig-lbl{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;text-align:center}
        /* Watermark */
        .wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:5rem;font-weight:900;color:rgba(0,102,204,.04);white-space:nowrap;pointer-events:none;user-select:none}
        @media print{body{padding:30px 40px}.wm{position:fixed}}
      </style></head><body>
      <div class="hdr">
        <div class="hdr-left">
          <div class="dr-name">${drName}</div>
          ${drSpec ? `<div class="dr-qual">${drSpec}</div>` : ''}
          ${drReg  ? `<div class="dr-reg">Reg. No: ${drReg}</div>` : ''}
        </div>
        ${(clName || clAddr || clPhone) ? `
        <div class="clinic-right">
          ${clName  ? `<div class="clinic-name">${clName}</div>` : ''}
          ${clAddr  ? `<div class="clinic-addr">${clAddr}</div>` : ''}
          ${clPhone ? `<div class="clinic-ph">Ph: ${clPhone}</div>` : ''}
        </div>` : ''}
      </div>
      <div class="divider"></div>
      <div class="pbar">
        <div><span class="lbl">Patient:</span><span class="val">${appt.name}</span></div>
        <div><span class="lbl">Age/Gender:</span><span class="val">${appt.age || '—'} yrs / ${appt.gender || '—'}</span></div>
        <div><span class="lbl">Date:</span><span class="val">${fmtDate(rx.appointmentDate || appt.appointmentDate)}</span></div>
      </div>
      ${rx.diagnosis || rx.chiefComplaint ? `
        <div class="section">
          <div class="sec-title">Chief Complaint</div>
          <p style="font-size:13px;color:#1f2937;padding-left:4px">${rx.diagnosis || rx.chiefComplaint}</p>
        </div>` : ''}
      <div class="rx-sym">&#8478;</div>
      ${meds.length > 0 ? `
        <div class="meds">
          ${meds.map((m,i) => `
            <div class="med-row">
              <div class="med-num">${i+1}.</div>
              <div>
                <div class="med-name">${m.medicineName || m.name || ''}</div>
                <div class="med-tags">
                  ${m.dosage || m.dose ? `<span class="tag tag-dose">${m.dosage || m.dose}</span>` : ''}
                  ${m.frequency ? `<span class="tag tag-freq">${fmtFreq(m.frequency)}</span>` : ''}
                  ${m.duration  ? `<span class="tag tag-dur">${fmtDur(m.duration)}</span>` : ''}
                  ${m.timing    ? `<span class="tag tag-time">${fmtTiming(m.timing)}</span>` : ''}
                </div>
              </div>
            </div>`).join('')}
        </div>` : ''}
      ${rx.generalAdvice ? `<div class="section" style="margin-top:14px"><div class="sec-title">Advice</div><p style="font-size:13px;padding-left:4px">${rx.generalAdvice}</p></div>` : ''}
      ${rx.nextVisitDate ? `<div class="fu">🗓 Follow-up: ${fmtDate(rx.nextVisitDate)}</div>` : ''}
      <div class="footer"><div><div class="sig-line"></div><div class="sig-lbl">Doctor's Signature</div></div></div>
      <div class="wm">AssistIQ Health</div>
    </body></html>`);
    win.document.close();
    // Auto-print once fonts load, then close the popup
    win.onload = () => {
      setTimeout(() => {
        win.focus();
        win.print();
        // Close popup after print dialog is dismissed
        win.onafterprint = () => win.close();
        // Fallback close if onafterprint not supported (Firefox)
        setTimeout(() => { if (!win.closed) win.close(); }, 3000);
      }, 350);
    };
  };

  /* ── Download prescription PDF ───────────────────────────────────────────── */
  const handleDownloadPDF = async (rxId) => {
    if (!rxId) { alert('PDF not available for this prescription.'); return; }
    try {
      const blob = await apiFetch(`/prescriptions/${rxId}/pdf`, { responseType: 'blob' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `Prescription_${appt.name}_${rxId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Failed to download PDF.'); }
  };

  /* ── Attach lab report — store in memory only (no DB upload) ───────────────
   * Files are kept as base64 in component state.
   * They are uploaded to WhatsApp media API only at send time (same as QuickSend).
   * ─────────────────────────────────────────────────────────────────────────── */
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') { setUploadMsg({ ok: false, text: 'Only PDF files are allowed.' }); return; }
    if (file.size > 10 * 1024 * 1024)   { setUploadMsg({ ok: false, text: 'File must be under 10 MB.' }); return; }
    if (pendingFiles.length >= 5)        { setUploadMsg({ ok: false, text: 'Maximum 5 files.' }); return; }

    try {
      const base64 = await readFileAsBase64(file);
      const rec = { id: Date.now(), name: file.name, mimeType: file.type, base64 };
      setPendingFiles(prev => [...prev, rec]);
      setUploadMsg({ ok: true, text: `${file.name} ready to send.` });
    } catch {
      setUploadMsg({ ok: false, text: 'Could not read file. Try again.' });
    }
  };

  const removePendingFile = (id) => setPendingFiles(prev => prev.filter(f => f.id !== id));

  /* ── Send via WhatsApp ────────────────────────────────────────────────────────
   * If sending prescription only (no files): use /patients/send-documents
   * If sending files: use /quick-send/report with base64 (same as QuickSend panel)
   * Files go directly to WhatsApp media API — never stored in DB.
   * ─────────────────────────────────────────────────────────────────────────── */
  const handleSend = async () => {
    if (pendingFiles.length === 0 && !sendSelections.rx) {
      setSendMsg({ ok: false, text: 'Select prescription or attach at least one report.' });
      return;
    }

    setSending(true);
    setSendMsg({ ok: null, text: 'Sending via WhatsApp…' });

    try {
      if (pendingFiles.length > 0) {
        // Send files directly to WhatsApp media API via /quick-send/report (base64 JSON)
        await apiFetch('/quick-send/report', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            patientName:   appt.name,
            phone:         appt.phone,
            clinicId,
            doctorId:      appt.doctorId || null,
            appointmentId: appt.appointmentId || null,
            patientId:     appt.patientId,
            isRegistered:  true,
            sendLatestRx:  sendSelections.rx,
            // files as base64 — backend uploads to WhatsApp media API, stores only mediaId
            files: pendingFiles.map(f => ({
              name:     f.name,
              mimeType: f.mimeType,
              base64:   f.base64,
            })),
          }),
        });
      } else {
        // Prescription only — use existing send-documents endpoint
        await apiFetch('/patients/send-documents', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            patientId:    appt.patientId,
            phone:        appt.phone,
            channel:      'WHATSAPP',
            sendLatestRx: sendSelections.rx,
            reportIds:    [],
          }),
        });
      }

      setSendMsg({ ok: true, text: `✓ Sent successfully to ${appt.phone}` });
      setPendingFiles([]); // clear pending files after successful send
    } catch (err) {
      setSendMsg({ ok: false, text: err.message || 'Send failed. Try again.' });
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

        {/* Header */}
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
            <button key={t.key}
              className={`recep-drawer-tab ${activeTab === t.key ? 'recep-drawer-tab--active' : ''}`}
              onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="recep-drawer-body">

          {/* ═══ INFO ═══ */}
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
                  <span className="recep-status-badge"
                    style={{ color: getStatusStyle(appt.status).color, background: getStatusStyle(appt.status).bg }}>
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
                <button className="recep-walkin-btn recep-walkin-btn--sm" onClick={() => setActiveTab('history')}>📋 History</button>
                <button className="recep-walkin-btn recep-walkin-btn--sm" onClick={() => setActiveTab('rx')}>💊 Prescriptions</button>
                <button className="recep-walkin-btn recep-walkin-btn--sm" onClick={() => setActiveTab('send')}>📤 Send</button>
              </div>
            </div>
          )}

          {/* ═══ HISTORY ═══ */}
          {activeTab === 'history' && (
            <div className="recep-drawer-section" style={{ padding: 0 }}>
              <React.Suspense fallback={<div className="recep-drawer-loading"><div className="recep-spinner" /></div>}>
                <PatientHistoryPanel
                  patientId={appt.patientId}
                  currentAppointmentId={appt.appointmentId}
                  doctorId={appt.doctorId || null}
                />
              </React.Suspense>
            </div>
          )}

          {/* ═══ PRESCRIPTIONS — READ-ONLY ═══ */}
          {activeTab === 'rx' && (
            <div className="recep-drawer-section">
              <div className="recep-readonly-notice">
                <IconLock />
                Read-only — prescriptions cannot be edited by receptionist
              </div>

              {loadingRx ? (
                <div className="recep-drawer-loading"><div className="recep-spinner" /></div>
              ) : prescriptions.length === 0 ? (
                <div className="recep-drawer-empty">
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💊</div>
                  <div>No prescriptions yet</div>
                  <small style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginTop: 4 }}>
                    Prescriptions appear after the doctor completes the consultation
                  </small>
                </div>
              ) : (
                prescriptions.map((rx, i) => {
                  const meds = rx.medicines || rx.prescriptions || rx.drugs || [];
                  return (
                    <div className="recep-rx-card" key={i}>
                      {/* Meta */}
                      <div className="recep-rx-meta">
                        <div className="recep-rx-date">📅 {fmtDate(rx.appointmentDate)}</div>
                        <div className="recep-rx-doc">🩺 {rx.doctorName || appt.doctorName}</div>
                      </div>

                      {/* Diagnosis */}
                      {rx.diagnosis && (
                        <div style={{ background:'#eff6ff', borderLeft:'3px solid #3b82f6', borderRadius:'0 6px 6px 0', padding:'7px 10px', marginBottom:10, fontSize:13 }}>
                          <span style={{ fontWeight:700, color:'#1d4ed8', fontSize:11, textTransform:'uppercase', letterSpacing:'.4px', marginRight:8 }}>Diagnosis</span>
                          <span style={{ color:'#1e293b' }}>{rx.diagnosis}</span>
                        </div>
                      )}

                      {/* Medicines */}
                      {meds.length > 0 && (
                        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, overflow:'hidden', marginBottom:10, fontSize:12.5 }}>
                          {/* Header row */}
                          <div style={{ display:'grid', gridTemplateColumns:'2fr 0.8fr 1.2fr 1fr 1.1fr', gap:6, padding:'7px 12px', background:'#dcfce7', fontSize:10.5, fontWeight:700, color:'#166534', textTransform:'uppercase', letterSpacing:'.4px' }}>
                            <span>Medicine</span><span>Dose</span><span>Frequency</span><span>Duration</span><span>Timing</span>
                          </div>
                          {meds.map((m, j) => (
                            <div key={j} style={{ display:'grid', gridTemplateColumns:'2fr 0.8fr 1.2fr 1fr 1.1fr', gap:6, padding:'8px 12px', borderTop:'1px solid #bbf7d0', alignItems:'center' }}>
                              <span style={{ fontWeight:600, color:'#1e293b' }}>💊 {m.medicineName || m.name}</span>
                              <span style={{ color:'#374151' }}>{m.dosage || m.dose || '—'}</span>
                              <span style={{ color:'#374151' }}>{fmtFreq(m.frequency)}</span>
                              <span style={{ color:'#374151' }}>{fmtDur(m.duration)}</span>
                              <span style={{ color:'#374151' }}>{fmtTiming(m.timing)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Advice */}
                      {rx.generalAdvice && (
                        <div style={{ fontSize:12.5, color:'#374151', marginBottom:8, padding:'6px 10px', background:'#f9fafb', borderRadius:6 }}>
                          💡 {rx.generalAdvice}
                        </div>
                      )}

                      {/* Follow-up */}
                      {rx.nextVisitDate && (
                        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:7, padding:'7px 11px', fontSize:12.5, color:'#92400e', fontWeight:500, marginBottom:10 }}>
                          🗓 Follow-up: {fmtDate(rx.nextVisitDate)}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="recep-rx-actions">
                        <button className="recep-rx-btn recep-rx-btn--print" onClick={() => handlePrint(rx)}>
                          🖨 Print
                        </button>
                        <button className="recep-rx-btn recep-rx-btn--pdf" onClick={() => handleDownloadPDF(rx.id)}>
                          ⬇ PDF
                        </button>
                        <button className="recep-rx-btn recep-rx-btn--wa" onClick={() => setActiveTab('send')}>
                          💬 Send via WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ═══ REPORTS ═══ */}
          {activeTab === 'reports' && (
            <div className="recep-drawer-section">
              <p className="recep-section-label">Lab Reports (PDF only)</p>
              <p style={{ fontSize:12, color:'#6b7280', marginBottom:12, lineHeight:1.5 }}>
                Attach a report — it will be sent directly to the patient via WhatsApp.<br/>
                <strong>Files are not stored</strong> — they go straight to WhatsApp.
              </p>

              {/* Upload feedback */}
              {uploadMsg && (
                <div style={{
                  padding:'9px 13px', borderRadius:8, fontSize:13, fontWeight:500, marginBottom:12,
                  background: uploadMsg.ok ? '#f0fdf4' : '#fef2f2',
                  color:      uploadMsg.ok ? '#166534' : '#dc2626',
                  border:    `1px solid ${uploadMsg.ok ? '#bbf7d0' : '#fecaca'}`,
                }}>
                  {uploadMsg.ok ? '✓' : '⚠'} {uploadMsg.text}
                </div>
              )}

              {/* Existing reports from server */}
              {loadingReports ? (
                <div className="recep-drawer-loading"><div className="recep-spinner" /></div>
              ) : reports.length > 0 ? (
                <>
                  <p style={{ fontSize:11.5, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:6 }}>Previous reports</p>
                  {reports.map((r, i) => (
                    <div className="recep-file-row" key={r.id || i}>
                      <span className="recep-file-icon">📄</span>
                      <span className="recep-file-name">{r.fileName || r.name}</span>
                      {(r.url || r.fileUrl) && (
                        <button className="recep-rx-btn recep-rx-btn--pdf"
                          onClick={() => window.open(r.url || r.fileUrl, '_blank')}>
                          ⬇ View
                        </button>
                      )}
                    </div>
                  ))}
                  <div style={{ height:12 }} />
                </>
              ) : null}

              {/* Pending files (in-memory, not uploaded yet) */}
              {pendingFiles.length > 0 && (
                <>
                  <p style={{ fontSize:11.5, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:6 }}>Ready to send</p>
                  {pendingFiles.map(f => (
                    <div className="recep-file-row" key={f.id} style={{ border:'1px solid #bbf7d0', background:'#f0fdf4', borderRadius:8, marginBottom:6 }}>
                      <span className="recep-file-icon">📄</span>
                      <span className="recep-file-name" style={{ flex:1 }}>{f.name}</span>
                      <span style={{ fontSize:10.5, background:'#dcfce7', color:'#166534', padding:'2px 8px', borderRadius:20, fontWeight:700, marginRight:6 }}>ready</span>
                      <button className="recep-rx-btn" style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca' }}
                        onClick={() => removePendingFile(f.id)}>✕</button>
                    </div>
                  ))}
                  <button className="recep-walkin-btn" style={{ width:'100%', justifyContent:'center', marginBottom:10 }}
                    onClick={() => setActiveTab('send')}>
                    📤 Send to Patient →
                  </button>
                </>
              )}

              {/* Drop zone */}
              {pendingFiles.length < 5 && (
                <>
                  <div className="recep-upload-drop" onClick={() => fileInputRef.current?.click()}>
                    <div className="recep-upload-icon">📁</div>
                    <span>Click to attach lab report</span>
                    <small>PDF only · max 10 MB · not stored in system</small>
                  </div>
                  <input ref={fileInputRef} type="file" accept="application/pdf"
                    style={{ display:'none' }} onChange={handleFileSelect} />
                </>
              )}
            </div>
          )}

          {/* ═══ SEND (WhatsApp ONLY) ═══ */}
          {activeTab === 'send' && (
            <div className="recep-drawer-section">

              {/* If doctor already sent — show info banner */}
              {appt.prescriptionSent && (
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, background:'#fffbeb', border:'1.5px solid #fde68a', borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
                  <span style={{ fontSize:18 }}>✅</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13.5, color:'#92400e', marginBottom:3 }}>
                      Prescription already sent by doctor
                    </div>
                    <div style={{ fontSize:12.5, color:'#6b7280' }}>
                      The doctor has already sent the prescription to the patient. You can still send additional lab reports below.
                    </div>
                  </div>
                </div>
              )}

              {!appt.prescriptionSent && (
                <div className="recep-send-notice">
                  ℹ️ Doctor absent? You can still send prescriptions &amp; reports directly to the patient.
                </div>
              )}

              {/* WhatsApp-only indicator */}
              <div style={{ display:'flex', alignItems:'center', gap:10, background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:10, padding:'11px 14px', marginBottom:16, color:'#166534', fontSize:13.5, fontWeight:600 }}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ color:'#25D366', flexShrink:0 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.113.549 4.096 1.508 5.824L0 24l6.335-1.481A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.003-1.368l-.36-.213-3.731.872.936-3.62-.234-.373A9.775 9.775 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                </svg>
                Sending via WhatsApp only
              </div>

              {/* Send feedback */}
              {sendMsg && (
                <div style={{
                  padding:'9px 13px', borderRadius:8, fontSize:13, fontWeight:500, marginBottom:12,
                  background: sendMsg.ok === true ? '#f0fdf4' : sendMsg.ok === false ? '#fef2f2' : '#eff6ff',
                  color:      sendMsg.ok === true ? '#166534' : sendMsg.ok === false ? '#dc2626'  : '#1d4ed8',
                  border:    `1px solid ${sendMsg.ok === true ? '#bbf7d0' : sendMsg.ok === false ? '#fecaca' : '#bfdbfe'}`,
                }}>
                  {sendMsg.ok === true ? '✓ ' : sendMsg.ok === false ? '⚠ ' : '⏳ '}{sendMsg.text}
                </div>
              )}

              {/* What to send */}
              <p className="recep-section-label" style={{ marginTop: 4 }}>What to send</p>

              {prescriptions.length > 0 ? (
                <label className="recep-send-check" style={{ opacity: appt.prescriptionSent ? 0.5 : 1 }}>
                  <input type="checkbox" checked={sendSelections.rx && !appt.prescriptionSent}
                    disabled={appt.prescriptionSent}
                    onChange={e => setSendSelections(s => ({ ...s, rx: e.target.checked }))} />
                  💊 Latest Prescription ({fmtDate(prescriptions[0]?.appointmentDate)})
                  {appt.prescriptionSent && <span style={{ fontSize:11, color:'#10b981', marginLeft:6, fontWeight:600 }}>✓ already sent</span>}
                </label>
              ) : (
                <p style={{ fontSize:12, color:'#9ca3af', marginBottom:8 }}>
                  No prescriptions loaded —{' '}
                  <button style={{ background:'none', border:'none', cursor:'pointer', color:'#0f766e', fontWeight:600, fontSize:12, textDecoration:'underline', padding:0 }}
                    onClick={() => setActiveTab('rx')}>
                    load prescriptions
                  </button>
                </p>
              )}

              {reports.map(r => (
                <label className="recep-send-check" key={r.id}>
                  <input type="checkbox"
                    checked={!!sendSelections.reports[r.id]}
                    onChange={e => setSendSelections(s => ({ ...s, reports: { ...s.reports, [r.id]: e.target.checked } }))} />
                  📄 {r.fileName || r.name}
                </label>
              ))}

              {/* Pending files from Reports tab */}
              {pendingFiles.map(f => (
                <div key={f.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, marginBottom:6, fontSize:13 }}>
                  <span>📄</span>
                  <span style={{ flex:1, fontWeight:500 }}>{f.name}</span>
                  <span style={{ fontSize:10.5, background:'#dcfce7', color:'#166534', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>ready</span>
                  <button style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', fontSize:14, padding:2 }}
                    onClick={() => removePendingFile(f.id)}>✕</button>
                </div>
              ))}

              {pendingFiles.length === 0 && (
                <button className="recep-walkin-btn recep-walkin-btn--sm" style={{ marginBottom:10 }}
                  onClick={() => setActiveTab('reports')}>
                  📎 Attach a report →
                </button>
              )}

              {prescriptions.length === 0 && reports.length === 0 && pendingFiles.length === 0 && (
                <div className="recep-drawer-empty">
                  No prescriptions or reports available. Attach a report first.
                </div>
              )}

              <div className="recep-send-recipient">
                Sending to: <strong>{appt.phone}</strong>
              </div>

              <button className="recep-walkin-btn"
                style={{ width:'100%', justifyContent:'center', opacity: sending ? 0.7 : 1 }}
                onClick={handleSend} disabled={sending}>
                {sending && <span className="recep-btn-spinner" />}
                💬 Send via WhatsApp
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   ReceptionistDashboard  (main)
══════════════════════════════════════════════════════════════════════════════ */
const ReceptionistDashboard = ({ clinicId }) => {
  const { auth, logout }                       = useAuth();
  const [appointments,  setAppointments]        = useState([]);
  const [loading,       setLoading]             = useState(true);
  const [loadError,     setLoadError]            = useState(false);
  const [search,        setSearch]              = useState('');
  const [filter,        setFilter]              = useState('ALL');
  const [currentTime,   setCurrentTime]         = useState(new Date());
  const [showWalkIn,    setShowWalkIn]           = useState(false);
  const [updatingId,    setUpdatingId]           = useState(null);
  const [selectedAppt,  setSelectedAppt]         = useState(null);
  const [showLogout,    setShowLogout]           = useState(false);
  const [showChangePw,  setShowChangePw]         = useState(false);
  const [walkInInitData, setWalkInInitData]      = useState(null);
  const [loadingWalkIn,  setLoadingWalkIn]       = useState(false);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (clinicId) load();
  }, [clinicId]); // eslint-disable-line

  const load = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      // 15-second timeout so we don't spin forever
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const data = await apiFetch(`/dashboard/appointments?clinicId=${clinicId}`);
      clearTimeout(timer);
      const todayStr = new Date().toISOString().split('T')[0];
      const today    = (data || []).filter(a => {
        const d = a.appointmentDate;
        return d && new Date(d).toISOString().split('T')[0] === todayStr;
      });
      setAppointments(today.map(a => ({
        appointmentId:   a.id,
        patientId:       a.patient?.id   || a.patientId,
        doctorId:        a.doctor?.id    || a.doctorId,
        name:            a.patient?.name || 'Unknown',
        phone:           a.patient?.phone || a.patient?.phoneNumber || '',
        age:             a.patient?.age   || '',
        gender:          a.patient?.gender || '',
        token:           a.tokenNumber   || '',
        status:          a.status        || 'SCHEDULED',
        reason:          a.notes         || '',
        appointmentDate: a.appointmentDate,
        doctorName:    a.doctor?.name           || '',
        doctorSpec:    a.doctor?.specialization  || '',
        doctorRegNo:   a.doctor?.regNo           || '',
        clinicName:    a.doctor?.clinicName      || '',
        clinicAddress: a.doctor?.address         || '',
        clinicPhone:   a.doctor?.phoneNumber     || '',
        slot:          a.slot                    || '',
        prescriptionSent:  a.prescriptionSent || false,   // true = doctor already sent to patient
        // Clinical data (available after doctor completes consultation)
        diagnosis:        a.diagnosis        || '',
        chiefComplaint:   a.chiefComplaint   || '',
        nextVisitDate:    a.nextVisitDate     || null,
        generalAdvice:    a.generalInstructions || a.generalAdvice || '',
        prescriptions:    a.prescriptions   || [],
        reports:          a.reports         || [],
      })));
    } catch (e) {
      console.error('Failed to load appointments:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    setUpdatingId(appointmentId);
    try {
      await apiFetch(`/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body:   JSON.stringify({ status: newStatus }),
      });
      setAppointments(prev =>
        prev.map(a => a.appointmentId === appointmentId ? { ...a, status: newStatus } : a)
      );
    } catch {
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openWalkInModal = async () => {
    setLoadingWalkIn(true);
    setShowWalkIn(true);
    try {
      const data = await apiFetch(`/dashboard/walkin/init?clinicId=${clinicId}`);
      setWalkInInitData(data);
    } catch {
      alert('Failed to load doctors');
      setShowWalkIn(false);
    } finally {
      setLoadingWalkIn(false);
    }
  };

  const stats = useMemo(() => ({
    total:     appointments.length,
    arrived:   appointments.filter(a => ['ARRIVED','IN_CONSULT'].includes(a.status?.toUpperCase())).length,
    completed: appointments.filter(a => a.status?.toUpperCase() === 'COMPLETED').length,
    waiting:   appointments.filter(a => ['SCHEDULED','CONFIRMED'].includes(a.status?.toUpperCase())).length,
    noShow:    appointments.filter(a => a.status?.toUpperCase() === 'NO_SHOW').length,
  }), [appointments]);

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

  const hour     = currentTime.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr  = currentTime.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  const timeStr  = currentTime.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });

  const nextActions = (status) => {
    const s = status?.toUpperCase();
    if (s === 'SCHEDULED' || s === 'CONFIRMED')
      return [{ label:'✓ Mark Arrived', value:'ARRIVED' }, { label:'✗ No Show', value:'NO_SHOW' }];
    if (s === 'ARRIVED')
      return [{ label:'→ In Consult', value:'IN_CONSULT' }];
    return [];
  };

  // Show skeleton inside the real layout instead of blank full-page spinner
  if (loading) {
    return (
      <div className="recep-root">
        <header className="recep-header">
          <div className="recep-header-inner">
            <div className="recep-header-left">
              <div className="recep-role-badge">
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M9 9H15M9 13H15M9 17H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
                <svg viewBox="0 0 24 24" fill="none" width="13" height="13" style={{flexShrink:0}}>
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {dateStr} · {timeStr}
              </div>
            </div>
          </div>
          <div className="recep-stats-strip">
            {['Total','Waiting','In Clinic','Done','No Show'].map((lbl,i) => (
              <React.Fragment key={lbl}>
                {i > 0 && <div className="recep-stat-divider" />}
                <div className="recep-stat">
                  <span className="recep-stat-num" style={{opacity:.3}}>—</span>
                  <span className="recep-stat-lbl">{lbl}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </header>
        <main className="recep-main">
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,padding:'60px 20px'}}>
            <div className="recep-spinner" style={{width:36,height:36,borderWidth:3}} />
            <p style={{fontSize:14,color:'#64748b',fontWeight:500}}>Loading today's appointments…</p>
            {loadError && (
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:13,color:'#dc2626',marginBottom:10}}>⚠ Failed to load. Check your connection.</p>
                <button className="recep-walkin-btn" onClick={load}>↺ Retry</button>
              </div>
            )}
          </div>
          {/* Skeleton cards */}
          <div className="recep-queue" style={{padding:'0 16px'}}>
            {[1,2,3].map(i => (
              <div key={i} className="recep-card" style={{opacity: 1 - i*0.25, pointerEvents:'none'}}>
                <div className="recep-token">
                  <span className="recep-token-num" style={{background:'#e5e7eb',color:'transparent',borderRadius:4}}>00{i}</span>
                  <span className="recep-token-lbl">Token</span>
                </div>
                <div className="recep-avatar" style={{background:'#e5e7eb'}} />
                <div className="recep-card-body">
                  <div className="recep-card-top">
                    <span style={{background:'#e5e7eb',borderRadius:4,width:120,height:16,display:'inline-block'}} />
                    <span style={{background:'#e5e7eb',borderRadius:12,width:70,height:20,display:'inline-block'}} />
                  </div>
                  <div className="recep-card-meta" style={{marginTop:6}}>
                    <span style={{background:'#f1f5f9',borderRadius:4,width:160,height:12,display:'inline-block'}} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
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
              <svg viewBox="0 0 24 24" fill="none" width="13" height="13" style={{ flexShrink:0 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {dateStr} · {timeStr}
            </div>

            <button className="recep-logout-btn" onClick={() => setShowChangePw(true)} title="Change password">
              <IconLock />
              Password
            </button>

            <button className="recep-logout-btn" onClick={() => setShowLogout(true)} title="Sign out">
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
              { key:'ALL',       label:'All' },
              { key:'WAITING',   label:'Waiting' },
              { key:'ARRIVED',   label:'In Clinic' },
              { key:'COMPLETED', label:'Done' },
            ].map(f => (
              <button key={f.key}
                className={`recep-filter-tab ${filter === f.key ? 'recep-filter-tab--active' : ''}`}
                onClick={() => setFilter(f.key)}>
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
            {visible.map(appt => {
              const s          = getStatusStyle(appt.status);
              const actions    = nextActions(appt.status);
              const isUpdating = updatingId === appt.appointmentId;
              return (
                <div className="recep-card" key={appt.appointmentId}
                  onClick={() => setSelectedAppt(appt)} style={{ cursor:'pointer' }}>
                  <div className="recep-token">
                    <span className="recep-token-num">{appt.token || '—'}</span>
                    <span className="recep-token-lbl">Token</span>
                  </div>
                  <div className="recep-avatar" style={{ background: avatarColor(appt.name) }}>
                    {appt.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
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
                  <div className="recep-actions" onClick={e => e.stopPropagation()}>
                    {actions.map(action => (
                      <button key={action.value}
                        className={`recep-action-btn ${action.value === 'NO_SHOW' ? 'recep-action-btn--danger' : 'recep-action-btn--primary'}`}
                        onClick={() => handleStatusChange(appt.appointmentId, action.value)}
                        disabled={isUpdating}>
                        {isUpdating ? <span className="recep-btn-spinner" /> : action.label}
                      </button>
                    ))}
                    <button className="recep-action-btn recep-action-btn--outline"
                      onClick={e => { e.stopPropagation(); setSelectedAppt(appt); }}>
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
          doctorInfo={null}  
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

      {/* ── Change Password ── */}
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}

      {/* ── Logout confirm ── */}
      {showLogout && (
        <div className="recep-modal-overlay" onClick={() => setShowLogout(false)}>
          <div className="recep-modal" onClick={e => e.stopPropagation()}>
            <h3>Sign out?</h3>
            <p>You'll need to sign in again to access the receptionist portal.</p>
            <div className="recep-modal-actions">
              <button className="recep-modal-cancel" onClick={() => setShowLogout(false)}>Cancel</button>
              <button className="recep-modal-confirm" onClick={logout}>Sign Out</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReceptionistDashboard;