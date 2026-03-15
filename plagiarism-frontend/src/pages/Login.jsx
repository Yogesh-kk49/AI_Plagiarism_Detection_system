import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

/* ─── Keyframes injected once ─── */
const injectStyles = () => {
  if (document.getElementById("login-anim-styles")) return;
  const tag = document.createElement("style");
  tag.id = "login-anim-styles";
  tag.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;800&family=DM+Sans:wght@400;500;600&display=swap');

    * { box-sizing: border-box; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(28px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.88); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.6); }
      70%  { box-shadow: 0 0 0 14px rgba(99,102,241,0); }
      100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
    }
    @keyframes slide-otp {
      from { opacity: 0; transform: translateY(16px) scaleY(0.95); }
      to   { opacity: 1; transform: translateY(0) scaleY(1); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(-1deg); }
      50%       { transform: translateY(-8px) rotate(1deg); }
    }
    @keyframes avatar-pop {
      0%   { transform: scale(0) rotate(-10deg); }
      70%  { transform: scale(1.1) rotate(2deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    @keyframes greeting-slide {
      from { opacity: 0; transform: translateX(-20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes badge-in {
      from { opacity: 0; transform: scale(0.5); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes orb1 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33%       { transform: translate(40px, -30px) scale(1.1); }
      66%       { transform: translate(-20px, 20px) scale(0.9); }
    }
    @keyframes orb2 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33%       { transform: translate(-50px, 20px) scale(0.95); }
      66%       { transform: translate(30px, -40px) scale(1.05); }
    }

    .login-btn-hover:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(99,102,241,0.45) !important;
    }
    .login-btn-hover:active {
      transform: translateY(0);
    }
    .logout-btn-hover:hover {
      background: rgba(239,68,68,0.15) !important;
      border-color: rgba(239,68,68,0.5) !important;
      color: #fca5a5 !important;
    }
    .otp-input:focus {
      border-color: #6366f1 !important;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.2) !important;
    }
    .otp-input::placeholder { color: rgba(148,163,184,0.5); }
    .card-inner { animation: scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
    .section-appear { animation: slide-otp 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
    .avatar-anim { animation: avatar-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) both 0.1s; }
    .greeting-anim { animation: greeting-slide 0.5s ease both 0.3s; }
    .badge-anim { animation: badge-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both 0.5s; }
  `;
  document.head.appendChild(tag);
};

/* ─── Spinner ─── */
const Spinner = () => (
  <span
    style={{
      display: "inline-block",
      width: 16,
      height: 16,
      borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.3)",
      borderTopColor: "#fff",
      animation: "spin 0.7s linear infinite",
      verticalAlign: "middle",
      marginRight: 8,
    }}
  />
);

/* ─── Avatar from initials ─── */
const Avatar = ({ name, picture }) => {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";
  return (
    <div className="avatar-anim" style={{ position: "relative", display: "inline-block" }}>
      {picture ? (
        <img
          src={picture}
          alt={name}
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            border: "3px solid rgba(99,102,241,0.6)",
            boxShadow: "0 0 0 6px rgba(99,102,241,0.12), 0 12px 32px rgba(0,0,0,0.4)",
            display: "block",
          }}
          onError={(e) => { e.target.style.display = "none"; }}
        />
      ) : (
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "3px solid rgba(99,102,241,0.6)",
            boxShadow: "0 0 0 6px rgba(99,102,241,0.12), 0 12px 32px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 30,
            fontWeight: 800,
            color: "#fff",
            fontFamily: "Syne, sans-serif",
          }}
        >
          {initials}
        </div>
      )}
      <span
        className="badge-anim"
        style={{
          position: "absolute",
          bottom: 2,
          right: 2,
          width: 22,
          height: 22,
          background: "#22c55e",
          borderRadius: "50%",
          border: "3px solid #0f0f1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
        }}
      >
        ✓
      </span>
    </div>
  );
};

/* ─── Ambient Orbs ─── */
const Orbs = () => (
  <>
    <div style={{
      position: "fixed", top: "10%", left: "5%",
      width: 400, height: 400, borderRadius: "50%",
      background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
      animation: "orb1 12s ease-in-out infinite", pointerEvents: "none", zIndex: 0,
    }} />
    <div style={{
      position: "fixed", bottom: "5%", right: "5%",
      width: 500, height: 500, borderRadius: "50%",
      background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
      animation: "orb2 15s ease-in-out infinite", pointerEvents: "none", zIndex: 0,
    }} />
    <div style={{
      position: "fixed", top: "50%", left: "50%",
      width: 600, height: 600, borderRadius: "50%",
      background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none", zIndex: 0,
    }} />
  </>
);

/* ══════════════════════════════════════════════════════
   LOGGED-IN CARD
══════════════════════════════════════════════════════ */
const LoggedInCard = ({ user, onLogout, onGoToOptions, onGoToHistory }) => (
  <div
    className="card-inner"
    style={{
      background: "rgba(15,15,26,0.7)",
      backdropFilter: "blur(32px)",
      WebkitBackdropFilter: "blur(32px)",
      borderRadius: 28,
      padding: "3rem 2.5rem",
      maxWidth: 480,
      width: "100%",
      border: "1px solid rgba(99,102,241,0.2)",
      boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
      textAlign: "center",
      position: "relative",
      zIndex: 1,
    }}
  >
    {/* Top shimmer line */}
    <div style={{
      position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
      background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.7), transparent)",
      borderRadius: 1,
    }} />

    <div style={{ marginBottom: "1.5rem" }}>
      <Avatar name={user.name} picture={user.picture} />
    </div>

    <div className="greeting-anim">
      <p style={{
        fontFamily: "Syne, sans-serif",
        fontSize: "0.75rem",
        fontWeight: 600,
        letterSpacing: "0.2em",
        color: "#6366f1",
        textTransform: "uppercase",
        marginBottom: "0.4rem",
      }}>
        Welcome back
      </p>
      <h2 style={{
        fontFamily: "Syne, sans-serif",
        fontSize: "1.9rem",
        fontWeight: 800,
        color: "#f1f5f9",
        margin: "0 0 0.4rem",
        lineHeight: 1.2,
      }}>
        {user.name || "User"}
      </h2>
      <p style={{
        fontFamily: "DM Sans, sans-serif",
        color: "#94a3b8",
        fontSize: "0.9rem",
        margin: "0 0 0.3rem",
      }}>
        {user.email}
      </p>

      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginTop: "0.6rem",
        padding: "5px 14px",
        borderRadius: 99,
        background: "rgba(34,197,94,0.1)",
        border: "1px solid rgba(34,197,94,0.3)",
        fontSize: "0.8rem",
        color: "#86efac",
        fontFamily: "DM Sans, sans-serif",
        fontWeight: 600,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
        2FA Verified · Session Active
      </div>
    </div>

    {/* Divider */}
    <div style={{
      margin: "2rem 0",
      height: 1,
      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
    }} />

    <button
      className="login-btn-hover"
      onClick={onGoToOptions}
      style={{
        width: "100%",
        padding: "1rem",
        borderRadius: 14,
        border: "none",
        fontWeight: 700,
        cursor: "pointer",
        background: "linear-gradient(135deg, #6366f1, #4f46e5)",
        color: "#fff",
        fontSize: "1rem",
        fontFamily: "Syne, sans-serif",
        letterSpacing: "0.04em",
        transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
      }}
    >
      Go to Options →
    </button>
    <button
    className="login-btn-hover"
    onClick={onGoToHistory}
    style={{
      width: "100%",
      padding: "1rem",
      borderRadius: 14,
      border: "none",
      fontWeight: 700,
      cursor: "pointer",
      background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
      color: "#fff",
      fontSize: "1rem",
      fontFamily: "Syne, sans-serif",
      letterSpacing: "0.04em",
      transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
      marginTop: 12,
    }}
>
  📜 View My History
</button>

    <button
      className="logout-btn-hover"
      onClick={onLogout}
      style={{
        width: "100%",
        padding: "0.85rem",
        borderRadius: 14,
        border: "1px solid rgba(239,68,68,0.25)",
        background: "rgba(239,68,68,0.05)",
        color: "#f87171",
        fontSize: "0.95rem",
        fontFamily: "DM Sans, sans-serif",
        fontWeight: 600,
        cursor: "pointer",
        marginTop: 12,
        transition: "all 0.25s ease",
      }}
    >
      Sign Out
    </button>
  </div>
);

/* ══════════════════════════════════════════════════════
   MAIN LOGIN COMPONENT
══════════════════════════════════════════════════════ */
export default function Login() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info"); // info | success | error
  const [isLoading, setIsLoading] = useState(false);
  const [googleVerified, setGoogleVerified] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const otpRef = useRef(null);

  const BASE_URL = "http://localhost:8000";


  useEffect(() => {
    injectStyles();
    document.body.style.margin = "0";
    document.body.style.background = "#0f0f1a";

    // Check if already logged in
    const verified = localStorage.getItem("verified");
    const savedUser = localStorage.getItem("user_profile");
    if (verified === "true" && savedUser) {
      try { setLoggedInUser(JSON.parse(savedUser)); } catch {}
    }
  }, []);

  const setMsg = (msg, type = "info") => {
    setStatus(msg);
    setStatusType(type);
  };

  const handleLogout = () => {
    localStorage.removeItem("verified");
    localStorage.removeItem("user_profile");
    setLoggedInUser(null);
    setGoogleVerified(false);
    setOtp("");
    setStatus("");
  };

  /* STEP 1: Google Login */
  const handleGoogleSuccess = async (credentialResponse) => {
    setMsg("Verifying Google account...", "info");
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/google-login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      const data = await res.json();
      if (res.ok) {
        setGoogleVerified(true);
        setMsg(`✅ Google Verified (${data.email}). Now send OTP.`, "success");
        // Decode name/picture from JWT payload for display
        try {
          const payload = JSON.parse(atob(credentialResponse.credential.split(".")[1]));
          localStorage.setItem("user_profile", JSON.stringify({
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
          }));
        } catch {}
        setTimeout(() => otpRef.current?.focus(), 400);
      } else {
        setMsg(data.error || "Google login failed.", "error");
      }
    } catch {
      setMsg("❌ Google login error. Check backend or client ID.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  /* STEP 2: Send OTP */
  const sendOTP = async () => {
    setIsLoading(true);
    setMsg("Sending OTP to your Gmail...", "info");
    try {
      const res = await fetch(`${BASE_URL}/send-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("📩 OTP sent to your Gmail. Check your inbox!", "success");
        setTimeout(() => otpRef.current?.focus(), 200);
      } else {
        setMsg(data.error || "Failed to send OTP.", "error");
      }
    } catch {
      setMsg("❌ Backend not reachable.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  /* STEP 3: Verify OTP */
  const verifyOTP = async () => {
    if (!otp || otp.length < 6) { setMsg("Enter the full 6-digit OTP.", "error"); return; }
    setIsLoading(true);
    setMsg("Verifying OTP...", "info");
    try {
      const res = await fetch(`${BASE_URL}/verify-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (res.ok && data.access === "granted") {
        localStorage.setItem("verified", "true");
        setMsg("🔓 2FA Verified! Access Unlocked!", "success");
        const savedUser = localStorage.getItem("user_profile");
        if (savedUser) setLoggedInUser(JSON.parse(savedUser));
        setTimeout(() => navigate("/options"), 1200);
      } else {
        setMsg(data.error || "Invalid OTP. Please try again.", "error");
      }
    } catch {
      setMsg("❌ OTP verification failed.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  /* OTP digit input — auto-submit on 6 digits */
  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(val);
    if (val.length === 6) setTimeout(verifyOTP, 80);
  };

  const statusColors = {
    info:    { bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.3)",  text: "#a5b4fc" },
    success: { bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.3)",   text: "#86efac" },
    error:   { bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.3)",   text: "#fca5a5" },
  };

  /* ── If already logged in ── */
  if (loggedInUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: "2rem", background: "#0f0f1a", position: "relative", overflow: "hidden" }}>
        <Orbs />
        <LoggedInCard
          user={loggedInUser}
          onLogout={handleLogout}
          onGoToOptions={() => navigate("/options")}
          onGoToHistory={() => navigate("/history")}
        />
      </div>
    );
  }

  /* ── Login flow ── */
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "2rem",
      background: "#0f0f1a",
      position: "relative",
      overflow: "hidden",
      fontFamily: "DM Sans, sans-serif",
    }}>
      <Orbs />

      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        style={{
          position: "fixed", top: 20, left: 20,
          padding: "9px 18px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.05)",
          color: "#94a3b8",
          cursor: "pointer",
          backdropFilter: "blur(10px)",
          fontFamily: "DM Sans, sans-serif",
          fontSize: "0.85rem",
          fontWeight: 500,
          transition: "all 0.2s",
          zIndex: 10,
        }}
        onMouseEnter={e => { e.target.style.color = "#f1f5f9"; e.target.style.background = "rgba(255,255,255,0.1)"; }}
        onMouseLeave={e => { e.target.style.color = "#94a3b8"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
      >
        ← Back
      </button>

      {/* Card */}
      <div
        className="card-inner"
        style={{
          background: "rgba(15,15,26,0.75)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderRadius: 28,
          padding: "2.8rem 2.5rem",
          maxWidth: 520,
          width: "100%",
          border: "1px solid rgba(99,102,241,0.18)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Top shine */}
        <div style={{
          position: "absolute", top: 0, left: "15%", right: "15%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.8), transparent)",
        }} />

        {/* Icon + Title */}
        <div style={{ textAlign: "center", marginBottom: "2rem", animation: "fadeUp 0.6s ease both 0.05s" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))",
            border: "1px solid rgba(99,102,241,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, margin: "0 auto 1.2rem",
            boxShadow: "0 8px 24px rgba(99,102,241,0.2)",
            animation: "float 4s ease-in-out infinite",
          }}>
            🔐
          </div>
          <h1 style={{
            fontFamily: "Syne, sans-serif",
            fontSize: "1.75rem",
            fontWeight: 800,
            color: "#f1f5f9",
            margin: "0 0 0.4rem",
            letterSpacing: "-0.02em",
          }}>
            Secure 2FA Login
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>
            Google OAuth + One-Time Password required
          </p>
        </div>

        {/* Steps indicator */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, marginBottom: "2rem",
          animation: "fadeUp 0.6s ease both 0.15s",
        }}>
          {["Google", "Send OTP", "Verify"].map((label, i) => {
            const done = i === 0 ? googleVerified : false;
            const active = i === 0 ? !googleVerified : i === 1 ? googleVerified && !otp : googleVerified && !!otp;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 12px",
                  borderRadius: 99,
                  background: done
                    ? "rgba(34,197,94,0.12)"
                    : active ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${done ? "rgba(34,197,94,0.3)" : active ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)"}`,
                  transition: "all 0.4s ease",
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: done ? "#22c55e" : active ? "#6366f1" : "rgba(255,255,255,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: "#fff", fontWeight: 700,
                    transition: "background 0.4s ease",
                  }}>
                    {done ? "✓" : i + 1}
                  </span>
                  <span style={{
                    fontSize: "0.75rem", fontWeight: 600,
                    color: done ? "#86efac" : active ? "#a5b4fc" : "#475569",
                    fontFamily: "DM Sans, sans-serif",
                    transition: "color 0.4s ease",
                  }}>
                    {label}
                  </span>
                </div>
                {i < 2 && <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.1)" }} />}
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: Google Login ── */}
        <div style={{ animation: "fadeUp 0.6s ease both 0.25s" }}>
          <label style={{
            display: "block",
            fontFamily: "Syne, sans-serif",
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.15em",
            color: "#475569",
            textTransform: "uppercase",
            marginBottom: "0.75rem",
          }}>
            Step 1 — Google Account
          </label>
          <div style={{
            display: "flex", justifyContent: "center",
            padding: "1.2rem",
            borderRadius: 14,
            border: `1px solid ${googleVerified ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.07)"}`,
            background: googleVerified ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.02)",
            transition: "all 0.4s ease",
          }}>
            {googleVerified ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                color: "#86efac", fontFamily: "DM Sans, sans-serif", fontWeight: 600,
              }}>
                <span style={{ fontSize: 20 }}>✅</span>
                Google account verified
              </div>
            ) : (
              <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setMsg("❌ Google Login Failed", "error")}
              theme="filled_black"
              shape="pill"
              size="large"
            
            />
            )}
          </div>
        </div>

        {/* ── STEP 2 & 3: OTP ── */}
        {googleVerified && (
          <div className="section-appear" style={{ marginTop: "1.5rem" }}>
            <label style={{
              display: "block",
              fontFamily: "Syne, sans-serif",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "#475569",
              textTransform: "uppercase",
              marginBottom: "0.75rem",
            }}>
              Step 2 — One-Time Password
            </label>

            <button
              className="login-btn-hover"
              onClick={sendOTP}
              disabled={isLoading}
              style={{
                width: "100%", padding: "0.9rem",
                borderRadius: 14, border: "none",
                fontWeight: 700, cursor: isLoading ? "not-allowed" : "pointer",
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff", fontSize: "0.95rem",
                fontFamily: "Syne, sans-serif",
                letterSpacing: "0.04em",
                transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                boxShadow: "0 4px 18px rgba(99,102,241,0.3)",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? <><Spinner />Sending...</> : "Send OTP to My Gmail"}
            </button>

            {/* OTP input */}
            <div style={{ marginTop: "1rem" }}>
              <label style={{
                display: "block",
                fontFamily: "Syne, sans-serif",
                fontSize: "0.7rem", fontWeight: 700,
                letterSpacing: "0.15em", color: "#475569",
                textTransform: "uppercase", marginBottom: "0.6rem",
              }}>
                Step 3 — Enter 6-Digit OTP
              </label>
              <input
                ref={otpRef}
                className="otp-input"
                type="text"
                inputMode="numeric"
                placeholder="_ _ _ _ _ _"
                value={otp}
                onChange={handleOtpChange}
                maxLength={6}
                style={{
                  width: "100%", padding: "1rem 1.2rem",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#f1f5f9",
                  outline: "none",
                  fontSize: "1.4rem",
                  fontFamily: "Syne, monospace",
                  fontWeight: 700,
                  letterSpacing: "0.4em",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                }}
              />
            </div>

            <button
              className="login-btn-hover"
              onClick={verifyOTP}
              disabled={isLoading || otp.length < 6}
              style={{
                width: "100%", padding: "1rem",
                borderRadius: 14, border: "none",
                fontWeight: 700,
                cursor: isLoading || otp.length < 6 ? "not-allowed" : "pointer",
                background: otp.length === 6
                  ? "linear-gradient(135deg, #22c55e, #16a34a)"
                  : "rgba(255,255,255,0.05)",
                color: otp.length === 6 ? "#fff" : "#475569",
                fontSize: "0.95rem",
                fontFamily: "Syne, sans-serif",
                letterSpacing: "0.04em",
                marginTop: 12,
                transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                boxShadow: otp.length === 6 ? "0 4px 18px rgba(34,197,94,0.3)" : "none",
                animation: otp.length === 6 ? "pulse-ring 1.5s ease-in-out infinite" : "none",
              }}
            >
              {isLoading ? <><Spinner />Verifying...</> : "Verify OTP & Unlock 🔓"}
            </button>
          </div>
        )}

        {/* Status message */}
        {status && (
          <div
            key={status}
            style={{
              marginTop: "1.2rem",
              padding: "0.9rem 1.1rem",
              borderRadius: 12,
              background: statusColors[statusType].bg,
              border: `1px solid ${statusColors[statusType].border}`,
              color: statusColors[statusType].text,
              fontFamily: "DM Sans, sans-serif",
              fontSize: "0.88rem",
              fontWeight: 500,
              textAlign: "center",
              animation: "fadeUp 0.3s ease both",
            }}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
}