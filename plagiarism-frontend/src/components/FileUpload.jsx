import { useState } from "react";
import API from "../api/axios";

export default function FileUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("document", file);

    try {
      setLoading(true);
      const res = await API.post("/upload/", formData);
      onUploaded(res.data);   // <-- returns id
    } catch (err) {
      console.error(err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        accept=".txt,.pdf,.docx"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button type="submit">
        {loading ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}
