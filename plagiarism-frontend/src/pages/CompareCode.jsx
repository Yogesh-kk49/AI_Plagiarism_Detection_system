import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { jsPDF } from "jspdf";

const injectStyles = () => {
  if (document.getElementById("compare-styles")) return;
  const tag = document.createElement("style");
  tag.id = "compare-styles";
  tag.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @keyframes fadeUpSmooth  { from{opacity:0;transform:translateY(24px);}  to{opacity:1;transform:translateY(0);} }
    @keyframes fadeInSmooth  { from{opacity:0;}                             to{opacity:1;} }
    @keyframes slideDownGlow { from{opacity:0;transform:translateY(-16px);} to{opacity:1;transform:translateY(0);} }
    @keyframes spinSmooth    { to{transform:rotate(360deg);} }
    @keyframes shakeError    { 0%,100%{transform:translateX(0);} 20%,60%{transform:translateX(-6px);} 40%,80%{transform:translateX(6px);} }
    @keyframes scaleInGlow   { from{opacity:0;transform:scale(0.88);} to{opacity:1;transform:scale(1);} }
    @keyframes badgePulse    { 0%{transform:scale(0);} 50%{transform:scale(1.2);} 100%{transform:scale(1);} }
    @keyframes pulseDotSoft  { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(0.8);} }
    @keyframes revealStagger { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
    @keyframes orbFloat1     { 0%,100%{transform:translate(0,0) scale(1);} 40%{transform:translate(45px,-35px) scale(1.05);} 70%{transform:translate(-20px,20px) scale(0.95);} }
    @keyframes orbFloat2     { 0%,100%{transform:translate(0,0) scale(1);} 35%{transform:translate(-45px,25px) scale(1.05);} 70%{transform:translate(25px,-40px) scale(0.95);} }

    body { background: linear-gradient(135deg,#0a0a15 0%,#0f0f1a 50%,#1a1a2e 100%); overflow-x:hidden; }

    .ca-back:hover {
      background: rgba(239,68,68,0.18) !important;
      border-color: rgba(239,68,68,0.6) !important;
      color: #fecaca !important;
      transform: translateX(-2px);
    }
    .ca-compare-btn:hover { transform:translateY(-2px) scale(1.01); box-shadow:0 12px 40px rgba(99,102,241,0.5)!important; }
    .ca-textarea:focus    { border-color:rgba(99,102,241,0.7)!important; box-shadow:0 0 0 3px rgba(99,102,241,0.15)!important; outline:none; }
    .ca-upload-zone:hover { border-color:rgba(99,102,241,0.6)!important; background:rgba(99,102,241,0.1)!important; }
    .ca-tab:hover         { background:rgba(255,255,255,0.08)!important; }
    .ca-tab.active        { background:rgba(99,102,241,0.25)!important; border-color:rgba(99,102,241,0.6)!important; color:#a5b4fc!important; }
    .profile-avatar       { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
    .profile-avatar:hover { transform: scale(1.12) rotate(5deg); box-shadow: 0 12px 40px rgba(99,102,241,0.4); }
    .logout-btn:hover     { background: rgba(239,68,68,0.2) !important; color: #fca5a5 !important; border-color: rgba(239,68,68,0.5) !important; transform: translateX(-2px); }
    .history-btn:hover    { background: rgba(124,58,237,0.25) !important; color: #c4b5fd !important; transform: translateX(-2px); }
    .signin-corner:hover  { background: rgba(99,102,241,0.25) !important; border-color: rgba(99,102,241,0.7) !important; transform: scale(1.05); }

    ::-webkit-scrollbar       { width:4px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:rgba(99,102,241,0.3); border-radius:4px; }
  `;
  document.head.appendChild(tag);
};

// ─── Colour helpers ───────────────────────────────────────────────────────────
const getSimilarityColor = (pct) => {
  if (pct >= 75) return { color:"#f87171", glow:"rgba(248,113,113,0.3)", bg:"rgba(248,113,113,0.1)" };
  if (pct >= 40) return { color:"#fbbf24", glow:"rgba(251,191,36,0.3)",  bg:"rgba(251,191,36,0.1)"  };
  return               { color:"#34d399", glow:"rgba(52,211,153,0.3)",  bg:"rgba(52,211,153,0.1)"  };
};

const getSimilarityLabel = (pct) => {
  if (pct >= 75) return { label:"High Plagiarism",     emoji:"🚨", badge:"⚠️ Plagiarism Detected" };
  if (pct >= 40) return { label:"Moderate Similarity", emoji:"🔶", badge:"🔶 Review Recommended"  };
  return               { label:"Low Similarity",       emoji:"✅", badge:"✅ Likely Original"      };
};

// ─── Data extractors ─────────────────────────────────────────────────────────
const extractPercentage = (data) => {
  if (!data) return null;
  if (typeof data.final_score      === "number") return Math.round(data.final_score      * 100) / 100;
  if (typeof data.similarity       === "number") return Math.round(data.similarity       * 100) / 100;
  if (typeof data.similarity_score === "number") return Math.round(data.similarity_score * 100) / 100;
  if (typeof data.score            === "number") return Math.round(data.score            * 100) / 100;
  const val = data.similarity ?? data.similarity_score ?? data.score ?? null;
  if (val !== null && val <= 1) return Math.round(val * 10000) / 100;
  if (val !== null)             return Math.round(val * 100)   / 100;
  return null;
};

const extractBatchResults = (data) => {
  if (!data)                           return null;
  if (Array.isArray(data.results))     return data.results;
  if (Array.isArray(data.comparisons)) return data.comparisons;
  if (Array.isArray(data))             return data;
  return null;
};

const parseApiError = (err) => {
  if (!err?.response) return { headline:"Network Error", detail:"Could not reach the server.", rejected:[] };
  const status = err.response.status;
  const data   = err.response?.data;
  if (!data) return { headline:`Server Error (${status})`, detail:"An unexpected error occurred.", rejected:[] };
  return {
    headline: data.error  || `Error ${status}`,
    detail:   data.detail || data.suggestion || data.message || "",
    rejected: Array.isArray(data.rejected_files) ? data.rejected_files : [],
  };
};

// ─── Orbs ─────────────────────────────────────────────────────────────────────
const Orbs = () => (
  <>
    <div style={{ position:"fixed", top:"10%", left:"2%", width:600, height:600, borderRadius:"50%",
      background:"radial-gradient(circle at 30% 30%, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.08) 30%, transparent 70%)",
      animation:"orbFloat1 16s ease-in-out infinite", pointerEvents:"none", zIndex:0 }} />
    <div style={{ position:"fixed", bottom:"8%", right:"2%", width:700, height:700, borderRadius:"50%",
      background:"radial-gradient(circle at 70% 20%, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.06) 35%, transparent 75%)",
      animation:"orbFloat2 20s ease-in-out infinite reverse", pointerEvents:"none", zIndex:0 }} />
  </>
);

// ─── ProfileCorner ────────────────────────────────────────────────────────────
const ProfileCorner = ({ user, onLogout, navigate }) => {
  const [open, setOpen] = useState(false);
  const initials = user?.name ? user.name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase() : "?";
  return (
    <div style={{position:"fixed", top:20, right:28, zIndex:400, animation:"slideDownGlow 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.3s"}}>
      <div style={{position:"relative"}}>
        <button className="profile-avatar" onClick={()=>setOpen(o=>!o)} style={{
          width:52, height:52, borderRadius:"50%", border:"2px solid rgba(99,102,241,0.6)",
          background:"linear-gradient(135deg, rgba(15,15,26,0.95), rgba(25,25,40,0.9))",
          padding:0, cursor:"pointer", boxShadow:"0 8px 32px rgba(0,0,0,0.5), 0 0 0 4px rgba(99,102,241,0.15)",
          overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center",
          backdropFilter:"blur(20px)", transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)"
        }}>
          {user?.picture ? (
            <img src={user.picture} alt={user.name||""} referrerPolicy="no-referrer" crossOrigin="anonymous"
              style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}
              onError={e=>{ e.currentTarget.onerror=null; e.currentTarget.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name||"User")}&background=6366f1&color=fff&bold=true&size=128`; }}
            />
          ) : (
            <span style={{fontFamily:"Inter, sans-serif", fontWeight:700, fontSize:16, color:"#a5b4fc"}}>{initials}</span>
          )}
        </button>
        <span style={{ position:"absolute", bottom:2, right:2, width:12, height:12, borderRadius:"50%",
          background:"linear-gradient(135deg, #22c55e, #4ade80)", border:"2px solid rgba(15,15,26,0.9)",
          animation:"badgePulse 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.6s, pulseDotSoft 2s ease-in-out infinite 1s" }} />

        {open && (
          <>
            <div onClick={()=>setOpen(false)} style={{position:"fixed", inset:0, zIndex:-1}} />
            <div style={{
              position:"absolute", top:64, right:0, zIndex:500,
              background:"linear-gradient(135deg, rgba(13,13,22,0.98), rgba(20,20,35,0.95))",
              backdropFilter:"blur(32px)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:20,
              padding:"1.5rem", minWidth:280, boxShadow:"0 32px 80px rgba(0,0,0,0.7)",
              animation:"scaleInGlow 0.3s cubic-bezier(0.34,1.56,0.64,1) both", transformOrigin:"top right"
            }}>
              <div style={{marginBottom:"1rem", paddingBottom:"1rem", borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                <p style={{fontFamily:"Inter, sans-serif", fontWeight:700, color:"#f1f5f9", fontSize:"1rem", marginBottom:4}}>{user?.name||"—"}</p>
                <p style={{fontFamily:"Inter, sans-serif", color:"#94a3b8", fontSize:"0.85rem"}}>{user?.email||"—"}</p>
                <div style={{display:"inline-flex", alignItems:"center", gap:6, marginTop:8, padding:"4px 12px", borderRadius:999,
                  background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.4)", fontSize:"0.75rem", color:"#86efac",
                  fontFamily:"Inter, sans-serif", fontWeight:600}}>
                  <span style={{width:6, height:6, borderRadius:"50%", background:"#22c55e", display:"inline-block"}} /> 2FA Verified
                </div>
              </div>
              <button className="history-btn" onClick={()=>{setOpen(false);navigate("/history");}} style={{
                width:"100%", padding:"0.8rem 1rem", borderRadius:14, border:"1px solid rgba(124,58,237,0.4)",
                background:"rgba(124,58,237,0.12)", color:"#c4b5fd", fontFamily:"Inter, sans-serif", fontWeight:600,
                fontSize:"0.9rem", cursor:"pointer", transition:"all 0.3s ease", marginBottom:"0.75rem",
                textAlign:"left", display:"flex", alignItems:"center", gap:8
              }}>📜 View Analysis History</button>
              <button className="logout-btn" onClick={onLogout} style={{
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

// ─── GuestCorner ──────────────────────────────────────────────────────────────
const GuestCorner = ({ onLogin }) => (
  <div style={{position:"fixed", top:24, right:32, zIndex:400, animation:"slideDownGlow 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.3s"}}>
    <button className="signin-corner" onClick={onLogin} style={{
      padding:"12px 28px", borderRadius:999, border:"1px solid rgba(99,102,241,0.4)",
      background:"rgba(99,102,241,0.12)", color:"#a5b4fc", fontFamily:"Inter, sans-serif",
      fontWeight:600, fontSize:"0.9rem", cursor:"pointer", transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      backdropFilter:"blur(20px)"
    }}>Sign In</button>
  </div>
);

// ─── Error Banner ─────────────────────────────────────────────────────────────
const ErrorBanner = ({ error, onDismiss }) => {
  if (!error) return null;
  const { headline, detail, rejected } = error;
  const isNotCodeError = headline.toLowerCase().includes("not") || headline.toLowerCase().includes("code");
  return (
    <div style={{borderRadius:14, border:"1px solid rgba(248,113,113,0.45)", background:"rgba(248,113,113,0.08)", padding:"1rem 1.2rem", animation:"shakeError 0.4s ease, fadeUpSmooth 0.35s ease both", position:"relative"}}>
      <button onClick={onDismiss} style={{position:"absolute",top:10,right:12,background:"none",border:"none",cursor:"pointer",color:"rgba(248,113,113,0.7)",fontSize:"1rem"}}>✕</button>
      <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:(detail||rejected.length)?8:0}}>
        <span style={{fontSize:"1.3rem",flexShrink:0}}>🚫</span>
        <p style={{fontFamily:"Inter,sans-serif",fontWeight:700,fontSize:"0.9rem",color:"#f87171",lineHeight:1.4,paddingRight:20}}>{headline}</p>
      </div>
      {detail && <p style={{fontFamily:"Inter,sans-serif",fontSize:"0.82rem",color:"#fca5a5",lineHeight:1.5,paddingLeft:"2.1rem",marginBottom:rejected.length?8:0}}>{detail}</p>}
      {rejected.length>0 && (
        <div style={{paddingLeft:"2.1rem",display:"flex",flexDirection:"column",gap:6}}>
          {rejected.map((f,i)=>(
            <div key={i} style={{padding:"0.5rem 0.8rem",borderRadius:10,background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.25)"}}>
              <p style={{fontFamily:"Inter,sans-serif",fontWeight:700,fontSize:"0.8rem",color:"#fca5a5",marginBottom:2}}>📄 {f.filename}</p>
              <p style={{fontFamily:"Inter,sans-serif",fontSize:"0.75rem",color:"#f87171",opacity:0.85}}>{f.reason}</p>
              {f.suggestion&&<p style={{fontFamily:"Inter,sans-serif",fontSize:"0.72rem",color:"#94a3b8",marginTop:2}}>💡 {f.suggestion}</p>}
            </div>
          ))}
        </div>
      )}
      {isNotCodeError&&<p style={{fontFamily:"Inter,sans-serif",fontSize:"0.75rem",color:"#94a3b8",paddingLeft:"2.1rem",marginTop:10}}>💡 Only source code files are accepted — .py · .java · .cpp · .js · .ts · .c · .go · .php</p>}
    </div>
  );
};

// ─── SVG Ring ─────────────────────────────────────────────────────────────────
const PercentageRing = ({ pct }) => {
  const { color, glow } = getSimilarityColor(pct);
  const r = 44, circ = 2 * Math.PI * r, dash = (pct/100)*circ;
  return (
    <svg width="120" height="120" style={{filter:`drop-shadow(0 0 16px ${glow})`}}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9"/>
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 60 60)"
        style={{transition:"stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)"}}/>
      <text x="60" y="55" textAnchor="middle" fill={color} style={{fontSize:"1.3rem",fontWeight:700,fontFamily:"Inter,sans-serif"}}>{pct}%</text>
      <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.4)" style={{fontSize:"0.55rem",fontFamily:"Inter,sans-serif",fontWeight:600,letterSpacing:"0.05em"}}>SIMILARITY</text>
    </svg>
  );
};

// ─── Single Result ────────────────────────────────────────────────────────────
const SingleResult = ({ result }) => {
  const pct = extractPercentage(result);
  if (pct === null) return <pre style={{color:"#e2e8f0",fontFamily:"Roboto Mono,monospace",fontSize:"0.8rem",lineHeight:1.6}}>{JSON.stringify(result,null,2)}</pre>;
  const { color, bg } = getSimilarityColor(pct);
  const { label, emoji, badge } = getSimilarityLabel(pct);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:"2rem",flexWrap:"wrap"}}>
        <PercentageRing pct={pct} />
        <div>
          <p style={{fontFamily:"Inter,sans-serif",fontWeight:800,fontSize:"1.6rem",color,marginBottom:6,letterSpacing:"-0.02em"}}>{emoji} {label}</p>
          <p style={{fontFamily:"Inter,sans-serif",fontSize:"0.88rem",color:"#94a3b8",marginBottom:14,lineHeight:1.5}}>
            These two code snippets are <strong style={{color}}>{pct}%</strong> similar.
          </p>
          <span style={{display:"inline-block",padding:"8px 20px",borderRadius:999,background:bg,border:`1px solid ${color}`,color,fontFamily:"Inter,sans-serif",fontWeight:700,fontSize:"0.85rem",boxShadow:`0 4px 20px ${color}40`}}>{badge}</span>
        </div>
      </div>
      <div style={{padding:"1.4rem 1.6rem",borderRadius:16,background:pct>=75?"rgba(248,113,113,0.12)":pct>=40?"rgba(251,191,36,0.1)":"rgba(52,211,153,0.1)",border:`1px solid ${color}50`,display:"flex",alignItems:"center",gap:14,animation:"revealStagger 0.5s ease both 0.2s"}}>
        <span style={{fontSize:"2.5rem"}}>{pct>=75?"🚨":pct>=40?"⚠️":"✅"}</span>
        <div>
          <p style={{fontFamily:"Inter,sans-serif",fontWeight:700,fontSize:"1rem",color,marginBottom:4}}>
            {pct>=75?"High Plagiarism Detected":pct>=40?"Moderate Similarity — Review Needed":"Low Similarity — Content Appears Original"}
          </p>
          <p style={{fontFamily:"Inter,sans-serif",fontSize:"0.82rem",color:"#94a3b8",lineHeight:1.5}}>
            {pct>=75?"These snippets share substantial code. Manual review strongly recommended.":pct>=40?"Some structural or logic overlap detected. Consider reviewing shared patterns.":"No significant overlapping code structure found between these snippets."}
          </p>
        </div>
      </div>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontFamily:"Inter,sans-serif",fontSize:"0.78rem",fontWeight:600,color:"#94a3b8"}}>Similarity Score</span>
          <span style={{fontFamily:"Inter,sans-serif",fontSize:"0.78rem",fontWeight:700,color}}>{pct}%</span>
        </div>
        <div style={{height:10,borderRadius:999,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:999,width:`${pct}%`,background:`linear-gradient(90deg,${color},${color}cc)`,transition:"width 1.5s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:`0 0 12px ${color}60`}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
          <span style={{fontFamily:"Inter,sans-serif",fontSize:"0.68rem",color:"#34d399",fontWeight:600}}>LOW</span>
          <span style={{fontFamily:"Inter,sans-serif",fontSize:"0.68rem",color:"#f87171",fontWeight:600}}>HIGH</span>
        </div>
      </div>
    </div>
  );
};

// ─── Batch Result ─────────────────────────────────────────────────────────────
const BatchResult = ({ result }) => {
  const rows = extractBatchResults(result);
  if (!rows) return <pre style={{color:"#e2e8f0",fontFamily:"Roboto Mono,monospace",fontSize:"0.8rem",lineHeight:1.6}}>{JSON.stringify(result,null,2)}</pre>;

  const sorted = [...rows].sort((a,b) => (extractPercentage(b)??0) - (extractPercentage(a)??0));
  const highCount = sorted.filter(r=>(extractPercentage(r)??0)>=75).length;
  const modCount  = sorted.filter(r=>{ const p=extractPercentage(r)??0; return p>=40&&p<75; }).length;
  const lowCount  = sorted.filter(r=>(extractPercentage(r)??0)<40).length;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:4}}>
        {highCount>0&&<span style={{padding:"6px 14px",borderRadius:999,background:"rgba(248,113,113,0.12)",border:"1px solid rgba(248,113,113,0.35)",color:"#f87171",fontFamily:"Inter,sans-serif",fontWeight:700,fontSize:"0.8rem"}}>🚨 {highCount} High</span>}
        {modCount>0&&<span style={{padding:"6px 14px",borderRadius:999,background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.35)",color:"#fbbf24",fontFamily:"Inter,sans-serif",fontWeight:700,fontSize:"0.8rem"}}>⚠️ {modCount} Moderate</span>}
        {lowCount>0&&<span style={{padding:"6px 14px",borderRadius:999,background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.35)",color:"#34d399",fontFamily:"Inter,sans-serif",fontWeight:700,fontSize:"0.8rem"}}>✅ {lowCount} Low</span>}
      </div>
      {sorted.map((row, i) => {
        const pct = extractPercentage(row);
        const file1 = row.file1 ?? row.code1 ?? `File ${i*2+1}`;
        const file2 = row.file2 ?? row.code2 ?? `File ${i*2+2}`;
        const { color, bg } = pct!==null ? getSimilarityColor(pct) : {color:"#94a3b8",bg:"transparent"};
        const { label, emoji } = pct!==null ? getSimilarityLabel(pct) : {label:"Unknown",emoji:"❓"};
        return (
          <div key={i} style={{padding:"1.2rem 1.4rem",borderRadius:16,background:"rgba(255,255,255,0.04)",border:`1px solid ${pct!==null?color+"30":"rgba(255,255,255,0.08)"}`,animation:`revealStagger 0.5s ease both ${i*0.06}s`,transition:"all 0.3s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{flex:1}}>
                <p style={{fontFamily:"Inter,sans-serif",fontSize:"0.88rem",color:"#f1f5f9",fontWeight:600,marginBottom:2}}>📄 {file1}</p>
                <p style={{fontFamily:"Inter,sans-serif",fontSize:"0.78rem",color:"#64748b",fontWeight:500}}>vs 📄 {file2}</p>
              </div>
              {pct!==null&&(
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                  <span style={{padding:"5px 14px",borderRadius:999,background:bg,border:`1px solid ${color}`,color,fontFamily:"Inter,sans-serif",fontWeight:700,fontSize:"0.9rem",boxShadow:`0 4px 12px ${color}40`}}>{pct}%</span>
                  <span style={{fontFamily:"Inter,sans-serif",fontSize:"0.72rem",fontWeight:700,color,letterSpacing:"0.04em"}}>{emoji} {label}</span>
                </div>
              )}
            </div>
            {pct!==null&&(
              <div>
                <div style={{height:8,borderRadius:999,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:999,width:`${pct}%`,background:`linear-gradient(90deg,${color},${color}bb)`,transition:"width 1.2s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:`0 0 10px ${color}50`}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                  <span style={{fontFamily:"Inter,sans-serif",fontSize:"0.65rem",color:"#34d399",fontWeight:600}}>LOW</span>
                  <span style={{fontFamily:"Inter,sans-serif",fontSize:"0.65rem",color:"#f87171",fontWeight:600}}>HIGH</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── PDF Download Function ────────────────────────────────────────────────────
const generatePDF = (result, resultMode, isPasted = false) => {
  if (!result) {
    alert("No result available to export.");
    return;
  }

  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const colors = {
    text: [31, 41, 55],
    muted: [107, 114, 128],
    lightText: [156, 163, 175],
    border: [229, 231, 235],
    card: [248, 250, 252],
    white: [255, 255, 255],
    primary: [99, 102, 241],
    primarySoft: [224, 231, 255],
    success: [22, 163, 74],
    successSoft: [220, 252, 231],
    warning: [217, 119, 6],
    warningSoft: [254, 243, 199],
    danger: [220, 38, 38],
    dangerSoft: [254, 226, 226],
    barBg: [229, 231, 235],
    headerBg: [15, 23, 42],
    sectionBg: [241, 245, 249],
  };

  const formatDate = () => new Date().toLocaleString();

  const getSeverityForPDF = (pct) => {
    if (pct >= 75) {
      return { label: "High Plagiarism", color: colors.danger, soft: colors.dangerSoft };
    }
    if (pct >= 40) {
      return { label: "Moderate Similarity", color: colors.warning, soft: colors.warningSoft };
    }
    return { label: "Low Similarity", color: colors.success, soft: colors.successSoft };
  };

  const addPageIfNeeded = (requiredHeight = 20) => {
    if (y + requiredHeight > pageHeight - 16) {
      pdf.addPage();
      y = 18;
      drawPageHeaderMini();
    }
  };

  const drawText = (text, x, yPos, options = {}) => {
    const {
      size = 10,
      color = colors.text,
      style = "normal",
      align = "left",
      maxWidth,
    } = options;

    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);

    const safeText = text == null ? "" : String(text);

    if (maxWidth) {
      const lines = pdf.splitTextToSize(safeText, maxWidth);
      pdf.text(lines, x, yPos, { align });
      return lines.length * (size * 0.42);
    }

    pdf.text(safeText, x, yPos, { align });
    return size * 0.42;
  };

  const drawRoundedBox = (x, yPos, w, h, fillColor, radius = 4) => {
    pdf.setFillColor(...fillColor);
    pdf.roundedRect(x, yPos, w, h, radius, radius, "F");
  };

  const drawStatusChip = (label, x, yPos, color, softColor) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    const textWidth = pdf.getTextWidth(label);
    const chipWidth = textWidth + 10;
    const chipHeight = 7;

    pdf.setFillColor(...softColor);
    pdf.roundedRect(x, yPos, chipWidth, chipHeight, 3, 3, "F");
    pdf.setTextColor(...color);
    pdf.text(label, x + chipWidth / 2, yPos + 4.7, { align: "center" });
  };

  const drawProgressBar = (x, yPos, w, h, pct, fillColor) => {
    const safePct = Math.max(0, Math.min(Number(pct) || 0, 100));

    pdf.setFillColor(...colors.barBg);
    pdf.roundedRect(x, yPos, w, h, 2, 2, "F");

    const fillWidth = Math.max((w * safePct) / 100, safePct > 0 ? 2 : 0);
    pdf.setFillColor(...fillColor);
    pdf.roundedRect(x, yPos, fillWidth, h, 2, 2, "F");
  };

  const drawPageHeaderMini = () => {
    pdf.setDrawColor(...colors.border);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;

    drawText("Code Plagiarism Report", margin, y, {
      size: 11,
      style: "bold",
      color: colors.text,
    });

    drawText(`Generated: ${formatDate()}`, pageWidth - margin, y, {
      size: 8,
      color: colors.muted,
      align: "right",
    });

    y += 8;
  };

  // Header background
  pdf.setFillColor(...colors.headerBg);
  pdf.rect(0, 0, pageWidth, 26, "F");
  
  // Main title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.setTextColor(...colors.white);
  pdf.text("Code Plagiarism Report", margin, 11);
  
  // Subtitle with date
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(180, 210, 220);
  pdf.text(`Generated: ${formatDate()}`, margin, 19);
  
  // Bottom border line
  pdf.setDrawColor(...colors.border);
  pdf.setLineWidth(0.3);
  pdf.line(margin, 28, pageWidth - margin, 28);

  y = 38;

  if (resultMode === "single") {
    // ──── SINGLE RESULT ────
    const pct = extractPercentage(result);
    if (pct === null) {
      drawText("Unable to extract similarity percentage from result.", margin, y, {
        size: 10,
        color: colors.muted,
      });
      pdf.save("Code_Comparison_Report.pdf");
      return;
    }

    const severity = getSeverityForPDF(pct);

    // Source information
    addPageIfNeeded(16);
    drawText("Source Information", margin, y, {
      size: 11,
      style: "bold",
      color: colors.text,
    });
    y += 6;

    if (isPasted) {
      drawText("Source 1: Pasted Code", margin + 2, y, {
        size: 9,
        color: colors.muted,
      });
      y += 5;
      drawText("Source 2: Pasted Code", margin + 2, y, {
        size: 9,
        color: colors.muted,
      });
    }
    y += 8;

    // Overview section
    addPageIfNeeded(40);
    drawText("Similarity Overview", margin, y, {
      size: 12,
      style: "bold",
      color: colors.text,
    });
    y += 7;

    const cardW = (contentWidth - 10) / 2;
    const cardH = 24;

    // Similarity card
    drawRoundedBox(margin, y, cardW, cardH, severity.soft, 4);
    drawText("Similarity Score", margin + 4, y + 6, {
      size: 8,
      color: colors.muted,
      style: "bold",
    });
    drawText(`${pct}%`, margin + 4, y + 16, {
      size: 16,
      color: severity.color,
      style: "bold",
    });

    // Severity card
    drawRoundedBox(margin + cardW + 10, y, cardW, cardH, severity.soft, 4);
    drawText("Assessment", margin + cardW + 10 + 4, y + 6, {
      size: 8,
      color: colors.muted,
      style: "bold",
    });
    drawText(severity.label, margin + cardW + 10 + 4, y + 16, {
      size: 12,
      color: severity.color,
      style: "bold",
      maxWidth: cardW - 8,
    });

    y += cardH + 12;

    // Details section
    addPageIfNeeded(50);
    drawText("Analysis Details", margin, y, {
      size: 12,
      style: "bold",
      color: colors.text,
    });
    y += 8;

    const detailBoxHeight = 42;
    drawRoundedBox(margin, y, contentWidth, detailBoxHeight, colors.card, 5);
    pdf.setDrawColor(...colors.border);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, y, contentWidth, detailBoxHeight, 5, 5, "S");

    const badgeX = margin + 4 + 10;
    drawStatusChip(severity.label, badgeX, y + 5, severity.color, severity.soft);

    const descText = pct >= 75
      ? "High plagiarism detected. These code snippets share substantial code structure and logic. Manual review is strongly recommended. Identical variable names, function signatures, and control flow patterns indicate potential copying."
      : pct >= 40
      ? "Moderate similarity found. Some structural or logic overlap detected. Consider reviewing shared patterns and implementation details. Similar algorithms or library usage may explain the overlap."
      : "Low similarity detected. No significant overlapping code structure found between these snippets. The code appears to be independently written with different approaches and implementations.";

    const descLines = pdf.splitTextToSize(descText, contentWidth - 8);
    drawText(descLines, margin + 4, y + 18, {
      size: 8.5,
      color: colors.muted,
      maxWidth: contentWidth - 8,
    });

    y += detailBoxHeight + 10;

    // Progress bar section
    addPageIfNeeded(20);
    drawText("Similarity Distribution", margin, y, {
      size: 11,
      style: "bold",
      color: colors.text,
    });
    y += 7;

    drawProgressBar(margin, y, contentWidth, 6, pct, severity.color);
    y += 9;

    drawText("0%", margin, y, {
      size: 8,
      color: colors.muted,
    });
    drawText("100%", pageWidth - margin, y, {
      size: 8,
      color: colors.muted,
      align: "right",
    });

  } else {
    // ──── BATCH RESULT ────
    const rows = extractBatchResults(result);
    if (!rows || rows.length === 0) {
      drawText("No comparison results available.", margin, y, {
        size: 10,
        color: colors.muted,
      });
      pdf.save("code-plagiarism-report.pdf");
      return;
    }

    const sorted = [...rows].sort((a, b) => (extractPercentage(b) ?? 0) - (extractPercentage(a) ?? 0));
    const highCount = sorted.filter(r => (extractPercentage(r) ?? 0) >= 75).length;
    const modCount = sorted.filter(r => {
      const p = extractPercentage(r) ?? 0;
      return p >= 40 && p < 75;
    }).length;
    const lowCount = sorted.filter(r => (extractPercentage(r) ?? 0) < 40).length;

    // Overview
    addPageIfNeeded(40);
    drawText("Comparison Overview", margin, y, {
      size: 12,
      style: "bold",
      color: colors.text,
    });
    y += 7;

    const gap = 4;
    const cardW = (contentWidth - gap * 3) / 4;
    const cardH = 24;

    const summaryCards = [
      { title: "Total", value: `${rows.length}`, fill: colors.primarySoft, color: colors.primary },
      { title: "High Risk", value: `${highCount}`, fill: colors.dangerSoft, color: colors.danger },
      { title: "Moderate", value: `${modCount}`, fill: colors.warningSoft, color: colors.warning },
      { title: "Low Risk", value: `${lowCount}`, fill: colors.successSoft, color: colors.success },
    ];

    summaryCards.forEach((card, i) => {
      const x = margin + i * (cardW + gap);
      drawRoundedBox(x, y, cardW, cardH, card.fill, 4);

      drawText(card.title, x + 3, y + 6, {
        size: 7.5,
        color: colors.muted,
        style: "bold",
      });

      drawText(card.value, x + 3, y + 16, {
        size: 14,
        color: card.color,
        style: "bold",
      });
    });

    y += cardH + 12;

    // Detailed comparisons
    addPageIfNeeded(25);
    drawText("File-by-File Comparisons", margin, y, {
      size: 12,
      style: "bold",
      color: colors.text,
    });

    y += 8;

    sorted.forEach((row, index) => {
      const pct = extractPercentage(row);
      const file1 = row.file1 ?? row.code1 ?? `File ${index * 2 + 1}`;
      const file2 = row.file2 ?? row.code2 ?? `File ${index * 2 + 2}`;
      const severity = getSeverityForPDF(pct ?? 0);

      const cardHeight = 38;
      addPageIfNeeded(cardHeight + 6);

      drawRoundedBox(margin, y, contentWidth, cardHeight, colors.card, 4);
      pdf.setDrawColor(...colors.border);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, y, contentWidth, cardHeight, 4, 4, "S");

      // Left column - File names
      const leftColWidth = contentWidth * 0.55;
      const file1Lines = pdf.splitTextToSize(file1, leftColWidth - 6);
      const file2Lines = pdf.splitTextToSize(file2, leftColWidth - 6);

      drawText("File 1:", margin + 3, y + 5, {
        size: 8,
        color: colors.muted,
        style: "bold",
      });
      drawText(file1, margin + 3, y + 10, {
        size: 8.5,
        color: colors.text,
        style: "bold",
        maxWidth: leftColWidth - 6,
      });

      drawText("File 2:", margin + 3, y + 19, {
        size: 8,
        color: colors.muted,
        style: "bold",
      });
      drawText(file2, margin + 3, y + 24, {
        size: 8.5,
        color: colors.text,
        maxWidth: leftColWidth - 6,
      });

      // Right column - Score and Badge
      const rightColX = margin + leftColWidth + 2;
      if (pct !== null) {
        drawText(`${pct}%`, rightColX, y + 8, {
          size: 22,
          style: "bold",
          color: severity.color,
          align: "right",
        });

        drawStatusChip(severity.label, rightColX - 28, y + 28, severity.color, severity.soft);
      }

      y += cardHeight + 6;
    });
  }

  addPageIfNeeded(16);
  pdf.setDrawColor(...colors.border);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 7;

  drawText("End of report", margin, y, {
    size: 9,
    color: colors.muted,
    style: "bold",
  });

  drawText("Generated using automated code plagiarism detection", pageWidth - margin, y, {
    size: 8.5,
    color: colors.lightText,
    align: "right",
  });

  pdf.save("code-plagiarism-report.pdf");
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CompareCode() {
  const navigate = useNavigate();
  const BASE_URL = "http://localhost:8000";

  const [tab,           setTab]           = useState("paste");
  const [code1,         setCode1]         = useState("");
  const [code2,         setCode2]         = useState("");
  const [files,         setFiles]         = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [result,        setResult]        = useState(null);
  const [resultMode,    setResultMode]    = useState("single");
  const [loading,       setLoading]       = useState(false);
  const [apiError,      setApiError]      = useState(null);
  const [isVerified,    setIsVerified]    = useState(false);
  const [user,          setUser]          = useState(null);
  const [authLoading,   setAuthLoading]   = useState(true);

  const handleNewSession = () => {
    setCode1("");
    setCode2("");
    setFiles([]);
    setSelectedFiles([]);
    setResult(null);
    setApiError(null);
    setResultMode("single");
  };

  useEffect(() => {
    injectStyles();
    document.body.style.margin     = "0";
    document.body.style.background = "linear-gradient(135deg,#0a0a15 0%,#0f0f1a 50%,#1a1a2e 100%)";

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

  const clearAuthState = () => { setIsVerified(false); setUser(null); localStorage.removeItem("verified"); localStorage.removeItem("user_profile"); setAuthLoading(false); };
  const handleLogout   = async () => { try { await fetch(`${BASE_URL}/api/logout/`,{method:"POST",credentials:"include"}); } catch {} clearAuthState(); };
  const clearError     = () => setApiError(null);

  const handleMultiUpload   = (e) => { setFiles(prev=>[...prev,...Array.from(e.target.files)]); clearError(); };
  const toggleFileSelection = (i)  => setSelectedFiles(prev=>prev.includes(i)?prev.filter(x=>x!==i):[...prev,i]);

  const comparePastedCodes = async () => {
    if (!code1.trim()||!code2.trim()) { setApiError({headline:"Both fields are required",detail:"Please paste code into both boxes.",rejected:[]}); return; }
    try { setLoading(true);setResult(null);clearError(); const res=await API.post("/compare-code/",{code1,code2},{withCredentials:true}); setResult(res.data);setResultMode("single"); }
    catch(err){ setApiError(parseApiError(err));setResult(null); } finally{setLoading(false);}
  };

  const compareSelectedFiles = async () => {
    if (selectedFiles.length<2){ setApiError({headline:"Select at least 2 files",detail:"Tick the checkboxes next to the files you want to compare.",rejected:[]}); return; }
    const fd=new FormData(); selectedFiles.forEach(i=>fd.append("files",files[i]));
    try { setLoading(true);setResult(null);clearError(); const res=await API.post("/compare-batch/",fd,{headers:{"Content-Type":"multipart/form-data"},withCredentials:true}); setResult(res.data);setResultMode("batch"); }
    catch(err){ setApiError(parseApiError(err));setResult(null); } finally{setLoading(false);}
  };

  const compareAllFiles = async () => {
    if (files.length<2){ setApiError({headline:"Upload at least 2 files",detail:"Add more files using the upload zone.",rejected:[]}); return; }
    const fd=new FormData(); files.forEach(f=>fd.append("files",f));
    try { setLoading(true);setResult(null);clearError(); const res=await API.post("/compare-batch/",fd,{headers:{"Content-Type":"multipart/form-data"},withCredentials:true}); setResult(res.data);setResultMode("batch"); }
    catch(err){ setApiError(parseApiError(err));setResult(null); } finally{setLoading(false);}
  };

  const tabBtn = (id, label) => (
    <button className={`ca-tab${tab===id?" active":""}`} onClick={()=>{setTab(id);setResult(null);clearError();}} style={{flex:1,padding:"10px 0",borderRadius:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:tab===id?"#a5b4fc":"#64748b",fontFamily:"Inter,sans-serif",fontWeight:700,fontSize:"0.9rem",cursor:"pointer",transition:"all 0.25s ease"}}>{label}</button>
  );

  return (
    <div style={{height:"100vh",background:"linear-gradient(135deg,#0a0a15 0%,#0f0f1a 50%,#1a1a2e 100%)",fontFamily:"Inter,sans-serif",display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
      <Orbs />

      {!authLoading && (isVerified&&user
        ? <ProfileCorner user={user} onLogout={handleLogout} navigate={navigate} />
        : <GuestCorner onLogin={()=>navigate("/login")} />
      )}

      {/* ── Header ── */}
      <div style={{
        padding:"16px 32px",
        borderBottom:"1px solid rgba(255,255,255,0.08)",
        flexShrink:0, zIndex:10, backdropFilter:"blur(12px)",
        display:"flex", alignItems:"center", gap:20,
        animation:"slideDownGlow 0.5s ease both"
      }}>
        <button className="ca-back" onClick={()=>navigate(-1)} style={{
          display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px",
          borderRadius:999, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.4)",
          color:"#f87171", fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:"0.85rem",
          cursor:"pointer", transition:"all 0.25s ease", flexShrink:0
        }}>← Back</button>

        <h2 style={{fontFamily:"Inter,sans-serif",fontWeight:700,fontSize:"1.2rem",color:"#f1f5f9",letterSpacing:"-0.02em",margin:0}}>
          🔀 Code Plagiarism Comparator
        </h2>

        {/* New Session — marginLeft:auto pushes it left of the avatar spacer */}
        {(result || apiError) && (
          <button
            onClick={handleNewSession}
            disabled={loading}
            style={{
              marginLeft:"auto",
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"8px 18px", borderRadius:999,
              background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.4)",
              color:"#a5b4fc", fontFamily:"Inter, sans-serif", fontWeight:600, fontSize:"0.85rem",
              cursor:loading ? "not-allowed" : "pointer",
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

      {/* ── Body ── */}
      <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative",zIndex:5}}>

        {/* LEFT */}
        <div style={{width:"55%",borderRight:"1px solid rgba(255,255,255,0.07)",overflowY:"auto",padding:"24px 28px",scrollbarWidth:"thin",scrollbarColor:"rgba(99,102,241,0.3) transparent",display:"flex",flexDirection:"column",gap:"1rem"}}>
          <div style={{display:"flex",gap:10}}>{tabBtn("paste","📋 Paste Code")}{tabBtn("files","📁 Upload Files")}</div>
          {apiError&&<ErrorBanner error={apiError} onDismiss={clearError}/>}

          {tab==="paste"&&(
            <div style={{animation:"fadeUpSmooth 0.4s ease both",display:"flex",flexDirection:"column",gap:"0.8rem"}}>
              <label style={{fontSize:"0.8rem",fontWeight:600,color:"#94a3b8",fontFamily:"Inter,sans-serif"}}>CODE SNIPPET 1</label>
              <textarea className="ca-textarea" rows="9" placeholder="Paste Code 1 here..." value={code1} onChange={e=>{setCode1(e.target.value);clearError();}} style={{width:"100%",padding:"1rem",fontFamily:"Roboto Mono,monospace",fontSize:"0.82rem",borderRadius:14,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(15,15,26,0.8)",resize:"vertical",lineHeight:1.7,color:"#e2e8f0",outline:"none",boxShadow:"0 4px 16px rgba(0,0,0,0.3)",fontWeight:500}}/>
              <label style={{fontSize:"0.8rem",fontWeight:600,color:"#94a3b8",fontFamily:"Inter,sans-serif"}}>CODE SNIPPET 2</label>
              <textarea className="ca-textarea" rows="9" placeholder="Paste Code 2 here..." value={code2} onChange={e=>{setCode2(e.target.value);clearError();}} style={{width:"100%",padding:"1rem",fontFamily:"Roboto Mono,monospace",fontSize:"0.82rem",borderRadius:14,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(15,15,26,0.8)",resize:"vertical",lineHeight:1.7,color:"#e2e8f0",outline:"none",boxShadow:"0 4px 16px rgba(0,0,0,0.3)",fontWeight:500}}/>
              <button className="ca-compare-btn" onClick={comparePastedCodes} disabled={loading} style={{width:"100%",padding:"14px 0",fontSize:"0.95rem",background:loading?"rgba(99,102,241,0.25)":"linear-gradient(135deg,#6366f1,#7c3aed)",color:loading?"#94a3b8":"#fff",border:"none",borderRadius:14,cursor:loading?"not-allowed":"pointer",fontFamily:"Inter,sans-serif",fontWeight:700,boxShadow:loading?"none":"0 8px 32px rgba(99,102,241,0.4)",transition:"all 0.3s ease",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                {loading?<><span style={{width:18,height:18,borderRadius:"50%",border:"3px solid rgba(255,255,255,0.2)",borderTopColor:"#fff",animation:"spinSmooth 0.8s linear infinite",display:"inline-block"}}/>Comparing...</>:"🚀 Compare Pasted Codes"}
              </button>
            </div>
          )}

          {tab==="files"&&(
            <div style={{animation:"fadeUpSmooth 0.4s ease both",display:"flex",flexDirection:"column",gap:"0.8rem"}}>
              <label className="ca-upload-zone" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"2px dashed rgba(99,102,241,0.4)",borderRadius:16,padding:"2rem 1.5rem",cursor:"pointer",background:"rgba(99,102,241,0.05)",transition:"all 0.3s ease",textAlign:"center"}}>
                <span style={{fontSize:"2rem",marginBottom:"0.6rem"}}>📁</span>
                <p style={{fontWeight:700,color:"#94a3b8",fontSize:"0.9rem",marginBottom:4}}>Click to Upload Code Files</p>
                <p style={{fontSize:"0.78rem",color:"#64748b"}}>TXT · PY · JAVA · CPP · JS · TS · C · GO · PHP</p>
                <input type="file" multiple accept=".txt,.py,.java,.cpp,.js,.ts,.c,.go,.php" onChange={handleMultiUpload} style={{display:"none"}}/>
              </label>
              {files.length>0&&(
                <>
                  <p style={{fontSize:"0.8rem",fontWeight:600,color:"#94a3b8",fontFamily:"Inter,sans-serif"}}>UPLOADED FILES — tick to select</p>
                  <div style={{maxHeight:"220px",overflowY:"auto",borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",padding:"0.6rem"}}>
                    {files.map((file,index)=>(
                      <div key={index} onClick={()=>toggleFileSelection(index)} style={{display:"flex",alignItems:"center",gap:10,padding:"0.6rem 0.8rem",borderRadius:10,background:selectedFiles.includes(index)?"rgba(99,102,241,0.1)":"rgba(255,255,255,0.02)",border:`1px solid ${selectedFiles.includes(index)?"rgba(99,102,241,0.35)":"rgba(255,255,255,0.06)"}`,marginBottom:"0.4rem",cursor:"pointer",transition:"all 0.2s ease"}}>
                        <input type="checkbox" checked={selectedFiles.includes(index)} onChange={()=>toggleFileSelection(index)} onClick={e=>e.stopPropagation()} style={{transform:"scale(1.1)",cursor:"pointer",accentColor:"#6366f1"}}/>
                        <span style={{fontSize:"0.85rem",color:"#f1f5f9",flex:1}}>{file.name}</span>
                        <span style={{fontSize:"0.72rem",color:"#64748b"}}>{(file.size/1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    <button onClick={compareSelectedFiles} disabled={loading} style={{flex:1,padding:"12px 0",fontSize:"0.88rem",background:loading?"rgba(139,92,246,0.2)":"linear-gradient(135deg,#8b5cf6,#a855f7)",color:loading?"#94a3b8":"#fff",border:"none",borderRadius:12,cursor:loading?"not-allowed":"pointer",fontFamily:"Inter,sans-serif",fontWeight:700,boxShadow:loading?"none":"0 8px 24px rgba(139,92,246,0.35)",transition:"all 0.3s ease",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                      {loading?<><span style={{width:14,height:14,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.2)",borderTopColor:"#fff",animation:"spinSmooth 0.8s linear infinite",display:"inline-block"}}/>Comparing...</>:"🔍 Compare Selected"}
                    </button>
                    <button onClick={compareAllFiles} disabled={loading} style={{flex:1,padding:"12px 0",fontSize:"0.88rem",background:loading?"rgba(34,197,94,0.2)":"linear-gradient(135deg,#10b981,#34d399)",color:loading?"#94a3b8":"#fff",border:"none",borderRadius:12,cursor:loading?"not-allowed":"pointer",fontFamily:"Inter,sans-serif",fontWeight:700,boxShadow:loading?"none":"0 8px 24px rgba(34,197,94,0.35)",transition:"all 0.3s ease",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                      {loading?<><span style={{width:14,height:14,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.2)",borderTopColor:"#fff",animation:"spinSmooth 0.8s linear infinite",display:"inline-block"}}/>Comparing...</>:"⚡ Compare All"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px",scrollbarWidth:"thin",scrollbarColor:"rgba(99,102,241,0.3) transparent",display:"flex",flexDirection:"column"}}>
          <p style={{fontSize:"0.8rem",fontWeight:600,color:"#94a3b8",fontFamily:"Inter,sans-serif",marginBottom:"1rem"}}>📊 RESULTS</p>

          {!result&&!loading&&!apiError&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,opacity:0.4}}>
              <span style={{fontSize:"3rem"}}>🔍</span>
              <p style={{color:"#64748b",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",textAlign:"center"}}>Results will appear here after comparison</p>
            </div>
          )}

          {!result&&!loading&&apiError&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,opacity:0.7}}>
              <span style={{fontSize:"3rem"}}>⚠️</span>
              <p style={{color:"#f87171",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",textAlign:"center",fontWeight:600}}>{apiError.headline}</p>
            </div>
          )}

          {loading&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
              <span style={{width:48,height:48,borderRadius:"50%",border:"4px solid rgba(99,102,241,0.2)",borderTopColor:"#6366f1",animation:"spinSmooth 0.9s linear infinite",display:"inline-block"}}/>
              <p style={{color:"#94a3b8",fontFamily:"Inter,sans-serif",fontSize:"0.9rem"}}>Analyzing similarity…</p>
            </div>
          )}

          {result&&!loading&&(
            <div style={{padding:"1.4rem",borderRadius:18,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",backdropFilter:"blur(12px)",animation:"fadeUpSmooth 0.5s ease both"}}>
              <p style={{fontFamily:"Inter,sans-serif",fontWeight:700,color:"#f1f5f9",fontSize:"0.9rem",marginBottom:"1.4rem"}}>
                {resultMode==="batch"?"Batch Comparison Results":"Pairwise Comparison Result"}
              </p>
              {resultMode==="single"?<SingleResult result={result}/>:<BatchResult result={result}/>}
              <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
                <button
                  onClick={() => generatePDF(result, resultMode, tab === "paste")}
                  style={{
                    padding: "14px 28px",
                    borderRadius: "14px",
                    border: "1px solid rgba(99,102,241,0.4)",
                    background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                    color: "#fff",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    boxShadow: "0 12px 32px rgba(99,102,241,0.4)",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8
                  }}
                >
                  ⬇️ Download Report
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}