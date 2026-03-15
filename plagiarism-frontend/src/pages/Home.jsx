import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

const styles = {
  wrapper: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "1rem",
    background: `
      radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.25) 0%, transparent 50%),
      radial-gradient(circle at 40% 60%, rgba(236, 72, 153, 0.2) 0%, transparent 50%),
      linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)
    `,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#f1f5f9",
    overflow: "hidden",
    boxSizing: "border-box",
  },
  backgroundImages: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 1,
  },
  bgImage: {
    position: "absolute",
    opacity: 0.15,
    animation: "copyFloat 25s infinite linear",
    filter: "blur(1px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: "90px",
    height: "90px",
    marginBottom: "1rem",
    position: "relative",
    zIndex: 3,
    flexShrink: 0,
  },
  logo: {
    width: "100%",
    height: "100%",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoCircle: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background:
      "conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #10b981, #3b82f6)",
    position: "absolute",
    top: 0,
    left: 0,
    animation: "logoRotate 3s linear infinite",
  },
  logoGlow: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background:
      "conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #10b981, #3b82f6)",
    position: "absolute",
    top: 0,
    left: 0,
    animation: "logoRotate 3s linear infinite",
    filter: "blur(12px)",
    opacity: 0.7,
  },
  logoIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "62px",
    height: "62px",
    background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))",
    borderRadius: "50%",
    border: "1.5px solid rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.8rem",
    backdropFilter: "blur(10px)",
    zIndex: 2,
    boxShadow: "inset 0 0 20px rgba(139,92,246,0.3)",
  },
  card: {
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(25px)",
    borderRadius: "28px",
    padding: "2.5rem 3rem",
    maxWidth: "580px",
    width: "90%",
    textAlign: "center",
    boxShadow:
      "0 32px 80px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)",
    zIndex: 3,
    animation: "fadeInUp 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  },
  title: {
    fontSize: "clamp(2rem, 5vw, 3.2rem)",
    fontWeight: "900",
    marginBottom: "1rem",
    background: "linear-gradient(135deg, #f8fafc, #e2e8f0)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    animation: "fadeInUp 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both",
  },
  subtitle: {
    fontSize: "1.1rem",
    marginBottom: "2rem",
    color: "#cbd5e1",
    animation: "fadeInUp 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s both",
  },
  buttonContainer: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "nowrap",
    alignItems: "center",
  },
  button: {
    background:
      "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #1e40af 100%)",
    color: "#fff",
    border: "none",
    padding: "1rem 2rem",
    fontSize: "1rem",
    fontWeight: "700",
    borderRadius: "16px",
    cursor: "pointer",
    transition: "all 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
    boxShadow: "0 16px 45px rgba(59,130,246,0.4)",
    position: "relative",
    overflow: "hidden",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    whiteSpace: "nowrap",
  },
  loginButton: {
    background:
      "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)",
    color: "#fff",
    border: "none",
    padding: "1rem 2rem",
    fontSize: "1rem",
    fontWeight: "700",
    borderRadius: "16px",
    cursor: "pointer",
    transition: "all 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
    boxShadow: "0 16px 45px rgba(139,92,246,0.4)",
    position: "relative",
    overflow: "hidden",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    whiteSpace: "nowrap",
  },
  buttonHover: {
    transform: "translateY(-6px) scale(1.03)",
    boxShadow: "0 30px 60px rgba(59,130,246,0.5)",
    background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
  },
  loginButtonHover: {
    transform: "translateY(-6px) scale(1.03)",
    boxShadow: "0 30px 60px rgba(139,92,246,0.5)",
    background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
  },
  dropdownWrapper: {
    position: "relative",
    display: "inline-block",
  },
  dropdown: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    left: "calc(100% + 12px)",
    minWidth: "240px",
    background: "rgba(15, 23, 42, 0.95)",
    backdropFilter: "blur(20px)",
    borderRadius: "16px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
    overflow: "hidden",
    zIndex: 100,
    animation: "dropdownIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  },
  dropdownHeader: {
    padding: "1.2rem 1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "0.9rem",
  },
  avatarFallback: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
    border: "2px solid rgba(139,92,246,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.2rem",
    fontWeight: "700",
    color: "#fff",
    flexShrink: 0,
  },
  dropdownUsername: {
    fontWeight: "700",
    fontSize: "0.95rem",
    color: "#f1f5f9",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  dropdownEmail: {
    fontSize: "0.75rem",
    color: "#94a3b8",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    marginTop: "2px",
  },
  verifiedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    marginTop: "6px",
    padding: "3px 10px",
    borderRadius: "99px",
    background: "rgba(34,197,94,0.1)",
    border: "1px solid rgba(34,197,94,0.3)",
    fontSize: "0.7rem",
    color: "#86efac",
    fontWeight: "600",
  },
};

export default function Home() {
  const navigate = useNavigate();
  const [isGetStartedHovered, setIsGetStartedHovered] = useState(false);
  const [isLoginHovered, setIsLoginHovered] = useState(false);
  const [isAccountHovered, setIsAccountHovered] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const dropdownRef = useRef(null);
  const authRan = useRef(false);

  const BASE_URL = "http://localhost:8000";

  // ✅ Check real session from backend (same as Options.jsx)
  useEffect(() => {
    if (authRan.current) return;
    authRan.current = true;

    const checkAuth = async () => {
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${BASE_URL}/api/check-auth/`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          setUser(null);
          setAuthChecked(true);
          return;
        }

        const data = await res.json();
        const isVerified = data.code_access === true;

        if (isVerified && (data.name || data.email)) {
          setUser({
            name: data.name || null,
            email: data.email || null,
            picture: data.picture || null,
          });
        } else if (isVerified) {
          // Fallback to localStorage if session has no name/email
          try {
            const saved = localStorage.getItem("user_profile");
            if (saved) setUser(JSON.parse(saved));
          } catch {}
        } else {
          setUser(null);
          localStorage.removeItem("verified");
          localStorage.removeItem("user_profile");
        }
      } catch {
        // Backend unreachable — fallback to localStorage
        try {
          const verified = localStorage.getItem("verified");
          const saved = localStorage.getItem("user_profile");
          if (verified === "true" && saved) {
            setUser(JSON.parse(saved));
          }
        } catch {}
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Remove white borders
  useEffect(() => {
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.documentElement.style.height = "100%";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const docIcons = ["📄", "📃", "📜", "📚", "💻", "🔍", "✏️"];
  const bgImages = Array.from({ length: 15 }).map((_, i) => {
    const size = 60 + Math.random() * 40;
    return (
      <div
        key={i}
        style={{
          ...styles.bgImage,
          width: size,
          height: size,
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 30}s`,
          animationDuration: `${20 + Math.random() * 15}s`,
          fontSize: size * 0.4,
          transform: `rotate(${Math.random() * 360}deg)`,
        }}
      >
        {docIcons[Math.floor(Math.random() * docIcons.length)]}
      </div>
    );
  });

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <div style={styles.wrapper}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(60px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes copyFloat {
          0% { transform: translateY(100vh) rotate(0deg) scale(0.8); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100px) rotate(360deg) scale(1.2); opacity: 0; }
        }
        @keyframes logoRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes starPulse {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(139,92,246,0.8)) drop-shadow(0 0 12px rgba(59,130,246,0.5)); }
          50% { filter: drop-shadow(0 0 12px rgba(236,72,153,0.9)) drop-shadow(0 0 24px rgba(139,92,246,0.7)); }
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        * { outline: none !important; }
      `}</style>

      <div style={styles.backgroundImages}>{bgImages}</div>

      <div style={styles.logoContainer}>
        <div style={styles.logo}>
          <div style={styles.logoGlow}></div>
          <div style={styles.logoCircle}></div>
          <div style={styles.logoIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: "starPulse 2s ease-in-out infinite" }}>
              <path
                d="M12 2L14.9 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L9.1 8.26L12 2Z"
                fill="url(#starGrad)"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="starGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="50%" stopColor="#c4b5fd" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h1 style={styles.title}>AI Plagiarism Detection</h1>
        <p style={styles.subtitle}>
          Precision-engineered AI detection for AI-generated content and plagiarism.
        </p>
        <div style={styles.buttonContainer}>
          <button
            style={{
              ...styles.button,
              ...(isGetStartedHovered ? styles.buttonHover : {}),
            }}
            onMouseEnter={() => setIsGetStartedHovered(true)}
            onMouseLeave={() => setIsGetStartedHovered(false)}
            onClick={() => navigate("/options")}
          >
            Get Started →
          </button>

          {/* Show login button only after auth check is done */}
          {authChecked && (
            !user ? (
              <button
                style={{
                  ...styles.loginButton,
                  ...(isLoginHovered ? styles.loginButtonHover : {}),
                }}
                onMouseEnter={() => setIsLoginHovered(true)}
                onMouseLeave={() => setIsLoginHovered(false)}
                onClick={() => navigate("/login")}
              >
                Join Now ⚡
              </button>
            ) : (
              <div style={styles.dropdownWrapper} ref={dropdownRef}>
                <button
                  style={{
                    ...styles.loginButton,
                    ...(isAccountHovered || dropdownOpen ? styles.loginButtonHover : {}),
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                  }}
                  onMouseEnter={() => setIsAccountHovered(true)}
                  onMouseLeave={() => setIsAccountHovered(false)}
                  onClick={() => setDropdownOpen((prev) => !prev)}
                >
                  View Your Account
                </button>

                {dropdownOpen && (
                  <div style={styles.dropdown}>
                    <div style={styles.dropdownHeader}>
                      {/* Avatar */}
                      {user.picture ? (
                        <img
                          src={user.picture}
                          alt={user.name || "User"}
                          referrerPolicy="no-referrer"
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid rgba(139,92,246,0.6)",
                            flexShrink: 0,
                          }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              user.name || "User"
                            )}&background=6366f1&color=fff&bold=true`;
                          }}
                        />
                      ) : (
                        <div style={styles.avatarFallback}>{initials}</div>
                      )}

                      {/* Name + Email + Badge */}
                      <div style={{ overflow: "hidden" }}>
                        <div style={styles.dropdownUsername}>
                          {user.name || "User"}
                        </div>
                        {user.email && (
                          <div style={styles.dropdownEmail}>{user.email}</div>
                        )}
                        <div style={styles.verifiedBadge}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                          2FA Verified
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
      {/* No YK Watermark */}
    </div>
  );
}