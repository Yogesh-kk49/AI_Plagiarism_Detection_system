import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

/* ─────────────────────────────────────────────────────────────────
   BACKGROUND FIX
───────────────────────────────────────────────────────────────── */
const forceBg = () => {
  document.documentElement.style.background = "#0a0a15";
  document.body.style.background = "#0a0a15";
  document.body.style.margin  = "0";
  document.body.style.padding = "0";
  if (!document.getElementById("bg-fix-style")) {
    const s = document.createElement("style");
    s.id = "bg-fix-style";
    s.textContent = `html,body{background:#0a0a15!important;margin:0!important;padding:0!important;}`;
    document.head.insertBefore(s, document.head.firstChild);
  }
};

/* ─────────────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────────────── */
const injectStyles = () => {
  if (document.getElementById("sim-styles")) return;
  const tag = document.createElement("style");
  tag.id = "sim-styles";
  tag.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

    @keyframes fadeUpSmooth  { from{opacity:0;transform:translateY(24px);}  to{opacity:1;transform:translateY(0);} }
    @keyframes fadeInSmooth  { from{opacity:0;}                              to{opacity:1;} }
    @keyframes scaleInGlow   { from{opacity:0;transform:scale(0.94);}       to{opacity:1;transform:scale(1);} }
    @keyframes slideDownGlow { from{opacity:0;transform:translateY(-16px);} to{opacity:1;transform:translateY(0);} }
    @keyframes slideInLeft   { from{opacity:0;transform:translateX(-18px);} to{opacity:1;transform:translateX(0);} }
    @keyframes spinSmooth    { to{transform:rotate(360deg);} }
    @keyframes orbFloat1     { 0%,100%{transform:translate(0,0) scale(1);} 40%{transform:translate(45px,-35px) scale(1.05);} 70%{transform:translate(-20px,20px) scale(0.95);} }
    @keyframes orbFloat2     { 0%,100%{transform:translate(0,0) scale(1);} 35%{transform:translate(-45px,25px) scale(1.05);} 70%{transform:translate(25px,-40px) scale(0.95);} }
    @keyframes floatGentle   { 0%,100%{transform:translateY(0px);} 50%{transform:translateY(-8px);} }
    @keyframes badgePulse    { 0%{transform:scale(0);} 50%{transform:scale(1.2);} 100%{transform:scale(1);} }
    @keyframes revealStagger { from{opacity:0;transform:translateY(18px);}  to{opacity:1;transform:translateY(0);} }
    @keyframes shimmerGlow   { 0%{opacity:0.3;transform:scaleX(0.7);} 50%{opacity:1;transform:scaleX(1.05);} 100%{opacity:0.3;transform:scaleX(0.7);} }
    @keyframes pulseDotSoft  { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(0.8);} }
    @keyframes shake         { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-10px);} 75%{transform:translateX(10px);} }

    html,body { margin:0!important; padding:0!important; background:#0a0a15!important; min-height:100vh; overflow-x:hidden; }
    #root     { background:#0a0a15; min-height:100vh; }

    ::-webkit-scrollbar       { width:6px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:rgba(251,191,36,0.28); border-radius:99px; }

    .sim-back:hover            { background:rgba(239,68,68,0.18)!important; border-color:rgba(239,68,68,0.6)!important; color:#fecaca!important; transform:translateX(-2px); }
    .profile-avatar-sim        { transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
    .profile-avatar-sim:hover  { transform:scale(1.12) rotate(5deg); box-shadow:0 12px 40px rgba(251,191,36,0.4); }
    .logout-btn-sim:hover      { background:rgba(239,68,68,0.2)!important;   color:#fca5a5!important; border-color:rgba(239,68,68,0.5)!important; transform:translateX(-2px); }
    .history-btn-sim:hover     { background:rgba(124,58,237,0.25)!important; color:#c4b5fd!important; transform:translateX(-2px); }
    .signin-corner-sim:hover   { background:rgba(251,191,36,0.25)!important; border-color:rgba(251,191,36,0.7)!important; transform:scale(1.05); }
    .upload-zone-sim:hover     { border-color:rgba(251,191,36,0.65)!important; background:rgba(251,191,36,0.07)!important; }
    .file-item-sim             { animation:slideInLeft 0.3s ease-out both; transition:all 0.2s ease; }
    .file-item-sim:hover       { transform:translateX(4px); }
    .doc-card-sim              { transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1); cursor:pointer; }
    .doc-card-sim:not(.sel-active):hover { transform:translateY(-3px) scale(1.02); border-color:rgba(251,191,36,0.45)!important; }
    .result-row-sim            { transition:all 0.25s ease; }
    .result-row-sim:hover      { transform:translateY(-2px); box-shadow:0 12px 36px rgba(0,0,0,0.4)!important; }
    .btn-sim-upload:hover:not(:disabled)  { transform:translateY(-3px) scale(1.02); box-shadow:0 18px 44px rgba(251,191,36,0.5)!important; }
    .btn-sim-success:hover:not(:disabled) { transform:translateY(-3px) scale(1.02); box-shadow:0 18px 44px rgba(16,185,129,0.5)!important; }
    .btn-sim-neutral:hover:not(:disabled) { transform:translateY(-3px) scale(1.02); box-shadow:0 18px 44px rgba(99,102,241,0.45)!important; }
    .btn-sim-danger:hover:not(:disabled)  { transform:translateY(-2px); box-shadow:0 14px 36px rgba(239,68,68,0.4)!important; }
  `;
  document.head.appendChild(tag);
};

/* ─────────────────────────────────────────────────────────────────
   CLIENT-SIDE CODE DETECTION
   Mirrors the backend is_code() logic so we can reject code files
   BEFORE uploading — preventing orphan DB records.
───────────────────────────────────────────────────────────────── */
const isLikelyCode = (text) => {
  if (!text || text.trim().length < 30) return false;

  const codePatterns = [
    /^\s*(def |class |import |from |return |if |elif |else:|for |while |try:|except|with )/m,
    /^\s*(public|private|protected|static|void|int|float|double|String|boolean)\s+\w+/m,
    /^\s*(function\s+\w+\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=)/m,
    /^\s*(#include|#define|int main\s*\()/m,
    /=>\s*\{/,
    /\bconsole\.log\s*\(/,
    /\bSystem\.out\.println\s*\(/,
    /\bprint\s*\(/,
    /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\s+/im,
    /^\s*[\{\}]\s*$/m,
    /;\s*$/m,
    /^\s*@\w+/m,
    /:\s*(int|str|float|bool|list|dict|tuple|Any|None|List|Dict)\b/,
    /\brequire\s*\(/,
    /\bimport\s+\{/,
    /<\?php/,
    /^\s*(\/\/|\/\*|\*\s)\S/m,
  ];

  const lines = text.split("\n").filter(l => l.trim().length > 0);
  if (lines.length === 0) return false;

  let matched = 0;
  for (const line of lines) {
    for (const pat of codePatterns) {
      if (pat.test(line)) { matched++; break; }
    }
  }

  return matched >= 2 && (matched / lines.length) >= 0.20;
};

/* ─────────────────────────────────────────────────────────────────
   SEVERITY COLOURS
───────────────────────────────────────────────────────────────── */
const getSeverity = (pct) => {
  const n = typeof pct === "number" && !isNaN(pct) ? pct : 0;
  if (n >= 70) return {
    label: "High Risk", color: "#f87171",
    bg: "rgba(239,68,68,0.13)", border: "rgba(239,68,68,0.45)",
    bar: "linear-gradient(90deg,#ef4444,#f97316)", dot: "#ef4444",
    glow: "rgba(239,68,68,0.22)",
  };
  if (n >= 40) return {
    label: "Medium Risk", color: "#fbbf24",
    bg: "rgba(251,191,36,0.13)", border: "rgba(251,191,36,0.45)",
    bar: "linear-gradient(90deg,#d97706,#fbbf24)", dot: "#f59e0b",
    glow: "rgba(251,191,36,0.22)",
  };
  return {
    label: "Low Risk", color: "#4ade80",
    bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.38)",
    bar: "linear-gradient(90deg,#16a34a,#4ade80)", dot: "#22c55e",
    glow: "rgba(34,197,94,0.18)",
  };
};

const calcPairs = (n) => Math.floor(n * (n - 1) / 2);

/* ─────────────────────────────────────────────────────────────────
   SMALL COMPONENTS
───────────────────────────────────────────────────────────────── */
const Orbs = () => (
  <>
    <div style={{ position:"fixed", top:"8%", left:"1%", width:560, height:560, borderRadius:"50%", background:"radial-gradient(circle at 30% 30%, rgba(251,191,36,0.14) 0%, rgba(251,191,36,0.04) 35%, transparent 70%)", animation:"orbFloat1 18s ease-in-out infinite", pointerEvents:"none", zIndex:0 }} />
    <div style={{ position:"fixed", bottom:"5%", right:"2%", width:640, height:640, borderRadius:"50%", background:"radial-gradient(circle at 70% 20%, rgba(245,158,11,0.11) 0%, rgba(245,158,11,0.03) 35%, transparent 70%)", animation:"orbFloat2 22s ease-in-out infinite reverse", pointerEvents:"none", zIndex:0 }} />
  </>
);

const Spinner = ({ dark = false }) => (
  <span style={{ width:16, height:16, borderRadius:"50%", border:`2.5px solid ${dark ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)"}`, borderTopColor: dark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)", animation:"spinSmooth 0.8s linear infinite", display:"inline-block", flexShrink:0 }} />
);

/* Generic red error banner */
const ErrorBanner = ({ msg }) => (
  <div style={{ marginTop:12, padding:"0.88rem 1.1rem", borderRadius:13, background:"rgba(239,68,68,0.13)", border:"1px solid rgba(239,68,68,0.38)", color:"#fca5a5", fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:"0.86rem", display:"flex", alignItems:"flex-start", gap:9, animation:"shake 0.5s ease, fadeInSmooth 0.3s ease" }}>
    <span style={{ flexShrink:0 }}>⚠️</span>
    <span style={{ lineHeight:1.5 }}>{msg}</span>
  </div>
);

/* Amber code-detection warning banner */
const CodeWarningBanner = ({ msg }) => (
  <div style={{ marginTop:12, padding:"0.88rem 1.1rem", borderRadius:13, background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.45)", color:"#fde68a", fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:"0.86rem", display:"flex", alignItems:"flex-start", gap:9, animation:"shake 0.5s ease, fadeInSmooth 0.3s ease" }}>
    <span style={{ flexShrink:0 }}>💻</span>
    <div>
      <p style={{ fontWeight:700, color:"#fbbf24", marginBottom:3 }}>Source Code Detected</p>
      <span style={{ lineHeight:1.5, fontWeight:500 }}>{msg}</span>
    </div>
  </div>
);

/* Skipped pair warning (amber, inline in results) */
const SkippedRow = ({ name1, name2, reason, index }) => (
  <div style={{ padding:"1rem 1.2rem", borderRadius:16, background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.3)", animation:`revealStagger 0.5s ease both ${index * 0.08}s`, display:"flex", alignItems:"flex-start", gap:12 }}>
    <span style={{ fontSize:"1.2rem", flexShrink:0 }}>⏭️</span>
    <div>
      <p style={{ fontFamily:"Inter,sans-serif", fontWeight:700, color:"#fbbf24", fontSize:"0.84rem", marginBottom:4 }}>
        Skipped: {name1} vs {name2}
      </p>
      <p style={{ fontFamily:"Inter,sans-serif", fontWeight:500, color:"#fde68a", fontSize:"0.78rem", lineHeight:1.5 }}>{reason}</p>
    </div>
  </div>
);

const ProfileCorner = ({ user, onLogout, navigate }) => {
  const [open, setOpen] = useState(false);
  const initials = user?.name ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  return (
    <div style={{ position:"fixed", top:20, right:28, zIndex:400, animation:"slideDownGlow 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.3s" }}>
      <div style={{ position:"relative" }}>
        <button className="profile-avatar-sim" onClick={() => setOpen(o => !o)} style={{ width:52, height:52, borderRadius:"50%", border:"2px solid rgba(251,191,36,0.55)", background:"linear-gradient(135deg,rgba(15,15,26,0.95),rgba(25,25,40,0.9))", padding:0, cursor:"pointer", boxShadow:"0 8px 32px rgba(0,0,0,0.5),0 0 0 4px rgba(251,191,36,0.1)", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(20px)" }}>
          {user?.picture
            ? <img src={user.picture} alt={user.name || ""} referrerPolicy="no-referrer" crossOrigin="anonymous" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "U")}&background=f59e0b&color=fff&bold=true&size=128`; }} />
            : <span style={{ fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:16, color:"#fcd34d" }}>{initials}</span>
          }
        </button>
        <span style={{ position:"absolute", bottom:2, right:2, width:12, height:12, borderRadius:"50%", background:"linear-gradient(135deg,#22c55e,#4ade80)", border:"2px solid rgba(15,15,26,0.9)", animation:"badgePulse 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.6s,pulseDotSoft 2s ease-in-out infinite 1s" }} />
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position:"fixed", inset:0, zIndex:-1 }} />
            <div style={{ position:"absolute", top:64, right:0, zIndex:500, background:"linear-gradient(135deg,rgba(13,13,22,0.98),rgba(20,20,35,0.95))", backdropFilter:"blur(32px)", border:"1px solid rgba(251,191,36,0.28)", borderRadius:20, padding:"1.5rem", minWidth:280, boxShadow:"0 32px 80px rgba(0,0,0,0.7)", animation:"scaleInGlow 0.3s cubic-bezier(0.34,1.56,0.64,1) both", transformOrigin:"top right" }}>
              <div style={{ marginBottom:"1rem", paddingBottom:"1rem", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontFamily:"Inter,sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"1rem", marginBottom:4 }}>{user?.name || "—"}</p>
                <p style={{ fontFamily:"Inter,sans-serif", color:"#94a3b8", fontSize:"0.85rem" }}>{user?.email || "—"}</p>
                <div style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:8, padding:"4px 12px", borderRadius:999, background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.4)", fontSize:"0.75rem", color:"#86efac", fontFamily:"Inter,sans-serif", fontWeight:600 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", display:"inline-block" }} /> 2FA Verified
                </div>
              </div>
              <button className="history-btn-sim" onClick={() => { setOpen(false); navigate("/history"); }} style={{ width:"100%", padding:"0.8rem 1rem", borderRadius:14, border:"1px solid rgba(124,58,237,0.4)", background:"rgba(124,58,237,0.12)", color:"#c4b5fd", fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:"0.9rem", cursor:"pointer", transition:"all 0.3s ease", marginBottom:"0.75rem", textAlign:"left", display:"flex", alignItems:"center", gap:8 }}>📜 View Analysis History</button>
              <button className="logout-btn-sim" onClick={onLogout} style={{ width:"100%", padding:"0.8rem 1rem", borderRadius:14, border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.08)", color:"#fca5a5", fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:"0.9rem", cursor:"pointer", transition:"all 0.3s ease", textAlign:"left", display:"flex", alignItems:"center", gap:8 }}>🚪 Sign Out</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const GuestCorner = ({ onLogin }) => (
  <div style={{ position:"fixed", top:24, right:32, zIndex:400, animation:"slideDownGlow 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.3s" }}>
    <button className="signin-corner-sim" onClick={onLogin} style={{ padding:"12px 28px", borderRadius:999, border:"1px solid rgba(251,191,36,0.4)", background:"rgba(251,191,36,0.1)", color:"#fcd34d", fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:"0.9rem", cursor:"pointer", transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)", backdropFilter:"blur(20px)" }}>Sign In</button>
  </div>
);

const LCard = ({ children, style = {} }) => (
  <div style={{ padding:"1.4rem", borderRadius:20, background:"rgba(251,191,36,0.05)", border:"1px solid rgba(251,191,36,0.18)", boxShadow:"0 10px 36px rgba(0,0,0,0.22)", marginBottom:"1.1rem", backdropFilter:"blur(10px)", ...style }}>
    {children}
  </div>
);

const SectionLabel = ({ icon, children }) => (
  <p style={{ fontFamily:"Inter,sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"0.95rem", marginBottom:"1.1rem", display:"flex", alignItems:"center", gap:10 }}>
    <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:32, height:32, borderRadius:10, background:"rgba(251,191,36,0.14)", border:"1px solid rgba(251,191,36,0.3)", fontSize:"1rem" }}>{icon}</span>
    {children}
  </p>
);

const SimBtn = ({ children, onClick, disabled, cls, bg, color, shadow, style = {} }) => (
  <button className={cls} onClick={onClick} disabled={disabled} style={{ padding:"13px 20px", border:"none", borderRadius:16, background: disabled ? "rgba(255,255,255,0.06)" : bg, color: disabled ? "#4b5563" : color, fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:"0.92rem", cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : shadow, display:"flex", alignItems:"center", justifyContent:"center", gap:9, transition:"all 0.35s cubic-bezier(0.34,1.56,0.64,1)", opacity: disabled ? 0.5 : 1, ...style }}>
    {children}
  </button>
);

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
export default function Similarity() {
  const navigate = useNavigate();

  const [files,         setFiles]         = useState([]);
  const [uploadedDocs,  setUploadedDocs]  = useState([]);
  // FIX 2: results now holds both successful comparisons AND skipped pairs
  // Each item: { type: "result"|"skipped", ...fields }
  const [results,       setResults]       = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [isCodeError,   setIsCodeError]   = useState(false);
  const [showSelection, setShowSelection] = useState(false);
  const [selectedDocs,  setSelectedDocs]  = useState({});
  const [user,          setUser]          = useState(null);
  const [isVerified,    setIsVerified]    = useState(false);
  const [authLoading,   setAuthLoading]   = useState(true);

  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    forceBg();
    injectStyles();

    const checkAuth = async () => {
      try {
        const res  = await fetch(`${BASE_URL}/api/check-auth/`, { method:"GET", credentials:"include" });
        if (!res.ok) { clearAuthState(); return; }
        const data = await res.json();
        if (data.code_access === true) {
          setIsVerified(true);
          setUser({ name: data.name || null, email: data.email || null, picture: data.picture || null });
        } else {
          clearAuthState();
        }
      } catch {
        clearAuthState();
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const clearAuthState = () => {
    setIsVerified(false);
    setUser(null);
    localStorage.removeItem("verified");
    localStorage.removeItem("user_profile");
  };

  const handleLogout = async () => {
    try { await fetch(`${BASE_URL}/api/logout/`, { method:"POST", credentials:"include" }); } catch {}
    clearAuthState();
    navigate("/login");
  };

  /* ── file handling ── */
  const handleFileChange = (e) => {
    setFiles(p => [...p, ...Array.from(e.target.files)]);
    setError(null); setIsCodeError(false); setResults([]); setShowSelection(false); setSelectedDocs({});
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setFiles(p => [...p, ...Array.from(e.dataTransfer.files)]);
    setError(null); setIsCodeError(false); setResults([]); setShowSelection(false); setSelectedDocs({});
  };
  const removeFile    = (i)  => setFiles(p => p.filter((_, idx) => idx !== i));
  const clearAllFiles = ()   => { setFiles([]); setError(null); setIsCodeError(false); };
  const toggleDoc     = (id) => setSelectedDocs(p => ({ ...p, [id]: !p[id] }));
  const selectedCount = ()   => Object.values(selectedDocs).filter(Boolean).length;

  /* ─────────────────────────────────────────────────────────────────
     FIX 1: CLIENT-SIDE CODE DETECTION BEFORE UPLOAD
     Reads each file as text and checks isLikelyCode().
     If any file looks like code → block the upload entirely with
     an amber CodeWarningBanner, no DB records created.
     NOTE: For PDF/DOCX we can't read raw text client-side, so we
     only check .txt files here; the backend catches the rest.
  ───────────────────────────────────────────────────────────────── */
  const uploadFiles = async () => {
    if (files.length < 2) return setError("Please select at least 2 documents for similarity analysis.");
    setLoading(true); setError(null); setIsCodeError(false); setResults([]);

    // Pre-flight: check .txt files for code before touching the network
    for (const file of files) {
      if (file.name.toLowerCase().endsWith(".txt")) {
        try {
          const text = await file.text();
          if (isLikelyCode(text)) {
            setIsCodeError(true);
            setError(`"${file.name}" appears to contain source code. Please use the Code Plagiarism section for code comparison.`);
            setLoading(false);
            return;
          }
        } catch {
          // If we can't read it, let the backend decide
        }
      }
    }

    try {
      const uploaded = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("document", file);
        const res = await API.post("/upload/", fd, {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        });
        uploaded.push({
          id:           res.data.id,
          originalName: file.name,
          serverName:   res.data.file_name,
        });
      }
      setUploadedDocs(uploaded);
      setShowSelection(true);
      setFiles([]);
    } catch (err) {
      const data   = err.response?.data;
      const status = err.response?.status;
      const msg    = data?.message || data?.error || err.message || "Upload failed";
      const isCode = (data?.error || "").toLowerCase().includes("code detected") ||
                     (data?.error || "").toLowerCase().includes("source code");
      setIsCodeError(isCode);
      setError(status && !isCode ? `[${status}] ${msg}` : msg);
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────────
     FIX 2: NON-BLOCKING PAIR COMPARISONS
     Instead of throw-on-first-error, we now:
       - Run all pairs with Promise.allSettled (parallel, non-blocking)
       - Successful pairs → type:"result" entries in results[]
       - Failed pairs     → type:"skipped" entries with the reason
     This means if 1 of 10 pairs fails, the other 9 still show.
  ───────────────────────────────────────────────────────────────── */
  const runComparisons = async (pairs) => {
    setLoading(true); setError(null); setIsCodeError(false);

    const settled = await Promise.allSettled(
      pairs.map(([d1, d2]) =>
        API.get(`/compare/${d1.id}/${d2.id}/`, { withCredentials: true })
          .then(res => ({ d1, d2, data: res.data }))
      )
    );

    const newResults = [];
    let anyCodeError = false;

    settled.forEach((outcome) => {
      if (outcome.status === "fulfilled") {
        const { d1, d2, data } = outcome.value;
        const pct = typeof data.similarity_percentage === "number" && !isNaN(data.similarity_percentage)
          ? Math.round(data.similarity_percentage)
          : 0;
        newResults.push({
          type:                  "result",
          document_1_name:       d1.originalName,
          document_2_name:       d2.originalName,
          similarity_percentage: pct,
          severity:              data.severity || null,
        });
      } else {
        // Extract the pair info from the rejection reason
        // Promise.allSettled gives us the error; we tagged d1/d2 via the closure
        // We need to recover the pair — re-parse from the error context
        const err    = outcome.reason;
        const data   = err?.response?.data;
        const status = err?.response?.status;
        const msg    = data?.message || data?.error || err?.message || "Comparison failed";

        const isCode = (data?.error || "").toLowerCase().includes("code detected") ||
                       (data?.error || "").toLowerCase().includes("source code");
        if (isCode) anyCodeError = true;

        // Recover doc names: the API url is in err.config.url → /compare/id1/id2/
        let name1 = "Document", name2 = "Document";
        try {
          const parts = err?.config?.url?.split("/").filter(Boolean);
          // parts: ["compare", "id1", "id2"]
          if (parts && parts.length >= 3) {
            const id1 = parseInt(parts[parts.length - 2]);
            const id2 = parseInt(parts[parts.length - 1]);
            const doc1 = pairs.find(([a]) => a.id === id1)?.[0];
            const doc2 = pairs.find(([, b]) => b.id === id2)?.[1];
            if (doc1) name1 = doc1.originalName;
            if (doc2) name2 = doc2.originalName;
          }
        } catch {}

        newResults.push({
          type:   "skipped",
          name1,
          name2,
          reason: isCode
            ? `${msg} — use the Code Plagiarism section.`
            : `[${status || "Error"}] ${msg}`,
        });
      }
    });

    setResults(p => [...p, ...newResults]);
    if (anyCodeError) setIsCodeError(true);
    setSelectedDocs({});
    setLoading(false);
  };

  const compareSelected = () => {
    const ids  = Object.keys(selectedDocs).filter(id => selectedDocs[id]);
    if (ids.length < 2) return setError("Select at least 2 documents to compare.");
    const docs  = ids.map(id => uploadedDocs.find(d => d.id === Number(id)));
    const pairs = [];
    for (let i = 0; i < docs.length; i++)
      for (let j = i + 1; j < docs.length; j++)
        pairs.push([docs[i], docs[j]]);
    runComparisons(pairs);
  };

  const compareAll = () => {
    const pairs = [];
    for (let i = 0; i < uploadedDocs.length; i++)
      for (let j = i + 1; j < uploadedDocs.length; j++)
        pairs.push([uploadedDocs[i], uploadedDocs[j]]);
    runComparisons(pairs);
  };

  /* ── Reset: clears everything so user can start a fresh upload ── */
  const handleReset = () => {
    setFiles([]);
    setUploadedDocs([]);
    setResults([]);
    setError(null);
    setIsCodeError(false);
    setShowSelection(false);
    setSelectedDocs({});
  };

  const successResults = results.filter(r => r.type === "result");
  const skippedResults = results.filter(r => r.type === "skipped");
  const hasResults     = results.length > 0;

  /* ─────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────── */
  return (
    <div style={{ height:"100vh", background:"linear-gradient(135deg,#0a0a15 0%,#0f0f1a 50%,#1a1a2e 100%)", fontFamily:"Inter,sans-serif", position:"relative", overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <Orbs />

      {!authLoading && (
        isVerified && user
          ? <ProfileCorner user={user} onLogout={handleLogout} navigate={navigate} />
          : <GuestCorner onLogin={() => navigate("/login")} />
      )}

      {/* ══════════════ TOP BAR ══════════════ */}
      {/* paddingRight:100 reserves space for the fixed profile avatar (52px + 28px margin + buffer) */}
      <div style={{ display:"flex", alignItems:"center", gap:20, padding:"20px 48px", paddingRight:100, borderBottom:"1px solid rgba(255,255,255,0.08)", flexShrink:0, position:"relative", zIndex:10, animation:"fadeUpSmooth 0.5s cubic-bezier(0.34,1.56,0.64,1) both", backdropFilter:"blur(12px)" }}>
        <button className="sim-back" onClick={() => navigate(-1)} style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 20px", borderRadius:999, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.4)", color:"#f87171", fontWeight:600, cursor:"pointer", fontFamily:"Inter,sans-serif", fontSize:"0.9rem", transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>← Back</button>
        <span style={{ fontSize:"1.3rem" }}>📊</span>
        <span style={{ fontWeight:700, fontSize:"1.2rem", color:"#f1f5f9" }}>Document Similarity Analysis</span>

        {/* Refresh button — marginLeft:auto pushes it right but paddingRight:100 stops it colliding with profile avatar */}
        {(uploadedDocs.length > 0 || results.length > 0) && (
          <button
            onClick={handleReset}
            disabled={loading}
            style={{
              marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:8,
              padding:"10px 20px", borderRadius:999,
              background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.4)",
              color:"#fcd34d", fontWeight:600, cursor: loading ? "not-allowed" : "pointer",
              fontFamily:"Inter,sans-serif", fontSize:"0.9rem", opacity: loading ? 0.5 : 1,
              transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)"
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "rgba(251,191,36,0.22)"; e.currentTarget.style.transform = "scale(1.05)"; }}}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(251,191,36,0.1)"; e.currentTarget.style.transform = "scale(1)"; }}
          >
            🔄 New Session
          </button>
        )}
      </div>

      {/* ══════════════ SPLIT BODY ══════════════ */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", position:"relative", zIndex:5 }}>

        {/* ════ LEFT PANEL — Inputs ════ */}
        <div style={{ width:"50%", borderRight:"1px solid rgba(255,255,255,0.08)", display:"flex", flexDirection:"column", overflow:"hidden" }}>

          <div style={{ flex:1, overflowY:"auto", padding:"24px 32px 16px", scrollbarWidth:"thin", scrollbarColor:"rgba(251,191,36,0.28) transparent" }}>

            {/* ── Upload Card ── */}
            <LCard>
              <SectionLabel icon="📤">Upload Documents</SectionLabel>

              <label
                className="upload-zone-sim"
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", border:"2px dashed rgba(251,191,36,0.32)", borderRadius:18, padding:"2.5rem 1.5rem", cursor:"pointer", background:"rgba(251,191,36,0.03)", transition:"all 0.4s ease", marginBottom:"1rem" }}
              >
                <input id="fileInput" type="file" multiple accept=".txt,.pdf,.docx" onChange={handleFileChange} style={{ display:"none" }} />
                <span style={{ fontSize:"2.6rem", marginBottom:"0.75rem", animation:"floatGentle 4s ease-in-out infinite" }}>
                  {files.length > 0 ? "✅" : "📤"}
                </span>
                <p style={{ fontFamily:"Inter,sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"0.92rem", marginBottom:"0.3rem", textAlign:"center" }}>
                  {files.length > 0 ? `${files.length} file(s) selected — click to add more` : "Click to select files or drag & drop"}
                </p>
                <p style={{ fontFamily:"Inter,sans-serif", color:"#64748b", fontSize:"0.78rem", fontWeight:500 }}>
                  PDF · DOCX · TXT · Max 5 MB · Min 2 documents
                </p>
              </label>

              {/* File list */}
              {files.length > 0 && (
                <div style={{ maxHeight:210, overflowY:"auto", marginBottom:"0.9rem", scrollbarWidth:"thin", scrollbarColor:"rgba(251,191,36,0.22) transparent" }}>
                  {files.map((file, idx) => (
                    <div key={idx} className="file-item-sim" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderRadius:12, marginBottom:7, background:"rgba(251,191,36,0.05)", border:"1px solid rgba(251,191,36,0.14)", borderLeft:"3px solid rgba(251,191,36,0.55)", animationDelay:`${idx * 0.05}s` }}>
                      <span style={{ display:"flex", alignItems:"center", gap:8, fontFamily:"Inter,sans-serif", fontWeight:600, color:"#f1f5f9", fontSize:"0.84rem", minWidth:0 }}>
                        <span style={{ flexShrink:0 }}>📄</span>
                        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{file.name}</span>
                        <span style={{ color:"#64748b", fontSize:"0.72rem", flexShrink:0 }}>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); removeFile(idx); }}
                        style={{ background:"rgba(239,68,68,0.13)", border:"1px solid rgba(239,68,68,0.35)", color:"#fca5a5", padding:"5px 12px", borderRadius:8, fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:"0.78rem", cursor:"pointer", flexShrink:0, transition:"background 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.27)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.13)"}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {files.length > 0 && (
                <button
                  className="btn-sim-danger"
                  onClick={clearAllFiles}
                  style={{ width:"100%", padding:"10px 18px", border:"1px solid rgba(239,68,68,0.32)", background:"rgba(239,68,68,0.09)", color:"#fca5a5", borderRadius:12, fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:"0.85rem", cursor:"pointer", transition:"all 0.3s ease" }}
                >🗑️ Clear All Files</button>
              )}
            </LCard>

            {/* ── Selection Card ── */}
            {showSelection && uploadedDocs.length > 0 && (
              <LCard>
                <SectionLabel icon="📋">Select Documents to Compare</SectionLabel>

                {/* Status row */}
                <div style={{ display:"flex", gap:12, flexWrap:"wrap", padding:"1rem 1.2rem", borderRadius:14, background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.18)", marginBottom:"1.1rem", alignItems:"center" }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontFamily:"Inter,sans-serif", fontSize:"0.67rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Documents Ready</p>
                    <p style={{ fontFamily:"Roboto Mono,monospace", fontSize:"1.3rem", fontWeight:700, color:"#f1f5f9" }}>{uploadedDocs.length} uploaded</p>
                  </div>
                  {[
                    { label:"Selected", value: selectedCount() },
                    { label:"Pairs",    value: selectedCount() >= 2 ? calcPairs(selectedCount()) : 0 },
                  ].map(item => (
                    <div key={item.label} style={{ padding:"10px 18px", borderRadius:12, background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.2)", textAlign:"center" }}>
                      <p style={{ fontFamily:"Inter,sans-serif", fontSize:"0.66rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>{item.label}</p>
                      <p style={{ fontFamily:"Roboto Mono,monospace", fontSize:"1.2rem", fontWeight:700, color:"#fcd34d" }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Document grid */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:10, marginBottom:"1.1rem" }}>
                  {uploadedDocs.map((doc, i) => {
                    const sel = !!selectedDocs[doc.id];
                    return (
                      <div
                        key={doc.id}
                        className={`doc-card-sim${sel ? " sel-active" : ""}`}
                        onClick={() => toggleDoc(doc.id)}
                        style={{ padding:"1.1rem", borderRadius:16, position:"relative", background: sel ? "rgba(16,185,129,0.1)" : "rgba(251,191,36,0.04)", border: sel ? "2px solid rgba(16,185,129,0.5)" : "2px solid rgba(251,191,36,0.16)", boxShadow: sel ? "0 8px 24px rgba(16,185,129,0.2)" : "0 4px 12px rgba(0,0,0,0.18)", animation:`revealStagger 0.5s cubic-bezier(0.34,1.56,0.64,1) both ${i * 0.07}s`, transform: sel ? "translateY(-3px) scale(1.02)" : "none" }}
                      >
                        <div style={{ position:"absolute", top:10, right:10, width:22, height:22, borderRadius:7, border: sel ? "none" : "2px solid rgba(255,255,255,0.18)", background: sel ? "linear-gradient(135deg,#059669,#10b981)" : "rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>
                          {sel && <span style={{ color:"#fff", fontSize:"0.8rem", fontWeight:700 }}>✓</span>}
                        </div>
                        <span style={{ fontSize:"1.6rem", display:"block", marginBottom:"0.5rem" }}>📄</span>
                        <p style={{ fontFamily:"Inter,sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"0.82rem", marginBottom:"0.4rem", paddingRight:28, wordBreak:"break-word", lineHeight:1.4 }}>{doc.originalName}</p>
                        <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:999, background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.22)", fontFamily:"Roboto Mono,monospace", fontSize:"0.68rem", color:"#fcd34d", fontWeight:600 }}>ID: {doc.id}</span>
                        <p style={{ fontFamily:"Inter,sans-serif", fontSize:"0.73rem", color: sel ? "#6ee7b7" : "#64748b", fontWeight:500, marginTop:"0.5rem", fontStyle:"italic" }}>
                          {sel ? "✓ Selected" : "Click to select"}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Compare buttons */}
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <SimBtn
                    cls="btn-sim-success" onClick={compareSelected}
                    disabled={loading || selectedCount() < 2}
                    bg="linear-gradient(135deg,#059669,#10b981,#34d399)" color="#fff"
                    shadow="0 12px 36px rgba(16,185,129,0.4)"
                    style={{ flex:1, minWidth:180 }}
                  >
                    {loading && <Spinner />}
                    {loading ? "Analyzing…" : `✅ Compare Selected (${selectedCount() >= 2 ? calcPairs(selectedCount()) : 0} pairs)`}
                  </SimBtn>
                  <SimBtn
                    cls="btn-sim-neutral" onClick={compareAll}
                    disabled={loading}
                    bg="linear-gradient(135deg,#4f46e5,#6366f1,#818cf8)" color="#fff"
                    shadow="0 12px 36px rgba(99,102,241,0.4)"
                    style={{ flex:1, minWidth:180 }}
                  >
                    {loading && <Spinner />}
                    {loading ? "Analyzing…" : `🔀 Compare All (${calcPairs(uploadedDocs.length)} pairs)`}
                  </SimBtn>
                </div>

                {/* Comparison-level errors (non-code) */}
                {error && showSelection && !isCodeError && <ErrorBanner msg={error} />}
                {error && showSelection && isCodeError  && <CodeWarningBanner msg={error} />}
              </LCard>
            )}
          </div>

          {/* ── Upload button pinned at bottom ── */}
          <div style={{ padding:"18px 32px 26px", borderTop:"1px solid rgba(255,255,255,0.08)", background:"rgba(10,10,21,0.92)", backdropFilter:"blur(16px)", flexShrink:0 }}>
            {/* Upload-level errors */}
            {error && !showSelection && !isCodeError && <ErrorBanner msg={error} />}
            {error && !showSelection &&  isCodeError && <CodeWarningBanner msg={error} />}

            <div style={{ marginTop: error && !showSelection ? 12 : 0 }}>
              <SimBtn
                cls="btn-sim-upload" onClick={uploadFiles}
                disabled={loading || files.length < 2}
                bg="linear-gradient(135deg,#d97706,#f59e0b,#fbbf24)" color="#0a0a15"
                shadow="0 14px 44px rgba(251,191,36,0.45)"
                style={{ width:"100%", padding:"16px 24px", fontSize:"1rem" }}
              >
                {loading && <Spinner dark />}
                {loading ? "Uploading…" : `📤 Upload ${files.length || 0} Documents`}
              </SimBtn>
            </div>
          </div>
        </div>

        {/* ════ RIGHT PANEL — Results ════ */}
        <div style={{ width:"50%", overflowY:"auto", padding:"24px 32px 40px", scrollbarWidth:"thin", scrollbarColor:"rgba(251,191,36,0.28) transparent", background:"rgba(0,0,0,0.1)", backdropFilter:"blur(8px)" }}>

          {/* Empty state */}
          {!hasResults && !loading && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", textAlign:"center", opacity:0.99 }}>
              <span style={{ fontSize:"4.5rem", marginBottom:"1.2rem" }}>📊</span>
              <p style={{ fontFamily:"Inter,sans-serif", fontWeight:700, color:"#94a3b8", fontSize:"1.1rem", marginBottom:"0.5rem" }}>Results will appear here</p>
              <p style={{ fontFamily:"Inter,sans-serif", color:"#64748b", fontSize:"0.86rem", maxWidth:280, lineHeight:1.7 }}>
                Upload at least 2 documents, select them, then click Compare.
              </p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:18, animation:"fadeInSmooth 0.4s ease both" }}>
              <div style={{ width:52, height:52, borderRadius:"50%", border:"4px solid rgba(251,191,36,0.2)", borderTopColor:"#f59e0b", animation:"spinSmooth 1s linear infinite" }} />
              <p style={{ fontFamily:"Inter,sans-serif", fontWeight:700, color:"#94a3b8", fontSize:"1rem" }}>Running comparison…</p>
              <p style={{ fontFamily:"Inter,sans-serif", color:"#64748b", fontSize:"0.83rem" }}>Analysing document pairs</p>
            </div>
          )}

          {/* Results */}
          {hasResults && (
            <div style={{ animation:"fadeInSmooth 0.5s ease both" }}>

              {/* Divider */}
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:"1.4rem" }}>
                <div style={{ flex:1, height:2, background:"linear-gradient(90deg,rgba(251,191,36,0.55),transparent)" }} />
                <span style={{ fontFamily:"Inter,sans-serif", fontSize:"0.7rem", fontWeight:700, color:"#fcd34d", letterSpacing:"0.15em", textTransform:"uppercase", background:"rgba(10,10,21,0.9)", padding:"6px 16px", borderRadius:999, border:"1px solid rgba(251,191,36,0.3)" }}>Similarity Report</span>
                <div style={{ flex:1, height:2, background:"linear-gradient(90deg,transparent,rgba(251,191,36,0.55))" }} />
              </div>

              {/* Summary stat cards */}
              <div style={{ display:"flex", gap:10, marginBottom:"1.4rem" }}>
                {[
                  { icon:"📄", label:"TOTAL",      value: successResults.length,                                                                                                    accent:"#fcd34d" },
                  { icon:"🔴", label:"HIGH RISK",   value: successResults.filter(r => r.similarity_percentage >= 70).length,                                                        accent:"#f87171" },
                  { icon:"🟡", label:"MEDIUM RISK", value: successResults.filter(r => r.similarity_percentage >= 40 && r.similarity_percentage < 70).length,                        accent:"#fbbf24" },
                  { icon:"🟢", label:"LOW RISK",    value: successResults.filter(r => r.similarity_percentage < 40).length,                                                         accent:"#4ade80" },
                  ...(skippedResults.length > 0 ? [{ icon:"⏭️", label:"SKIPPED", value: skippedResults.length, accent:"#94a3b8" }] : []),
                ].map(card => (
                  <div key={card.label} style={{ flex:1, padding:"0.9rem 0.7rem", borderRadius:14, background:"rgba(251,191,36,0.04)", border:`1px solid ${card.accent}28`, position:"relative", overflow:"hidden", animation:"revealStagger 0.5s ease both" }}>
                    <div style={{ position:"absolute", top:0, left:"-10%", right:"-10%", height:2, background:`linear-gradient(90deg,transparent,${card.accent}70,transparent)`, animation:"shimmerGlow 4s ease-in-out infinite" }} />
                    <p style={{ fontSize:"1.1rem", marginBottom:"0.3rem" }}>{card.icon}</p>
                    <p style={{ fontFamily:"Inter,sans-serif", fontSize:"0.58rem", color:"#64748b", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.2rem" }}>{card.label}</p>
                    <p style={{ fontFamily:"Roboto Mono,monospace", fontSize:"1.35rem", fontWeight:700, color:card.accent }}>{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Result rows */}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {results.map((r, i) => {
                  // ── Skipped pair ──
                  if (r.type === "skipped") {
                    return <SkippedRow key={i} name1={r.name1} name2={r.name2} reason={r.reason} index={i} />;
                  }

                  // ── Successful comparison ──
                  const pct = typeof r.similarity_percentage === "number" && !isNaN(r.similarity_percentage)
                    ? Math.round(r.similarity_percentage)
                    : 0;
                  const sev = getSeverity(pct);

                  return (
                    <div key={i} className="result-row-sim" style={{ padding:"1.2rem 1.3rem", borderRadius:18, background:sev.bg, border:`1px solid ${sev.border}`, boxShadow:`0 6px 20px rgba(0,0,0,0.22),0 0 0 1px ${sev.glow}`, animation:`revealStagger 0.5s cubic-bezier(0.34,1.56,0.64,1) both ${i * 0.08}s`, position:"relative", overflow:"hidden" }}>
                      <div style={{ position:"absolute", top:0, left:"-10%", right:"-10%", height:2, background:`linear-gradient(90deg,transparent,${sev.color}80,transparent)`, animation:"shimmerGlow 4s ease-in-out infinite" }} />

                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:"0.9rem" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          {[r.document_1_name, r.document_2_name].map((name, ni) => (
                            <div key={ni} style={{ display:"flex", alignItems:"center", gap:8, marginBottom: ni === 0 ? 6 : 0 }}>
                              <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:20, height:20, borderRadius:6, background:"rgba(255,255,255,0.09)", fontFamily:"Inter,sans-serif", fontSize:"0.62rem", fontWeight:700, color:"#94a3b8", flexShrink:0 }}>{ni + 1}</span>
                              <span style={{ fontFamily:"Inter,sans-serif", fontWeight:600, color:"#f1f5f9", fontSize:"0.85rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", flexShrink:0 }}>
                          <span style={{ fontFamily:"Roboto Mono,monospace", fontSize:"2rem", fontWeight:700, color:sev.color, lineHeight:1, letterSpacing:"-0.03em" }}>
                            {pct}%
                          </span>
                          <span style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:5, padding:"4px 12px", borderRadius:999, background:sev.bg, border:`1px solid ${sev.border}`, fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:"0.72rem", color:sev.color, textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>
                            <span style={{ width:6, height:6, borderRadius:"50%", background:sev.dot, display:"inline-block" }} />
                            {sev.label}
                          </span>
                        </div>
                      </div>

                      <div style={{ height:7, borderRadius:999, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:999, width:`${pct}%`, background:sev.bar, transition:"width 1.4s cubic-bezier(0.34,1.56,0.64,1)" }} />
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                        <span style={{ fontFamily:"Inter,sans-serif", fontSize:"0.64rem", color:"#374151" }}>0%</span>
                        <span style={{ fontFamily:"Inter,sans-serif", fontSize:"0.64rem", color:"#374151" }}>100%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ display:"flex", gap:18, marginTop:"1.2rem", padding:"0.9rem 1.1rem", borderRadius:13, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", flexWrap:"wrap" }}>
                {[
                  { label:"Low Risk",    color:"#4ade80", desc:"< 40%"    },
                  { label:"Medium Risk", color:"#fbbf24", desc:"40 – 70%" },
                  { label:"High Risk",   color:"#f87171", desc:"> 70%"    },
                  ...(skippedResults.length > 0 ? [{ label:"Skipped", color:"#94a3b8", desc:"code / error" }] : []),
                ].map(item => (
                  <div key={item.label} style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ width:9, height:9, borderRadius:"50%", background:item.color, display:"inline-block" }} />
                    <span style={{ fontFamily:"Inter,sans-serif", fontSize:"0.78rem", color:"#94a3b8", fontWeight:600 }}>
                      {item.label} <span style={{ color:"#4b5563" }}>({item.desc})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}