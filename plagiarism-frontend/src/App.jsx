import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Upload from "./pages/Upload.jsx";
import Compare from "./pages/Compare.jsx";
import AIAnalysis from "./pages/AIAnalysis.jsx";
import TextPaste from "./pages/TextPaste.jsx";
import Similarity from "./pages/Similarity.jsx"; 
import Login from "./pages/Login.jsx";
import Options from "./pages/Options.jsx";
import CompareCode from "./pages/CompareCode";
import History from "./pages/MyHistory";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/options" element={<Options />} /> 
        <Route path="/upload" element={<Upload />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/ai-analysis" element={<AIAnalysis />} />
        <Route path="/text" element={<TextPaste />} />
        <Route path="/login" element={<Login />} />
        <Route path="/similarity" element={<Similarity />} />
        <Route path="/compare-code" element={<CompareCode />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
