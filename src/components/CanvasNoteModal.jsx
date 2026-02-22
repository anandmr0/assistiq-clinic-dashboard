import React, { useRef, useState, useEffect, useCallback } from 'react';
import '../css/CanvasNoteModal.css';

/**
 * CanvasNoteModal
 *
 * Props:
 *   isVisible   {boolean}
 *   onClose     {function}
 *   patient     {object}   { patientId, name, age, gender }
 *   doctorInfo  {object}   { name, qualification, regNo, clinicName, address, phoneNumber }
 *   pastNotes   {array}    [{ imageDataUrl, pdfDataUrl, createdAt, visitDate }]
 *   savedNote   {object|null}  — canvas note already saved this session
 *                              { imageDataUrl, pdfDataUrl, createdAt }
 *   onSaveNote  {function} ({ imageDataUrl, pdfDataUrl, patientId }) => void
 *                          Called when doctor clicks "Save". Does NOT close the modal.
 */
const CanvasNoteModal = ({
  isVisible,
  onClose,
  patient,
  doctorInfo,
  pastNotes = [],
  savedNote = null,      // ← current-session saved note
  onSaveNote,
}) => {
  const canvasRef      = useRef(null);
  const ctxRef         = useRef(null);
  const lastPoint      = useRef(null);
  const isDrawingRef   = useRef(false);
  const historyRef     = useRef([]);
  const historyIdxRef  = useRef(-1);

  // Use refs so draw callbacks always see latest values
  const toolRef  = useRef('pen');
  const colorRef = useRef('#1a1a2e');
  const sizeRef  = useRef(3);

  const [tool,        setToolState]   = useState('pen');
  const [penColor,    setColorState]  = useState('#1a1a2e');
  const [penSize,     setSizeState]   = useState(3);
  const [isEmpty,     setIsEmpty]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('draw');
  const [viewingNote, setViewingNote] = useState(null);
  const [isSaving,    setIsSaving]    = useState(false);
  const [justSaved,   setJustSaved]   = useState(false);
  const [, forceRender] = useState(0);

  const setTool  = v => { toolRef.current  = v; setToolState(v);  };
  const setColor = v => { colorRef.current = v; setColorState(v); };
  const setSize  = v => { sizeRef.current  = v; setSizeState(v);  };

  const COLORS = ['#1a1a2e', '#0066CC', '#EF476F', '#06D6A0', '#FFB830', '#7B2D8B'];
  const SIZES  = [{ v: 2, label: 'S' }, { v: 4, label: 'M' }, { v: 7, label: 'L' }];

  /* ────────────────────────────────────────────────────────
     Background drawing helper
  ──────────────────────────────────────────────────────── */
  const drawBackground = useCallback((ctx, w, h) => {
    ctx.globalCompositeOperation = 'source-over';
    // Use raw pixel fill to avoid DPR issues
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#FFFEF7';
    ctx.fillRect(0, 0, w * dpr, h * dpr);
    ctx.restore();

    // Ruling lines (logical px, after scale)
    ctx.strokeStyle = 'rgba(0,102,204,0.07)';
    ctx.lineWidth = 1;
    for (let y = 48; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // Red margin
    ctx.strokeStyle = 'rgba(239,71,111,0.13)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(52, 0); ctx.lineTo(52, h); ctx.stroke();
  }, []);

  /* ────────────────────────────────────────────────────────
     Init / reinit canvas — called on mount AND when switching
     back to the draw tab (fixes "can't draw after history")
  ──────────────────────────────────────────────────────── */
  const initCanvas = useCallback((preserveContent = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrapper = canvas.parentElement;
    if (!wrapper) return;

    const dpr = window.devicePixelRatio || 1;
    const w   = wrapper.clientWidth;
    const h   = wrapper.clientHeight;

    // Capture existing drawing before resize (if preserving)
    let snapshot = null;
    if (preserveContent && canvas.width > 0 && historyIdxRef.current >= 0) {
      snapshot = canvas.toDataURL('image/png');
    }

    canvas.width        = Math.round(w * dpr);
    canvas.height       = Math.round(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctxRef.current = ctx;

    drawBackground(ctx, w, h);

    // Restore content if snapshot exists
    if (snapshot) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, h);
      img.src = snapshot;
    }
  }, [drawBackground]);

  // Fresh init when modal opens
  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(() => {
      initCanvas(false);
      historyRef.current    = [];
      historyIdxRef.current = -1;
      setIsEmpty(true);
      setJustSaved(false);
      forceRender(n => n + 1);
    }, 60);
    return () => clearTimeout(t);
  }, [isVisible, initCanvas]);

  // Reinit (preserving content) when switching BACK to draw tab
  // This is the fix for "can't draw after visiting history"
  useEffect(() => {
    if (!isVisible || activeTab !== 'draw') return;
    const t = setTimeout(() => initCanvas(true), 30);
    return () => clearTimeout(t);
  }, [activeTab, isVisible, initCanvas]);

  useEffect(() => {
    if (!isVisible) return;
    const fn = () => initCanvas(true);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [isVisible, initCanvas]);

  /* ────────────────────────────────────────────────────────
     Clear
  ──────────────────────────────────────────────────────── */
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx    = ctxRef.current;
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    drawBackground(ctx, canvas.width / dpr, canvas.height / dpr);

    historyRef.current    = [];
    historyIdxRef.current = -1;
    setIsEmpty(true);
    setJustSaved(false);
    forceRender(n => n + 1);
  }, [drawBackground]);

  /* ────────────────────────────────────────────────────────
     Undo
  ──────────────────────────────────────────────────────── */
  const undo = useCallback(() => {
    const idx = historyIdxRef.current;
    if (idx < 0) return;
    if (idx === 0) { clearCanvas(); return; }

    const canvas = canvasRef.current;
    const ctx    = ctxRef.current;
    const dpr    = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    const img = new Image();
    img.src = historyRef.current[idx - 1];
    img.onload = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.drawImage(img, 0, 0, w, h);
    };
    historyIdxRef.current = idx - 1;
    forceRender(n => n + 1);
  }, [clearCanvas]);

  /* ────────────────────────────────────────────────────────
     Drawing events
  ──────────────────────────────────────────────────────── */
  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches?.[0] || e.changedTouches?.[0] || e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDrawing = useCallback((e) => {
    e.preventDefault();
    // Reinit ctx if lost (e.g. after tab switch without reinit completing)
    if (!ctxRef.current) { initCanvas(true); return; }
    isDrawingRef.current = true;
    const pos = getPos(e);
    lastPoint.current = pos;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(pos.x, pos.y);
  }, [initCanvas]);

  const draw = useCallback((e) => {
    e.preventDefault();
    if (!isDrawingRef.current || !ctxRef.current) return;
    const ctx = ctxRef.current;
    const pos = getPos(e);

    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';

    if (toolRef.current === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth   = sizeRef.current * 7;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else if (toolRef.current === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.lineWidth   = sizeRef.current * 9;
      ctx.strokeStyle = hexToRgba(colorRef.current, 0.3);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth   = sizeRef.current;
      ctx.strokeStyle = colorRef.current;
    }

    if (lastPoint.current) {
      const mid = {
        x: (lastPoint.current.x + pos.x) / 2,
        y: (lastPoint.current.y + pos.y) / 2,
      };
      ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, mid.x, mid.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mid.x, mid.y);
    }
    lastPoint.current = pos;
    setIsEmpty(false);
    setJustSaved(false); // mark as dirty if drawing again after save
  }, []);

  const stopDrawing = useCallback((e) => {
    if (!isDrawingRef.current) return;
    e?.preventDefault?.();
    isDrawingRef.current = false;
    lastPoint.current    = null;
    const canvas = canvasRef.current;
    const ctx    = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.globalCompositeOperation = 'source-over';

    const snap = canvas.toDataURL('image/png');
    const arr  = historyRef.current.slice(0, historyIdxRef.current + 1);
    arr.push(snap);
    historyRef.current    = arr;
    historyIdxRef.current = arr.length - 1;
    forceRender(n => n + 1);
  }, []);

  /* ────────────────────────────────────────────────────────
     PDF generation  (794×1123 canvas → jpeg)
  ──────────────────────────────────────────────────────── */
  const generatePDF = useCallback(async (imageDataUrl) => {
    const W = 794, H = 1123;
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const c = off.getContext('2d');

    // White bg
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);

    // Header
    const grad = c.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#0052A5');
    grad.addColorStop(1, '#0066CC');
    c.fillStyle = grad; c.fillRect(0, 0, W, 92);

    // Doctor left
    c.fillStyle = '#fff';
    c.font = 'bold 20px Georgia,serif';
    c.fillText(doctorInfo?.name || 'Doctor', 28, 34);
    c.font = '13px Georgia,serif';
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.fillText(doctorInfo?.qualification || '', 28, 56);
    c.fillText(`Reg. No: ${doctorInfo?.regNo || ''}`, 28, 76);

    // Clinic right
    c.textAlign = 'right';
    c.font = 'bold 15px Georgia,serif';
    c.fillStyle = '#fff';
    c.fillText(doctorInfo?.clinicName || '', W - 24, 34);
    c.font = '12px Georgia,serif';
    c.fillStyle = 'rgba(255,255,255,0.78)';
    c.fillText(doctorInfo?.address || '', W - 24, 54);
    c.fillText(doctorInfo?.phoneNumber || '', W - 24, 74);
    c.textAlign = 'left';

    // Patient bar
    c.fillStyle = '#EFF6FF'; c.fillRect(0, 92, W, 46);
    c.strokeStyle = '#BFDBFE'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, 138); c.lineTo(W, 138); c.stroke();
    const today = new Date().toLocaleDateString('en-IN');
    c.font = 'bold 12px Arial,sans-serif'; c.fillStyle = '#1e40af';
    c.fillText(`Patient: ${patient?.name || ''}`, 24, 118);
    c.fillText(
      `Age: ${patient?.age || '-'}  |  Gender: ${patient?.gender || '-'}  |  Date: ${today}`,
      240, 118
    );

    // Rx symbol
    c.font = 'bold italic 44px Times New Roman,serif';
    c.fillStyle = '#0066CC'; c.globalAlpha = 0.82;
    c.fillText('℞', 24, 182); c.globalAlpha = 1;

    // Divider + label
    c.strokeStyle = '#E2E8F0'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(24, 193); c.lineTo(W - 24, 193); c.stroke();
    c.font = '10px Arial,sans-serif';
    c.fillStyle = '#94a3b8';
    c.fillText('HANDWRITTEN PRESCRIPTION NOTE', 24, 210);

    // Note image area
    const IX = 24, IY = 218, IW = W - 48, IH = H - IY - 60;
    // light paper bg with border
    c.fillStyle = '#FFFEF7'; c.fillRect(IX, IY, IW, IH);
    c.strokeStyle = '#E2E8F0'; c.lineWidth = 1;
    c.strokeRect(IX, IY, IW, IH);

    await new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(IW / img.naturalWidth, IH / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        c.drawImage(img, IX + (IW - dw) / 2, IY, dw, dh);
        res();
      };
      img.src = imageDataUrl;
    });

    // Footer
    c.fillStyle = '#F1F5F9'; c.fillRect(0, H - 52, W, 52);
    c.strokeStyle = '#E2E8F0'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, H - 52); c.lineTo(W, H - 52); c.stroke();
    c.font = '10px Arial,sans-serif'; c.fillStyle = '#94a3b8';
    c.textAlign = 'center';
    c.fillText(`AssistIQ Health  ·  Canvas Prescription Note  ·  ${today}`, W / 2, H - 28);
    c.textAlign = 'left';

    return off.toDataURL('image/jpeg', 0.92);
  }, [patient, doctorInfo]);

  /* ────────────────────────────────────────────────────────
     Save — saves to UI state, does NOT close modal
  ──────────────────────────────────────────────────────── */
  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    setIsSaving(true);
    try {
      const imageDataUrl = canvas.toDataURL('image/png');
      const pdfDataUrl   = await generatePDF(imageDataUrl);
      onSaveNote?.({ imageDataUrl, pdfDataUrl, appointmentId: patient?.appointmentId });
      setJustSaved(true);
    } finally {
      setIsSaving(false);
    }
    // Modal stays open — doctor can review what they drew
  };

  /* ────────────────────────────────────────────────────────
     Download helper
  ──────────────────────────────────────────────────────── */
  const downloadPDF = async (imgUrl, name) => {
    const pdf = await generatePDF(imgUrl);
    const a   = document.createElement('a');
    a.href = pdf;
    a.download = name || `canvas_note_${patient?.name || 'patient'}.jpg`;
    a.click();
  };

  if (!isVisible) return null;

  const canUndo      = historyIdxRef.current >= 0;
  const allPastNotes = savedNote
    ? [...pastNotes, savedNote]   // include current-session note in history
    : pastNotes;

  return (
    <div className="cn-overlay" onClick={onClose}>
      <div className="cn-container" onClick={e => e.stopPropagation()}>

        {/* ══════════ HEADER ══════════ */}
        <div className="cn-header">
          <div className="cn-header-left">
            <div className="cn-pen-icon">
              <svg viewBox="0 0 24 24" fill="none" width="17" height="17">
                <path d="M12 20H21M16.5 3.5C17.33 2.67 18.67 2.67 19.5 3.5C20.33 4.33 20.33 5.67 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h2 className="cn-title">Canvas Note</h2>
              <p className="cn-subtitle">{patient?.name || 'Patient'}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="cn-tabs">
            <button
              className={`cn-tab ${activeTab === 'draw' ? 'active' : ''}`}
              onClick={() => setActiveTab('draw')}
            >
              <svg viewBox="0 0 24 24" fill="none" width="12" height="12">
                <path d="M12 20H21M16.5 3.5C17.33 2.67 18.67 2.67 19.5 3.5C20.33 4.33 20.33 5.67 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Write
            </button>
            <button
              className={`cn-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <svg viewBox="0 0 24 24" fill="none" width="12" height="12">
                <path d="M12 8V12L15 15M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Past Visits
              {allPastNotes.length > 0 && (
                <span className="cn-badge">{allPastNotes.length}</span>
              )}
            </button>
          </div>

          <button className="cn-close-btn" onClick={onClose} title="Close">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ══════════ DRAW TAB ══════════ */}
        {activeTab === 'draw' && (
          <>
            {/* Saved badge */}
            {justSaved && (
              <div className="cn-saved-banner">
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Note saved — it will be included when you mark this visit complete.
              </div>
            )}

            {/* ── Toolbar ── */}
            <div className="cn-toolbar">
              {/* Tools */}
              <div className="cn-tool-group">
                <button className={`cn-tool-btn ${tool === 'pen' ? 'active pen' : ''}`} onClick={() => setTool('pen')}>
                  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                    <path d="M12 20H21M16.5 3.5C17.33 2.67 18.67 2.67 19.5 3.5C20.33 4.33 20.33 5.67 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Pen</span>
                </button>
                <button className={`cn-tool-btn ${tool === 'highlighter' ? 'active hl' : ''}`} onClick={() => setTool('highlighter')}>
                  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                    <path d="M9 5H19M9 9H19M9 13H16M9 17H14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  <span>Hi-lite</span>
                </button>
                <button className={`cn-tool-btn ${tool === 'eraser' ? 'active er' : ''}`} onClick={() => setTool('eraser')}>
                  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                    <path d="M20 20H7L3 16L13 6L21 14L20 20Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M6.5 17.5L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>Eraser</span>
                </button>
              </div>

              <div className="cn-divider" />

              {/* Sizes */}
              <div className="cn-tool-group">
                {SIZES.map(s => (
                  <button
                    key={s.v}
                    className={`cn-size-btn ${penSize === s.v ? 'active' : ''}`}
                    onClick={() => setSize(s.v)}
                    title={`Size ${s.label}`}
                  >
                    <span className="cn-size-dot" style={{ width: s.v * 3 + 4, height: s.v * 3 + 4 }} />
                  </button>
                ))}
              </div>

              <div className="cn-divider" />

              {/* Colors */}
              <div className="cn-tool-group">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`cn-color-btn ${penColor === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => { setColor(c); setTool('pen'); }}
                    aria-label={c}
                  />
                ))}
              </div>

              <div className="cn-divider" />

              {/* Undo / Clear */}
              <div className="cn-tool-group">
                <button className="cn-tool-btn" onClick={undo} disabled={!canUndo} title="Undo">
                  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                    <path d="M3 10H16C18.76 10 21 12.24 21 15C21 17.76 18.76 20 16 20H11M3 10L7 6M3 10L7 14"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Undo</span>
                </button>
                <button className="cn-tool-btn cn-clear" onClick={clearCanvas} title="Clear all">
                  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                    <path d="M3 6H21M8 6V4C8 3.45 8.45 3 9 3H15C15.55 3 16 3.45 16 4V6M19 6L18.2 20.07C18.09 21.14 17.19 21.93 16.11 21.93H7.89C6.81 21.93 5.91 21.14 5.8 20.07L5 6"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* ── Canvas ── */}
            <div className="cn-canvas-wrap">
              <canvas
                ref={canvasRef}
                className="cn-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{
                  cursor: tool === 'eraser' ? 'cell' : 'crosshair',
                  touchAction: 'none',
                }}
              />
              {isEmpty && (
                <div className="cn-hint">
                  <svg viewBox="0 0 24 24" fill="none" width="50" height="50">
                    <path d="M12 20H21M16.5 3.5C17.33 2.67 18.67 2.67 19.5 3.5C20.33 4.33 20.33 5.67 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
                      stroke="#0066CC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.2"/>
                  </svg>
                  <p>Write your prescription here</p>
                  <span>Finger · Stylus · Mouse</span>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="cn-footer">
              <span className="cn-indicator">
                <span className="cn-dot" style={{ background: tool === 'eraser' ? '#aaa' : penColor }} />
                {tool === 'pen' ? 'Pen' : tool === 'highlighter' ? 'Highlighter' : 'Eraser'} · Size {penSize}
              </span>
              <div className="cn-footer-btns">
                <button className="cn-btn cn-ghost" onClick={onClose}>Close</button>
                <button
                  className={`cn-btn ${justSaved ? 'cn-saved' : 'cn-primary'}`}
                  onClick={handleSave}
                  disabled={isEmpty || isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="cn-spinner" />
                      Saving…
                    </>
                  ) : justSaved ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Saved
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                        <path d="M19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16L21 8V19C21 20.1 20.1 21 19 21Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M17 21V13H7V21M7 3V8H15" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Save Note
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ══════════ HISTORY TAB ══════════ */}
        {activeTab === 'history' && (
          <div className="cn-history">
            {allPastNotes.length === 0 ? (
              <div className="cn-history-empty">
                <svg viewBox="0 0 24 24" fill="none" width="54" height="54">
                  <path d="M12 8V12L15 15M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z"
                    stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p>No past canvas notes</p>
                <span>Notes saved from previous visits will appear here</span>
              </div>
            ) : (
              <>
                <p className="cn-history-label">
                  <strong>{allPastNotes.length}</strong> visit note{allPastNotes.length !== 1 ? 's' : ''} — tap to view full size
                </p>
                <div className="cn-history-grid">
                  {[...allPastNotes].reverse().map((note, i) => {
                    const isNew   = note === savedNote;
                    const rawDate = note.visitDate || note.createdAt;
                    const dateStr = rawDate
                      ? new Date(rawDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Unknown date';
                    return (
                      <div
                        key={i}
                        className={`cn-history-card ${isNew ? 'cn-history-card-new' : ''}`}
                        onClick={() => setViewingNote(note)}
                      >
                        {isNew && <span className="cn-new-badge">Today</span>}
                        <img src={note.imageDataUrl} alt={`Visit ${i + 1}`} className="cn-history-thumb" />
                        <div className="cn-history-card-foot">
                          <span className="cn-history-date">{dateStr}</span>
                          <button
                            className="cn-dl-btn"
                            onClick={e => {
                              e.stopPropagation();
                              downloadPDF(note.imageDataUrl, `visit_${dateStr}.jpg`);
                            }}
                            title="Download PDF"
                          >
                            <svg viewBox="0 0 24 24" fill="none" width="12" height="12">
                              <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15M7 10L12 15L17 10M12 15V3"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            PDF
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════ LIGHTBOX ══════════ */}
        {viewingNote && (
          <div className="cn-lightbox" onClick={() => setViewingNote(null)}>
            <div className="cn-lb-content" onClick={e => e.stopPropagation()}>
              <div className="cn-lb-header">
                <span>
                  {new Date(viewingNote.visitDate || viewingNote.createdAt)
                    .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    className="cn-btn cn-ghost"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => downloadPDF(viewingNote.imageDataUrl)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" width="12" height="12" style={{ marginRight: 4 }}>
                      <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15M7 10L12 15L17 10M12 15V3"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Download PDF
                  </button>
                  <button className="cn-close-btn" onClick={() => setViewingNote(null)}>
                    <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              <img src={viewingNote.imageDataUrl} alt="Visit note" className="cn-lb-img" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

function hexToRgba(hex, alpha) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? `rgba(${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)},${alpha})`
    : hex;
}

export default CanvasNoteModal;