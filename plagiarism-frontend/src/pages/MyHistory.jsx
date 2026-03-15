import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function MyHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const BASE_URL = "http://localhost:8000";

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/my-history/`, {
        method: "GET",
        credentials: "include",
      });

      if (res.status === 401 || res.status === 403) {
        navigate("/login");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await res.json();
      setHistory(data.results || []);
    } catch (err) {
      console.error("History fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 NEW: CLEAR HISTORY FUNCTION
  const clearHistory = async () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear ALL plagiarism history? This cannot be undone."
    );

    if (!confirmClear) return;

    try {
      setClearing(true);

      const res = await fetch(`${BASE_URL}/api/clear-history/`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to clear history");
      }

      // 🔥 Refresh UI instantly
      setHistory([]);
      alert("History cleared successfully!");
    } catch (err) {
      console.error("Clear history error:", err);
      alert("Failed to clear history");
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f0f1a",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#a5b4fc",
          fontSize: "1.2rem",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        Loading your plagiarism history...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f1a",
        padding: "2rem",
        color: "#f1f5f9",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <button
            onClick={() => navigate("/options")}
            style={{
              marginBottom: "1rem",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.4)",
              color: "#fca5a5",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(239,68,68,0.18)";
              e.target.style.borderColor = "rgba(239,68,68,0.6)";
              e.target.style.color = "#fecaca";
              e.target.style.transform = "translateY(-1px)";
          }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(239,68,68,0.08)";
              e.target.style.borderColor = "rgba(239,68,68,0.4)";
              e.target.style.color = "#f87171";
              e.target.style.transform = "translateY(0)";
      }}
          >
            ← Back to Options
          </button>

          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "800",
              fontFamily: "Syne, sans-serif",
            }}
          >
            📜 My Plagiarism History
          </h1>

          <p style={{ color: "#64748b" }}>
            Essay + Code plagiarism reports (Private to your account)
          </p>
        </div>

        {/* 🔥 NEW CLEAR HISTORY BUTTON */}
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            disabled={clearing}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "1px solid rgba(239,68,68,0.4)",
              background: "rgba(239,68,68,0.15)",
              color: "#f87171",
              fontWeight: "600",
              cursor: "pointer",
              height: "fit-content",
            }}
          >
            {clearing ? "Clearing..." : "🗑 Clear History"}
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          No history found. Start a plagiarism check to see results here.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {history.map((item, index) => (
            <div
              key={index}
              style={{
                padding: "1.5rem",
                borderRadius: "16px",
                background: "rgba(15,15,26,0.7)",
                border: "1px solid rgba(99,102,241,0.2)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <h3
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontWeight: "700",
                  }}
                >
                  {item.result_type?.toUpperCase()} Analysis
                </h3>

                <span
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.8rem",
                  }}
                >
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>

              <p style={{ color: "#a5b4fc" }}>
                Score: <strong>{item.score}%</strong>
              </p>

              <p
                style={{
                  color:
                    item.risk_level === "VERY HIGH" || item.risk_level === "HIGH"
                      ? "#f87171"
                      : item.risk_level === "MEDIUM"
                      ? "#facc15"
                      : "#4ade80",
                  fontWeight: "600",
                }}
              >
                Risk Level: {item.risk_level}
              </p>

              {item.title && (
                <p style={{ color: "#64748b", marginTop: "6px" }}>
                  Title: {item.title}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}