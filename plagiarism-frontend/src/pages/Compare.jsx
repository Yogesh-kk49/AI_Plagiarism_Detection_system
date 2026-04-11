import { useState, useEffect } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";

// ── PDF Download Button ──
const DownloadPDFButton = ({ aiResult, fileName, activeTab }) => {
  const [downloading, setDownloading] = useState(false);
  const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
};
  const handleDownload = async () => {
  setDownloading(true);
  try {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageWidth    = pdf.internal.pageSize.getWidth();
    const pageHeight   = pdf.internal.pageSize.getHeight();
    const margin       = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    const theme = {
      primary: [22, 78, 99],    accent:  [14, 116, 144],
      text:    [33, 37, 41],    muted:   [108, 117, 125],
      light:   [248, 249, 250], border:  [222, 226, 230],
      success: [25, 135, 84],   danger:  [220, 53, 69],
      warning: [255, 193, 7],   white:   [255, 255, 255],
    };

    const clean = (str) =>
      String(str)
        .replace(/[\u2018\u2019\u02BC]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2013/g, "-")
        .replace(/\u2014/g, "--")
        .replace(/\u2026/g, "...")
        .replace(/[\uD800-\uDFFF]/g, "")
        .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
        .replace(/[^\x00-\xFF]/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();

    const resetText = (size = 10, style = "normal", color = theme.text) => {
      pdf.setFont("helvetica", style);
      pdf.setFontSize(size);
      pdf.setTextColor(...color);
    };

    const now    = new Date();
    const normalizePercent = (val) => {
      const num = Number(val || 0);
      return num <= 1 ? Math.round(num * 100) : Math.round(num);
    };

    const aiPercent = normalizePercent(aiResult?.ai_probability);
    const humanPercent = normalizePercent(aiResult?.human_probability);
    const verdict = aiResult?.label || "Unknown";
    const verdictColor =
      verdict.includes("AI") ? theme.danger :
      verdict.includes("Human") ? theme.success :
      theme.warning;

    const addHeader = () => {
      pdf.setFillColor(...theme.primary);
      pdf.rect(0, 0, pageWidth, 26, "F");
      resetText(17, "bold", theme.white);
      pdf.text("AI Content Detection Report", margin, 11);
      resetText(8, "normal", [180, 210, 220]);
      pdf.text(clean(`Generated: ${now.toLocaleString()}`), margin, 19);
      pdf.setDrawColor(...theme.border);
      pdf.setLineWidth(0.3);
      pdf.line(margin, 28, pageWidth - margin, 28);
    };

    const addFooter = (pageNo) => {
      pdf.setDrawColor(...theme.border);
      pdf.setLineWidth(0.3);
      pdf.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
      resetText(8, "normal", theme.muted);
      pdf.text("Confidential AI analysis summary", margin, pageHeight - 6);
      pdf.text(clean(`Page ${pageNo}`), pageWidth - margin, pageHeight - 6, { align: "right" });
    };

    const checkPageBreak = (needed = 10) => {
      if (y + needed > pageHeight - 18) {
        addFooter(pdf.getNumberOfPages());
        pdf.addPage();
        addHeader();
        resetText();
        y = 36;
      }
    };

    const drawSectionTitle = (title) => {
      checkPageBreak(12);
      resetText(10, "bold", theme.primary);
      pdf.text(clean(title), margin, y);
      y += 2;
      pdf.setDrawColor(...theme.border);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y + 1, pageWidth - margin, y + 1);
      y += 7;
    };

    const drawLabelValue = (label, value) => {
      checkPageBreak(7);
      resetText(9, "bold", theme.text);
      pdf.text(clean(`${label}:`), margin, y);
      resetText(9, "normal", theme.muted);
      pdf.text(clean(String(value)), margin + 42, y);
      y += 6;
    };

    const drawCard = (x, cardY, w, h, title, value, color = theme.primary) => {
      pdf.setFillColor(...theme.light);
      pdf.setDrawColor(...theme.border);
      pdf.roundedRect(x, cardY, w, h, 2, 2, "FD");
      resetText(8, "normal", theme.muted);
      pdf.text(clean(title), x + 4, cardY + 7);
      resetText(13, "bold", color);
      pdf.text(clean(String(value)), x + 4, cardY + 16, { maxWidth: w - 8 });
    };

    const drawProgressBar = (label, value, color) => {
      checkPageBreak(14);
      resetText(9, "normal", theme.muted);
      pdf.text(clean(label), margin, y);
      resetText(9, "bold", theme.text);
      pdf.text(clean(`${value}%`), pageWidth - margin, y, { align: "right" });
      y += 4;
      pdf.setFillColor(226, 229, 233);
      pdf.roundedRect(margin, y, contentWidth, 3.5, 1.5, 1.5, "F");
      pdf.setFillColor(...color);
      const fillW = Math.max((contentWidth * value) / 100, 3);
      pdf.roundedRect(margin, y, fillW, 3.5, 1.5, 1.5, "F");
      y += 9;
    };

    addHeader();
    y = 36;

    pdf.setFillColor(245, 247, 250);
    pdf.setDrawColor(...theme.border);
    pdf.roundedRect(margin, y, contentWidth, 22, 3, 3, "FD");

    resetText(10, "bold", theme.text);
    pdf.text("Executive Summary", margin + 5, y + 7);

    resetText(8, "normal", theme.muted);
    const source =
      activeTab === "upload" && fileName
        ? fileName
        : "Pasted Code";
    const srcLines = pdf.splitTextToSize(clean(`Source: ${source}`), contentWidth - 60);
    pdf.text(srcLines, margin + 5, y + 13);


    // Badge positioning - adjusted to be slightly left-aligned for better balance
    const badgeLabel = clean(verdict);
    resetText(8, "bold", theme.white);
    const badgePad = 5;
    const badgeW   = pdf.getTextWidth(badgeLabel) + badgePad * 2;
    const badgeH   = 8;
    // Position badge with some offset from the right edge for better visual balance
    const badgeX   = pageWidth - margin - badgeW - 10; // Added 10mm offset from right
    const badgeY   = y + 5;
    pdf.setFillColor(...verdictColor);
    pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 4, 4, "F");
    resetText(8, "bold", theme.white);
    pdf.text(badgeLabel, badgeX + badgeW / 2, badgeY + 5.5, { align: "center" });

    y += 29;

    drawSectionTitle("Summary Metrics");
    const cardY = y;
    const gap   = 5;
    const cardW = (contentWidth - gap * 2) / 3;
    drawCard(margin, cardY, cardW, 22,
      "AI Probability",
      `${aiPercent}%`,
      theme.danger
    );

    drawCard(margin + cardW + gap, cardY, cardW, 22,
      "Human Probability",
      `${humanPercent}%`,
      theme.success
    );

    drawCard(margin + (cardW + gap) * 2, cardY, cardW, 22,
      "Verdict",
      verdict,
      theme.accent
    );
    y += 28;

    drawSectionTitle("Probability Breakdown");
    drawProgressBar("AI Probability", aiPercent, theme.danger);
    drawProgressBar("Human Probability", humanPercent, theme.success);
    drawLabelValue("Date",    clean(now.toLocaleString()));
    drawLabelValue("Source",  clean(source));
    drawLabelValue("Verdict", clean(verdict));

    y += 2;
    drawSectionTitle("Analysis Summary");

    const summary =
      aiPercent > 70
        ? "The submitted code strongly matches patterns typically generated by AI."
        : aiPercent > 40
        ? "The code shows mixed characteristics of AI and human writing."
        : "The code is likely written by a human.";

    const lines = pdf.splitTextToSize(summary, contentWidth);
    checkPageBreak(lines.length * 5);
    pdf.text(lines, margin, y);
    y += lines.length * 5 + 4;

    addFooter(pdf.getNumberOfPages());
    pdf.save("Code_Analysis_Report.pdf");

  } catch (err) {
    console.error("PDF generation failed:", err);
    alert("Failed to generate PDF. Please try again.");
  } finally {
    setDownloading(false);
  }
};

  return (
    <button
      className="download-btn-up"
      onClick={handleDownload}
      disabled={downloading}
      style={{
        width:"100%", padding:"15px", fontSize:"0.98rem",
        background: downloading
          ? "rgba(20,184,166,0.1)"
          : "linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #0891b2 100%)",
        color: downloading ? "#64748b" : "#ffffff",
        border: downloading ? "1px solid rgba(20,184,166,0.25)" : "1px solid rgba(20,184,166,0.5)",
        borderRadius:16, cursor: downloading ? "not-allowed" : "pointer",
        fontFamily:"Inter, sans-serif", fontWeight:700,
        boxShadow: downloading ? "none" : "0 10px 32px rgba(20,184,166,0.35)",
        display:"flex", alignItems:"center", justifyContent:"center", gap:10,
        transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        marginTop: "12px",
        opacity: downloading ? 0.7 : 1,
      }}
    >
      {downloading ? (
        <>
          <span style={{
            width:16, height:16, borderRadius:"50%",
            border:"2.5px solid rgba(255,255,255,0.2)",
            borderTopColor:"rgba(255,255,255,0.8)",
            animation:"spinSmooth 0.8s linear infinite", display:"inline-block"
          }} />
          Generating PDF…
        </>
      ) : (
        <>
          <span style={{ fontSize:"1.1rem" }}>⬇️</span>
          Download Report as PDF
        </>
      )}
    </button>
  );
};

const injectStyles = () => {
  if (document.getElementById("ca-styles")) return;
  const tag = document.createElement("style");
  tag.id = "ca-styles";
  tag.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600&display=swap');
    
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @keyframes fadeUpSmooth    { from{opacity:0;transform:translateY(24px);}  to{opacity:1;transform:translateY(0);} }
    @keyframes fadeInSmooth    { from{opacity:0;} to{opacity:1;} }
    @keyframes scaleInGlow     { from{opacity:0;transform:scale(0.95);} to{opacity:1;transform:scale(1);} }
    @keyframes slideDownGlow   { from{opacity:0;transform:translateY(-16px);} to{opacity:1;transform:translateY(0);} }
    @keyframes spinSmooth      { to{transform:rotate(360deg);} }
    @keyframes orbFloat1       { 0%,100%{transform:translate(0,0) scale(1);} 40%{transform:translate(45px,-35px) scale(1.05);} 70%{transform:translate(-20px,20px) scale(0.95);} }
    @keyframes orbFloat2       { 0%,100%{transform:translate(0,0) scale(1);} 35%{transform:translate(-45px,25px) scale(1.05);} 70%{transform:translate(25px,-40px) scale(0.95);} }
    @keyframes floatGentle     { 0%,100%{transform:translateY(0px);} 50%{transform:translateY(-8px);} }
    @keyframes badgePulse      { 0%{transform:scale(0);} 50%{transform:scale(1.2);} 100%{transform:scale(1);} }
    @keyframes revealStagger   { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
    @keyframes shimmerGlow     { 0%{opacity:0.3;transform:scaleX(0.7);} 50%{opacity:1;transform:scaleX(1.05);} 100%{opacity:0.3;transform:scaleX(0.7);} }
    @keyframes pulseDotSoft    { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(0.8);} }
    @keyframes gradientShift   { 0%,100%{background-position:0% 50%;} 50%{background-position:100% 50%;} }
    @keyframes cardLift        { 0%{transform:translateY(8px);box-shadow:0 8px 24px rgba(0,0,0,0.2);} to{transform:translateY(0);box-shadow:0 20px 40px rgba(0,0,0,0.3);} }

    body { background: linear-gradient(135deg, #0a0a15 0%, #0f0f1a 50%, #1a1a2e 100%); overflow-x: hidden; }

    .ca-back:hover {
      background: rgba(239,68,68,0.18) !important;
      border-color: rgba(239,68,68,0.6) !important;
      color: #fecaca !important;
      transform: translateX(-2px);
    }
    .ca-analyze:hover:not(:disabled) { 
      transform: translateY(-4px) scale(1.02); 
      box-shadow: 0 20px 48px rgba(99,102,241,0.6) !important;
      background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
    }
    .ca-analyze:active:not(:disabled){ transform: translateY(-2px) scale(1.01); }
    .ca-tab:hover              { background: rgba(255,255,255,0.12) !important; transform: translateY(-1px); }
    .ca-feat:hover             { transform: translateY(-3px) scale(1.02); box-shadow: 0 12px 32px rgba(0,0,0,0.3) !important; }
    .ca-cmp:hover              { transform: translateY(-3px) scale(1.02); box-shadow: 0 16px 48px rgba(99,102,241,0.5) !important; }
    .profile-avatar            { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
    .profile-avatar:hover      { transform: scale(1.12) rotate(5deg); box-shadow: 0 12px 40px rgba(99,102,241,0.4); }
    .logout-btn:hover          { background: rgba(239,68,68,0.2) !important; color: #fca5a5 !important; border-color: rgba(239,68,68,0.5) !important; transform: translateX(-2px); }
    .history-btn:hover         { background: rgba(124,58,237,0.25) !important; color: #c4b5fd !important; transform: translateX(-2px); }
    .signin-corner:hover       { background: rgba(99,102,241,0.25) !important; border-color: rgba(99,102,241,0.7) !important; transform: scale(1.05); }
    .ca-textarea:focus         { border-color: rgba(99,102,241,0.7) !important; box-shadow: 0 0 0 4px rgba(99,102,241,0.15) !important; outline: none; transform: scale(1.01); }
    .upload-zone:hover         { border-color: rgba(99,102,241,0.6) !important; background: rgba(99,102,241,0.1) !important; transform: scale(1.02); }

    .lang-py:hover    { background: linear-gradient(135deg, #3b5cc4, #4f7cff) !important; border-color: #4f7cff !important; color: #fff !important; transform: translateY(-2px); }
    .lang-js:hover    { background: linear-gradient(135deg, #b8860b, #f0c040) !important; border-color: #f0c040 !important; color: #fff !important; transform: translateY(-2px); }
    .lang-java:hover  { background: linear-gradient(135deg, #b5451b, #f07040) !important; border-color: #f07040 !important; color: #fff !important; transform: translateY(-2px); }
    .lang-cpp:hover   { background: linear-gradient(135deg, #1a6b8a, #30b0e0) !important; border-color: #30b0e0 !important; color: #fff !important; transform: translateY(-2px); }
    .lang-c:hover     { background: linear-gradient(135deg, #264d7a, #4090d0) !important; border-color: #4090d0 !important; color: #fff !important; transform: translateY(-2px); }
    .lang-html:hover  { background: linear-gradient(135deg, #8b2500, #e06030) !important; border-color: #e06030 !important; color: #fff !important; transform: translateY(-2px); }
    .lang-other:hover { background: linear-gradient(135deg, #4a4a6a, #8080b0) !important; border-color: #8080b0 !important; color: #fff !important; transform: translateY(-2px); }
  `;
  document.head.appendChild(tag);
};

const SIGNAL_COLORS = {
  AI:      { bg:"rgba(239,68,68,0.12)",   border:"rgba(239,68,68,0.35)",   text:"#fca5a5", badge:"rgba(239,68,68,0.25)",   dot:"#ef4444" },
  Human:   { bg:"rgba(34,197,94,0.12)",   border:"rgba(34,197,94,0.35)",   text:"#86efac", badge:"rgba(34,197,94,0.25)",   dot:"#22c55e" },
  Neutral: { bg:"rgba(148,163,184,0.1)",  border:"rgba(148,163,184,0.25)", text:"#94a3b8", badge:"rgba(148,163,184,0.2)",  dot:"#64748b" },
};

const LANG_CFG = {
  python:     { label:"Python",     cls:"lang-py",   ibg:"rgba(79,124,255,0.15)",  ib:"rgba(79,124,255,0.45)",  it:"#7ba4ff", abg:"rgba(79,124,255,0.3)", ab:"rgba(79,124,255,0.8)",  at:"#a5c0ff" },
  javascript: { label:"JavaScript", cls:"lang-js",   ibg:"rgba(240,192,64,0.15)",  ib:"rgba(240,192,64,0.45)",  it:"#f0c040", abg:"rgba(240,192,64,0.3)", ab:"rgba(240,192,64,0.8)",  at:"#f5d76e" },
  java:       { label:"Java",       cls:"lang-java", ibg:"rgba(240,112,64,0.15)",  ib:"rgba(240,112,64,0.45)",  it:"#f07040", abg:"rgba(240,112,64,0.3)", ab:"rgba(240,112,64,0.8)",  at:"#f5a080" },
  cpp:        { label:"C++",        cls:"lang-cpp",  ibg:"rgba(48,176,224,0.15)",  ib:"rgba(48,176,224,0.45)",  it:"#30b0e0", abg:"rgba(48,176,224,0.3)", ab:"rgba(48,176,224,0.8)",  at:"#70ccee" },
  c:          { label:"C",          cls:"lang-c",    ibg:"rgba(64,144,208,0.15)",  ib:"rgba(64,144,208,0.45)",  it:"#4090d0", abg:"rgba(64,144,208,0.3)", ab:"rgba(64,144,208,0.8)",  at:"#80b8e8" },
  html:       { label:"HTML",       cls:"lang-html", ibg:"rgba(224,96,48,0.15)",   ib:"rgba(224,96,48,0.45)",   it:"#e06030", abg:"rgba(224,96,48,0.3)", ab:"rgba(224,96,48,0.8)",   at:"#f09070" },
  other:      { label:"Other",      cls:"lang-other",ibg:"rgba(128,128,176,0.15)", ib:"rgba(128,128,176,0.45)", it:"#8080b0", abg:"rgba(128,128,176,0.3)", ab:"rgba(128,128,176,0.7)", at:"#a0a0cc" },
};

const Orbs = () => (
  <>
    <div style={{
      position:"fixed", top:"10%", left:"2%", width:600, height:600, borderRadius:"50%", 
      background:"radial-gradient(circle at 30% 30%, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.08) 30%, transparent 70%)",
      animation:"orbFloat1 16s ease-in-out infinite", pointerEvents:"none", zIndex:0
    }} />
    <div style={{
      position:"fixed", bottom:"8%", right:"2%", width:700, height:700, borderRadius:"50%", 
      background:"radial-gradient(circle at 70% 20%, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.06) 35%, transparent 75%)",
      animation:"orbFloat2 20s ease-in-out infinite reverse", pointerEvents:"none", zIndex:0
    }} />
  </>
);

const ProfileCorner = ({ user, onLogout, navigate }) => {
  const [open, setOpen] = useState(false);
  const initials = user?.name ? user.name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase() : "?";
  return (
    <div style={{position:"fixed", top:20, right:28, zIndex:400, animation:"slideDownGlow 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.3s"}}>
      <div style={{position:"relative"}}>
        <button 
          className="profile-avatar" 
          onClick={()=>setOpen(o=>!o)} 
          style={{
            width:52, height:52, borderRadius:"50%", border:"2px solid rgba(99,102,241,0.6)", 
            background:"linear-gradient(135deg, rgba(15,15,26,0.95), rgba(25,25,40,0.9))", 
            padding:0, cursor:"pointer", 
            boxShadow:"0 8px 32px rgba(0,0,0,0.5), 0 0 0 4px rgba(99,102,241,0.15)", 
            overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", 
            backdropFilter:"blur(20px)", transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)"
          }}
        >
          {user?.picture ? (
            <img 
              src={user.picture} alt={user.name||""} 
              referrerPolicy="no-referrer" crossOrigin="anonymous"
              style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}
              onError={e=>{
                e.currentTarget.onerror=null;
                e.currentTarget.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name||"User")}&background=6366f1&color=fff&bold=true&size=128`;
              }}
            />
          ) : (
            <span style={{fontFamily:"Inter, sans-serif", fontWeight:700, fontSize:16, color:"#a5b4fc", letterSpacing:"-0.02em"}}>{initials}</span>
          )}
        </button>
        <span style={{position:"absolute", bottom:2, right:2, width:12, height:12, borderRadius:"50%", 
          background:"linear-gradient(135deg, #22c55e, #4ade80)", border:"2px solid rgba(15,15,26,0.9)", 
          animation:"badgePulse 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.6s, pulseDotSoft 2s ease-in-out infinite 1s"}} />
        
        {open && (
          <>
            <div onClick={()=>setOpen(false)} style={{position:"fixed", inset:0, zIndex:-1}} />
            <div style={{
              position:"absolute", top:64, right:0, zIndex:500, 
              background:"linear-gradient(135deg, rgba(13,13,22,0.98), rgba(20,20,35,0.95))", 
              backdropFilter:"blur(32px)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:20, 
              padding:"1.5rem", minWidth:280, boxShadow:"0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1)", 
              animation:"scaleInGlow 0.3s cubic-bezier(0.34,1.56,0.64,1) both", transformOrigin:"top right"
            }}>
              <div style={{marginBottom:"1rem", paddingBottom:"1rem", borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                <p style={{fontFamily:"Inter, sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"1rem", marginBottom:4}}>{user?.name||"—"}</p>
                <p style={{fontFamily:"Inter, sans-serif", color:"#94a3b8", fontSize:"0.85rem"}}>{user?.email||"—"}</p>
                <div style={{display:"inline-flex", alignItems:"center", gap:6, marginTop:8, padding:"4px 12px", borderRadius:999, 
                  background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.4)", fontSize:"0.75rem", color:"#86efac", 
                  fontFamily:"Inter, sans-serif", fontWeight:600}}>
                  <span style={{width:6, height:6, borderRadius:"50%", background:"#22c55e", display:"inline-block", boxShadow:"0 0 8px rgba(34,197,94,0.5)"}} /> 
                  2FA Verified
                </div>
              </div>
              <button className="history-btn" onClick={()=>{setOpen(false);navigate("/history");}} 
                style={{width:"100%", padding:"0.8rem 1rem", borderRadius:14, border:"1px solid rgba(124,58,237,0.4)", 
                  background:"rgba(124,58,237,0.12)", color:"#c4b5fd", fontFamily:"Inter, sans-serif", fontWeight:600, 
                  fontSize:"0.9rem", cursor:"pointer", transition:"all 0.3s ease", marginBottom:"0.75rem", 
                  textAlign:"left", display:"flex", alignItems:"center", gap:8}}>
                📜 View Analysis History
              </button>
              <button className="logout-btn" onClick={onLogout}
                style={{width:"100%", padding:"0.8rem 1rem", borderRadius:14, border:"1px solid rgba(239,68,68,0.3)", 
                  background:"rgba(239,68,68,0.08)", color:"#fca5a5", fontFamily:"Inter, sans-serif", fontWeight:600, 
                  fontSize:"0.9rem", cursor:"pointer", transition:"all 0.3s ease", textAlign:"left", 
                  display:"flex", alignItems:"center", gap:8}}>
                🚪 Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const GuestCorner = ({ onLogin }) => (
  <div style={{position:"fixed", top:24, right:32, zIndex:400, animation:"slideDownGlow 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.3s"}}>
    <button className="signin-corner" onClick={onLogin} 
      style={{padding:"12px 28px", borderRadius:999, border:"1px solid rgba(99,102,241,0.4)", 
        background:"rgba(99,102,241,0.12)", color:"#a5b4fc", fontFamily:"Inter, sans-serif", 
        fontWeight:600, fontSize:"0.9rem", cursor:"pointer", transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)", 
        backdropFilter:"blur(20px)", letterSpacing:"-0.01em"}}>
      Sign In
    </button>
  </div>
);

const StepLabel = ({ n, title, sub }) => (
  <div style={{marginBottom:"1.2rem"}}>
    <p style={{fontFamily:"Inter, sans-serif", fontWeight:700, fontSize:"1rem", color:"#f1f5f9", display:"flex", alignItems:"center", gap:12}}>
      <span style={{display:"inline-flex", alignItems:"center", justifyContent:"center", width:32, height:32, 
        borderRadius:"50%", background:"rgba(99,102,241,0.2)", border:"2px solid rgba(99,102,241,0.5)", 
        color:"#a5b4fc", fontSize:"0.85rem", fontWeight:700, flexShrink:0, boxShadow:"0 4px 16px rgba(99,102,241,0.2)"}}>
        {n}
      </span>
      {title}
    </p>
    {sub && <p style={{margin:"6px 0 0 44px", fontSize:"0.82rem", color:"#94a3b8", fontFamily:"Inter, sans-serif", fontWeight:500}}>{sub}</p>}
  </div>
);

const SummaryCard = ({ icon, label, value, sub, accentColor, delay }) => (
  <div style={{
    padding:"1.6rem 1.4rem", borderRadius:20, background:"rgba(255,255,255,0.05)", 
    border:`1px solid ${accentColor}40`, 
    boxShadow:`0 12px 48px rgba(0,0,0,0.25), 0 0 0 1px ${accentColor}15`, 
    animation:`revealStagger 0.6s cubic-bezier(0.34,1.56,0.64,1) both ${delay}`, 
    position:"relative", overflow:"hidden", transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)"
  }}>
    <div style={{position:"absolute", top:0, left:"-10%", right:"-10%", height:2, 
      background:`linear-gradient(90deg,transparent,${accentColor}90,transparent)`, 
      animation:"shimmerGlow 4s ease-in-out infinite"}} />
    <p style={{fontSize:"1.8rem", marginBottom:"0.6rem", opacity:0.9}}>{icon}</p>
    <p style={{fontFamily:"Inter, sans-serif", fontSize:"0.7rem", color:"#94a3b8", fontWeight:700, 
      textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"0.5rem"}}>{label}</p>
    <p style={{fontFamily:"Inter, sans-serif", fontSize:"1.9rem", fontWeight:700, color:accentColor, 
      lineHeight:1.1, marginBottom:"0.4rem", letterSpacing:"-0.02em"}}>{value}</p>
    <p style={{fontFamily:"Inter, sans-serif", fontSize:"0.78rem", color:"#94a3b8", fontWeight:500}}>{sub}</p>
  </div>
);

const FeatureCard = ({ name, value, signal }) => {
  const c = SIGNAL_COLORS[signal] || SIGNAL_COLORS.Neutral;
  return (
    <div className="ca-feat" style={{
      padding:"16px 18px", borderRadius:16, background:c.bg, border:`1px solid ${c.border}`, 
      display:"flex", flexDirection:"column", gap:10, 
      transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)", position:"relative", overflow:"hidden"
    }}>
      <div style={{position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${c.border}80,transparent)`}} />
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:12}}>
        <span style={{fontFamily:"Inter, sans-serif", fontSize:"0.85rem", fontWeight:600, color:"#94a3b8", letterSpacing:"-0.01em"}}>{name}</span>
        <span style={{fontSize:"0.7rem", fontWeight:700, padding:"4px 10px", borderRadius:999, background:c.badge, 
          color:c.text, textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap", 
          fontFamily:"Inter, sans-serif", boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
          {signal}
        </span>
      </div>
      <span style={{fontFamily:"Roboto Mono, monospace", fontSize:"1.1rem", fontWeight:600, color:c.text, letterSpacing:"-0.02em"}}>{String(value)}</span>
    </div>
  );
};

const MetaCard = ({ label, value }) => (
  <div style={{padding:"1.2rem 1.4rem", borderRadius:16, background:"rgba(255,255,255,0.04)", 
    border:"1px solid rgba(255,255,255,0.1)", transition:"all 0.3s ease"}}>
    <p style={{fontFamily:"Inter, sans-serif", fontSize:"0.7rem", color:"#94a3b8", fontWeight:700, 
      textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8}}>{label}</p>
    <p style={{fontFamily:"Inter, sans-serif", fontSize:"1.25rem", fontWeight:700, color:"#f1f5f9", letterSpacing:"-0.02em"}}>{value}</p>
  </div>
);

const Card = ({ children, style={}, delay }) => (
  <div style={{
    padding:"1.8rem", borderRadius:24, background:"rgba(255,255,255,0.04)", 
    border:"1px solid rgba(255,255,255,0.1)", 
    boxShadow:"0 16px 64px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)", 
    marginBottom:"1.5rem", 
    animation:delay?`fadeUpSmooth 0.6s cubic-bezier(0.34,1.56,0.64,1) both ${delay}`:undefined, 
    backdropFilter:"blur(12px)", ...style
  }}>
    {children}
  </div>
);

export default function CodeAnalyzer() {
  const navigate = useNavigate();
  const [code, setCode]             = useState("");
  const [language, setLanguage]     = useState("");
  const [file, setFile]             = useState(null);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [activeTab, setActiveTab]   = useState("paste");
  const [isVerified, setIsVerified] = useState(false);
  const [user, setUser]             = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const BASE_URL = "http://localhost:8000";

  useEffect(() => {
    injectStyles();
    document.body.style.margin = "0";
    document.body.style.background = "linear-gradient(135deg, #0a0a15 0%, #0f0f1a 50%, #1a1a2e 100%)";
    
    const checkAuth = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/check-auth/`, { method:"GET", credentials:"include" });
        if (!res.ok) { clearAuthState(); return; }
        const data = await res.json();
        if (data.code_access === true) {
          setIsVerified(true);
          if (data.name || data.email) setUser({ name:data.name||null, email:data.email||null, picture:data.picture||null });
          else { try { const s=localStorage.getItem("user_profile"); if(s) setUser(JSON.parse(s)); } catch {} }
        } else clearAuthState();
      } catch { clearAuthState(); }
      finally { setAuthLoading(false); }
    };
    checkAuth();
  }, []);

  const clearAuthState = () => {
    setIsVerified(false); setUser(null);
    localStorage.removeItem("verified"); localStorage.removeItem("user_profile");
  };

  const handleLogout = async () => {
    try { await fetch(`${BASE_URL}/api/logout/`, { method:"POST", credentials:"include" }); } catch {}
    clearAuthState();
  };

  const handleReset = () => {
    setCode("");
    setLanguage("");
    setFile(null);
    setResult(null);
    setError("");
    setActiveTab("paste");
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (![".txt",".pdf",".docx"].some(ext => f.name.toLowerCase().endsWith(ext)))
      return setError("Only TXT, PDF, and DOCX files are allowed.");
    setFile(f); setError("");
  };

  const analyzeCode = async () => {
    setError(""); setResult(null);
    if (!language) return setError("Please select a programming language.");
    if (activeTab === "paste" && !code.trim()) return setError("Please paste your code before analyzing.");
    if (activeTab === "upload" && !file) return setError("Please upload a file before analyzing.");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("language", language);
      activeTab === "upload" ? fd.append("file", file) : fd.append("code", code);

      const res = await API.post("/code-analyze/", fd, {
        withCredentials: true,
        timeout: 60000
      });

      if (res.data.language_mismatch) {
        setError(`Language Mismatch: You selected ${language.toUpperCase()} but the code looks like ${res.data.detected_language?.toUpperCase()}.`);
      }
      setResult(res.data);

    } catch (err) {
      if (err.code === "ECONNABORTED") {
        setError("⏱️ Request timed out. Please check your server is running.");
      } else {
        setError(err.response?.data?.error || "Server error during code analysis.");
      }
    } finally {
      setLoading(false);
    }
  };

  const aiPct    = result?.ai_probability    ?? 0;
  const humanPct = result?.human_probability ?? 0;

  const verdictColor = result?.label?.includes("AI")    ? "#f87171"
                     : result?.label?.includes("Human") ? "#4ade80"
                     : "#a5b4fc";

  return (
    <div style={{
      height:"100vh", background:"linear-gradient(135deg, #0a0a15 0%, #0f0f1a 50%, #1a1a2e 100%)", 
      fontFamily:"Inter, sans-serif", position:"relative", overflow:"hidden", display:"flex", flexDirection:"column"
    }}>
      <Orbs />

      {!authLoading && (isVerified && user
        ? <ProfileCorner user={user} onLogout={handleLogout} navigate={navigate} />
        : <GuestCorner onLogin={()=>navigate("/login")} />
      )}

      {/* ── TOP BAR ── */}
      <div style={{
        display:"flex", alignItems:"center", gap:20,
        padding:"16px 32px",
        borderBottom:"1px solid rgba(255,255,255,0.08)",
        flexShrink:0, position:"relative", zIndex:10,
        animation:"fadeUpSmooth 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
        backdropFilter:"blur(12px)"
      }}>
        <button className="ca-back" onClick={()=>navigate(-1)} style={{
          display:"inline-flex", alignItems:"center", gap:8, padding:"10px 20px",
          borderRadius:999, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.4)",
          color:"#f87171", fontWeight:600, cursor:"pointer", flexShrink:0,
          fontFamily:"Inter, sans-serif", fontSize:"0.9rem", transition:"all 0.25s ease"
        }}>
          ← Back
        </button>
        <span style={{fontSize:"1.3rem"}}>💻</span>
        <span style={{fontWeight:700, fontSize:"1.2rem", color:"#f1f5f9"}}>AI Code Analyzer</span>
        <button className="ca-cmp" onClick={()=>navigate("/compare-code")} style={{
          padding:"10px 20px", borderRadius:14,
          background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.4)",
          color:"#a5b4fc", fontWeight:700, cursor:"pointer", transition:"all 0.3s ease",
          fontFamily:"Inter, sans-serif", fontSize:"0.9rem", flexShrink:0
        }}>
          🔀 Compare Multiple Languages
        </button>

        {/* New Session — marginLeft:auto pushes it left of the avatar spacer */}
        {(result || error) && (
          <button
            onClick={handleReset}
            disabled={loading}
            style={{
              marginLeft:"auto",
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"8px 18px", borderRadius:999,
              background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.4)",
              color:"#a5b4fc", fontWeight:600, cursor:loading ? "not-allowed" : "pointer",
              fontFamily:"Inter, sans-serif", fontSize:"0.85rem",
              opacity:loading ? 0.6 : 1,
              transition:"all 0.25s ease"
            }}
          >
            🔄 New Session
          </button>
        )}

        {/* Fixed-width spacer so button never slides under the profile avatar (52px + 28px right + 8px gap) */}
        <div style={{width:88, flexShrink:0}} />
      </div>

      {/* Main Content */}
      <div style={{flex:1, overflow:"hidden", display:"flex", position:"relative", zIndex:5}}>

        {/* LEFT PANEL */}
        <div style={{width:"50%", borderRight:"1px solid rgba(255,255,255,0.08)", display:"flex", 
          flexDirection:"column", overflow:"hidden", backdropFilter:"blur(8px)"}}>
          <div style={{flex:1, overflowY:"auto", padding:"32px 40px 20px", 
            scrollbarWidth:"thin", scrollbarColor:"rgba(99,102,241,0.3) transparent"}}>

            <Card delay="0.1s" style={{marginBottom:"16px", borderRadius:28}}>
              <StepLabel n="1" title="Select Programming Language" sub="Choose the language your code is written in." />
              <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12}}>
                {Object.entries(LANG_CFG).map(([key, cfg]) => {
                  const active = language === key;
                  return (
                    <button key={key} className={cfg.cls} onClick={() => setLanguage(key)} style={{
                      padding:"12px 8px", borderRadius:14, cursor:"pointer",
                      fontFamily:"Inter, sans-serif", fontWeight:700, fontSize:"0.85rem", letterSpacing:"-0.01em",
                      background: active ? cfg.abg : cfg.ibg,
                      border: `2px solid ${active ? cfg.ab : cfg.ib}`,
                      color: active ? cfg.at : cfg.it,
                      transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                      boxShadow: active ? `0 8px 24px ${cfg.ib}80, 0 0 0 3px ${cfg.ab}40` : "0 4px 12px rgba(0,0,0,0.2)",
                      position:"relative", overflow:"hidden",
                      transform: active ? "translateY(-2px) scale(1.05)" : "none",
                      outline: active ? `2px solid ${cfg.ab}` : "none",
                      outlineOffset: "2px",
                    }}>
                      {active && (
                        <span style={{position:"absolute", top:0, left:0, right:0, height:"2px",
                          background:`linear-gradient(90deg, transparent, ${cfg.at}, transparent)`,
                          borderRadius:"999px 999px 0 0"}} />
                      )}
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card delay="0.2s" style={{marginBottom:"16px", borderRadius:28}}>
              <StepLabel n="2" title="Provide Your Code" sub="Paste code directly or upload a file (PDF, DOCX, TXT)." />
              <div style={{display:"flex", background:"rgba(255,255,255,0.06)", borderRadius:16, padding:4, 
                marginBottom:"1.5rem", boxShadow:"0 4px 16px rgba(0,0,0,0.2)"}}>
                {[["paste","✏️ Paste Code"],["upload","📁 Upload File"]].map(([tab,label])=>(
                  <button key={tab} className="ca-tab" onClick={()=>setActiveTab(tab)} style={{
                    flex:1, padding:"12px", fontSize:"0.9rem", fontWeight:700, border:"none", cursor:"pointer",
                    borderRadius:12, background: activeTab===tab ? "rgba(99,102,241,0.25)" : "transparent",
                    color: activeTab===tab ? "#a5b4fc" : "#94a3b8", fontFamily:"Inter, sans-serif",
                    letterSpacing:"-0.01em", transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                    boxShadow: activeTab===tab ? "0 4px 20px rgba(99,102,241,0.3)" : "none"
                  }}>
                    {label}
                  </button>
                ))}
              </div>

              {activeTab==="paste" && (
                <textarea className="ca-textarea" rows={12} value={code} onChange={e=>setCode(e.target.value)}
                  placeholder="// Paste your code here...&#10;&#10;function example() {&#10;  console.log('Hello World!');&#10;}"
                  style={{width:"100%", padding:"1.4rem", fontFamily:"Roboto Mono, monospace", fontSize:"0.85rem", 
                    borderRadius:20, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(15,15,26,0.8)", 
                    resize:"none", boxSizing:"border-box", lineHeight:1.7, color:"#e2e8f0", outline:"none", 
                    transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)", boxShadow:"0 8px 32px rgba(0,0,0,0.3)", fontWeight:500}} 
                />
              )}

              {activeTab==="upload" && (!file ? (
                <label className="upload-zone" style={{display:"flex", flexDirection:"column", alignItems:"center", 
                  justifyContent:"center", border:"2px dashed rgba(99,102,241,0.4)", borderRadius:24, 
                  padding:"3.5rem 2rem", cursor:"pointer", background:"rgba(99,102,241,0.06)", 
                  transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)", boxShadow:"0 8px 32px rgba(0,0,0,0.3)"}}>
                  <span style={{fontSize:"3rem", marginBottom:"1rem", animation:"floatGentle 4s ease-in-out infinite"}}>📁</span>
                  <p style={{fontFamily:"Inter, sans-serif", fontWeight:700, color:"#94a3b8", marginBottom:"0.4rem", fontSize:"1rem", letterSpacing:"-0.01em"}}>Drop your code file here</p>
                  <p style={{fontSize:"0.82rem", color:"#64748b", fontWeight:500}}>PDF · DOCX · TXT supported (Max 5MB)</p>
                  <input type="file" accept=".txt,.pdf,.docx" onChange={handleFileChange} style={{display:"none"}} />
                </label>
              ) : (
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", 
                  padding:"1.4rem 1.6rem", border:"1px solid rgba(34,197,94,0.4)", borderRadius:20, 
                  background:"rgba(34,197,94,0.1)", boxShadow:"0 8px 32px rgba(34,197,94,0.2)", animation:"scaleInGlow 0.4s ease both"}}>
                  <div style={{display:"flex", alignItems:"center", gap:14}}>
                    <span style={{fontSize:"1.8rem"}}>📄</span>
                    <div>
                      <p style={{fontFamily:"Inter, sans-serif", fontWeight:700, color:"#86efac", margin:0, fontSize:"0.95rem", letterSpacing:"-0.01em"}}>{file.name}</p>
                      <p style={{fontSize:"0.78rem", color:"#94a3b8", margin:"3px 0 0", fontWeight:500}}>{(file.size/1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button onClick={()=>setFile(null)} style={{background:"none", border:"none", fontSize:"1.2rem", cursor:"pointer", 
                    color:"#fca5a5", padding:"6px 10px", borderRadius:10, transition:"all 0.2s ease", backdropFilter:"blur(8px)"}}>
                    ✕
                  </button>
                </div>
              ))}
            </Card>
          </div>

          {/* Analyze Button */}
          <div style={{padding:"24px 40px 32px", borderTop:"1px solid rgba(255,255,255,0.1)", 
            background:"rgba(15,15,26,0.9)", backdropFilter:"blur(16px)", flexShrink:0}}>
            {error && (
              <div style={{marginBottom:"16px", padding:"1rem 1.4rem", borderRadius:16, 
                background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.4)", 
                color:"#fca5a5", fontFamily:"Inter, sans-serif", fontWeight:600, fontSize:"0.9rem", 
                display:"flex", alignItems:"center", gap:12, 
                animation:"fadeUpSmooth 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
                boxShadow:"0 8px 32px rgba(239,68,68,0.2)"}}>
                ⚠️ {error}
              </div>
            )}
            <button className="ca-analyze" onClick={analyzeCode} disabled={loading} style={{
              width:"100%", padding:"18px", fontSize:"1.05rem",
              background: loading ? "rgba(99,102,241,0.25)" : "linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #7c3aed 100%)",
              color: loading ? "#94a3b8" : "#ffffff", 
              border: loading ? "1px solid rgba(99,102,241,0.4)" : "none", 
              borderRadius:20, cursor: loading ? "not-allowed" : "pointer", 
              fontFamily:"Inter, sans-serif", fontWeight:700, letterSpacing:"-0.01em",
              boxShadow: loading ? "0 8px 24px rgba(99,102,241,0.2)" : "0 16px 64px rgba(99,102,241,0.5)",
              display:"flex", alignItems:"center", justifyContent:"center", gap:12, 
              transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)", position:"relative", overflow:"hidden"
            }}>
              {loading ? (
                <>
                  <span style={{width:20, height:20, borderRadius:"50%", border:"3px solid rgba(255,255,255,0.2)", 
                    borderTopColor:"rgba(255,255,255,0.9)", animation:"spinSmooth 0.8s linear infinite", display:"inline-block"}} />
                  Analyzing your code...
                </>
              ) : "🔍 Analyze Code Now"}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL - Results */}
        <div style={{width:"50%", overflowY:"auto", padding:"32px 40px 32px", height:"100%",flexDirection:"column", overflow:"hidden",
          scrollbarWidth:"thin", scrollbarColor:"rgba(99,102,241,0.3) transparent",
          background:"rgba(0,0,0,0.1)", backdropFilter:"blur(8px)"}}>

          {!result && !loading && (
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", 
              height:"100%", padding:"3rem", textAlign:"center", opacity:0.6}}>
              <span style={{fontSize:"5rem", marginBottom:"1.5rem"}}>🔍</span>
              <p style={{fontFamily:"Inter, sans-serif", fontWeight:700, color:"#94a3b8", fontSize:"1.2rem", marginBottom:"0.5rem"}}>Ready to Analyze</p>
              <p style={{fontFamily:"Inter, sans-serif", color:"#64748b", fontSize:"0.9rem", maxWidth:300, lineHeight:1.6}}>
                Select a language, paste your code or upload a file, then click Analyze to see AI detection results.
              </p>
            </div>
          )}

          {loading && (
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", 
              height:"100%", gap:20, animation:"fadeInSmooth 0.4s ease both"}}>
              <div style={{width:64, height:64, borderRadius:"50%", border:"4px solid rgba(99,102,241,0.2)", 
                borderTopColor:"#6366f1", animation:"spinSmooth 1s linear infinite"}} />
              <p style={{fontFamily:"Inter, sans-serif", fontWeight:700, color:"#94a3b8", fontSize:"1.1rem"}}>Analyzing your code…</p>
              <p style={{fontFamily:"Inter, sans-serif", color:"#64748b", fontSize:"0.85rem"}}>Processing 20+ AI detection signals</p>
            </div>
          )}

          {result && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              height: "100%"
            }}>

              {/* SCROLL AREA */}
              <div style={{
                flex: 1,
                overflowY: "auto"
              }}>

              <div style={{display:"flex", alignItems:"center", gap:16, marginBottom:"2rem", position:"relative"}}>
                <div style={{flex:1, height:2, background:"linear-gradient(90deg, rgba(99,102,241,0.5), transparent)"}} />
                <span style={{fontFamily:"Inter, sans-serif", fontSize:"0.75rem", fontWeight:700, color:"#94a3b8", 
                  letterSpacing:"0.15em", textTransform:"uppercase", background:"rgba(15,15,26,0.8)", 
                  padding:"8px 20px", borderRadius:999, backdropFilter:"blur(12px)", border:"1px solid rgba(99,102,241,0.2)"}}>
                  Analysis Complete
                </span>
                <div style={{flex:1, height:2, background:"linear-gradient(90deg, transparent, rgba(99,102,241,0.5))"}} />
              </div>

              {result.low_line_warning && (
                <div style={{padding:"1rem 1.4rem", borderRadius:16, marginBottom:"1.5rem",
                  background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.4)",
                  color:"#fcd34d", fontFamily:"Inter, sans-serif", fontWeight:600, fontSize:"0.88rem",
                  animation:"fadeUpSmooth 0.4s ease both"}}>
                  ⚠️ {result.low_line_warning}
                </div>
              )}

              <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px", marginBottom:"2rem"}}>
                <SummaryCard icon="🧠" label="VERDICT" value={result.label}
                  sub={`Confidence: ${result.confidence}`}
                  accentColor={verdictColor} delay="0.05s" />
                <SummaryCard icon="🤖" label="AI PROBABILITY" value={`${aiPct}%`}
                  sub={aiPct>=65?"Strong AI patterns detected":aiPct>=45?"Mixed AI signals":"Low AI likelihood"}
                  accentColor={aiPct>=65?"#f87171":aiPct>=45?"#fbbf24":"#4ade80"} delay="0.15s" />
                <SummaryCard icon="🙋" label="HUMAN PROBABILITY" value={`${humanPct}%`}
                  sub={humanPct>=65?"Strong human patterns":humanPct>=45?"Mixed human traits":"Low human likelihood"}
                  accentColor={humanPct>=65?"#4ade80":humanPct>=45?"#fbbf24":"#f87171"} delay="0.25s" />
              </div>

              <Card style={{animation:"revealStagger 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.3s", marginBottom:"2rem"}}>
                <p style={{fontFamily:"Inter, sans-serif", fontWeight:700, color:"#f1f5f9", marginBottom:"1.5rem", fontSize:"1rem", letterSpacing:"-0.01em"}}>
                  📊 Probability Distribution
                </p>
                <div style={{height:28, borderRadius:999, overflow:"hidden", display:"flex", 
                  background:"rgba(255,255,255,0.06)", marginBottom:"1.5rem",
                  boxShadow:"0 4px 16px rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.1)"}}>
                  <div style={{width:`${aiPct}%`, borderRadius: humanPct===0 ? 999 : "999px 0 0 999px",
                    background:"linear-gradient(90deg, #ef4444 0%, #f97316 50%, #fb923c 100%)",
                    transition:"width 1.5s cubic-bezier(0.34,1.56,0.64,1)", position:"relative", display:"flex", alignItems:"center"}}>
                    {aiPct>15 && <span style={{position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", 
                      fontFamily:"Inter, sans-serif", fontSize:"0.75rem", fontWeight:700, 
                      color:"rgba(255,255,255,0.95)", textShadow:"0 1px 2px rgba(0,0,0,0.5)"}}>{aiPct}%</span>}
                  </div>
                  <div style={{width:`${humanPct}%`, borderRadius: aiPct===0 ? 999 : "0 999px 999px 0",
                    background:"linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #15803d 100%)",
                    transition:"width 1.5s cubic-bezier(0.34,1.56,0.64,1)", position:"relative", display:"flex", alignItems:"center"}}>
                    {humanPct>15 && <span style={{position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", 
                      fontFamily:"Inter, sans-serif", fontSize:"0.75rem", fontWeight:700, 
                      color:"rgba(255,255,255,0.95)", textShadow:"0 1px 2px rgba(0,0,0,0.5)"}}>{humanPct}%</span>}
                  </div>
                </div>
                {[
                  {label:"🤖 AI Generated",  pct:aiPct,    dot:"#ef4444", val:"#f87171", grad:"linear-gradient(90deg, #ef4444, #f97316)"},
                  {label:"🙋 Human Written", pct:humanPct, dot:"#22c55e", val:"#4ade80", grad:"linear-gradient(90deg, #22c55e, #16a34a)"}
                ].map((item, i) => (
                  <div key={item.label} style={{marginBottom:"1rem", animation:`revealStagger 0.6s ease both ${0.4 + i*0.1}s`}}>
                    <div style={{display:"flex", justifyContent:"space-between", marginBottom:8, alignItems:"center"}}>
                      <span style={{fontFamily:"Inter, sans-serif", fontSize:"0.9rem", color:"#94a3b8", 
                        fontWeight:600, display:"flex", alignItems:"center", gap:8, letterSpacing:"-0.01em"}}>
                        <span style={{width:10, height:10, borderRadius:"50%", background:item.dot, 
                          display:"inline-block", boxShadow:"0 0 12px rgba(0,0,0,0.3)"}} /> 
                        {item.label}
                      </span>
                      <span style={{fontFamily:"Inter, sans-serif", fontSize:"1rem", fontWeight:700, color:item.val, letterSpacing:"-0.02em"}}>
                        {item.pct}%
                      </span>
                    </div>
                    <div style={{height:8, borderRadius:999, background:"rgba(255,255,255,0.08)", overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
                      <div style={{height:"100%", borderRadius:999, width:`${item.pct}%`, background:item.grad, 
                        transition:"width 1.8s cubic-bezier(0.34,1.56,0.64,1)", boxShadow:"0 0 16px rgba(0,0,0,0.3)"}} />
                    </div>
                  </div>
                ))}
              </Card>

              {result.language_mismatch && (
                <div style={{padding:"1.2rem 1.6rem", borderRadius:20, background:"rgba(251,191,36,0.15)", 
                  border:"1px solid rgba(251,191,36,0.4)", color:"#fcd34d", fontFamily:"Inter, sans-serif", 
                  fontWeight:600, fontSize:"0.9rem", marginBottom:"2rem", animation:"fadeUpSmooth 0.4s ease both",
                  boxShadow:"0 8px 32px rgba(251,191,36,0.2)"}}>
                  ⚠️ <strong>Language Warning:</strong> You selected <strong>{language.toUpperCase()}</strong> but detected <strong>{result.detected_language?.toUpperCase()}</strong>. Consider reselecting.
                </div>
              )}

              <Card style={{animation:"revealStagger 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.35s", marginBottom:"2rem"}}>
                <p style={{fontFamily:"Inter, sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"1rem", marginBottom:"1.5rem", letterSpacing:"-0.01em"}}>
                  📋 Code Statistics
                </p>
                <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16}}>
                  <MetaCard label="LINES OF CODE"  value={result.lines_of_code ?? "—"} />
                  <MetaCard label="DETECTED LANG"  value={result.detected_language?.toUpperCase() ?? "—"} />
                  <MetaCard label="SELECTED LANG"  value={language.toUpperCase()} />
                </div>
              </Card>

              {result.feature_breakdown && Object.keys(result.feature_breakdown).length > 0 && (
                <Card style={{animation:"revealStagger 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.4s"}}>
                  <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", 
                    gap:16, marginBottom:"2rem", paddingBottom:"1.5rem", borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                    <p style={{fontFamily:"Inter, sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"1rem"}}>
                      🔬 Feature Analysis Breakdown
                      <span style={{marginLeft:16, padding:"6px 14px", borderRadius:999, fontSize:"0.8rem", 
                        background:"rgba(99,102,241,0.2)", border:"1px solid rgba(99,102,241,0.5)", 
                        color:"#a5b4fc", fontWeight:600, letterSpacing:"0.05em"}}>
                        {Object.keys(result.feature_breakdown).length} signals analyzed
                      </span>
                    </p>
                    <div style={{display:"flex", gap:16, flexWrap:"wrap"}}>
                      {Object.entries(SIGNAL_COLORS).map(([key,c])=>(
                        <div key={key} style={{display:"flex", alignItems:"center", gap:6}}>
                          <span style={{width:10, height:10, borderRadius:"50%", background:c.dot, 
                            display:"inline-block", boxShadow:"0 0 8px rgba(0,0,0,0.4)"}} />
                          <span style={{fontFamily:"Inter, sans-serif", fontSize:"0.82rem", color:"#94a3b8", 
                            fontWeight:600, letterSpacing:"-0.01em"}}>{key}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16}}>
                    {Object.entries(result.feature_breakdown).map(([name, data]) => (
                      <FeatureCard
                        key={name}
                        name={name.replace(/_/g, " ").toUpperCase()}
                        value={data.value}
                        signal={data.signal}
                      />
                    ))}
                  </div>
                </Card>
              )}
              </div>
              <div style={{ marginTop: "12px" }}>
                <DownloadPDFButton 
                  aiResult={result} 
                  fileName={file?.name} 
                  activeTab={activeTab}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}