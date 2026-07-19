/*
 * AI Plagiarism Detection System
 * © 2026 YK Product. All rights reserved.
 * Designed • Built • Delivered — YK Product
 */
export default function Footer({ fixed = false }) {
  const year = new Date().getFullYear();

  return (
    <footer style={{
      ...(fixed ? {
        position: "fixed",
        bottom: 0,
        left: 0,
        zIndex: 20,
      } : {}),
      width: "100%",
      padding: "14px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      flexWrap: "wrap",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(0,0,0,0.35)",
      backdropFilter: "blur(8px)",
    }}>
      <img
        src="/yk-icon.png"
        alt="YK Product"
        style={{ width: 18, height: 18, objectFit: "contain", opacity: 0.9 }}
      />
      <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.78rem",
        color: "#64748b",
        letterSpacing: "0.02em",
        textAlign: "center",
      }}>
        © {year} <strong style={{ color: "#94a3b8" }}>YK Product</strong> — All rights reserved. · Designed · Built · Delivered
      </span>
    </footer>
  );
}