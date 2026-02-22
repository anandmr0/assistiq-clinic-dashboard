
import html2canvas from 'html2canvas';
import { jsPDF }   from 'jspdf';

// ── helpers (same as PrescriptionPad.jsx) ────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const fmtFreq   = f => ({ once_daily:'1-0-0', twice_daily:'1-0-1', thrice_daily:'1-1-1', four_times:'1-1-1-1', every_6_hours:'Every 6hrs', every_8_hours:'Every 8hrs', as_needed:'As needed' }[f] || f || '');
const fmtDur    = d => ({ '1_day':'1 day','3_days':'3 days','5_days':'5 days','7_days':'7 days','10_days':'10 days','14_days':'14 days','21_days':'21 days','30_days':'30 days' }[d] || d || '');
const fmtTiming = t => ({ after_food:'After Food', before_food:'Before Food', with_food:'With Food', empty_stomach:'Empty Stomach' }[t] || t || '');

// ── CSS (identical to PrescriptionPad print CSS) ──────────────────────────────
const PRESCRIPTION_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: white;
    font-family: Georgia, 'Times New Roman', serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-prescription-page {
    width: 794px;          /* 210mm at 96dpi — matches A4 exactly */
    background: white;
    padding: 56px 76px;    /* 1.5cm 2cm */
    position: relative;
  }

  /* ── Header ── */
  .prescription-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 1rem;
  }
  .doctor-name {
    font-family: 'Dancing Script', 'Brush Script MT', cursive, Georgia, serif;
    font-size: 2rem;
    color: #1a56db;
    font-weight: 700;
    margin-bottom: 0.2rem;
    line-height: 1.2;
  }
  .doctor-qualification { font-size: 0.875rem; color: #374151; margin-bottom: 0.125rem; }
  .doctor-reg           { font-size: 0.8rem;   color: #6B7280; }
  .clinic-details       { text-align: right; }
  .clinic-name          { font-size: 1.125rem; font-weight: 700; color: #1F2937; margin-bottom: 0.2rem; }
  .clinic-address, .clinic-phone { font-size: 0.8rem; color: #6B7280; margin-bottom: 0.1rem; }

  /* ── Divider ── */
  .prescription-divider {
    height: 2px;
    background: linear-gradient(to right, #1a56db, #7c3aed);
    margin: 0.75rem 0;
    border-radius: 1px;
  }

  /* ── Patient bar ── */
  .patient-info-bar {
    display: flex;
    gap: 2rem;
    background: #EFF6FF;
    border-left: 4px solid #1a56db;
    padding: 0.6rem 1rem;
    margin-bottom: 1rem;
    border-radius: 0 6px 6px 0;
  }
  .info-label {
    font-size: 0.75rem; color: #6B7280; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.5px; margin-right: 0.35rem;
  }
  .info-value { font-size: 0.9rem; color: #1F2937; font-weight: 600; }

  /* ── Rx Symbol ── */
  .rx-symbol {
    font-family: 'Times New Roman', serif;
    font-size: 3rem; font-weight: 700; font-style: italic;
    color: #1a56db; margin-bottom: 0.5rem;
  }

  /* ── Sections ── */
  .prescription-section { margin-bottom: 1rem; }
  .section-title {
    font-size: 0.85rem; font-weight: 700; color: #374151;
    text-transform: uppercase; letter-spacing: 0.5px;
    margin-bottom: 0.4rem; border-left: 3px solid #1a56db;
    padding-left: 0.5rem;
  }
  .handwritten-text {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1rem; color: #1F2937; line-height: 1.6;
    padding-left: 0.25rem;
  }

  /* ── Vitals ── */
  .vitals-compact {
    display: flex; gap: 1.5rem; flex-wrap: wrap;
    background: #F9FAFB; border: 1px solid #E5E7EB;
    border-radius: 6px; padding: 0.5rem 1rem;
    margin-bottom: 1rem; font-size: 0.85rem; color: #374151;
  }

  /* ── Medications ── */
  .medications {
    background: #F0FDF4; border-left: 3px solid #10B981;
    border-radius: 0 8px 8px 0; padding: 0.75rem 1rem;
  }
  .medication-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .medication-item {
    display: flex; align-items: flex-start; gap: 0.75rem;
    background: white; border-radius: 6px; padding: 0.5rem 0.75rem;
    border: 1px solid #D1FAE5;
  }
  .med-number   { font-weight: 700; color: #10B981; font-size: 1rem; min-width: 20px; }
  .med-name     { font-weight: 700; font-size: 1rem; color: #1F2937; margin-bottom: 0.25rem; font-style: italic; }
  .med-instructions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.2rem; }
  .med-instructions span { font-size: 0.8rem; padding: 0.15rem 0.5rem; border-radius: 20px; }
  .med-dosage    { background:#EFF6FF; color:#1a56db; font-weight:600; }
  .med-frequency { background:#F0FDF4; color:#065F46; font-weight:600; }
  .med-duration  { background:#FFF7ED; color:#92400E; font-weight:600; }
  .med-timing    { background:#FDF4FF; color:#6B21A8; font-weight:600; }
  .med-notes     { font-size:0.8rem; color:#6B7280; margin-top:0.25rem; font-style:italic; }

  /* ── Advice / Tests ── */
  .advice-list p, .tests-list p { font-size: 0.9rem; color: #374151; line-height: 1.7; }

  /* ── Follow-up ── */
  .followup {
    background: #FFF7ED; border-left: 3px solid #F59E0B;
    border-radius: 0 6px 6px 0; padding: 0.5rem 1rem;
  }

  /* ── Canvas note ── */
  .canvas-note-section { border-top: 1.5px dashed #CBD5E1; padding-top: 0.875rem; margin-top: 0.5rem; }
  .canvas-note-img-wrap {
    border: 1.5px solid #E2E8F0; border-radius: 8px;
    overflow: hidden; background: #FFFEF7; margin-top: 0.5rem;
  }
  .canvas-note-img { width: 100%; display: block; background: #FFFEF7; }

  /* ── Footer / Signature ── */
  .prescription-footer { margin-top: 2.5rem; display: flex; justify-content: flex-end; }
  .signature-section   { text-align: center; }
  .signature-line      { width: 160px; height: 1px; background: #374151; margin-bottom: 0.3rem; }
  .signature-label     { font-size: 0.75rem; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; }

  /* ── Watermark ── */
  .prescription-watermark {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-size: 5rem; font-weight: 900;
    color: rgba(0,102,204,0.04); white-space: nowrap;
    pointer-events: none; z-index: 0; user-select: none;
  }
`;

// ── Build the prescription HTML body ─────────────────────────────────────────
function buildPrescriptionBody(patient, data, doctorInfo) {
  const vitals = data?.vitalSigns || {};
  const prx    = (data?.prescriptions || []).filter(p => p.medicineName);
  const today  = new Date().toLocaleDateString('en-IN');

  const vitalsHtml = (vitals.systolic || vitals.pulse || vitals.temperature) ? `
    <div class="vitals-compact">
      ${vitals.systolic && vitals.diastolic ? `<span>BP: ${vitals.systolic}/${vitals.diastolic} mmHg</span>` : ''}
      ${vitals.pulse       ? `<span>Pulse: ${vitals.pulse} bpm</span>` : ''}
      ${vitals.temperature ? `<span>Temp: ${vitals.temperature}°F</span>` : ''}
      ${vitals.weight      ? `<span>Wt: ${vitals.weight} kg</span>` : ''}
      ${vitals.height      ? `<span>Ht: ${vitals.height} cm</span>` : ''}
      ${vitals.spo2        ? `<span>SpO₂: ${vitals.spo2}%</span>` : ''}
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
                ${med.dosage    ? `<span class="med-dosage">${escHtml(med.dosage)}</span>`             : ''}
                ${med.frequency ? `<span class="med-frequency">${escHtml(fmtFreq(med.frequency))}</span>` : ''}
                ${med.duration  ? `<span class="med-duration">${escHtml(fmtDur(med.duration))}</span>`   : ''}
                ${med.timing    ? `<span class="med-timing">${escHtml(fmtTiming(med.timing))}</span>`    : ''}
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
        ${data.dietaryAdvice   ? `<p class="handwritten-text">• ${escHtml(data.dietaryAdvice)}</p>`   : ''}
        ${data.lifestyleAdvice ? `<p class="handwritten-text">• ${escHtml(data.lifestyleAdvice)}</p>` : ''}
        ${data.generalAdvice   ? `<p class="handwritten-text">• ${escHtml(data.generalAdvice)}</p>`   : ''}
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

  // Canvas note image is already a base64 data-URL — embeds inline, no fetch needed
  const canvasHtml = data?.canvasNote?.imageDataUrl ? `
    <div class="prescription-section canvas-note-section">
      <div class="section-title">✎ Handwritten Notes:</div>
      <div class="canvas-note-img-wrap">
        <img src="${data.canvasNote.imageDataUrl}" class="canvas-note-img" alt="Handwritten note"/>
      </div>
    </div>` : '';

  return `
    <div class="print-prescription-page">
      <div class="prescription-header">
        <div class="doctor-details">
          <div class="doctor-name">${escHtml(doctorInfo?.name || 'Dr. Name')}</div>
          <div class="doctor-qualification">${escHtml(doctorInfo?.qualification || doctorInfo?.specialization || 'MBBS, MD')}</div>
          <div class="doctor-reg">Reg. No: ${escHtml(doctorInfo?.regNo || '')}</div>
        </div>
        <div class="clinic-details">
          <div class="clinic-name">${escHtml(doctorInfo?.clinicName || '')}</div>
          <div class="clinic-address">${escHtml(doctorInfo?.address || '')}</div>
          <div class="clinic-phone">Ph: ${escHtml(doctorInfo?.phoneNumber || '')}</div>
        </div>
      </div>

      <div class="prescription-divider"></div>

      <div class="patient-info-bar">
        <div class="info-group">
          <span class="info-label">Patient:</span>
          <span class="info-value">${escHtml(patient?.name || '')}</span>
        </div>
        <div class="info-group">
          <span class="info-label">Age/Gender:</span>
          <span class="info-value">${patient?.age || '-'} yrs / ${escHtml(patient?.gender || '-')}</span>
        </div>
        <div class="info-group">
          <span class="info-label">Date:</span>
          <span class="info-value">${today}</span>
        </div>
      </div>

      <div class="rx-symbol">&#8478;</div>

      ${data?.chiefComplaint ? `<div class="prescription-section"><div class="section-title">Chief Complaint:</div><p class="handwritten-text">${escHtml(data.chiefComplaint)}</p></div>` : ''}
      ${data?.diagnosis      ? `<div class="prescription-section"><div class="section-title">Diagnosis:</div><p class="handwritten-text">${escHtml(data.diagnosis)}</p></div>`           : ''}
      ${vitalsHtml}
      ${medsHtml}
      ${adviceHtml}
      ${testsHtml}
      ${followupHtml}
      ${canvasHtml}

      <div class="prescription-footer">
        <div class="signature-section">
          <div class="signature-line"></div>
          <p class="signature-label">Doctor's Signature</p>
        </div>
      </div>

      <div class="prescription-watermark">AssistIQ Health</div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// generatePrescriptionPdfBase64
//
// Renders the prescription HTML into a hidden off-screen div, captures it
// with html2canvas, and converts to a jsPDF PDF.
//
// Returns: Promise<string>  — base64 PDF string WITHOUT the data: prefix
//          e.g. "JVBERi0xLjM..."  ready to set on payload.prescriptionPdfBase64
//
// Returns null on error (caller should still proceed with saving the appointment).
// ─────────────────────────────────────────────────────────────────────────────
export async function generatePrescriptionPdfBase64(patient, data, doctorInfo) {
  try {
    // ── 1. Create a hidden container and inject the prescription HTML ──────
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: 794px;        /* A4 at 96 dpi */
      background: white;
      z-index: -1;
      font-family: Georgia, 'Times New Roman', serif;
    `;

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = PRESCRIPTION_CSS;
    container.appendChild(styleEl);

    // Inject body HTML
    container.innerHTML += buildPrescriptionBody(patient, data, doctorInfo);
    document.body.appendChild(container);

    // ── 2. Wait a tick for fonts + images to load ──────────────────────────
    await new Promise(r => setTimeout(r, 300));

    // ── 3. Capture with html2canvas ────────────────────────────────────────
    const canvas = await html2canvas(container, {
      scale: 2,              // 2× for sharper text
      useCORS: true,         // allow external font/image URLs
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width:  794,
      windowWidth: 794,
    });

    document.body.removeChild(container);

    // ── 4. Build jsPDF (A4 portrait) ───────────────────────────────────────
    const A4_W_MM = 210;
    const A4_H_MM = 297;

    // Canvas dimensions in mm (canvas is 794*2 = 1588px wide = 210mm)
    const imgWidthMM  = A4_W_MM;
    const imgHeightMM = (canvas.height / canvas.width) * A4_W_MM;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit:        'mm',
      format:      'a4',
      compress:    true,
    });

    // If content is taller than one A4 page, add extra pages
    let yOffset = 0;
    const pageHeightPx = (A4_H_MM / A4_W_MM) * canvas.width; // in canvas pixels

    while (yOffset < canvas.height) {
      if (yOffset > 0) pdf.addPage();

      // Slice a page-height strip from the canvas
      const pageCanvas  = document.createElement('canvas');
      const sliceHeight = Math.min(pageHeightPx, canvas.height - yOffset);
      pageCanvas.width  = canvas.width;
      pageCanvas.height = sliceHeight;

      const ctx = pageCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, -yOffset);

      const pageImgData  = pageCanvas.toDataURL('image/jpeg', 0.92);
      const pageHeightMM = (sliceHeight / canvas.width) * A4_W_MM;

      pdf.addImage(pageImgData, 'JPEG', 0, 0, imgWidthMM, pageHeightMM);
      yOffset += pageHeightPx;
    }

    // ── 5. Return base64 string (no data: prefix) ──────────────────────────
    // jsPDF output('datauristring') returns "data:application/pdf;base64,XXX"
    const dataUri = pdf.output('datauristring');
    return dataUri.split(',')[1];     // strip prefix → raw base64

  } catch (err) {
    console.error('[prescriptionPdfGenerator] PDF generation failed:', err);
    return null;   // non-fatal — appointment save still proceeds
  }
}