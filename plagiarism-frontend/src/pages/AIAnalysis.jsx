import { useEffect, useState } from "react";
import API from "../api/axios";

export default function AIAnalysis() {
  const [documents, setDocuments] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await API.get("/documents/");
      setDocuments(res.data);
    } catch (err) {
      console.error("Failed to load documents");
    }
  };

  const runAIAnalysis = async (docId) => {
    setSelectedDoc(docId);
    setAiResult(null);
    setError(null);
    setLoading(true);

    try {
      const res = await API.get(`/ai-check/${docId}/`, {
        timeout: 60000
      });
      setAiResult(res.data.ai_analysis);
    } catch (err) {
      if (err.code === "ECONNABORTED") {
        setError("Request timed out. The server is still loading AI models. Please try again in a moment.");
      } else {
        setError(err.response?.data?.error || "AI analysis failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>AI Authorship Analysis</h2>

      {documents.length === 0 && <p>No documents available.</p>}

      <ul>
        {documents.map((doc) => (
          <li key={doc.id} style={{ marginBottom: "10px" }}>
            <strong>{doc.file_name}</strong>
            <button
              style={{ marginLeft: "12px" }}
              onClick={() => runAIAnalysis(doc.id)}
              disabled={loading && selectedDoc === doc.id}
            >
              {loading && selectedDoc === doc.id
                ? "Analyzing..."
                : "Run AI Analysis"}
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p style={{ color: "red", marginTop: "15px" }}>
          {error}
        </p>
      )}

      {aiResult && (
        <div style={{ marginTop: "30px" }}>
          <h3>Analysis Result</h3>

          <p><strong>Label:</strong> {aiResult.label}</p>
          <p><strong>AI Percentage:</strong> {aiResult.ai_percentage ?? "—"}%</p>
          <p><strong>Human Percentage:</strong> {aiResult.human_percentage ?? "—"}%</p>
          <p><strong>Confidence:</strong> {aiResult.confidence ?? "—"}%</p>
          <p><strong>Word Count:</strong> {aiResult.word_count ?? "—"}</p>
          <p><strong>Recommendation:</strong> {aiResult.recommendation ?? "—"}</p>

          {aiResult.warning && (
            <p style={{ color: "orange" }}>
              ⚠️ {aiResult.warning}
            </p>
          )}

          {aiResult.error && (
            <p style={{ color: "red" }}>
              ❌ {aiResult.message}
            </p>
          )}

          {aiResult.components && (
            <>
              <h4>Component Scores</h4>
              <ul>
                {Object.entries(aiResult.components).map(([k, v]) => (
                  <li key={k}>{k}: {v}</li>
                ))}
              </ul>
            </>
          )}

          {aiResult.heuristic_breakdown && (
            <>
              <h4>Heuristic Breakdown</h4>
              <ul>
                {Object.entries(aiResult.heuristic_breakdown).map(([k, v]) => (
                  <li key={k}>{k}: {v}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}