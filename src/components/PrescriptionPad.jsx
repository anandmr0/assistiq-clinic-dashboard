// ─────────────────────────────────────────────────────────────────────────────
// PrescriptionPad.jsx  (updated)
//
// CHANGE SUMMARY
//   • buildPrintHTML renamed → buildPrescriptionHtml  (same logic, better name)
//   • buildPrescriptionHtml is now a NAMED EXPORT so PatientList can import it
//     and embed the HTML string into the CompleteAppointmentRequest payload.
//   • getPrescriptionPageCss is also exported so the caller gets the identical
//     CSS that the print window uses (backend needs it for headless rendering).
//   • Everything else is unchanged.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef } from 'react';
import '../css/PrescriptionPad.css';

// ─────────────────────────────────────────────────────────────────────────────
// CSS used both in the print window AND exported for backend PDF generation
// ─────────────────────────────────────────────────────────────────────────────
export function getPrescriptionPageCss() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: white;
      font-family: Georgia, 'Times New Roman', serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-prescription-page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 1.5cm 2cm;
      background: white;
    }
    .prescription-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 1rem;
    }
    .doctor-name {
      
      font-size: 1.125rem;
      color: #1a56db;
      font-weight: 700;
      margin-bottom: 0.2rem;
    }
    .doctor-qualification { font-size: 0.875rem; color: #374151; margin-bottom: 0.125rem; }
    .doctor-reg           { font-size: 0.8rem; color: #6B7280; }
    .clinic-details       { text-align: right; }
    .clinic-name          { font-size: 1.125rem; font-weight: 700; color: #1F2937; margin-bottom: 0.2rem; }
    .clinic-address, .clinic-phone { font-size: 0.8rem; color: #6B7280; margin-bottom: 0.1rem; }
    .prescription-divider {
      height: 2px;
      background: linear-gradient(to right, #1a56db, #7c3aed);
      margin: 0.75rem 0;
      border-radius: 1px;
    }
    .patient-info-bar {
      display: flex;
      gap: 2rem;
      background: #EFF6FF;
      border-left: 4px solid #1a56db;
      padding: 0.6rem 1rem;
      margin-bottom: 1rem;
      border-radius: 0 6px 6px 0;
    }
    .info-label  { font-size: 0.75rem; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 0.35rem; }
    .info-value  { font-size: 0.9rem; color: #1F2937; font-weight: 600; }
    .rx-symbol   { font-family: 'Times New Roman', serif; font-size: 3rem; font-weight: 700; font-style: italic; color: #1a56db; margin-bottom: 0.5rem; }
    .prescription-section { margin-bottom: 1rem; page-break-inside: avoid; }
    .section-title {
      font-size: 0.85rem; font-weight: 700; color: #374151;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.4rem;
    }
    .handwritten-text { font-family: Georgia, 'Times New Roman', serif; font-size: 1rem; color: #1F2937; line-height: 1.6; }
    .vitals-compact {
      display: flex; gap: 1.5rem; flex-wrap: wrap;
      background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px;
      padding: 0.5rem 1rem; margin-bottom: 1rem; font-size: 0.85rem; color: #374151;
    }
    .medications { background: #F0FDF4; border-left: 3px solid #10B981; border-radius: 0 8px 8px 0; padding: 0.75rem 1rem; }
    .medication-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .medication-item {
      display: flex; align-items: flex-start; gap: 0.75rem;
      background: white; border-radius: 6px; padding: 0.5rem 0.75rem;
      border: 1px solid #D1FAE5; page-break-inside: avoid;
    }
    .med-number    { font-weight: 700; color: #10B981; font-size: 1rem; min-width: 20px; }
    .med-name      { font-weight: 700; font-size: 1rem; color: #1F2937; margin-bottom: 0.25rem; }
    .med-instructions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .med-instructions span { font-size: 0.8rem; padding: 0.15rem 0.5rem; border-radius: 20px; }
    .med-dosage    { background:#EFF6FF; color:#1a56db; font-weight:600; }
    .med-frequency { background:#F0FDF4; color:#065F46; font-weight:600; }
    .med-duration  { background:#FFF7ED; color:#92400E; font-weight:600; }
    .med-timing    { background:#FDF4FF; color:#6B21A8; font-weight:600; }
    .med-notes     { font-size:0.8rem; color:#6B7280; margin-top:0.25rem; font-style:italic; }
    .advice-list p, .tests-list p { font-size: 0.9rem; color: #374151; line-height: 1.7; }
    .followup { background: #FFF7ED; border-left: 3px solid #F59E0B; border-radius: 0 6px 6px 0; padding: 0.5rem 1rem; }
    .canvas-note-section { border-top: 1.5px dashed #CBD5E1; padding-top: 0.875rem; margin-top: 0.5rem; page-break-inside: avoid; }
    .canvas-note-img-wrap { border: 1.5px solid #E2E8F0; border-radius: 8px; overflow: hidden; background: #FFFEF7; margin-top: 0.5rem; }
    .canvas-note-img { width: 100%; display: block; max-height: 420px; object-fit: contain; background: #FFFEF7; }
    .prescription-footer { margin-top: 2rem; display: flex; justify-content: flex-end; }
    .signature-section   { text-align: center; }
    .signature-line      { width: 160px; height: 1px; background: #374151; margin-bottom: 0.3rem; }
    .signature-label     { font-size: 0.75rem; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .prescription-watermark {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 5rem; font-weight: 900;
      color: rgba(0,102,204,0.04); white-space: nowrap;
      pointer-events: none; z-index: 0;
    }
    @media print {
      body { margin: 0; }
      .print-prescription-page { width: 100%; padding: 1cm 1.5cm; }
    }
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny HTML escape helper
// ─────────────────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────────────────────
// Format helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmtFreq   = (f) => ({ once_daily:'1-0-0', twice_daily:'1-0-1', thrice_daily:'1-1-1', four_times:'1-1-1-1', every_6_hours:'Every 6hrs', every_8_hours:'Every 8hrs', as_needed:'As needed' }[f] || f);
const fmtDur    = (d) => ({ '1_day':'1 day','3_days':'3 days','5_days':'5 days','7_days':'7 days','10_days':'10 days','14_days':'14 days','21_days':'21 days','30_days':'30 days' }[d] || d);
const fmtTiming = (t) => ({ after_food:'After Food', before_food:'Before Food', with_food:'With Food', empty_stomach:'Empty Stomach' }[t] || t);

// kept for backwards compat with the on-screen view
const formatFrequency = fmtFreq;
const formatDuration  = fmtDur;
const formatTiming    = fmtTiming;

// ─────────────────────────────────────────────────────────────────────────────
// buildPrescriptionHtml  ← NAMED EXPORT (was buildPrintHTML, internal only)
//
// Returns a self-contained HTML <body> fragment (no <html>/<head> wrapper).
// Wrap it in a full document + getPrescriptionPageCss() for printing or
// for sending to the backend for PDF conversion.
//
// @param patient    { name, age, gender }
// @param data       consultation data object (same shape as PatientList state)
// @param doctorInfo { name, qualification, regNo, clinicName, address, phoneNumber }
// ─────────────────────────────────────────────────────────────────────────────
export function buildPrescriptionHtml(patient, data, doctorInfo) {
  const vitals = data?.vitalSigns || {};
  const prx    = (data?.prescriptions || []).filter(p => p.medicineName && !p.dispensed);
  const today  = new Date().toLocaleDateString('en-IN');
  
  const vitalsHtml = (vitals.systolic || vitals.pulse || vitals.temperature) ? `
    <div class="vitals-compact">
      ${vitals.systolic && vitals.diastolic ? `<span>BP: ${vitals.systolic}/${vitals.diastolic} mmHg</span>` : ''}
      ${vitals.pulse       ? `<span>Pulse: ${vitals.pulse} bpm</span>` : ''}
      ${vitals.temperature ? `<span>Temp: ${vitals.temperature}°F</span>` : ''}
      ${vitals.weight      ? `<span>Wt: ${vitals.weight} kg</span>` : ''}
    </div>` : '';

  const medsHtml = prx.length ? `
    <div class="prescription-section medications">
      <div class="section-title">Medications:</div>
      <div class="medication-list">
        ${prx.map((med, i) => `
          <div class="medication-item">
            <div class="med-number">${i + 1}.</div>
            <div class="med-details">
              <div class="med-name">${escHtml(med.medicineName)}</div>
              <div class="med-instructions">
                ${med.dosage    ? `<span class="med-dosage">${escHtml(med.dosage)}</span>` : ''}
                ${med.frequency ? `<span class="med-frequency">${escHtml(fmtFreq(med.frequency))}</span>` : ''}
                ${med.duration  ? `<span class="med-duration">${escHtml(fmtDur(med.duration))}</span>` : ''}
                ${med.timing    ? `<span class="med-timing">${escHtml(fmtTiming(med.timing))}</span>` : ''}
              </div>
              ${med.notes ? `<div class="med-notes">${escHtml(med.notes)}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>` : '';

  const adviceHtml = (data?.dietaryAdvice || data?.lifestyleAdvice || data?.generalAdvice) ? `
    <div class="prescription-section">
      <div class="section-title">Advice:</div>
      <div class="advice-list">
        ${data.dietaryAdvice   ? `<p class="handwritten-text">• ${escHtml(data.dietaryAdvice)}</p>` : ''}
        ${data.lifestyleAdvice ? `<p class="handwritten-text">• ${escHtml(data.lifestyleAdvice)}</p>` : ''}
        ${data.generalAdvice   ? `<p class="handwritten-text">• ${escHtml(data.generalAdvice)}</p>` : ''}
      </div>
    </div>` : '';

  const testsHtml = data?.selectedTests?.length ? `
    <div class="prescription-section">
      <div class="section-title">Investigations:</div>
      <div class="tests-list">
        ${data.selectedTests.map(t => `<p class="handwritten-text">• ${escHtml(t)}</p>`).join('')}
      </div>
    </div>` : '';

  const followupHtml = data?.nextVisitDate ? `
    <div class="prescription-section followup">
      <div class="section-title">Follow-up:</div>
      <p class="handwritten-text">${new Date(data.nextVisitDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</p>
    </div>` : '';

  // The canvas handwritten note image is embedded as a data-URL so the
  // backend HTML→PDF renderer doesn't need to fetch any external resource.
  const canvasHtml = data?.canvasNote?.imageDataUrl ? `
    <div class="prescription-section canvas-note-section">
      <div class="section-title">&#9998; Handwritten Notes:</div>
      <div class="canvas-note-img-wrap">
        <img src="${data.canvasNote.imageDataUrl}" class="canvas-note-img" alt="Handwritten note"/>
      </div>
    </div>` : '';

  return `
    <div class="print-prescription-page">
      <div class="prescription-header">
        <div class="doctor-details">
          <div class="doctor-name">${escHtml(doctorInfo?.name || 'Dr. Name')}</div>
          <div class="doctor-qualification">${escHtml(doctorInfo?.specialization || 'MBBS, MD')}</div>
          <div class="doctor-reg">${escHtml(doctorInfo?.qualification || 'XXXXXX')} || Reg. No: ${escHtml(doctorInfo?.regNo || 'XXXXXX')}</div>
        </div>
        <div class="clinic-details">
          <div class="clinic-name">${escHtml(doctorInfo?.clinicName || 'Clinic Name')}</div>
          <div class="clinic-address">${escHtml(doctorInfo?.address || '')}</div>
          <div class="clinic-phone">Ph: ${escHtml(doctorInfo?.clinicNumber || '')}</div>
        </div>
      </div>

      <div class="prescription-divider"></div>

      <div class="patient-info-bar">
        <div class="info-group"><span class="info-label">Patient:</span><span class="info-value">${escHtml(patient?.name || '')}</span></div>
        <div class="info-group"><span class="info-label">Age/Gender:</span><span class="info-value">${patient?.age || '-'} yrs / ${escHtml(patient?.gender || '-')}</span></div>
        <div class="info-group"><span class="info-label">Date:</span><span class="info-value">${today}</span></div>
      </div>

      <div class="rx-symbol">&#8478;</div>

      ${data?.chiefComplaint ? `<div class="prescription-section"><div class="section-title">Chief Complaint:</div><p class="handwritten-text">${escHtml(data.chiefComplaint)}</p></div>` : ''}
      ${vitalsHtml}
      ${data?.diagnosis ? `<div class="prescription-section"><div class="section-title">Diagnosis:</div><p class="handwritten-text">${escHtml(data.diagnosis)}</p></div>` : ''}
      ${medsHtml}
      ${adviceHtml}
      ${testsHtml}
      ${followupHtml}
      ${canvasHtml}

      <div class="prescription-footer">
        <div class="signature-section">
          <div class="signature-line"></div>
          <div class="signature-label">Doctor's Signature</div>
        </div>
      </div>
      <div class="prescription-watermark">AssistIQ Health</div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PrescriptionPad React component (unchanged except handlePrint uses the
// exported helpers so there's a single source of truth for the HTML/CSS)
// ─────────────────────────────────────────────────────────────────────────────
const PrescriptionPad = ({ patient, data, isVisible, onClose, doctorInfo }) => {
  const [mode, setMode] = useState('view');
  const printRef = useRef(null);
  
  if (!isVisible) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Prescription — ${patient?.name || 'Patient'}</title>
          <style>${getPrescriptionPageCss()}</style>
        </head>
        <body>
          ${buildPrescriptionHtml(patient, data, doctorInfo)}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 400);
    };
    setTimeout(() => {
      try { printWindow.focus(); printWindow.print(); printWindow.close(); } catch(e) {}
    }, 1200);
  };

  const formatDate = (date) => {
    if (!date) return new Date().toLocaleDateString('en-IN');
    return new Date(date).toLocaleDateString('en-IN');
  };

  const prescriptions = data.prescriptions || [];
  const vitals = data.vitalSigns || {};

  return (
    <>
      <div className="prescription-modal-overlay" onClick={onClose}>
        <div className="prescription-modal-content" onClick={(e) => e.stopPropagation()}>

          <div className="prescription-modal-header">
            <h2>
              <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5"
                  stroke="currentColor" strokeWidth="2"/>
              </svg>
              Prescription Note
            </h2>
            <button className="prescription-close-btn" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          </div>

          <div className="prescription-actions">
            <button className={`mode-btn ${mode === 'view' ? 'active' : ''}`} onClick={() => setMode('view')}>
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              View Note
            </button>
            <button className={`mode-btn ${mode === 'preview' ? 'active' : ''}`} onClick={() => setMode('preview')}>
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M3 9H21M9 3V21" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Print Preview
            </button>
            <button className="print-btn" onClick={handlePrint}>
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                <path d="M6 9V2H18V9" stroke="currentColor" strokeWidth="2"/>
                <path d="M6 18H4C2.89543 18 2 17.1046 2 16V11C2 9.89543 2.89543 9 4 9H20C21.1046 9 22 9.89543 22 11V16C22 17.1046 21.1046 18 20 18H18" stroke="currentColor" strokeWidth="2"/>
                <rect x="6" y="14" width="12" height="8" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Print
            </button>
          </div>

          <div
            ref={printRef}
            className={`prescription-pad-wrapper ${mode === 'preview' ? 'preview-mode' : ''}`}
          >
            <div className="prescription-pad">
              <div className="prescription-header">
                <div className="doctor-details">
                  <h1 className="doctor-name">{doctorInfo?.name || 'Dr. Name'}</h1>
                  <p className="doctor-qualification">{doctorInfo?.specialization || 'General Physician'}</p>
                  <p className="doctor-reg">{doctorInfo?.qualification || 'MBBS, MD'} || Reg. No: {doctorInfo?.regNo || 'XXXXXX'}</p>
                </div>
                <div className="clinic-details">
                  <h3 className="clinic-name">{doctorInfo?.clinicName || 'Clinic Name'}</h3>
                  <p className="clinic-address">{doctorInfo?.address || 'Clinic Address'}</p>
                  <p className="clinic-phone">Ph: {doctorInfo?.clinicNumber || '+91 XXXXXXXXXX'}</p>
                </div>
              </div>

              <div className="prescription-divider"></div>

              <div className="patient-info-bar">
                <div className="info-group">
                  <span className="info-label">Patient:</span>
                  <span className="info-value">{patient?.name || 'Patient Name'}</span>
                </div>
                <div className="info-group">
                  <span className="info-label">Age/Gender:</span>
                  <span className="info-value">{patient?.age || '-'} yrs / {patient?.gender || '-'}</span>
                </div>
                <div className="info-group">
                  <span className="info-label">Date:</span>
                  <span className="info-value">{formatDate()}</span>
                </div>
              </div>

              <div className="rx-symbol">℞</div>

              {data.chiefComplaint && (
                <div className="prescription-section">
                  <h4 className="section-title">Chief Complaint:</h4>
                  <p className="handwritten-text">{data.chiefComplaint}</p>
                </div>
              )}

              {(vitals.systolic || vitals.pulse || vitals.temperature) && (
                <div className="vitals-compact">
                  {vitals.systolic && vitals.diastolic && <span>BP: {vitals.systolic}/{vitals.diastolic} mmHg</span>}
                  {vitals.pulse && <span>Pulse: {vitals.pulse} bpm</span>}
                  {vitals.temperature && <span>Temp: {vitals.temperature}°F</span>}
                  {vitals.weight && <span>Wt: {vitals.weight} kg</span>}
                </div>
              )}

              {data.diagnosis && (
                <div className="prescription-section">
                  <h4 className="section-title">Diagnosis:</h4>
                  <p className="handwritten-text">{data.diagnosis}</p>
                </div>
              )}

              {prescriptions.length > 0 && prescriptions.some(p => p.medicineName && !p.dispensed) && (
                <div className="prescription-section medications">
                  <h4 className="section-title">Medications:</h4>
                  <div className="medication-list">
                    {prescriptions.filter(p => p.medicineName && !p.dispensed).map((med, idx) => (
                      <div key={idx} className="medication-item">
                        <div className="med-number">{idx + 1}.</div>
                        <div className="med-details">
                          <div className="med-name handwritten-text">{med.medicineName}</div>
                          <div className="med-instructions">
                            {med.dosage    && <span className="med-dosage">{med.dosage}</span>}
                            {med.frequency && <span className="med-frequency">{formatFrequency(med.frequency)}</span>}
                            {med.duration  && <span className="med-duration">{formatDuration(med.duration)}</span>}
                            {med.timing    && <span className="med-timing">{formatTiming(med.timing)}</span>}
                          </div>
                          {med.notes && <div className="med-notes">{med.notes}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(data.dietaryAdvice || data.lifestyleAdvice || data.generalAdvice) && (
                <div className="prescription-section">
                  <h4 className="section-title">Advice:</h4>
                  <div className="advice-list">
                    {data.dietaryAdvice   && <p className="handwritten-text">• {data.dietaryAdvice}</p>}
                    {data.lifestyleAdvice && <p className="handwritten-text">• {data.lifestyleAdvice}</p>}
                    {data.generalAdvice   && <p className="handwritten-text">• {data.generalAdvice}</p>}
                  </div>
                </div>
              )}

              {data.selectedTests?.length > 0 && (
                <div className="prescription-section">
                  <h4 className="section-title">Investigations:</h4>
                  <div className="tests-list">
                    {data.selectedTests.map((test, idx) => (
                      <p key={idx} className="handwritten-text">• {test}</p>
                    ))}
                  </div>
                </div>
              )}

              {data.nextVisitDate && (
                <div className="prescription-section followup">
                  <h4 className="section-title">Follow-up:</h4>
                  <p className="handwritten-text">
                    {new Date(data.nextVisitDate).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              )}

              {data.canvasNote?.imageDataUrl && (
                <div className="prescription-section canvas-note-section">
                  <h4 className="section-title">
                    <svg viewBox="0 0 24 24" fill="none" width="14" height="14" style={{marginRight:4,verticalAlign:'middle'}}>
                      <path d="M12 20H21M16.5 3.5C17.33 2.67 18.67 2.67 19.5 3.5C20.33 4.33 20.33 5.67 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Handwritten Notes:
                  </h4>
                  <div className="canvas-note-img-wrap">
                    <img src={data.canvasNote.imageDataUrl} alt="Handwritten note" className="canvas-note-img"/>
                  </div>
                </div>
              )}

              <div className="prescription-footer">
                <div className="signature-section">
                  <div className="signature-line"></div>
                  <p className="signature-label">Doctor's Signature</p>
                </div>
              </div>

              <div className="prescription-watermark">AssistIQ Health</div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default PrescriptionPad;