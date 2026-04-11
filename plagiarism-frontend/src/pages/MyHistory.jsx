import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function MyHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const [showClearModal, setShowClearModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const BASE_URL = "http://localhost:8000";

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [successMessage]);

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

  const clearHistory = async () => {
    try {
      setClearing(true);

      const res = await fetch(`${BASE_URL}/api/clear-history/`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.status === 401 || res.status === 403) {
        navigate("/login");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to clear history");
      }

      setHistory([]);
      setShowClearModal(false);
      setSuccessMessage("Your plagiarism history has been cleared successfully.");
    } catch (err) {
      console.error("Clear history error:", err);
      setSuccessMessage("Failed to clear history. Please try again.");
    } finally {
      setClearing(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    if (riskLevel === "VERY HIGH" || riskLevel === "HIGH") return "#f87171";
    if (riskLevel === "MEDIUM") return "#facc15";
    return "#4ade80";
  };

  const getScoreColor = (score) => {
    const numericScore = Number(score);
    if (numericScore >= 70) return "#f87171";
    if (numericScore >= 40) return "#facc15";
    return "#4ade80";
  };

  const getAnalysisLabel = (type) => {
    const normalized = String(type || "").toLowerCase();

    if (
      normalized.includes("essay") ||
      normalized.includes("plagiarism")
    ) {
      return "Essay Analysis";
    }

    if (
      normalized.includes("code") ||
      normalized.includes("python") ||
      normalized.includes("javascript") ||
      normalized.includes("java") ||
      normalized.includes("cpp") ||
      normalized.includes("c++")
    ) {
      return "Code Analysis";
    }

    return "Analysis";
  };

  const getSourceLabel = (item) => {
    const type = item?.result_type?.toLowerCase();
    if (type === "essay") return "Uploaded Document";
    if (type === "code") return "Pasted Content";
    return "Source";
  };

  const getSourceValue = (item) => {
    return (
      item.title ||
      item.file_name ||
      item.source_name ||
      (item.result_type?.includes("code") ? "Pasted Code" : "Pasted Content")
    );
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
        position: "relative",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <button
            onClick={() => navigate("/options")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.4)",
              color: "#fca5a5",
              cursor: "pointer",
              transition: "all 0.2s ease",
              alignSelf: "flex-start",
              height: "fit-content",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.18)";
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.6)";
              e.currentTarget.style.color = "#fecaca";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(220,38,38,0.08)";
              e.currentTarget.style.borderColor = "rgba(220,38,38,0.4)";
              e.currentTarget.style.color = "#fca5a5";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            ← Back to Options
          </button>

          <div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: "800",
                fontFamily: "Syne, sans-serif",
              }}
            >
              📜 My Plagiarism History
            </h1>

            <p style={{ color: "#64748b", margin: "0" }}>
              Essay + Code plagiarism reports (Private to your account)
            </p>
          </div>
        </div>

        {/* Clear History Button - Aligned with Back button */}
        {history.length > 0 && (
          <button
            onClick={() => setShowClearModal(true)}
            disabled={clearing}
            style={{
              padding: "12px 18px",
              borderRadius: "12px",
              border: "1px solid rgba(239,68,68,0.35)",
              background: "linear-gradient(135deg, rgba(239,68,68,0.14), rgba(127,29,29,0.12))",
              color: "#fca5a5",
              fontWeight: "700",
              cursor: "pointer",
              height: "fit-content",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.background =
                "linear-gradient(135deg, rgba(239,68,68,0.22), rgba(127,29,29,0.18))";
              e.currentTarget.style.borderColor = "rgba(248,113,113,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background =
                "linear-gradient(135deg, rgba(239,68,68,0.14), rgba(127,29,29,0.12))";
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)";
            }}
          >
            🗑 Clear History
          </button>
        )}
      </div>

      {/* Inline Success/Error Message */}
      {successMessage && (
        <div
          style={{
            marginBottom: "2rem",
            padding: "16px 20px",
            borderRadius: "14px",
            background: successMessage.toLowerCase().includes("failed")
              ? "linear-gradient(135deg, rgba(239,68,68,0.16), rgba(220,38,38,0.1))"
              : "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(22,163,74,0.12))",
            border: successMessage.toLowerCase().includes("failed")
              ? "1px solid rgba(248,113,113,0.3)"
              : "1px solid rgba(74,222,128,0.35)",
            color: successMessage.toLowerCase().includes("failed")
              ? "#fecaca"
              : "#bbf7d0",
            boxShadow: successMessage.toLowerCase().includes("failed")
              ? "0 8px 24px rgba(239,68,68,0.12)"
              : "0 8px 24px rgba(34,197,94,0.15)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ fontWeight: "700", fontSize: "0.95rem", marginBottom: "4px" }}>
            {successMessage.toLowerCase().includes("failed") ? "Error" : "Success"}
          </div>
          <div
            style={{
              fontSize: "0.9rem",
              color: successMessage.toLowerCase().includes("failed")
                ? "#fee2e2"
                : "#dcfce7",
            }}
          >
            {successMessage}
          </div>
        </div>
      )}

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
                  alignItems: "flex-start",
                  marginBottom: "0.75rem",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: "700",
                      color: "#f8fafc",
                      marginBottom: "4px",
                    }}
                  >
                    {item.result_type?.toLowerCase().includes("code")
                      ? "Code Analysis"
                      : "Essay Analysis"}
                  </h3>

                  <p
                    style={{
                      color: "#64748b",
                      fontSize: "0.85rem",
                    }}
                  >
                    Source: {getSourceValue(item)}
                  </p>
                </div>

                <span
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.8rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>

              <p style={{ color: "#a5b4fc" }}>
                Score:{" "}
                <strong style={{ color: getScoreColor(item.score) }}>
                  {item.score}%
                </strong>
              </p>

              <p
                style={{
                  color: getRiskColor(item.risk_level),
                  fontWeight: "600",
                }}
              >
                Risk Level: {item.risk_level}
              </p>

            </div>
          ))}
        </div>
      )}

      {/* Professional Confirm Modal */}
      {showClearModal && (
        <div
          onClick={() => !clearing && setShowClearModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.72)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            zIndex: 1500,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              borderRadius: "22px",
              background:
                "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.96))",
              border: "1px solid rgba(248,113,113,0.22)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
              overflow: "hidden",
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
                  width: "52px",
                  height: "52px",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(239,68,68,0.14)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  fontSize: "1.4rem",
                  marginBottom: "1rem",
                }}
              >
                🗑
              </div>

              <h2
                style={{
                  fontSize: "1.35rem",
                  fontWeight: "800",
                  color: "#f8fafc",
                  marginBottom: "0.55rem",
                  fontFamily: "Syne, sans-serif",
                }}
              >
                Clear plagiarism history?
              </h2>

              <p
                style={{
                  color: "#94a3b8",
                  lineHeight: "1.7",
                  fontSize: "0.98rem",
                }}
              >
                This will permanently remove all essay and code plagiarism reports
                saved in your account. This action cannot be undone.
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
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
                style={{
                  padding: "11px 18px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#cbd5e1",
                  fontWeight: "600",
                  cursor: clearing ? "not-allowed" : "pointer",
                  opacity: clearing ? 0.6 : 1,
                }}
              >
                Cancel
              </button>

              <button
                onClick={clearHistory}
                disabled={clearing}
                style={{
                  padding: "11px 18px",
                  borderRadius: "12px",
                  border: "1px solid rgba(248,113,113,0.35)",
                  background:
                    clearing
                      ? "rgba(239,68,68,0.2)"
                      : "linear-gradient(135deg, #dc2626, #b91c1c)",
                  color: "#fff",
                  fontWeight: "700",
                  cursor: clearing ? "not-allowed" : "pointer",
                  minWidth: "170px",
                  boxShadow: "0 12px 24px rgba(185,28,28,0.28)",
                  opacity: clearing ? 0.85 : 1,
                }}
              >
                {clearing ? "Clearing History..." : "Yes, Clear Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}