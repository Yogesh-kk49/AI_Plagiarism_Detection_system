import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const injectStyles = () => {
  if (document.getElementById("options-styles")) return;
  const tag = document.createElement("style");
  tag.id = "options-styles";
  tag.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @keyframes fadeUp { from{opacity:0;transform:translateY(32px);} to{opacity:1;transform:translateY(0);} }
    @keyframes fadeIn { from{opacity:0;} to{opacity:1;} }
    @keyframes scaleIn { from{opacity:0;transform:scale(0.85);} to{opacity:1;transform:scale(1);} }
    @keyframes slideDown { from{opacity:0;transform:translateY(-16px);} to{opacity:1;transform:translateY(0);} }
    @keyframes fadeInPanel { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }
    @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1);} 40%{transform:translate(60px,-50px) scale(1.1);} 70%{transform:translate(-30px,30px) scale(0.9);} }
    @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1);} 35%{transform:translate(-70px,40px) scale(0.95);} 65%{transform:translate(40px,-60px) scale(1.08);} }
    @keyframes float { 0%,100%{transform:translateY(0) rotate(-1deg);} 50%{transform:translateY(-10px) rotate(1deg);} }
    @keyframes spin { to{transform:rotate(360deg);} }
    @keyframes shimmer-line { 0%{opacity:0.4;transform:scaleX(0.6);} 50%{opacity:1;transform:scaleX(1);} 100%{opacity:0.4;transform:scaleX(0.6);} }
    @keyframes badge-pop { 0%{transform:scale(0) rotate(-10deg);} 70%{transform:scale(1.15) rotate(2deg);} 100%{transform:scale(1) rotate(0deg);} }
    @keyframes drawerSlide { from{transform:translateX(-110%);opacity:0;} to{transform:translateX(0);opacity:1;} }
    @keyframes overlayFade { from{opacity:0;} to{opacity:1;} }

    .opt-card { transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.3s ease,border-color 0.3s ease; cursor:pointer; }
    .opt-card:hover { transform:translateY(-6px) scale(1.01); }
    .opt-card:active { transform:translateY(-2px) scale(0.99); }
    .profile-avatar { transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .profile-avatar:hover { transform:scale(1.08); }
    .logout-btn:hover { background:rgba(239,68,68,0.2) !important; color:#fecaca !important; border-color:rgba(239,68,68,0.6) !important; }
    .login-prompt-btn:hover { background:rgba(99,102,241,0.2) !important; border-color:rgba(99,102,241,0.5) !important; color:#c7d2fe !important; }
    .signin-banner-btn:hover { transform:translateY(-2px) !important; box-shadow:0 8px 24px rgba(99,102,241,0.45) !important; }

    .hamburger-btn { transition:all 0.25s ease; }
    .hamburger-btn:hover { background:rgba(99,102,241,0.25) !important; border-color:rgba(99,102,241,0.6) !important; transform:scale(1.05); }

    .drawer-menu-item { transition:all 0.2s ease; cursor:pointer; }
    .drawer-menu-item:hover { background:rgba(99,102,241,0.2) !important; transform:translateX(4px); border-color:rgba(99,102,241,0.4) !important; }

    .feedback-input { color:#f1f5f9 !important; }
    .feedback-input:focus { border-color:rgba(99,102,241,0.7) !important; box-shadow:0 0 0 3px rgba(99,102,241,0.2) !important; outline:none; background:rgba(99,102,241,0.08) !important; }
    .feedback-input::placeholder { color:#64748b !important; }
    .feedback-textarea { color:#f1f5f9 !important; }
    .feedback-textarea:focus { border-color:rgba(99,102,241,0.7) !important; box-shadow:0 0 0 3px rgba(99,102,241,0.2) !important; outline:none; background:rgba(99,102,241,0.08) !important; }
    .feedback-textarea::placeholder { color:#64748b !important; }
    .feedback-select { color:#f1f5f9 !important; background:rgba(255,255,255,0.06) !important; }
    .feedback-select option { background:#1e1e35; color:#f1f5f9; }
    .submit-btn:hover:not(:disabled) { transform:translateY(-2px) !important; box-shadow:0 12px 32px rgba(99,102,241,0.55) !important; }
    .submit-btn:disabled { opacity:0.5; cursor:not-allowed; }

    .back-btn {
      display:flex; align-items:center; gap:8px; padding:10px 16px; border-radius:12px;
      border:1px solid rgba(239,68,68,0.4); background:rgba(239,68,68,0.08); color:#f87171;
      font-family:'DM Sans',sans-serif; font-weight:600; font-size:0.9rem; cursor:pointer;
      transition:all 0.25s ease; backdrop-filter:blur(12px); box-shadow:0 4px 16px rgba(0,0,0,0.3);
    }
    .back-btn:hover { background:rgba(239,68,68,0.18); border-color:rgba(239,68,68,0.6); color:#fecaca; transform:translateY(-1px); }
    .drawer-close:hover { background:rgba(255,255,255,0.15) !important; color:#f1f5f9 !important; }
    .history-drawer-btn:hover { background:rgba(124,58,237,0.2) !important; color:#ddd6fe !important; }

    ::-webkit-scrollbar { width:4px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:rgba(99,102,241,0.4); border-radius:4px; }
  `;
  document.head.appendChild(tag);
};

const Orbs = () => (
  <>
    <div style={{position:"fixed",top:"8%",left:"3%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 70%)",animation:"orb1 14s ease-in-out infinite",pointerEvents:"none",zIndex:0}} />
    <div style={{position:"fixed",bottom:"5%",right:"3%",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 70%)",animation:"orb2 18s ease-in-out infinite",pointerEvents:"none",zIndex:0}} />
    <div style={{position:"fixed",top:"45%",left:"50%",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:0}} />
  </>
);

const Spinner = () => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
    <div style={{width:40,height:40,borderRadius:"50%",border:"3px solid rgba(99,102,241,0.2)",borderTopColor:"#6366f1",animation:"spin 0.8s linear infinite"}} />
    <p style={{fontFamily:"DM Sans,sans-serif",color:"#94a3b8",fontSize:"0.9rem"}}>Checking session...</p>
  </div>
);

const ProfileCorner = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const handleLogoutClick = () => {
    setOpen(false);
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 100,
          animation: "slideDown 0.5s ease both 0.2s",
        }}
      >
        <div style={{ position: "relative" }}>
          <button
            className="profile-avatar"
            onClick={() => setOpen((o) => !o)}
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              border: "2px solid rgba(99,102,241,0.5)",
              background: "rgba(15,15,26,0.9)",
              padding: 0,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 0 4px rgba(99,102,241,0.08)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(12px)",
            }}
          >
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name || ""}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user.name || "User"
                  )}&background=6366f1&color=fff&bold=true`;
                }}
              />
            ) : (
              <span
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 800,
                  fontSize: 16,
                  color: "#a5b4fc",
                }}
              >
                {initials}
              </span>
            )}
          </button>

          <span
            style={{
              position: "absolute",
              bottom: 1,
              right: 1,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#22c55e",
              border: "2px solid #0f0f1a",
              animation: "badge-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both 0.5s",
            }}
          />

          {open && (
            <>
              <div
                onClick={() => setOpen(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 50,
                }}
              />

              <div
                style={{
                  position: "absolute",
                  top: 56,
                  right: 0,
                  zIndex: 200,
                  background: "rgba(13,13,22,0.97)",
                  backdropFilter: "blur(24px)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: 16,
                  padding: "1rem",
                  minWidth: 230,
                  boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
                  animation: "scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
                  transformOrigin: "top right",
                }}
              >
                <div
                  style={{
                    marginBottom: "0.8rem",
                    paddingBottom: "0.8rem",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 700,
                      color: "#f1f5f9",
                      fontSize: "0.95rem",
                    }}
                  >
                    {user?.name || "—"}
                  </p>

                  <p
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      color: "#94a3b8",
                      fontSize: "0.78rem",
                      marginTop: 2,
                    }}
                  >
                    {user?.email || "—"}
                  </p>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      marginTop: 6,
                      padding: "3px 10px",
                      borderRadius: 99,
                      background: "rgba(34,197,94,0.12)",
                      border: "1px solid rgba(34,197,94,0.35)",
                      fontSize: "0.7rem",
                      color: "#86efac",
                      fontFamily: "DM Sans, sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#22c55e",
                        display: "inline-block",
                      }}
                    />
                    2FA Verified
                  </div>
                </div>

                <button
                  className="history-drawer-btn"
                  onClick={() => {
                    setOpen(false);
                    navigate("/history");
                  }}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: 10,
                    border: "1px solid rgba(124,58,237,0.3)",
                    background: "rgba(124,58,237,0.1)",
                    color: "#c4b5fd",
                    fontFamily: "DM Sans, sans-serif",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    marginBottom: "0.5rem",
                  }}
                >
                  📜 View History
                </button>

                <button
                  className="logout-btn"
                  onClick={handleLogoutClick}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: 10,
                    border: "1px solid rgba(239,68,68,0.3)",
                    background: "rgba(239,68,68,0.08)",
                    color: "#fca5a5",
                    fontFamily: "DM Sans, sans-serif",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showLogoutConfirm && (
        <div
          onClick={handleCancelLogout}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.72)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            zIndex: 1000,
            animation: "overlayFade 0.2s ease both",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "460px",
              borderRadius: "22px",
              background: "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.96))",
              border: "1px solid rgba(248,113,113,0.22)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
              overflow: "hidden",
              animation: "scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
          >
            <div
              style={{
                padding: "1.4rem 1.5rem 1rem 1.5rem",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(239,68,68,0.14)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  fontSize: "1.4rem",
                  marginBottom: "1rem",
                }}
              >
                🔒
              </div>

              <h2
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 800,
                  color: "#f8fafc",
                  marginBottom: "0.5rem",
                  fontFamily: "Syne, sans-serif",
                }}
              >
                Sign out of your account?
              </h2>

              <p
                style={{
                  color: "#94a3b8",
                  lineHeight: 1.7,
                  fontSize: "0.95rem",
                }}
              >
                You are about to end your current session on this device. You can sign in again anytime using your Google account and OTP verification.
              </p>
            </div>

            <div
              style={{
                padding: "1rem 1.5rem 1.4rem 1.5rem",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.85rem",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={handleCancelLogout}
                style={{
                  padding: "11px 18px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#cbd5e1",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmLogout}
                style={{
                  padding: "11px 18px",
                  borderRadius: "12px",
                  border: "1px solid rgba(248,113,113,0.35)",
                  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  minWidth: "150px",
                  boxShadow: "0 12px 24px rgba(185,28,28,0.28)",
                }}
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const GuestCorner = ({ onLogin }) => (
  <div style={{position:"fixed",top:20,right:20,zIndex:100,animation:"slideDown 0.5s ease both 0.2s"}}>
    <button className="login-prompt-btn" onClick={onLogin} style={{padding:"8px 20px",borderRadius:99,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.08)",color:"#a5b4fc",fontFamily:"DM Sans,sans-serif",fontWeight:600,fontSize:"0.85rem",cursor:"pointer",transition:"all 0.25s ease",backdropFilter:"blur(12px)"}}>
      Sign In
    </button>
  </div>
);

/* ════════════════════════════════════════
   ABOUT PANEL
════════════════════════════════════════ */
const AboutPanel = () => (
  <div style={{animation:"fadeInPanel 0.35s ease both"}}>
    <div style={{marginBottom:"2rem"}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"5px 14px",borderRadius:99,background:"rgba(99,102,241,0.18)",border:"1px solid rgba(99,102,241,0.45)",marginBottom:"1rem"}}>
        <span style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.1em",color:"#c7d2fe",fontFamily:"Syne,sans-serif",textTransform:"uppercase"}}>About This Project</span>
      </div>
      <h2 style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"1.5rem",color:"#f8fafc",lineHeight:1.2,marginBottom:"0.6rem"}}>AI Plagiarism Detection System</h2>
      <p style={{fontFamily:"DM Sans,sans-serif",color:"#cbd5e1",fontSize:"0.9rem",lineHeight:1.75}}>
        A full-stack academic integrity platform combining Google OAuth 2FA, NLP-based essay analysis, and heuristic AI code detection.
      </p>
    </div>

    {[
      { icon:"📝", title:"Essay Plagiarism Detection", color:"rgba(99,102,241,0.22)", border:"rgba(99,102,241,0.45)", titleColor:"#c7d2fe",
        content:"Analyzes written content using TF-IDF vectorization and cosine similarity to detect copied or paraphrased text between two documents. Supports .txt, .pdf, and .docx formats up to 5MB. Results include a similarity percentage, severity rating (Low / Medium / High), and a sentence-level highlight breakdown showing exactly which sentences match." },
      { icon:"💻", title:"Code Plagiarism Detection", color:"rgba(34,197,94,0.15)", border:"rgba(34,197,94,0.4)", titleColor:"#86efac",
        content:"Compares two code submissions using normalized token-based similarity, structural pattern matching, and AST-level analysis. Supports Python, JavaScript, Java, C, C++, and HTML. Detects clone types including copy-paste, renamed variables, and restructured logic. Severity is classified as Low, Medium, or High based on the similarity score." },
      { icon:"🤖", title:"AI-Generated Code Analysis", color:"rgba(251,191,36,0.14)", border:"rgba(251,191,36,0.4)", titleColor:"#fde68a",
        content:"Heuristic engine that evaluates 20+ code signals to determine the likelihood of AI generation. Signals include comment density, function naming regularity, cyclomatic complexity, indentation consistency, and boilerplate patterns. Returns AI probability, human probability, and a feature-by-feature breakdown." },
      { icon:"🔐", title:"2FA Security System", color:"rgba(139,92,246,0.18)", border:"rgba(139,92,246,0.45)", titleColor:"#ddd6fe",
        content:"All protected features require Google OAuth login followed by a one-time password (OTP) sent to your Gmail. The OTP expires in 5 minutes. Sessions are server-managed using Django session cookies — no sensitive data is stored in the browser beyond your name and email for display." },
      { icon:"📜", title:"Analysis History", color:"rgba(236,72,153,0.14)", border:"rgba(236,72,153,0.4)", titleColor:"#fbcfe8",
        content:"Every analysis you run — essay comparison, code comparison, and AI detection — is automatically saved to your account history. You can review past results including type, title, score, risk level, and timestamp from the History page." },
    ].map((item,i) => (
      <div key={i} style={{padding:"1.3rem",borderRadius:16,background:item.color,border:`1px solid ${item.border}`,marginBottom:"1rem",animation:`fadeInPanel 0.4s ease both ${0.1+i*0.07}s`}}>
        <p style={{fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:"0.97rem",color:item.titleColor,marginBottom:"0.6rem",display:"flex",alignItems:"center",gap:8}}>
          <span>{item.icon}</span>{item.title}
        </p>
        <p style={{fontFamily:"DM Sans,sans-serif",color:"#cbd5e1",fontSize:"0.85rem",lineHeight:1.8}}>{item.content}</p>
      </div>
    ))}
  </div>
);

/* ════════════════════════════════════════
   HELP PANEL
════════════════════════════════════════ */
const HelpPanel = ({ isLoggedIn }) => {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);
  const [category, setCategory] = useState("bug");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
  if (!message.trim()) return;

  setLoading(true);
  setError("");

  try {
    const res = await fetch("http://localhost:8000/api/feedback/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ category, message }),
    });

    const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
      } else {
        if (res.status === 403) {
          setError("🔒 Please login to submit feedback");
        } else {
          setError(data.error || "Something went wrong");
        }
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  };
  const inputStyle = {
    width:"100%", padding:"0.9rem 1rem", borderRadius:12,
    border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.06)",
    color:"#f1f5f9", fontFamily:"DM Sans,sans-serif", fontSize:"0.9rem",
    transition:"all 0.2s ease", marginBottom:"1rem",
  };

  if (submitted) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,textAlign:"center",animation:"fadeInPanel 0.4s ease both"}}>
      <div style={{fontSize:"4rem",marginBottom:"1rem"}}>✅</div>
      <h3 style={{fontFamily:"Syne,sans-serif",fontWeight:800,color:"#86efac",fontSize:"1.3rem",marginBottom:"0.6rem"}}>Feedback Received!</h3>
      <p style={{fontFamily:"DM Sans,sans-serif",color:"#cbd5e1",fontSize:"0.9rem",lineHeight:1.75,maxWidth:280}}>
        Thank you for reaching out. We'll review your message and get back to you within 24–48 hours.
      </p>
      <button onClick={()=>{
                setSubmitted(false);
                setMessage("");
              }}
        style={{marginTop:"1.5rem",padding:"0.7rem 1.6rem",borderRadius:12,border:"1px solid rgba(99,102,241,0.4)",background:"rgba(99,102,241,0.15)",color:"#c7d2fe",fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:"0.85rem",cursor:"pointer"}}>
        Send Another
      </button>
    </div>
  );

  return (
    <div style={{animation:"fadeInPanel 0.35s ease both"}}>
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"5px 14px",borderRadius:99,background:"rgba(251,191,36,0.15)",border:"1px solid rgba(251,191,36,0.45)",marginBottom:"1rem"}}>
          <span style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.1em",color:"#fde68a",fontFamily:"Syne,sans-serif",textTransform:"uppercase"}}>Support & Feedback</span>
        </div>
        <h2 style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"1.5rem",color:"#f8fafc",marginBottom:"0.6rem"}}>Feeling Difficulties?</h2>
        <p style={{fontFamily:"DM Sans,sans-serif",color:"#cbd5e1",fontSize:"0.9rem",lineHeight:1.75}}>
          We're here to help. Fill out the form below and our team will respond as soon as possible.
        </p>
      </div>

      {/* Common Issues */}
      <div style={{padding:"1.2rem",borderRadius:16,background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.3)",marginBottom:"1.5rem"}}>
        <p style={{fontFamily:"Syne,sans-serif",fontWeight:700,color:"#c7d2fe",fontSize:"0.9rem",marginBottom:"0.9rem"}}>💡 Common Issues</p>
        {[
          ["OTP not received","Check your spam folder. OTP expires in 5 minutes — request a new one."],
          ["Login loop","Clear cookies and try again. Make sure cookies are enabled in your browser."],
          ["File upload fails","Ensure file is under 5MB and is .txt, .pdf, or .docx format."],
          ["Results seem wrong","Try re-uploading with cleaner text. Scanned PDFs may reduce accuracy."],
        ].map(([q,a],i) => (
          <div key={i} style={{marginBottom:"0.75rem",paddingBottom:"0.75rem",borderBottom:i<3?"1px solid rgba(255,255,255,0.08)":"none"}}>
            <p style={{fontFamily:"DM Sans,sans-serif",fontWeight:700,color:"#e2e8f0",fontSize:"0.86rem",marginBottom:"0.3rem"}}>• {q}</p>
            <p style={{fontFamily:"DM Sans,sans-serif",color:"#94a3b8",fontSize:"0.82rem",lineHeight:1.65}}>{a}</p>
          </div>
        ))}
      </div>
  

      <p
  style={{
    fontFamily: "Syne,sans-serif",
    fontWeight: 700,
    color: "#f1f5f9",
    fontSize: "0.97rem",
    marginBottom: "1rem",
  }}
>
  📬 Submit Feedback
</p>

{!isLoggedIn ? (
  <div
    style={{
      textAlign: "center",
      padding: "1.5rem",
      borderRadius: 12,
      background: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.3)",
    }}
  >
    <p style={{ color: "#f87171", fontWeight: 600 }}>
      🔒 Login required to submit feedback
    </p>

    <button
      onClick={() => navigate("/login")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        marginTop: "0.8rem",
        padding: "0.6rem 1.4rem",
        borderRadius: 10,
        border: "none",
        background: hover ? "#4f46e5" : "#6366f1",
        color: "#fff",
        cursor: "pointer",
        transition: "all 0.25s ease",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hover
          ? "0 6px 20px rgba(99,102,241,0.5)"
          : "0 3px 10px rgba(99,102,241,0.3)"
      }}
    >
      Login →
    </button>
  </div>
) : (
  <>
    {error && (
      <div
        style={{
          padding: "0.8rem",
          borderRadius: 10,
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.4)",
          color: "#fca5a5",
          marginBottom: "1rem",
          fontSize: "0.85rem",
        }}
      >
        {error}
      </div>
    )}

    <select
      className="feedback-select"
      value={category}
      onChange={(e) => setCategory(e.target.value)}
      style={{
        ...inputStyle,
        cursor: "pointer",
        appearance: "none",
        WebkitAppearance: "none",
      }}
    >
      <option value="bug">🐛 Bug Report</option>
      <option value="feature">✨ Feature Request</option>
      <option value="account">🔐 Account Issue</option>
      <option value="other">💬 Other</option>
    </select>

    <textarea
      className="feedback-textarea"
      rows={5}
      style={{
        ...inputStyle,
        resize: "vertical",
        lineHeight: 1.75,
      }}
      placeholder="Describe your issue or suggestion in detail..."
      value={message}
      onChange={(e) => setMessage(e.target.value)}
    />

    <button
      className="submit-btn"
      onClick={handleSubmit}
      disabled={loading || !message.trim()}
      style={{
        width: "100%",
        padding: "1rem",
        borderRadius: 14,
        border: "none",
        background: "linear-gradient(135deg,#6366f1,#4f46e5)",
        color: "#fff",
        fontFamily: "Syne,sans-serif",
        fontWeight: 700,
        fontSize: "0.97rem",
        cursor: "pointer",
        transition: "all 0.25s ease",
        boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      {loading ? (
        <>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "#fff",
              animation: "spin 0.7s linear infinite",
              display: "inline-block",
            }}
          />
          Sending...
        </>
      ) : (
        "Send Feedback →"
      )}
    </button>
  </>
)}
</div>
);
};

/* ════════════════════════════════════════
   TERMS PANEL
════════════════════════════════════════ */
const TermsPanel = () => (
  <div style={{animation:"fadeInPanel 0.35s ease both"}}>
    <div style={{marginBottom:"1.5rem"}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"5px 14px",borderRadius:99,background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.45)",marginBottom:"1rem"}}>
        <span style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.1em",color:"#fecaca",fontFamily:"Syne,sans-serif",textTransform:"uppercase"}}>Terms & Conditions</span>
      </div>
      <h2 style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"1.5rem",color:"#f8fafc",marginBottom:"0.6rem"}}>Usage Rules & Disclaimer</h2>
      <p style={{fontFamily:"DM Sans,sans-serif",color:"#cbd5e1",fontSize:"0.88rem",lineHeight:1.75}}>Last updated: March 2026. By using this platform, you agree to the following terms.</p>
    </div>

    {[
      { icon:"🔐", title:"1. Authentication & Login", color:"rgba(99,102,241,0.18)", border:"rgba(99,102,241,0.4)", titleColor:"#c7d2fe",
        points:["You must log in using a valid Google account. Shared or disposable accounts are not permitted.","A one-time password (OTP) will be sent to your registered Gmail each session. This OTP expires in 5 minutes.","You are responsible for keeping your account secure. Do not share OTPs or login credentials with others.","Multiple failed OTP attempts may temporarily restrict your access to prevent abuse.","Sessions are managed server-side. Closing the browser does not immediately invalidate your session — use Sign Out."] },
      { icon:"📜", title:"2. Analysis History & Data", color:"rgba(139,92,246,0.18)", border:"rgba(139,92,246,0.4)", titleColor:"#ddd6fe",
        points:["All analyses you perform (essay comparison, code comparison, AI detection) are automatically logged to your account.","History records include: analysis type, title, similarity score, risk level, and timestamp.","You may view your history at any time from the History page. History is tied to your verified Gmail address.","We do not store the actual content of your documents or code — only the results metadata.","History records may be retained for up to 90 days. After that, older records may be deleted automatically."] },
      { icon:"📄", title:"3. Acceptable Use", color:"rgba(34,197,94,0.14)", border:"rgba(34,197,94,0.4)", titleColor:"#86efac",
        points:["This platform is intended for educational and academic integrity purposes only.","You may not upload content that violates copyright, contains malware, or is illegal in your jurisdiction.","Automated scraping, botting, or API abuse is strictly prohibited and may result in account termination.","Do not attempt to reverse-engineer the scoring algorithms or exploit system vulnerabilities.","Uploading personally identifiable information of third parties without consent is not allowed."] },
      { icon:"⚠️", title:"4. Disclaimer", color:"rgba(251,191,36,0.12)", border:"rgba(251,191,36,0.38)", titleColor:"#fde68a",
        points:["Similarity scores are probabilistic estimates — they are NOT definitive proof of plagiarism or AI authorship.","This tool should be used as one signal among many in academic assessment, not as the sole decision-maker.","We do not guarantee 100% accuracy. Edge cases, paraphrasing, and code refactoring may affect results.","The platform is provided 'as is' without warranties of any kind, express or implied.","We are not liable for any decisions made based on the output of this system."] },
      { icon:"🔒", title:"5. Privacy", color:"rgba(236,72,153,0.14)", border:"rgba(236,72,153,0.38)", titleColor:"#fbcfe8",
        points:["We collect your name, email, and profile picture from Google solely for authentication and display.","We do not sell, share, or transfer your personal data to third parties.","Session data is stored server-side using Django's encrypted session framework.","You can request deletion of your data at any time by contacting us via the Help section.","By continuing to use this platform, you consent to these privacy practices."] },
    ].map((section,i) => (
      <div key={i} style={{padding:"1.3rem",borderRadius:16,background:section.color,border:`1px solid ${section.border}`,marginBottom:"1rem",animation:`fadeInPanel 0.4s ease both ${0.1+i*0.07}s`}}>
        <p style={{fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:"0.97rem",color:section.titleColor,marginBottom:"0.9rem"}}>{section.icon} {section.title}</p>
        {section.points.map((pt,j) => (
          <div key={j} style={{display:"flex",gap:10,marginBottom:"0.6rem",alignItems:"flex-start"}}>
            <span style={{color:"#818cf8",fontWeight:700,flexShrink:0,marginTop:2,fontSize:"0.85rem"}}>→</span>
            <p style={{fontFamily:"DM Sans,sans-serif",color:"#cbd5e1",fontSize:"0.84rem",lineHeight:1.8}}>{pt}</p>
          </div>
        ))}
      </div>
    ))}

    <div style={{padding:"1rem 1.2rem",borderRadius:14,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",marginTop:"0.5rem"}}>
      <p style={{fontFamily:"DM Sans,sans-serif",color:"#94a3b8",fontSize:"0.8rem",lineHeight:1.75,textAlign:"center"}}>
        These terms may be updated periodically. Continued use of the platform after changes constitutes acceptance of the revised terms.
      </p>
    </div>
  </div>
);

/* ════════════════════════════════════════
   HAMBURGER DRAWER
════════════════════════════════════════ */
const HamburgerDrawer = ({ open, onClose, isVerified }) => {
  const [activeSection, setActiveSection] = useState(null);

  const menuItems = [
    { id:"about", icon:"ℹ️", label:"About",               sub:"Features & how it works",       accent:"#c7d2fe", bg:"rgba(99,102,241,0.12)",  border:"rgba(99,102,241,0.3)" },
    { id:"help",  icon:"🆘", label:"Help",                sub:"Support & feedback",             accent:"#fde68a", bg:"rgba(251,191,36,0.1)",   border:"rgba(251,191,36,0.3)" },
    { id:"terms", icon:"📋", label:"Terms & Conditions",  sub:"Rules, privacy & disclaimer",   accent:"#fecaca", bg:"rgba(239,68,68,0.1)",    border:"rgba(239,68,68,0.3)"  },
  ];

  useEffect(() => { if (!open) setActiveSection(null); }, [open]);
  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(5px)",zIndex:300,animation:"overlayFade 0.25s ease both"}} />

      <div style={{position:"fixed",top:0,left:0,height:"100vh",width:activeSection?520:300,maxWidth:"93vw",background:"linear-gradient(160deg,rgba(10,10,20,0.99),rgba(18,18,36,0.98))",backdropFilter:"blur(40px)",border:"1px solid rgba(99,102,241,0.25)",borderLeft:"none",borderRadius:"0 24px 24px 0",zIndex:400,display:"flex",flexDirection:"column",boxShadow:"12px 0 80px rgba(0,0,0,0.7)",animation:"drawerSlide 0.35s cubic-bezier(0.34,1.2,0.64,1) both",transition:"width 0.3s cubic-bezier(0.34,1.2,0.64,1)"}}>

        {/* Header */}
        <div style={{padding:"1.5rem 1.5rem 1.1rem",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {activeSection && (
              <button onClick={()=>setActiveSection(null)} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",color:"#e2e8f0",cursor:"pointer",fontSize:"0.95rem",padding:"6px 12px",borderRadius:8,transition:"all 0.2s ease",display:"flex",alignItems:"center",fontFamily:"DM Sans,sans-serif",fontWeight:600}}>
                ← Back
              </button>
            )}
            <div>
              <p style={{fontFamily:"Syne,sans-serif",fontWeight:800,color:"#f8fafc",fontSize:"1.05rem"}}>
                {activeSection ? menuItems.find(m=>m.id===activeSection)?.label : "Menu"}
              </p>
              {!activeSection && <p style={{fontFamily:"DM Sans,sans-serif",color:"#94a3b8",fontSize:"0.76rem",marginTop:2}}>AI Plagiarism Detection</p>}
            </div>
          </div>
          <button className="drawer-close" onClick={onClose} style={{width:34,height:34,borderRadius:8,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.07)",color:"#cbd5e1",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",transition:"all 0.2s ease"}}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:"1.4rem 1.5rem 2.5rem",scrollbarWidth:"thin",scrollbarColor:"rgba(99,102,241,0.4) transparent"}}>
          {!activeSection ? (
            <div style={{animation:"fadeInPanel 0.3s ease both"}}>
              <p style={{fontFamily:"DM Sans,sans-serif",color:"#94a3b8",fontSize:"0.8rem",marginBottom:"1.2rem",letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:700}}>Navigation</p>

              {menuItems.map((item,i) => (
                <div key={item.id} className="drawer-menu-item" onClick={()=>setActiveSection(item.id)}
                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.1rem 1.2rem",borderRadius:14,border:`1px solid ${item.border}`,background:item.bg,marginBottom:"0.8rem",animation:`fadeInPanel 0.35s ease both ${i*0.07}s`}}>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <span style={{fontSize:"1.5rem"}}>{item.icon}</span>
                    <div>
                      <p style={{fontFamily:"Syne,sans-serif",fontWeight:700,color:"#f1f5f9",fontSize:"0.95rem"}}>{item.label}</p>
                      <p style={{fontFamily:"DM Sans,sans-serif",color:"#94a3b8",fontSize:"0.77rem",marginTop:3}}>{item.sub}</p>
                    </div>
                  </div>
                  <span style={{color:item.accent,fontSize:"1.1rem",fontWeight:700}}>→</span>
                </div>
              ))}

              <div style={{marginTop:"2rem",padding:"1.1rem",borderRadius:14,background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)"}}>
                <p style={{
                  fontFamily:"DM Sans,sans-serif",
                  fontSize:"0.78rem",
                  lineHeight:1.8,
                textAlign:"center"
            }}>
              <span style={{color:"#ef4444",fontWeight:700}}>
                AI Plagiarism Detection System
              </span><br/>
              <span style={{color:"#94a3b8"}}>
                v1.0.0 · Built with Django + React
              </span><br/>
              <span style={{color:"#94a3b8"}}>
                Protected by 2FA · Session Encrypted
              </span>
            </p>
            </div>
            </div>
          ) : activeSection === "about" ? <AboutPanel />
            : activeSection === "help"  ? <HelpPanel isLoggedIn={isVerified} />
            : <TermsPanel />
          }
        </div>
      </div>
    </>
  );
};

/* ── Feature Card ── */
const FeatureCard = ({ icon, title, subtitle, subtitleColor, badge, onClick, locked, delay, color, glowColor }) => (
  <div className="opt-card" onClick={onClick} style={{background:"rgba(15,15,26,0.7)",backdropFilter:"blur(24px)",border:`1px solid ${locked?"rgba(255,255,255,0.06)":`rgba(${color},0.22)`}`,borderRadius:24,padding:"2rem",flex:1,minWidth:260,maxWidth:340,position:"relative",overflow:"hidden",boxShadow:locked?"0 8px 32px rgba(0,0,0,0.3)":`0 8px 32px rgba(0,0,0,0.3),0 0 0 1px rgba(${color},0.08)`,animation:`fadeUp 0.6s ease both ${delay}`}}>
    <div style={{position:"absolute",top:0,left:"10%",right:"10%",height:1,background:locked?"rgba(255,255,255,0.04)":`linear-gradient(90deg,transparent,rgba(${color},0.8),transparent)`,animation:locked?"none":"shimmer-line 3s ease-in-out infinite"}} />
    {!locked && <div style={{position:"absolute",bottom:-60,right:-40,width:160,height:160,borderRadius:"50%",background:`radial-gradient(circle,rgba(${glowColor},0.18) 0%,transparent 70%)`,pointerEvents:"none"}} />}
    <div style={{width:54,height:54,borderRadius:16,marginBottom:"1.2rem",background:locked?"rgba(255,255,255,0.04)":`linear-gradient(135deg,rgba(${color},0.25),rgba(${color},0.1))`,border:locked?"1px solid rgba(255,255,255,0.07)":`1px solid rgba(${color},0.3)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,animation:locked?"none":"float 4s ease-in-out infinite",boxShadow:locked?"none":`0 4px 16px rgba(${glowColor},0.2)`}}>
      {icon}
    </div>
    {badge && <div style={{position:"absolute",top:16,right:16,padding:"3px 10px",borderRadius:99,background:locked?"rgba(255,255,255,0.05)":`rgba(${color},0.15)`,border:locked?"1px solid rgba(255,255,255,0.08)":`1px solid rgba(${color},0.3)`,fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:locked?"#475569":`rgb(${color})`,fontFamily:"Syne,sans-serif"}}>{badge}</div>}
    <h3 style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"1.2rem",color:locked?"#475569":"#f1f5f9",marginBottom:"0.5rem",lineHeight:1.2}}>{title}</h3>
    <p style={{fontFamily:"DM Sans,sans-serif",color:locked?"#374151":subtitleColor||"#64748b",fontSize:"0.85rem",lineHeight:1.6,marginBottom:"1.5rem"}}>{subtitle}</p>
    <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"0.55rem 1.2rem",borderRadius:99,background:locked?"rgba(255,255,255,0.04)":`rgba(${color},0.15)`,border:locked?"1px solid rgba(255,255,255,0.07)":`1px solid rgba(${color},0.3)`,color:locked?"#374151":`rgb(${color})`,fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:"0.82rem",letterSpacing:"0.05em"}}>
      {locked ? "🔒 Login Required" : "→ Open"}
    </div>
  </div>
);

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function Options() {
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [user, setUser]             = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const BASE_URL = "http://localhost:8000";

  useEffect(() => {
    injectStyles();
    document.body.style.margin = "0";
    document.body.style.background = "#0f0f1a";
    const checkAuth = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/check-auth/`, { method:"GET", credentials:"include" });
        if (!res.ok) { clearAuthState(); return; }
        const data = await res.json();
        const verified = data.code_access === true;
        if (verified) {
          setIsVerified(true);
          if (data.name || data.email) setUser({ name:data.name||null, email:data.email||null, picture:data.picture||null });
          else { try { const saved = localStorage.getItem("user_profile"); if (saved) setUser(JSON.parse(saved)); } catch {} }
        } else clearAuthState();
      } catch { clearAuthState(); }
      finally { setLoading(false); }
    };
    checkAuth();
  }, []);

  const clearAuthState = () => { setIsVerified(false); setUser(null); localStorage.removeItem("verified"); localStorage.removeItem("user_profile"); };
  const handleLogout = async () => {
    try { await fetch(`${BASE_URL}/api/logout/`, { method:"POST", credentials:"include" }); } catch {}
    clearAuthState();
  };

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",justifyContent:"center",alignItems:"center",background:"#0f0f1a",position:"relative",overflow:"hidden"}}>
      <Orbs />
      <div style={{position:"relative",zIndex:1,animation:"fadeIn 0.4s ease"}}><Spinner /></div>
    </div>
  );

  const isGuest = !isVerified;
  const firstName = user?.name?.split(" ")[0] || null;

  return (
    <div style={{minHeight:"100vh",background:"#0f0f1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem",position:"relative",overflow:"hidden",fontFamily:"DM Sans,sans-serif"}}>
      <Orbs />

      {/* Top Left */}
      <div style={{position:"fixed",top:24,left:24,zIndex:150,display:"flex",alignItems:"center",gap:10}}>
        <button className="hamburger-btn" onClick={()=>setDrawerOpen(true)} style={{width:44,height:44,borderRadius:12,border:"1px solid rgba(99,102,241,0.4)",background:"rgba(99,102,241,0.1)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,backdropFilter:"blur(12px)",boxShadow:"0 4px 16px rgba(0,0,0,0.3)"}}>
          {[0,1,2].map(i => <span key={i} style={{display:"block",width:18,height:2,borderRadius:2,background:"#c7d2fe",transition:"all 0.2s ease"}} />)}
        </button>
        <button className="back-btn" onClick={()=>navigate("/")}>← Back</button>
      </div>

      {isVerified && user ? <ProfileCorner user={user} onLogout={handleLogout} /> : <GuestCorner onLogin={()=>navigate("/login")} />}
      <HamburgerDrawer 
        open={drawerOpen} 
        onClose={()=>setDrawerOpen(false)} 
        isVerified={isVerified}
      />

      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:780}}>
        <div style={{textAlign:"center",marginBottom:"3rem",animation:"fadeUp 0.6s ease both"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 18px",borderRadius:99,marginBottom:"1.2rem",background:isGuest?"rgba(255,255,255,0.04)":"rgba(99,102,241,0.1)",border:isGuest?"1px solid rgba(255,255,255,0.08)":"1px solid rgba(99,102,241,0.25)",animation:"slideDown 0.5s ease both 0.1s"}}>
            <span style={{width:8,height:8,borderRadius:"50%",display:"inline-block",background:isGuest?"#64748b":"#22c55e",boxShadow:isGuest?"none":"0 0 8px #22c55e"}} />
            <span style={{fontFamily:"DM Sans,sans-serif",fontWeight:600,fontSize:"0.82rem",letterSpacing:"0.06em",color:isGuest?"#475569":"#86efac"}}>
              {isGuest ? "Entered as Guest" : firstName ? `Welcome back, ${firstName}` : "Welcome back"}
            </span>
          </div>
          <h1 style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"clamp(1.8rem,5vw,2.8rem)",color:"#f1f5f9",letterSpacing:"-0.03em",lineHeight:1.15,marginBottom:"0.8rem"}}>Choose Analysis Type</h1>
          <p style={{color:"#facc15",fontSize:"0.95rem",maxWidth:460,margin:"0 auto",lineHeight:1.7}}>
            {isGuest ? "Explore essay analysis for free, or sign in to unlock AI-powered code plagiarism detection." : "All features are unlocked. Select a tool below to get started."}
          </p>
        </div>

        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:"1.2rem"}}>
          <FeatureCard icon="📝" title="Essay Plagiarism" subtitle="Detect similarities in essays, paragraphs, and written content using advanced text analysis." subtitleColor="#a5b4fc" badge="Free" locked={false} delay="0.2s" color="99,102,241" glowColor="99,102,241" onClick={()=>navigate("/upload")} />
          <FeatureCard icon={isVerified?"💻":"🔒"} title="Code Plagiarism" subtitle={isVerified?"Compare code files with AST-level analysis, clone detection, and similarity scoring.":"Sign in with Google + OTP to unlock AI-powered code comparison."} subtitleColor={isVerified?"#86efac":"#64748b"} badge={isVerified?"Unlocked":"Login Required"} locked={!isVerified} delay="0.35s" color={isVerified?"34,197,94":"71,85,105"} glowColor={isVerified?"34,197,94":"71,85,105"} onClick={()=>isVerified?navigate("/compare"):navigate("/login")} />
        </div>

        {isGuest && (
          <div style={{marginTop:"2rem",padding:"1.2rem 1.8rem",borderRadius:18,background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.18)",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,animation:"fadeUp 0.6s ease both 0.5s"}}>
            <div>
              <p style={{fontFamily:"Syne,sans-serif",fontWeight:700,color:"#a5b4fc",fontSize:"0.95rem",marginBottom:3}}>🚀 Unlock Code Analysis</p>
              <p style={{fontFamily:"DM Sans,sans-serif",color:"#64748b",fontSize:"0.82rem"}}>Sign in with Google and verify via OTP to access all features.</p>
            </div>
            <button className="signin-banner-btn" onClick={()=>navigate("/login")} style={{padding:"0.7rem 1.6rem",borderRadius:12,border:"none",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:"0.88rem",cursor:"pointer",flexShrink:0,boxShadow:"0 4px 16px rgba(99,102,241,0.35)",transition:"transform 0.2s ease,box-shadow 0.2s ease"}}>
              Sign In Free →
            </button>
          </div>
        )}

        <p style={{textAlign:"center",marginTop:"2.5rem",fontFamily:"DM Sans,sans-serif",color:"#ef4444",fontSize:"1rem",fontWeight:600,animation:"fadeIn 0.8s ease both 0.6s"}}>
          Your session is encrypted and protected by 2FA.
        </p>
      </div>
    </div>
  );
}