import { BASE_URL } from "../config";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import useResponsive from "../hooks/useResponsive";

const FEATURES = [
  {
    num: "01",
    title: "Essay & Document Plagiarism",
    desc: "Cross-reference essays, paragraphs, and written content using sentence-level similarity analysis.",
    badge: "FREE",
    path: "/similarity",
  },
  {
    num: "02",
    title: "AI Content Detector",
    desc: "Estimate the probability that text was AI-generated versus human-written, with a full breakdown.",
    badge: "FREE",
    path: "/upload",
  },
  {
    num: "03",
    title: "Code Plagiarism Analyzer",
    desc: "AST-level source comparison, clone detection, and similarity scoring across languages.",
    badge: "LOGIN",
    path: "/compare",
  },
  {
    num: "04",
    title: "Analysis History",
    desc: "Every scan you run is logged to your account — revisit past results, scores, and risk levels.",
    badge: "LOGIN",
    path: "/history",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [isGetStartedHovered, setIsGetStartedHovered] = useState(false);
  const [isLoginHovered, setIsLoginHovered] = useState(false);
  const [isAccountHovered, setIsAccountHovered] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const dropdownRef = useRef(null);
  const authRan = useRef(false);

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
          setUser({ name: data.name || null, email: data.email || null, picture: data.picture || null });
        } else if (isVerified) {
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
        try {
          const verified = localStorage.getItem("verified");
          const saved = localStorage.getItem("user_profile");
          if (verified === "true" && saved) setUser(JSON.parse(saved));
        } catch {}
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Force-reset any scroll lock left behind by other pages, and restore it on leave
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;

    html.style.overflow = "auto";
    body.style.overflow = "auto";
    html.style.height = "auto";
    body.style.height = "auto";
    body.style.margin = "0";
    body.style.background = "#07080a";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;
    };
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const year = new Date().getFullYear();

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scanline { 0% { transform: translateY(-100%); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(2000%); opacity: 0; } }
        @keyframes dropdownIn { from { opacity: 0; transform: translateY(-8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
        * { box-sizing: border-box; }
        html, body { overflow-x: hidden; }
        .yk-row { transition: all 0.25s ease; }
        .yk-row:hover { background: rgba(255,255,255,0.025) !important; border-left-color: #3b82f6 !important; }
        .yk-row:hover .yk-row-num { color: #3b82f6 !important; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ ...styles.nav, padding: isMobile ? "16px 20px" : "20px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/yk-icon.png" alt="YK Product" style={{ width: 26, height: 26, objectFit: "contain" }} />
          <span style={styles.navBrand}>PLAGIARISM<span style={{ color: "#3b82f6" }}>::</span>DETECT</span>
        </div>

        {authChecked && (
          !user ? (
            <button
              style={{ ...styles.navButton, ...(isLoginHovered ? styles.navButtonHover : {}) }}
              onMouseEnter={() => setIsLoginHovered(true)}
              onMouseLeave={() => setIsLoginHovered(false)}
              onClick={() => navigate("/login")}
            >
              Sign In
            </button>
          ) : (
            <div style={styles.dropdownWrapper} ref={dropdownRef}>
              <button
                style={{ ...styles.navButton, ...(isAccountHovered || dropdownOpen ? styles.navButtonHover : {}), display: "flex", alignItems: "center", gap: "0.5rem" }}
                onMouseEnter={() => setIsAccountHovered(true)}
                onMouseLeave={() => setIsAccountHovered(false)}
                onClick={() => setDropdownOpen((p) => !p)}
              >
                {user.name ? user.name.split(" ")[0] : "Account"} ▾
              </button>

              {dropdownOpen && (
                <div style={{
                  ...styles.dropdown,
                  ...(isMobile ? { right: "auto", left: "50%", transform: "translateX(-50%)", minWidth: "calc(100vw - 40px)", maxWidth: 320 } : {}),
                }}>
                  <div style={styles.dropdownHeader}>
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name || "User"}
                        referrerPolicy="no-referrer"
                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(59,130,246,0.4)", flexShrink: 0 }}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=3b82f6&color=fff&bold=true`; }}
                      />
                    ) : (
                      <div style={styles.avatarFallback}>{initials}</div>
                    )}
                    <div style={{ overflow: "hidden" }}>
                      <div style={styles.dropdownUsername}>{user.name || "User"}</div>
                      {user.email && <div style={styles.dropdownEmail}>{user.email}</div>}
                      <div style={styles.verifiedBadge}>
                        <span style={{ width: 6, height: 6, background: "#22c55e", display: "inline-block" }} />
                        VERIFIED
                      </div>
                    </div>
                  </div>
                  <button style={styles.dropdownGoBtn} onClick={() => navigate("/options")}>Go to Dashboard →</button>
                </div>
              )}
            </div>
          )
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ ...styles.hero, padding: isMobile ? "3rem 1.25rem 3.5rem" : "5rem 3rem 6rem", flexDirection: isMobile ? "column" : "row" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.statusTag}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "blink 1.8s ease-in-out infinite" }} />
            SYSTEM ONLINE · SCAN ENGINE READY
          </div>

          <h1 style={{ ...styles.title, fontSize: isMobile ? "2.1rem" : "3.4rem" }}>
            Detect plagiarism.<br />Detect AI text.<br />
            <span style={{ color: "#3b82f6" }}>In seconds.</span>
          </h1>

          <p style={{ ...styles.subtitle, fontSize: isMobile ? "0.98rem" : "1.08rem" }}>
            A precision detection engine for essays, documents, and source code -
            built to catch both copied content and AI-generated writing.
          </p>

          <div style={styles.buttonContainer}>
            <button
              style={{ ...styles.button, ...(isGetStartedHovered ? styles.buttonHover : {}) }}
              onMouseEnter={() => setIsGetStartedHovered(true)}
              onMouseLeave={() => setIsGetStartedHovered(false)}
              onClick={() => navigate("/options")}
            >
              Get Started →
            </button>
            {authChecked && !user && (
              <button
                style={{ ...styles.loginButton, ...(isLoginHovered ? styles.loginButtonHover : {}) }}
                onMouseEnter={() => setIsLoginHovered(true)}
                onMouseLeave={() => setIsLoginHovered(false)}
                onClick={() => navigate("/login")}
              >
                Join Now
              </button>
            )}
          </div>
        </div>

        {!isMobile && (
          <div style={styles.heroMark}>
            <div style={styles.heroMarkScanline} />
            <img src="/yk-icon.png" alt="YK Product" style={{ width: 120, height: 120, objectFit: "contain", position: "relative", zIndex: 2 }} />
            <div style={styles.heroMarkRing} />
          </div>
        )}
      </section>

      {/* ── FEATURES ── */}
      <section style={{ ...styles.featuresSection, padding: isMobile ? "0 1.25rem 4rem" : "0 3rem 6rem" }}>
        <div style={styles.featuresHeader}>
          <span style={styles.featuresLabel}>// AVAILABLE MODULES</span>
          <h2 style={{ ...styles.sectionTitle, fontSize: isMobile ? "1.5rem" : "2rem" }}>Four Tools. One Account.</h2>
        </div>

        <div style={styles.featuresList}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="yk-row"
              style={{ ...styles.featureRow, animation: `fadeInUp 0.5s ease both ${0.08 + i * 0.07}s`, flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center" }}
              onClick={() => navigate(f.path)}
            >
              <span className="yk-row-num" style={styles.featureNum}>{f.num}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.featureRowTop}>
                  <h3 style={styles.featureTitle}>{f.title}</h3>
                  <span style={{ ...styles.featureBadge, ...(f.badge === "FREE" ? styles.badgeFree : styles.badgeLogin) }}>{f.badge}</span>
                </div>
                <p style={styles.featureDesc}>{f.desc}</p>
              </div>
              <span style={styles.featureArrow}>→</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ ...styles.footer, padding: isMobile ? "2rem 1.25rem" : "2.5rem 3rem", flexDirection: isMobile ? "column" : "row" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/yk-icon.png" alt="YK Product" style={{ width: 18, height: 18, objectFit: "contain" }} />
          <span style={styles.footerText}>© {year} <strong style={{ color: "#cbd5e1" }}>YK Product</strong> - All rights reserved.</span>
        </div>
        <span style={styles.footerSub}>Designed · Built · Delivered</span>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: `
      linear-gradient(#0d0e12 1px, transparent 1px),
      linear-gradient(90deg, #0d0e12 1px, transparent 1px),
      #07080a
    `,
    backgroundSize: "48px 48px, 48px 48px, cover",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#f1f5f9",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    position: "sticky",
    top: 0,
    zIndex: 30,
    backdropFilter: "blur(14px)",
    background: "rgba(7,8,10,0.75)",
  },
  navBrand: {
    fontWeight: 700,
    fontSize: "0.92rem",
    letterSpacing: "0.04em",
    color: "#e2e8f0",
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  },
  navButton: {
    padding: "0.5rem 1.2rem",
    borderRadius: 6,
    border: "1px solid rgba(59,130,246,0.4)",
    background: "rgba(59,130,246,0.08)",
    color: "#93c5fd",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  navButtonHover: { background: "rgba(59,130,246,0.2)", borderColor: "rgba(59,130,246,0.7)" },
  dropdownWrapper: { position: "relative" },
  dropdown: {
    position: "absolute", top: "calc(100% + 10px)", right: 0, minWidth: 250,
    background: "#0e0f13", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
    padding: "1rem", boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
    animation: "dropdownIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both", zIndex: 40,
  },
  dropdownHeader: { display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "0.9rem" },
  avatarFallback: {
    width: 40, height: 40, borderRadius: 8, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: "0.9rem", color: "#fff", flexShrink: 0,
  },
  dropdownUsername: { fontWeight: 700, fontSize: "0.9rem", color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  dropdownEmail: { fontSize: "0.76rem", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  verifiedBadge: { display: "flex", alignItems: "center", gap: 5, fontSize: "0.68rem", color: "#86efac", marginTop: 3, fontWeight: 700, letterSpacing: "0.05em", fontFamily: "'JetBrains Mono', monospace" },
  dropdownGoBtn: {
    width: "100%", padding: "0.6rem", borderRadius: 6, border: "1px solid rgba(59,130,246,0.4)",
    background: "rgba(59,130,246,0.1)", color: "#93c5fd", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
  },
  hero: { display: "flex", alignItems: "center", gap: "3rem", maxWidth: 1200, margin: "0 auto" },
  statusTag: {
    display: "inline-flex", alignItems: "center", gap: 8,
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", color: "#4ade80",
    background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
    padding: "0.4rem 0.8rem", borderRadius: 4, marginBottom: "1.75rem",
  },
  title: { fontWeight: 800, margin: "0 0 1rem", letterSpacing: "-0.02em", lineHeight: 1.12, animation: "fadeInUp 0.6s ease both" },
  subtitle: { color: "#8b96a8", lineHeight: 1.65, margin: "0 0 2.25rem", maxWidth: 480, animation: "fadeInUp 0.6s ease both 0.1s" },
  buttonContainer: { display: "flex", gap: "0.9rem", flexWrap: "wrap", alignItems: "center", animation: "fadeInUp 0.6s ease both 0.2s" },
  button: {
    background: "#3b82f6", color: "#fff", border: "none", padding: "0.85rem 1.8rem", borderRadius: 6,
    fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
    boxShadow: "0 4px 20px rgba(59,130,246,0.3)", transition: "all 0.2s ease",
  },
  buttonHover: { background: "#2563eb", transform: "translateY(-2px)", boxShadow: "0 8px 26px rgba(59,130,246,0.4)" },
  loginButton: {
    background: "transparent", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.18)",
    padding: "0.85rem 1.8rem", borderRadius: 6, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
    transition: "all 0.2s ease",
  },
  loginButtonHover: { background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.35)" },
  heroMark: {
    width: 260, height: 260, borderRadius: "50%", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
    border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden",
  },
  heroMarkRing: {
    position: "absolute", inset: 24, borderRadius: "50%", border: "1px dashed rgba(59,130,246,0.3)",
  },
  heroMarkScanline: {
    position: "absolute", left: 0, right: 0, height: 2,
    background: "linear-gradient(90deg, transparent, #3b82f6, transparent)",
    animation: "scanline 3.5s linear infinite", zIndex: 1,
  },
  featuresSection: { maxWidth: 1000, margin: "0 auto" },
  featuresHeader: { marginBottom: "2.5rem" },
  featuresLabel: {
    fontFamily: "'JetBrains Mono', 'Courier New', monospace", fontSize: "0.75rem",
    color: "#3b82f6", letterSpacing: "0.1em", fontWeight: 700, display: "block", marginBottom: "0.6rem",
  },
  sectionTitle: { fontWeight: 800, margin: 0, letterSpacing: "-0.01em" },
  featuresList: { display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden" },
  featureRow: {
    display: "flex", gap: "1.5rem", padding: "1.5rem 1.75rem", cursor: "pointer",
    borderLeft: "3px solid transparent", borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  featureNum: {
    fontFamily: "'JetBrains Mono', 'Courier New', monospace", fontSize: "1.3rem", fontWeight: 700,
    color: "#334155", flexShrink: 0, width: 40, transition: "color 0.25s ease",
  },
  featureRowTop: { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.35rem", flexWrap: "wrap" },
  featureTitle: { fontSize: "1.02rem", fontWeight: 700, color: "#f1f5f9", margin: 0 },
  featureBadge: {
    fontFamily: "'JetBrains Mono', 'Courier New', monospace", fontSize: "0.65rem", fontWeight: 700,
    padding: "2px 8px", borderRadius: 4, letterSpacing: "0.05em",
  },
  badgeFree: { color: "#4ade80", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" },
  badgeLogin: { color: "#93c5fd", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)" },
  featureDesc: { fontSize: "0.86rem", color: "#8b96a8", lineHeight: 1.55, margin: 0 },
  featureArrow: { color: "#334155", fontSize: "1.1rem", flexShrink: 0, alignSelf: "center" },
  footer: {
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
  },
  footerText: { fontSize: "0.82rem", color: "#8b96a8" },
  footerSub: {
    fontSize: "0.72rem", color: "#475569", letterSpacing: "0.06em",
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  },
};