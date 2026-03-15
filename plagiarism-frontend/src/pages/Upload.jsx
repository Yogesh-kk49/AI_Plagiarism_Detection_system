import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

const injectStyles = () => {
  if (document.getElementById("upload-styles")) return;
  const tag = document.createElement("style");
  tag.id = "upload-styles";
  tag.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @keyframes fadeUpSmooth  { from{opacity:0;transform:translateY(24px);}  to{opacity:1;transform:translateY(0);} }
    @keyframes fadeInSmooth  { from{opacity:0;} to{opacity:1;} }
    @keyframes scaleInGlow   { from{opacity:0;transform:scale(0.95);} to{opacity:1;transform:scale(1);} }
    @keyframes slideDownGlow { from{opacity:0;transform:translateY(-16px);} to{opacity:1;transform:translateY(0);} }
    @keyframes spinSmooth    { to{transform:rotate(360deg);} }
    @keyframes orbFloat1     { 0%,100%{transform:translate(0,0) scale(1);} 40%{transform:translate(45px,-35px) scale(1.05);} 70%{transform:translate(-20px,20px) scale(0.95);} }
    @keyframes orbFloat2     { 0%,100%{transform:translate(0,0) scale(1);} 35%{transform:translate(-45px,25px) scale(1.05);} 70%{transform:translate(25px,-40px) scale(0.95);} }
    @keyframes floatGentle   { 0%,100%{transform:translateY(0px);} 50%{transform:translateY(-8px);} }
    @keyframes badgePulse    { 0%{transform:scale(0);} 50%{transform:scale(1.2);} 100%{transform:scale(1);} }
    @keyframes revealStagger { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
    @keyframes shimmerGlow   { 0%{opacity:0.3;transform:scaleX(0.7);} 50%{opacity:1;transform:scaleX(1.05);} 100%{opacity:0.3;transform:scaleX(0.7);} }
    @keyframes pulseDotSoft  { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(0.8);} }
    @keyframes shake         { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-10px);} 75%{transform:translateX(10px);} }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #0a0a15 !important;
      min-height: 100vh;
      overflow-x: hidden;
    }
    #root { background: #0a0a15; min-height: 100vh; }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(20,184,166,0.3); border-radius: 99px; }

    .up-back:hover {
      background: rgba(239,68,68,0.18) !important;
      border-color: rgba(239,68,68,0.6) !important;
      color: #fecaca !important;
      transform: translateX(-2px);
    }
    .up-tab:hover { background: rgba(255,255,255,0.12) !important; transform: translateY(-1px); }
    .up-analyze:hover:not(:disabled) {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 20px 48px rgba(20,184,166,0.55) !important;
      background: linear-gradient(135deg, #059669, #14b8a6) !important;
    }
    .up-analyze:active:not(:disabled) { transform: translateY(-2px) scale(1.01); }
    .profile-avatar-up { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
    .profile-avatar-up:hover { transform: scale(1.12) rotate(5deg); box-shadow: 0 12px 40px rgba(20,184,166,0.4); }
    .logout-btn-up:hover { background: rgba(239,68,68,0.2) !important; color: #fca5a5 !important; border-color: rgba(239,68,68,0.5) !important; transform: translateX(-2px); }
    .history-btn-up:hover { background: rgba(124,58,237,0.25) !important; color: #c4b5fd !important; transform: translateX(-2px); }
    .signin-corner-up:hover { background: rgba(20,184,166,0.25) !important; border-color: rgba(20,184,166,0.7) !important; transform: scale(1.05); }
    .up-textarea:focus { border-color: rgba(20,184,166,0.7) !important; box-shadow: 0 0 0 4px rgba(20,184,166,0.12) !important; outline: none; }
    .upload-zone-up:hover { border-color: rgba(20,184,166,0.6) !important; background: rgba(20,184,166,0.08) !important; transform: scale(1.02); }
    .compare-btn-up:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 16px 48px rgba(99,102,241,0.5) !important; }
    .feat-card-up:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 10px 28px rgba(0,0,0,0.3); }
  `;
  document.head.appendChild(tag);
};

const forceBg = () => {
  document.documentElement.style.background = "#0a0a15";
  document.body.style.background = "#0a0a15";
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  if (!document.getElementById("bg-fix-style")) {
    const s = document.createElement("style");
    s.id = "bg-fix-style";
    s.textContent = `html, body { background: #0a0a15 !important; margin: 0 !important; }`;
    document.head.insertBefore(s, document.head.firstChild);
  }
};

// ── Teal/Cyan palette for results (distinct from CodeAnalyzer's indigo) ──
const TEAL = {
  accent: "#14b8a6",
  accentLight: "#5eead4",
  accentBg: "rgba(20,184,166,0.08)",
  accentBorder: "rgba(20,184,166,0.25)",
  accentGrad: "linear-gradient(90deg,#0d9488,#14b8a6,#06b6d4)",
};

const Orbs = () => (
  <>
    <div style={{
      position:"fixed", top:"8%", left:"1%", width:560, height:560, borderRadius:"50%",
      background:"radial-gradient(circle at 30% 30%, rgba(20,184,166,0.16) 0%, rgba(20,184,166,0.05) 35%, transparent 70%)",
      animation:"orbFloat1 18s ease-in-out infinite", pointerEvents:"none", zIndex:0
    }} />
    <div style={{
      position:"fixed", bottom:"5%", right:"2%", width:640, height:640, borderRadius:"50%",
      background:"radial-gradient(circle at 70% 20%, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.04) 35%, transparent 70%)",
      animation:"orbFloat2 22s ease-in-out infinite reverse", pointerEvents:"none", zIndex:0
    }} />
  </>
);

const ProfileCorner = ({ user, onLogout, navigate }) => {
  const [open, setOpen] = useState(false);
  const initials = user?.name ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  return (
    <div style={{ position:"fixed", top:20, right:28, zIndex:400, animation:"slideDownGlow 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.3s" }}>
      <div style={{ position:"relative" }}>
        <button className="profile-avatar-up" onClick={() => setOpen(o => !o)} style={{
          width:52, height:52, borderRadius:"50%", border:"2px solid rgba(20,184,166,0.6)",
          background:"linear-gradient(135deg, rgba(15,15,26,0.95), rgba(25,25,40,0.9))",
          padding:0, cursor:"pointer",
          boxShadow:"0 8px 32px rgba(0,0,0,0.5), 0 0 0 4px rgba(20,184,166,0.15)",
          overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center",
          backdropFilter:"blur(20px)", transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)"
        }}>
          {user?.picture ? (
            <img src={user.picture} alt={user.name || ""} referrerPolicy="no-referrer" crossOrigin="anonymous"
              style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }}
              onError={e => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=14b8a6&color=fff&bold=true&size=128`;
              }} />
          ) : (
            <span style={{ fontFamily:"Inter, sans-serif", fontWeight:700, fontSize:16, color:"#5eead4", letterSpacing:"-0.02em" }}>{initials}</span>
          )}
        </button>
        <span style={{
          position:"absolute", bottom:2, right:2, width:12, height:12, borderRadius:"50%",
          background:"linear-gradient(135deg, #22c55e, #4ade80)", border:"2px solid rgba(15,15,26,0.9)",
          animation:"badgePulse 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.6s, pulseDotSoft 2s ease-in-out infinite 1s"
        }} />
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position:"fixed", inset:0, zIndex:-1 }} />
            <div style={{
              position:"absolute", top:64, right:0, zIndex:500,
              background:"linear-gradient(135deg, rgba(13,13,22,0.98), rgba(20,20,35,0.95))",
              backdropFilter:"blur(32px)", border:"1px solid rgba(20,184,166,0.3)", borderRadius:20,
              padding:"1.5rem", minWidth:280, boxShadow:"0 32px 80px rgba(0,0,0,0.7)",
              animation:"scaleInGlow 0.3s cubic-bezier(0.34,1.56,0.64,1) both", transformOrigin:"top right"
            }}>
              <div style={{ marginBottom:"1rem", paddingBottom:"1rem", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontFamily:"Inter, sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"1rem", marginBottom:4 }}>{user?.name || "—"}</p>
                <p style={{ fontFamily:"Inter, sans-serif", color:"#94a3b8", fontSize:"0.85rem" }}>{user?.email || "—"}</p>
                <div style={{
                  display:"inline-flex", alignItems:"center", gap:6, marginTop:8, padding:"4px 12px",
                  borderRadius:999, background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.4)",
                  fontSize:"0.75rem", color:"#86efac", fontFamily:"Inter, sans-serif", fontWeight:600
                }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", display:"inline-block" }} />
                  2FA Verified
                </div>
              </div>
              <button className="history-btn-up" onClick={() => { setOpen(false); navigate("/history"); }} style={{
                width:"100%", padding:"0.8rem 1rem", borderRadius:14, border:"1px solid rgba(124,58,237,0.4)",
                background:"rgba(124,58,237,0.12)", color:"#c4b5fd", fontFamily:"Inter, sans-serif", fontWeight:600,
                fontSize:"0.9rem", cursor:"pointer", transition:"all 0.3s ease", marginBottom:"0.75rem",
                textAlign:"left", display:"flex", alignItems:"center", gap:8
              }}>📜 View Analysis History</button>
              <button className="logout-btn-up" onClick={onLogout} style={{
                width:"100%", padding:"0.8rem 1rem", borderRadius:14, border:"1px solid rgba(239,68,68,0.3)",
                background:"rgba(239,68,68,0.08)", color:"#fca5a5", fontFamily:"Inter, sans-serif", fontWeight:600,
                fontSize:"0.9rem", cursor:"pointer", transition:"all 0.3s ease",
                textAlign:"left", display:"flex", alignItems:"center", gap:8
              }}>🚪 Sign Out</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const GuestCorner = ({ onLogin }) => (
  <div style={{ position:"fixed", top:24, right:32, zIndex:400, animation:"slideDownGlow 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.3s" }}>
    <button className="signin-corner-up" onClick={onLogin} style={{
      padding:"12px 28px", borderRadius:999, border:"1px solid rgba(20,184,166,0.4)",
      background:"rgba(20,184,166,0.12)", color:"#5eead4", fontFamily:"Inter, sans-serif",
      fontWeight:600, fontSize:"0.9rem", cursor:"pointer",
      transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)", backdropFilter:"blur(20px)"
    }}>Sign In</button>
  </div>
);

// Result card wrapper
const RCard = ({ children, style = {}, delay }) => (
  <div style={{
    padding:"1.4rem", borderRadius:18,
    background:TEAL.accentBg,
    border:`1px solid ${TEAL.accentBorder}`,
    boxShadow:"0 10px 36px rgba(0,0,0,0.22), 0 0 0 1px rgba(20,184,166,0.04)",
    marginBottom:"1.1rem",
    animation: delay ? `revealStagger 0.6s cubic-bezier(0.34,1.56,0.64,1) both ${delay}` : undefined,
    backdropFilter:"blur(10px)", ...style
  }}>{children}</div>
);

const SummaryCard = ({ icon, label, value, sub, accent, delay }) => (
  <div style={{
    padding:"1.2rem 1rem", borderRadius:16,
    background:`rgba(20,184,166,0.05)`,
    border:`1px solid ${accent}30`,
    boxShadow:`0 8px 28px rgba(0,0,0,0.18), 0 0 0 1px ${accent}08`,
    animation:`revealStagger 0.6s cubic-bezier(0.34,1.56,0.64,1) both ${delay}`,
    position:"relative", overflow:"hidden", flex:1
  }}>
    <div style={{
      position:"absolute", top:0, left:"-10%", right:"-10%", height:2,
      background:`linear-gradient(90deg,transparent,${accent}70,transparent)`,
      animation:"shimmerGlow 4s ease-in-out infinite"
    }} />
    <p style={{ fontSize:"1.4rem", marginBottom:"0.45rem" }}>{icon}</p>
    <p style={{ fontFamily:"Inter, sans-serif", fontSize:"0.63rem", color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"0.35rem" }}>{label}</p>
    <p style={{ fontFamily:"Inter, sans-serif", fontSize:"1.4rem", fontWeight:700, color:accent, lineHeight:1.1, marginBottom:"0.3rem", letterSpacing:"-0.02em" }}>{value}</p>
    <p style={{ fontFamily:"Inter, sans-serif", fontSize:"0.7rem", color:"#64748b", fontWeight:500 }}>{sub}</p>
  </div>
);

const BreakdownRow = ({ label, value }) => (
  <div style={{
    display:"flex", justifyContent:"space-between", alignItems:"center",
    padding:"9px 13px", background:"rgba(20,184,166,0.04)",
    borderRadius:10, border:"1px solid rgba(20,184,166,0.1)", marginBottom:7
  }}>
    <span style={{ fontFamily:"Inter, sans-serif", fontWeight:600, color:"#94a3b8", fontSize:"0.83rem" }}>{label}</span>
    <span style={{ fontFamily:"Roboto Mono, monospace", fontWeight:700, color:"#5eead4", fontSize:"0.88rem" }}>
      {typeof value === "number" ? value.toFixed(1) : value}
    </span>
  </div>
);

const MiniBar = ({ pct, grad }) => (
  <div style={{ height:5, borderRadius:999, background:"rgba(255,255,255,0.07)", overflow:"hidden", marginTop:6 }}>
    <div style={{ height:"100%", borderRadius:999, width:`${Math.min(pct, 100)}%`, background:grad, transition:"width 1.4s cubic-bezier(0.34,1.56,0.64,1)" }} />
  </div>
);

const StepNum = ({ n }) => (
  <span style={{
    display:"inline-flex", alignItems:"center", justifyContent:"center",
    width:26, height:26, borderRadius:"50%",
    background:"rgba(20,184,166,0.18)", border:"2px solid rgba(20,184,166,0.5)",
    color:"#5eead4", fontSize:"0.76rem", fontWeight:700, marginRight:10, flexShrink:0
  }}>{n}</span>
);

// ── Code Detection Warning Banner ──
const CodeWarningBanner = ({ message }) => (
  <div style={{
    padding:"1.1rem 1.4rem", borderRadius:16,
    background:"rgba(251,191,36,0.10)",
    border:"1px solid rgba(251,191,36,0.45)",
    display:"flex", alignItems:"flex-start", gap:12,
    animation:"shake 0.5s ease, fadeUpSmooth 0.4s ease both",
    boxShadow:"0 6px 24px rgba(251,191,36,0.12)",
    marginBottom:14
  }}>
    <span style={{ fontSize:"1.4rem", flexShrink:0 }}>💻</span>
    <div>
      <p style={{
        fontFamily:"Inter, sans-serif", fontWeight:700, color:"#fbbf24",
        fontSize:"0.92rem", marginBottom:"0.3rem"
      }}>Source Code Detected</p>
      <p style={{
        fontFamily:"Inter, sans-serif", fontWeight:500, color:"#fde68a",
        fontSize:"0.83rem", lineHeight:1.6
      }}>
        {message || "This input appears to contain source code. Please use the Code Plagiarism section for code comparison."}
      </p>
    </div>
  </div>
);

export default function Upload() {
  const navigate = useNavigate();
  const [file, setFile]               = useState(null);
  const [aiResult, setAiResult]       = useState(null);
  const [error, setError]             = useState(null);
  const [isCodeError, setIsCodeError] = useState(false);   // ← NEW: track code-detection errors
  const [uploading, setUploading]     = useState(false);
  const [pastedText, setPastedText]   = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [activeTab, setActiveTab]     = useState("paste");
  const [user, setUser]               = useState(null);
  const [isVerified, setIsVerified]   = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const BASE_URL = "http://localhost:8000";

  useEffect(() => {
    forceBg();
    injectStyles();

    const checkAuth = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/check-auth/`, { method:"GET", credentials:"include" });
        if (!res.ok) { clearAuthState(); return; }
        const data = await res.json();
        if (data.code_access === true) {
          setIsVerified(true);
          if (data.name || data.email) setUser({ name:data.name||null, email:data.email||null, picture:data.picture||null });
          else { try { const s = localStorage.getItem("user_profile"); if (s) setUser(JSON.parse(s)); } catch {} }
        } else clearAuthState();
      } catch { clearAuthState(); }
      finally { setAuthLoading(false); }
    };
    checkAuth();
  }, []);

  const clearAuthState = () => {
    setIsVerified(false); setUser(null);
    localStorage.removeItem("verified");
    localStorage.removeItem("user_profile");
  };

  const handleLogout = async () => {
    try { await fetch(`${BASE_URL}/api/logout/`, { method:"POST", credentials:"include" }); } catch {}
    clearAuthState();
  };

  // -- Reset: clears results so user can start fresh --
  const handleReset = () => {
    setFile(null);
    setAiResult(null);
    setError(null);
    setIsCodeError(false);
    setPastedText("");
    setActiveTab("paste");
  };

  // ── Helper: parse error response and detect code-rejection ──
  const handleApiError = (err) => {
    const data = err.response?.data;
    const errorMsg = data?.error || "";
    const isCode = errorMsg.toLowerCase().includes("code detected") ||
                   errorMsg.toLowerCase().includes("source code");
    setIsCodeError(isCode);
    // Show the backend's descriptive message if present, otherwise the error
    setError(data?.message || errorMsg || "Analysis failed");
  };

  const uploadFile = async () => {
    if (!file) return setError("Please select a file to upload");
    setUploading(true); setError(null); setAiResult(null); setIsCodeError(false);
    const formData = new FormData();
    formData.append("document", file);
    try {
      const uploadRes = await API.post("/upload/", formData);
      const docId = uploadRes.data.id;
      // ✅ Correct endpoint: /api/ai-check/<id>/ (GET with doc_id)
      const analysisRes = await API.get(`/ai-check/${docId}/`);
      setAiResult(analysisRes.data.ai_analysis);
      setFile(null);
    } catch (err) {
      handleApiError(err);
    } finally { setUploading(false); }
  };

  const runTextAnalysis = async () => {
    if (!pastedText.trim()) return setError("Please paste some text to analyze");
    setAiResult(null); setError(null); setIsCodeError(false); setTextLoading(true);
    try {
      // /api/ai-check-text/ → maps to ai_check view (POST, no doc_id)
      const res = await API.post("/ai-check-text/", { text: pastedText });
      setAiResult(res.data.ai_analysis);
    } catch (err) {
      handleApiError(err);
    } finally { setTextLoading(false); }
  };

  const loading    = uploading || textLoading;
  const aiPct      = aiResult?.ai_percentage ?? 0;
  const humanPct = Number((100 - aiPct).toFixed(2));
  const verdictAcc = aiPct >= 70 ? "#f87171" : aiPct >= 40 ? "#fbbf24" : "#5eead4";

  return (
    <div style={{
      height:"100vh",
      background:"linear-gradient(135deg, #0a0a15 0%, #0f0f1a 50%, #1a1a2e 100%)",
      fontFamily:"Inter, sans-serif",
      position:"relative", overflow:"hidden",
      display:"flex", flexDirection:"column"
    }}>
      <Orbs />

      {/* Auth corner */}
      {!authLoading && (
        isVerified && user
          ? <ProfileCorner user={user} onLogout={handleLogout} navigate={navigate} />
          : <GuestCorner onLogin={() => navigate("/login")} />
      )}

      {/* ── TOP BAR ── */}
      <div style={{
        display:"flex", alignItems:"center", gap:20,
        padding:"20px 48px", paddingRight:100,
        borderBottom:"1px solid rgba(255,255,255,0.08)",
        flexShrink:0, position:"relative", zIndex:10,
        animation:"fadeUpSmooth 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
        backdropFilter:"blur(12px)"
      }}>
        <button className="up-back" onClick={() => navigate(-1)} style={{
          display:"inline-flex", alignItems:"center", gap:8,
          padding:"10px 20px", borderRadius:999,
          background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.4)",
          color:"#f87171", fontWeight:600, cursor:"pointer",
          fontFamily:"Inter, sans-serif", fontSize:"0.9rem",
          transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)"
        }}>← Back</button>

        <span style={{ fontSize:"1.3rem" }}>🔍</span>

        <span style={{ fontWeight:700, fontSize:"1.2rem", color:"#f1f5f9", fontFamily:"Inter, sans-serif" }}>
          AI Content Detector
        </span>

        <button className="compare-btn-up" onClick={() => navigate("/similarity")} style={{
          marginLeft:20, padding:"10px 20px", borderRadius:14,
          background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.4)",
          color:"#a5b4fc", fontWeight:700, cursor:"pointer",
          fontFamily:"Inter, sans-serif", fontSize:"0.9rem", transition:"all 0.3s ease"
        }}>📊 Compare Multiple Documents</button>

        {/* New Session — only visible when there's a result or error, pushed left of profile avatar */}
        {(aiResult || error) && (
          <button
            onClick={handleReset}
            disabled={loading}
            style={{
              marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:8,
              padding:"10px 20px", borderRadius:999,
              background:"rgba(20,184,166,0.1)", border:"1px solid rgba(20,184,166,0.4)",
              color:"#5eead4", fontWeight:600, cursor: loading ? "not-allowed" : "pointer",
              fontFamily:"Inter, sans-serif", fontSize:"0.9rem", opacity: loading ? 0.5 : 1,
              transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)"
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "rgba(20,184,166,0.22)"; e.currentTarget.style.transform = "scale(1.05)"; }}}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(20,184,166,0.1)"; e.currentTarget.style.transform = "scale(1)"; }}
          >
            🔄 New Session
          </button>
        )}
      </div>

      {/* ── SPLIT BODY ── */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", position:"relative", zIndex:5 }}>

        {/* ════ LEFT PANEL — Input ════ */}
        <div style={{
          width:"50%", borderRight:"1px solid rgba(255,255,255,0.08)",
          display:"flex", flexDirection:"column", overflow:"hidden", backdropFilter:"blur(8px)"
        }}>
          <div style={{
            flex:1, overflowY:"auto", padding:"28px 36px 16px",
            scrollbarWidth:"thin", scrollbarColor:"rgba(20,184,166,0.3) transparent"
          }}>

            {/* Tabs */}
            <div style={{
              display:"flex", background:"rgba(255,255,255,0.05)", borderRadius:18, padding:4,
              marginBottom:"1.4rem", boxShadow:"0 4px 20px rgba(0,0,0,0.25)",
              border:"1px solid rgba(255,255,255,0.08)"
            }}>
              {[["paste","✏️ Paste Text"],["upload","📄 Upload File"]].map(([tab, label]) => (
                <button key={tab} className="up-tab"
                  onClick={() => { setActiveTab(tab); setError(null); setAiResult(null); setIsCodeError(false); }}
                  style={{
                    flex:1, padding:"12px", fontSize:"0.9rem", fontWeight:700, border:"none",
                    cursor:"pointer", borderRadius:14,
                    background: activeTab === tab ? "rgba(20,184,166,0.2)" : "transparent",
                    color: activeTab === tab ? "#5eead4" : "#94a3b8",
                    fontFamily:"Inter, sans-serif",
                    transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                    boxShadow: activeTab === tab ? "0 4px 20px rgba(20,184,166,0.25)" : "none"
                  }}>{label}</button>
              ))}
            </div>

            {/* ── Paste Tab ── */}
            {activeTab === "paste" && (
              <div style={{
                padding:"1.5rem", borderRadius:20, background:"rgba(255,255,255,0.03)",
                border:"1px solid rgba(255,255,255,0.09)", marginBottom:"1rem",
                animation:"fadeUpSmooth 0.5s ease both"
              }}>
                <p style={{ fontFamily:"Inter, sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"0.92rem", marginBottom:"1rem", display:"flex", alignItems:"center" }}>
                  <StepNum n="1" />Paste your text content
                </p>
                <textarea
                  className="up-textarea"
                  rows={15}
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder={"Paste your text here...\n\nThe detector will analyze:\n• Repetition & vocabulary diversity\n• Sentence structure patterns\n• AI-specific phrase fingerprints\n• Writing rhythm & entropy\n• 13+ more signals"}
                  style={{
                    width:"100%", padding:"1.2rem",
                    fontFamily:"Roboto Mono, monospace", fontSize:"0.82rem",
                    borderRadius:16, border:"1px solid rgba(255,255,255,0.1)",
                    background:"rgba(10,10,21,0.75)", resize:"none",
                    lineHeight:1.8, color:"#e2e8f0", outline:"none",
                    transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                    boxShadow:"0 6px 24px rgba(0,0,0,0.3)", fontWeight:500
                  }}
                />
              </div>
            )}

            {/* ── Upload Tab ── */}
            {activeTab === "upload" && (
              <div style={{
                padding:"1.5rem", borderRadius:20, background:"rgba(255,255,255,0.03)",
                border:"1px solid rgba(255,255,255,0.09)", marginBottom:"1rem",
                animation:"fadeUpSmooth 0.5s ease both"
              }}>
                <p style={{ fontFamily:"Inter, sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"0.92rem", marginBottom:"1rem", display:"flex", alignItems:"center" }}>
                  <StepNum n="1" />Upload a document
                </p>
                {!file ? (
                  <label className="upload-zone-up" style={{
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                    border:"2px dashed rgba(20,184,166,0.35)", borderRadius:20, padding:"3.5rem 2rem",
                    cursor:"pointer", background:"rgba(20,184,166,0.04)",
                    transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                    boxShadow:"0 8px 32px rgba(0,0,0,0.25)"
                  }}>
                    <span style={{ fontSize:"3rem", marginBottom:"1rem", animation:"floatGentle 4s ease-in-out infinite" }}>📁</span>
                    <p style={{ fontFamily:"Inter, sans-serif", fontWeight:700, color:"#94a3b8", marginBottom:"0.4rem", fontSize:"0.95rem" }}>
                      Drop your file here or click to browse
                    </p>
                    <p style={{ fontSize:"0.8rem", color:"#64748b", fontWeight:500 }}>PDF · DOCX · TXT supported</p>
                    <input type="file" accept=".txt,.pdf,.docx"
                      onChange={e => { setFile(e.target.files[0]); setError(null); setIsCodeError(false); }}
                      style={{ display:"none" }} />
                  </label>
                ) : (
                  <div style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"1.2rem 1.4rem", border:"1px solid rgba(20,184,166,0.4)", borderRadius:18,
                    background:"rgba(20,184,166,0.08)", boxShadow:"0 6px 24px rgba(20,184,166,0.15)",
                    animation:"scaleInGlow 0.4s ease both"
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ fontSize:"1.6rem" }}>📄</span>
                      <div>
                        <p style={{ fontFamily:"Inter, sans-serif", fontWeight:700, color:"#5eead4", margin:0, fontSize:"0.9rem" }}>{file.name}</p>
                        <p style={{ fontSize:"0.75rem", color:"#94a3b8", margin:"2px 0 0", fontWeight:500 }}>{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button onClick={() => setFile(null)} style={{
                      background:"none", border:"none", fontSize:"1.1rem", cursor:"pointer",
                      color:"#fca5a5", padding:"6px 10px", borderRadius:10, transition:"all 0.2s ease"
                    }}>✕</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Analyze Button ── */}
          <div style={{
            padding:"20px 36px 28px",
            borderTop:"1px solid rgba(255,255,255,0.08)",
            background:"rgba(10,10,21,0.92)", backdropFilter:"blur(16px)", flexShrink:0
          }}>
            {/* ── Code detection: show amber warning banner ── */}
            {error && isCodeError && (
              <CodeWarningBanner message={error} />
            )}

            {/* ── Generic error: show red error bar ── */}
            {error && !isCodeError && (
              <div style={{
                marginBottom:14, padding:"0.9rem 1.2rem", borderRadius:14,
                background:"rgba(239,68,68,0.14)", border:"1px solid rgba(239,68,68,0.4)",
                color:"#fca5a5", fontFamily:"Inter, sans-serif", fontWeight:600, fontSize:"0.88rem",
                display:"flex", alignItems:"center", gap:10,
                animation:"shake 0.5s ease, fadeUpSmooth 0.4s ease both",
                boxShadow:"0 6px 24px rgba(239,68,68,0.15)"
              }}>⚠️ {error}</div>
            )}

            <button className="up-analyze"
              onClick={activeTab === "paste" ? runTextAnalysis : uploadFile}
              disabled={loading}
              style={{
                width:"100%", padding:"17px", fontSize:"1rem",
                background: loading
                  ? "rgba(20,184,166,0.12)"
                  : "linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #06b6d4 100%)",
                color: loading ? "#64748b" : "#ffffff",
                border: loading ? "1px solid rgba(20,184,166,0.25)" : "none",
                borderRadius:18, cursor: loading ? "not-allowed" : "pointer",
                fontFamily:"Inter, sans-serif", fontWeight:700, fontSize:"1.02rem",
                boxShadow: loading ? "none" : "0 14px 48px rgba(20,184,166,0.45)",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)"
              }}>
              {loading ? (
                <>
                  <span style={{
                    width:18, height:18, borderRadius:"50%", border:"3px solid rgba(255,255,255,0.2)",
                    borderTopColor:"rgba(255,255,255,0.8)", animation:"spinSmooth 0.8s linear infinite", display:"inline-block"
                  }} />
                  Analyzing content...
                </>
              ) : (
                activeTab === "paste" ? "🔍 Analyze Text Now" : "🔍 Upload & Analyze"
              )}
            </button>
          </div>
        </div>

        {/* ════ RIGHT PANEL — Results ════ */}
        <div style={{
          width:"50%", overflowY:"auto", padding:"28px 36px 36px",
          scrollbarWidth:"thin", scrollbarColor:"rgba(20,184,166,0.3) transparent",
          background:"rgba(0,0,0,0.1)", backdropFilter:"blur(8px)"
        }}>

          {/* Empty */}
          {!aiResult && !loading && (
            <div style={{
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              height:"100%", textAlign:"center", opacity:0.9
            }}>
              <span style={{ fontSize:"4.5rem", marginBottom:"1.2rem" }}>📄</span>
              <p style={{ fontFamily:"Inter, sans-serif", fontWeight:700, color:"#94a3b8", fontSize:"1.1rem", marginBottom:"0.5rem" }}>
                Results will appear here
              </p>
              <p style={{ fontFamily:"Inter, sans-serif", color:"#64748b", fontSize:"0.86rem", maxWidth:280, lineHeight:1.7 }}>
                Paste your text or upload a document, then click Analyze to see detection results.
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              height:"100%", gap:18, animation:"fadeInSmooth 0.4s ease both"
            }}>
              <div style={{
                width:56, height:56, borderRadius:"50%",
                border:"4px solid rgba(20,184,166,0.2)", borderTopColor:"#14b8a6",
                animation:"spinSmooth 1s linear infinite"
              }} />
              <p style={{ fontFamily:"Inter, sans-serif", fontWeight:700, color:"#94a3b8", fontSize:"1rem" }}>
                Analyzing your content…
              </p>
              <p style={{ fontFamily:"Inter, sans-serif", color:"#64748b", fontSize:"0.83rem" }}>
                Processing 20+ AI detection signals
              </p>
            </div>
          )}

          {/* ── RESULTS ── */}
          {aiResult && (
            <div style={{ animation:"fadeInSmooth 0.5s ease both" }}>

              {/* Divider */}
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:"1.5rem" }}>
                <div style={{ flex:1, height:2, background:"linear-gradient(90deg, rgba(20,184,166,0.55), transparent)" }} />
                <span style={{
                  fontFamily:"Inter, sans-serif", fontSize:"0.7rem", fontWeight:700, color:"#5eead4",
                  letterSpacing:"0.15em", textTransform:"uppercase",
                  background:"rgba(10,10,21,0.9)", padding:"7px 18px", borderRadius:999,
                  backdropFilter:"blur(12px)", border:"1px solid rgba(20,184,166,0.3)"
                }}>Analysis Complete</span>
                <div style={{ flex:1, height:2, background:"linear-gradient(90deg, transparent, rgba(20,184,166,0.55))" }} />
              </div>

              {/* ── Summary Cards ── */}
              <div style={{ display:"flex", gap:10, marginBottom:"1.2rem" }}>
                <SummaryCard icon="🧠" label="VERDICT" value={aiResult.label}
                  sub={`Confidence: ${aiResult.confidence}%`}
                  accent={verdictAcc} delay="0.05s" />
                <SummaryCard icon="🤖" label="AI PROBABILITY" value={`${aiPct}%`}
                  sub={aiPct >= 65 ? "Strong AI patterns" : aiPct >= 40 ? "Mixed signals" : "Low AI likelihood"}
                  accent={aiPct >= 65 ? "#f87171" : aiPct >= 40 ? "#fbbf24" : "#5eead4"} delay="0.12s" />
                <SummaryCard icon="🙋" label="HUMAN PROBABILITY" value={`${humanPct}%`}
                  sub={humanPct >= 65 ? "Strong human patterns" : humanPct >= 40 ? "Mixed traits" : "Low human likelihood"}
                  accent={humanPct >= 65 ? "#5eead4" : humanPct >= 40 ? "#fbbf24" : "#f87171"} delay="0.19s" />
              </div>

              {/* ── Probability Distribution ── */}
              <RCard delay="0.26s">
                <p style={{ fontFamily:"Inter, sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"0.92rem", marginBottom:"1.1rem" }}>
                  📊 Probability Distribution
                </p>
                {/* Combo bar */}
                <div style={{
                  height:26, borderRadius:999, overflow:"hidden", display:"flex",
                  background:"rgba(255,255,255,0.05)", marginBottom:"1.1rem",
                  boxShadow:"0 4px 16px rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.08)"
                }}>
                  <div style={{
                    width:`${aiPct}%`,
                    borderRadius: humanPct === 0 ? 999 : "999px 0 0 999px",
                    background:"linear-gradient(90deg,#ef4444,#f97316)",
                    transition:"width 1.5s cubic-bezier(0.34,1.56,0.64,1)",
                    position:"relative", display:"flex", alignItems:"center"
                  }}>
                    {aiPct > 12 && (
                      <span style={{
                        position:"absolute", right:10,
                        fontFamily:"Inter, sans-serif", fontSize:"0.7rem", fontWeight:700, color:"rgba(255,255,255,0.95)"
                      }}>{aiPct}%</span>
                    )}
                  </div>
                  <div style={{
                    width:`${humanPct}%`,
                    borderRadius: aiPct === 0 ? 999 : "0 999px 999px 0",
                    background:"linear-gradient(90deg,#14b8a6,#06b6d4)",
                    transition:"width 1.5s cubic-bezier(0.34,1.56,0.64,1)",
                    position:"relative", display:"flex", alignItems:"center"
                  }}>
                    {humanPct > 12 && (
                      <span style={{
                        position:"absolute", left:10,
                        fontFamily:"Inter, sans-serif", fontSize:"0.7rem", fontWeight:700, color:"rgba(255,255,255,0.95)"
                      }}>{humanPct}%</span>
                    )}
                  </div>
                </div>
                {/* Individual bars */}
                {[
                  { label:"🤖 AI Generated",  pct:aiPct,    dot:"#ef4444", val:"#f87171", grad:"linear-gradient(90deg,#ef4444,#f97316)" },
                  { label:"🙋 Human Written", pct:humanPct, dot:"#14b8a6", val:"#5eead4", grad:"linear-gradient(90deg,#14b8a6,#06b6d4)" }
                ].map((item, i) => (
                  <div key={item.label} style={{ marginBottom:"0.85rem", animation:`revealStagger 0.5s ease both ${0.35 + i * 0.1}s` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, alignItems:"center" }}>
                      <span style={{ fontFamily:"Inter, sans-serif", fontSize:"0.84rem", color:"#94a3b8", fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ width:8, height:8, borderRadius:"50%", background:item.dot, display:"inline-block" }} />
                        {item.label}
                      </span>
                      <span style={{ fontFamily:"Inter, sans-serif", fontSize:"0.92rem", fontWeight:700, color:item.val }}>{item.pct}%</span>
                    </div>
                    <MiniBar pct={item.pct} grad={item.grad} />
                  </div>
                ))}
              </RCard>

              {/* ── Recommendation ── */}
              {aiResult.recommendation && (
                <RCard delay="0.33s">
                  <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <span style={{ fontSize:"1.5rem" }}>💡</span>
                    <div>
                      <p style={{
                        fontFamily:"Inter, sans-serif", fontSize:"0.65rem", fontWeight:700,
                        color:"#5eead4", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:7
                      }}>Recommendation</p>
                      <p style={{ fontFamily:"Inter, sans-serif", fontSize:"0.88rem", color:"#f1f5f9", fontWeight:600, lineHeight:1.65 }}>
                        {aiResult.recommendation}
                      </p>
                    </div>
                  </div>
                </RCard>
              )}

              {/* ── Strong Signals ── */}
              {aiResult.strong_signals !== undefined && (
                <RCard delay="0.38s" style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <span style={{ fontSize:"1.4rem" }}>⚡</span>
                  <div>
                    <p style={{ fontFamily:"Inter, sans-serif", fontSize:"0.65rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:5 }}>
                      Strong Signals Detected
                    </p>
                    <p style={{
                      fontFamily:"Roboto Mono, monospace", fontSize:"1.35rem", fontWeight:700,
                      color: aiResult.strong_signals >= 3 ? "#f87171" : aiResult.strong_signals >= 2 ? "#fbbf24" : "#5eead4"
                    }}>
                      {aiResult.strong_signals}
                      <span style={{ fontFamily:"Inter, sans-serif", fontSize:"0.82rem", color:"#64748b", fontWeight:600, marginLeft:6 }}>out of 4</span>
                    </p>
                  </div>
                </RCard>
              )}

              {/* ── Component Scores ── */}
              {aiResult.components && (
                <RCard delay="0.43s">
                  <p style={{ fontFamily:"Inter, sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"0.92rem", marginBottom:"1rem" }}>⚙️ Component Scores</p>
                  {Object.entries(aiResult.components).map(([k, v]) => (
                    <BreakdownRow key={k} label={k} value={v} />
                  ))}
                </RCard>
              )}

              {/* ── Heuristic Breakdown ── */}
              {aiResult.heuristic_breakdown && (
                <RCard delay="0.49s">
                  <p style={{ fontFamily:"Inter, sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"0.92rem", marginBottom:"1.1rem" }}>🔬 Heuristic Analysis</p>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
                    {Object.entries(aiResult.heuristic_breakdown).map(([k, v]) => (
                      <div key={k} className="feat-card-up" style={{
                        padding:"11px 13px", background:"rgba(20,184,166,0.05)",
                        borderRadius:13, border:"1px solid rgba(20,184,166,0.14)",
                        transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)"
                      }}>
                        <p style={{ fontFamily:"Inter, sans-serif", fontSize:"0.62rem", color:"#64748b", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:5 }}>
                          {k.replace(/_/g, " ")}
                        </p>
                        <p style={{ fontFamily:"Roboto Mono, monospace", fontSize:"1.15rem", fontWeight:700, color:"#5eead4", marginBottom:7 }}>{v}%</p>
                        <MiniBar pct={v} grad="linear-gradient(90deg,#0d9488,#06b6d4)" />
                      </div>
                    ))}
                  </div>
                </RCard>
              )}

              {/* ── ML Breakdown ── */}
              {aiResult.ml_breakdown && (
                <RCard delay="0.55s">
                  <p style={{ fontFamily:"Inter, sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"0.92rem", marginBottom:"1rem" }}>🧠 ML Analysis</p>
                  {Object.entries(aiResult.ml_breakdown).map(([k, v]) => (
                    <BreakdownRow key={k}
                      label={k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      value={typeof v === "number" ? v.toFixed(1) : v}
                    />
                  ))}
                </RCard>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}