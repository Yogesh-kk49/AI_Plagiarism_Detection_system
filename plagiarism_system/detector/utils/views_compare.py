from rest_framework.decorators import api_view
from rest_framework.response import Response
import difflib
import itertools
import re
import io
import ast
from detector.models import PlagiarismHistory, UserHistory
# ── Import the v6.1 AI detector engine ───────────────────────────────────────
# plagiarism_engine.py is ai_code_detector_v6.py placed inside detector/utils/
from .plagiarism_engine import analyze_code_ai_likelihood, normalize_input

# ── Optional file parsers ─────────────────────────────────────────────────────
try:
    import pdfplumber
    _PDF_OK = True
except ImportError:
    _PDF_OK = False

try:
    from docx import Document as DocxDocument
    _DOCX_OK = True
except ImportError:
    _DOCX_OK = False


# ════════════════════════════════════════════════════════════════
#  🔹 AST SIMILARITY  (Python-only structural comparison)
# ════════════════════════════════════════════════════════════════

# Max lines fed into ast_similarity — AST dump SequenceMatcher is O(n²)
# 300 lines → ~70ms, 600 lines → ~260ms. Cap at 300 lines to stay fast.
_AST_SIM_MAX_LINES = 300

def ast_similarity(code1: str, code2: str) -> float:
    """
    Compare two Python snippets by their AST structure.
    Uses difflib on the AST dump strings — catches renamed-variable copies.
    Falls back to 0.0 for non-Python or unparseable code.
    Inputs are capped at _AST_SIM_MAX_LINES to prevent O(n²) slowdown.
    """
    try:
        # Cap lines to avoid SequenceMatcher O(n²) on large AST dumps
        lines1 = code1.splitlines()
        lines2 = code2.splitlines()
        if len(lines1) > _AST_SIM_MAX_LINES:
            lines1 = lines1[:_AST_SIM_MAX_LINES]
        if len(lines2) > _AST_SIM_MAX_LINES:
            lines2 = lines2[:_AST_SIM_MAX_LINES]
        dump1 = ast.dump(ast.parse("\n".join(lines1)))
        dump2 = ast.dump(ast.parse("\n".join(lines2)))
        return round(difflib.SequenceMatcher(None, dump1, dump2).ratio() * 100, 2)
    except Exception:
        return 0.0


# ════════════════════════════════════════════════════════════════
#  🔹 NON-CODE DETECTION  (blocks prose/essays/paragraphs)
# ════════════════════════════════════════════════════════════════

CODE_INDICATORS = [
    r'\bdef \w+\s*\(',
    r'\bfunction\s+\w+\s*\(',
    r'\bclass\s+\w+',
    r'\bimport\s+\w+',
    r'\bfrom\s+\w+\s+import',
    r'#include\s*[<"]',
    r'\bpublic\s+static\s+void\b',
    r'\bpublic\s+class\b',
    r'console\.log\s*\(',
    r'\bprint\s*\(',
    r'\bSystem\.out\.print',
    r'(?:==|!=|<=|>=|&&|\|\|)',
    r'(?:\+=|-=|\*=|/=|%=)',
    r'\breturn\s+\w',
    r'\bfor\s*\(',
    r'\bwhile\s*\(',
    r'\bif\s*\(',
    r'(?:int|str|float|bool)\s+\w+\s*=',
    r'=>\s*[\{\(]',
    r'<\?php',
    r'SELECT\s+\w+\s+FROM',
    r'CREATE\s+TABLE',
    r'<!DOCTYPE\s+html>',
    r'<html[\s>]',
    r'^\s*---\s*$',
]
COMPILED_CODE_PATTERNS = [
    re.compile(p, re.IGNORECASE | re.MULTILINE) for p in CODE_INDICATORS
]

PROSE_INDICATORS = [
    r'\b(the|a|an|is|are|was|were|has|have|had|will|would|could|should|may|might)\b',
    r'\b(this|that|these|those|it|they|we|you|he|she|I)\b',
    r'\b(and|but|or|so|yet|for|nor|although|because|since|unless|whereas)\b',
    r'[A-Z][a-z]{3,}\s+[a-z]{2,}\s+[a-z]{2,}',
    r'\.\s+[A-Z]',
    r'\b(please|thank|hello|hi|dear|regards|sincerely|however|therefore|furthermore|additionally)\b',
    r'\b(paragraph|essay|chapter|section|introduction|conclusion|summary|abstract)\b',
]
COMPILED_PROSE_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in PROSE_INDICATORS
]

def is_code(text: str) -> tuple:
    """
    Determine if text is source code or natural language.
    Returns: (bool, str) — (is_code, human_readable_reason)
    """
    if not text or len(text.strip()) < 10:
        return False, "Input is empty or too short to analyze"

    stripped   = text.strip()
    lines      = stripped.split("\n")
    line_count = max(len([l for l in lines if l.strip()]), 1)

    code_hits  = sum(1 for p in COMPILED_CODE_PATTERNS if p.search(text))
    prose_hits = sum(1 for p in COMPILED_PROSE_PATTERNS if p.search(text))
    if prose_hits >= 3 and code_hits == 0:
        return False, "Detected essay / natural language text"

    code_chars        = len(re.findall(r'[{}()\[\];=<>+\-*/&|^%!~@#]', text))
    code_char_density = code_chars / max(len(text), 1)

    words    = re.findall(r'[a-zA-Z]+', text)
    avg_word = sum(len(w) for w in words) / max(len(words), 1)

    indented     = sum(1 for l in lines if l.startswith(("    ", "\t")))
    indent_ratio = indented / line_count

    if code_hits >= 3:
        return True, f"Detected {code_hits} code patterns"
    if code_hits >= 1 and code_char_density > 0.05:
        return True, f"Code patterns + high symbol density ({code_char_density:.2f})"
    if code_char_density > 0.10 and indent_ratio > 0.2:
        return True, "High symbol density + structured indentation"
    if prose_hits >= 6 and code_hits == 0:
        return False, f"Detected natural language prose ({prose_hits} prose markers, 0 code patterns)"
    if avg_word < 4 and code_char_density > 0.05:
        return True, "Short identifiers + code symbols"
    if line_count < 3 and code_hits == 0:
        return False, "Too few lines and no code patterns detected"
    if prose_hits > code_hits * 2 and code_char_density < 0.04:
        return False, f"Prose signals ({prose_hits}) outweigh code signals ({code_hits}) with low symbol density"

    return False, "Content appears to be natural language text"


# ════════════════════════════════════════════════════════════════
#  🔹 PREPROCESSING
# ════════════════════════════════════════════════════════════════

def preprocess_code(code: str) -> str:
    if not code:
        return ""
    code = re.sub(r"#.*",  "", code)
    code = re.sub(r"//.*", "", code)
    code = re.sub(r"/\*.*?\*/", "", code, flags=re.DOTALL)
    lines = [l.strip() for l in code.split("\n") if l.strip()]
    code = "\n".join(lines)
    return code.lower()


# ════════════════════════════════════════════════════════════════
#  🔹 LANGUAGE DETECTION
# ════════════════════════════════════════════════════════════════

def detect_language(code: str) -> str:
    c = code.lower()
    if "def " in c or "import " in c or "print(" in c:
        return "python"
    if "public static void main" in c or "system.out" in c:
        return "java"
    if "#include" in c or "cout" in c:
        return "cpp"
    if "function " in c or "console.log" in c:
        return "javascript"
    if "<?" in c and "php" in c:
        return "php"
    if "select " in c and "from " in c:
        return "sql"
    return "unknown"


# ════════════════════════════════════════════════════════════════
#  🔹 SIMILARITY METRICS
# ════════════════════════════════════════════════════════════════

def text_similarity(code1: str, code2: str) -> float:
    matcher = difflib.SequenceMatcher(None, code1, code2)
    return round(matcher.ratio() * 100, 2)


def line_similarity(code1: str, code2: str) -> float:
    lines1 = code1.splitlines()
    lines2 = code2.splitlines()
    matcher = difflib.SequenceMatcher(None, lines1, lines2)
    return round(matcher.ratio() * 100, 2)


def token_similarity(code1: str, code2: str) -> float:
    tokens1 = re.findall(r'\b\w+\b', code1)
    tokens2 = re.findall(r'\b\w+\b', code2)
    if not tokens1 or not tokens2:
        return 0.0
    common = len(set(tokens1) & set(tokens2))
    total  = len(set(tokens1) | set(tokens2))
    return round((common / total) * 100, 2)


def lcs_similarity(code1: str, code2: str) -> float:
    matcher = difflib.SequenceMatcher(None, code1, code2)
    match   = sum(triple.size for triple in matcher.get_matching_blocks())
    max_len = max(len(code1), len(code2)) or 1
    return round((match / max_len) * 100, 2)


# ════════════════════════════════════════════════════════════════
#  🔹 FINAL WEIGHTED SCORE ENGINE
# ════════════════════════════════════════════════════════════════

def final_plagiarism_score(text: float, line: float, token: float, lcs: float, ast_score: float) -> float:
    return round(
        (0.25 * text)  +
        (0.20 * line)  +
        (0.20 * token) +
        (0.20 * lcs)   +
        (0.15 * ast_score),
        2
    )

def risk_level(score: float) -> str:
    if score >= 80:  return "VERY HIGH"
    if score >= 60:  return "HIGH"
    if score >= 40:  return "MEDIUM"
    return "LOW"


def risk_emoji(level: str) -> str:
    return {"VERY HIGH": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢"}.get(level, "⚪")


# ════════════════════════════════════════════════════════════════
#  🔹 CODE ANALYZE HELPERS  (used only by code_analyze view)
# ════════════════════════════════════════════════════════════════

ALLOWED_LANGUAGES = {"python", "javascript", "java", "cpp", "c", "html", "other"}

LANG_DISPLAY = {
    "python":     "Python",
    "javascript": "JavaScript",
    "java":       "Java",
    "cpp":        "C++",
    "c":          "C",
    "html":       "HTML",
    "other":      "Other",
}

# Max characters allowed for pasted code input (prevents SequenceMatcher hangs)
# 200 KB = ~5000–8000 lines of typical code — more than enough
MAX_PASTE_CHARS = 200 * 1024


def _extract_text_from_file(f) -> tuple:
    """
    Extract plain text from an uploaded file.
    Supports: .txt, .py, .java, .js, .cpp, .c, .html, .pdf, .docx
    Returns: (text, None) on success | (None, error_message) on failure
    """
    name = f.name.lower()

    text_extensions = (
        ".txt", ".py", ".java", ".js", ".ts", ".jsx", ".tsx",
        ".cpp", ".c", ".h", ".cs", ".go", ".rs", ".php",
        ".rb", ".swift", ".kt", ".html", ".css", ".sql",
    )
    if any(name.endswith(ext) for ext in text_extensions):
        try:
            return f.read().decode("utf-8", errors="ignore"), None
        except Exception as e:
            return None, f"Could not read file: {e}"

    if name.endswith(".pdf"):
        if not _PDF_OK:
            return None, "PDF support requires pdfplumber. Run: pip install pdfplumber"
        try:
            raw = f.read()
            with pdfplumber.open(io.BytesIO(raw)) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            return text, None
        except Exception as e:
            return None, f"PDF extraction failed: {e}"

    if name.endswith(".docx"):
        if not _DOCX_OK:
            return None, "DOCX support requires python-docx. Run: pip install python-docx"
        try:
            raw = f.read()
            doc = DocxDocument(io.BytesIO(raw))
            text = "\n".join(para.text for para in doc.paragraphs)
            return text, None
        except Exception as e:
            return None, f"DOCX extraction failed: {e}"

    return None, (
        f"Unsupported file type: '{f.name}'. "
        "Allowed: .txt .py .java .js .cpp .c .html .pdf .docx"
    )


def _language_mismatch(selected: str, detected: str) -> bool:
    if not selected or not detected:
        return False
    if selected == "other":
        return False
    if detected == "unknown":
        return False
    norm = {"cpp": "cpp", "c++": "cpp"}
    return norm.get(selected, selected) != norm.get(detected, detected)


def _format_feature_breakdown(breakdown: dict) -> dict:
    """
    Strip leading emoji category prefix from feature names so React
    FeatureCard renders clean labels.
    e.g. "📝 Comment Density" → "Comment Density"
    """
    cleaned = {}
    for raw_name, data in breakdown.items():
        name = re.sub(
            r'^[\U00010000-\U0010ffff\u2000-\u2FFF\u3000-\u303F'
            r'✅❌➖🔬📊⚙️🔷📐🏷️💬📝🤖🧑🔁🎨💀🏗️⏱️]+\s*',
            '', raw_name
        )
        cleaned[name] = {
            "value":  data.get("value", ""),
            "signal": data.get("signal", "Neutral"),
        }
    return cleaned


# ════════════════════════════════════════════════════════════════
#  🔹 CODE ANALYZE  —  POST /api/code-analyze/
# ════════════════════════════════════════════════════════════════

@api_view(["POST"])
def code_analyze(request):
    """
    Analyze a single code snippet for AI vs Human authorship.

    POST body (multipart/form-data):
        language  (str)  — selected language key from frontend
        code      (str)  — pasted code text          [paste tab]
        file      (file) — uploaded code file         [upload tab]

    Sampling behaviour (handled entirely inside analyze_code_ai_likelihood):
        ≤ 800 lines  →  full analysis, no sampling
        > 800 lines  →  stratified 4-zone sample:
                          Zone 1: first 200 lines
                          Zone 2: lines around n/4
                          Zone 3: lines around n/2
                          Zone 4: last  200 lines

    Returns 400 on:
        • Missing language
        • Empty / missing code or file
        • Non-code input (prose/essay detected)
        • Unsupported file type
        • File too large (> 200 KB)

    Returns 200 with full AI detection report that the React
    CodeAnalyzer component renders directly.
    """

    # ── 1. Validate language ──────────────────────────────────────
    language = (request.data.get("language") or "").strip().lower()
    if not language:
        return Response(
            {"error": "❌ Please select a programming language before analyzing."},
            status=400,
        )
    if language not in ALLOWED_LANGUAGES:
        return Response(
            {"error": f"❌ Unsupported language '{language}'. Choose from: {', '.join(sorted(ALLOWED_LANGUAGES))}."},
            status=400,
        )

    # ── 2. Get code text (paste OR file upload) ───────────────────
    code_text = ""

    if "file" in request.FILES:
        uploaded = request.FILES["file"]

        # 200 KB size guard
        if uploaded.size > 200 * 1024:
            return Response(
                {"error": f"❌ File '{uploaded.name}' is too large ({uploaded.size // 1024} KB). Maximum is 200 KB."},
                status=400,
            )

        code_text, extract_err = _extract_text_from_file(uploaded)
        if extract_err:
            return Response({"error": f"❌ {extract_err}"}, status=400)

    else:
        code_text = (request.data.get("code") or "").strip()

    # ── 3. Empty check ────────────────────────────────────────────
    if not code_text or len(code_text.strip()) < 10:
        return Response(
            {"error": "❌ No code provided. Please paste your code or upload a file."},
            status=400,
        )

    original_lines = len(code_text.splitlines())

    # ── 4. Run the v6.1 detector ──────────────────────────────────
    # Direct call — no ThreadPoolExecutor needed.
    # analyze_code_ai_likelihood is pure CPU/regex (no I/O, no blocking).
    # ThreadPoolExecutor was causing 200-500ms overhead on Windows per request
    # due to thread pool creation/teardown cost on every API call.
    # Stratified sampling (≤800 lines full, >800 lines → 4×200 zones) is
    # handled entirely inside analyze_code_ai_likelihood.
    try:
        result = analyze_code_ai_likelihood(code_text)
    except Exception as e:
        return Response(
            {
                "error":  "Analysis failed unexpectedly.",
                "detail": str(e),
            },
            status=500,
        )

    # ── 5. Handle not-code / insufficient-code responses ─────────
    if not result.get("is_code", True):
        return Response(
            {
                "error":      f"❌ {result['label']}: {result.get('not_code_reason', 'Input does not appear to be source code.')}",
                "detail":     result.get("not_code_reason", ""),
                "suggestion": "Please paste actual programming code, not an essay or paragraph.",
            },
            status=400,
        )

    if result.get("label") == "Insufficient Code":
        return Response(
            {
                "error":      "❌ Code is too short to analyze reliably.",
                "detail":     result.get("not_code_reason", ""),
                "suggestion": "Please provide at least 10–15 lines of code for meaningful results.",
            },
            status=400,
        )

    # ── 6. Language mismatch check ────────────────────────────────
    detected_lang = result.get("language", "unknown")
    lang_mismatch = _language_mismatch(language, detected_lang)

    # ── 7. Clean feature breakdown for React ─────────────────────
    clean_breakdown = _format_feature_breakdown(result.get("feature_breakdown", {}))

    # ── 8. Save to UserHistory if logged in ──────────────────────
    user_email = request.session.get("user_email")
    if user_email:
        try:
            UserHistory.objects.create(
                user_email=user_email,
                result_type="code",
                title=uploaded.name if "file" in request.FILES else "Pasted Code",
                score=result.get("ai_probability", 0),
                risk_level=result.get("label", "Unknown"),
            )
        except Exception as db_err:
            print(f"[code_analyze] DB save error: {db_err}")

    # ── 9. Return full response to React ─────────────────────────
    return Response(
        {
            # Core verdict
            "label":             result.get("label"),
            "emoji":             result.get("emoji"),
            "ai_probability":    result.get("ai_probability"),
            "human_probability": result.get("human_probability"),
            "confidence":        result.get("confidence"),
            "confidence_emoji":  result.get("confidence_emoji"),
            "score_bar":         result.get("score_bar"),

            # Language info
            "detected_language": detected_lang,
            "selected_language": language,
            "language_mismatch": lang_mismatch,
            "language_emoji":    result.get("language_emoji"),

            # Stats
            "lines_of_code":      result.get("lines_of_code", 0),
            "original_line_count": result.get("original_line_count", original_lines),
            "sampled":            result.get("sampled", False),
            "sampling_note":      result.get("sampling_note"),
            "is_code":            result.get("is_code", True),
            "ai_signal_count":    result.get("ai_signal_count", 0),
            "human_signal_count": result.get("human_signal_count", 0),

            # Warning shown when < 15 lines
            "low_line_warning":   result.get("low_line_warning"),

            # Feature breakdown for React FeatureCard components
            "feature_breakdown":  clean_breakdown,
        }
    )


# ════════════════════════════════════════════════════════════════
#  🔹 PASTE vs PASTE COMPARISON  (with non-code detection)
# ════════════════════════════════════════════════════════════════

@api_view(['POST'])
def compare_code(request):
    """
    Compare two pasted code snippets.

    POST body:
        code1  (str) — first snippet
        code2  (str) — second snippet

    Returns:
        400  if either input is not code (essay / paragraph detected)
        400  if either field is empty
        200  with full similarity report
    """
    code1 = request.data.get("code1", "")
    code2 = request.data.get("code2", "")

    if not code1 or not code2:
        return Response(
            {"error": "❌ Both code fields are required. Please paste code into both boxes."},
            status=400
        )

    # Size guard — prevents SequenceMatcher O(n²) hang on huge pastes
    if len(code1) > MAX_PASTE_CHARS:
        return Response(
            {"error": f"❌ Code 1 is too large ({len(code1)//1024} KB). Maximum is 200 KB."},
            status=400,
        )
    if len(code2) > MAX_PASTE_CHARS:
        return Response(
            {"error": f"❌ Code 2 is too large ({len(code2)//1024} KB). Maximum is 200 KB."},
            status=400,
        )

    ok1, reason1 = is_code(code1)
    if not ok1:
        return Response(
            {
                "error":       "❌ Input 1 does not appear to be source code.",
                "detail":      reason1,
                "suggestion":  "Please paste actual programming code (Python, Java, C++, JS, etc.), not an essay or paragraph.",
                "input_label": "code1",
            },
            status=400
        )

    ok2, reason2 = is_code(code2)
    if not ok2:
        return Response(
            {
                "error":       "❌ Input 2 does not appear to be source code.",
                "detail":      reason2,
                "suggestion":  "Please paste actual programming code (Python, Java, C++, JS, etc.), not an essay or paragraph.",
                "input_label": "code2",
            },
            status=400
        )

    code1 = normalize_input(code1)
    code2 = normalize_input(code2)

    clean1 = preprocess_code(code1)
    clean2 = preprocess_code(code2)
    if clean1 == clean2:
        return Response({
            "mode": "paste_vs_paste",
            "detected_language_1": detect_language(code1),
            "detected_language_2": detect_language(code2),
            "language_match": True,
            "metrics": {
                "text_similarity": 100,
                "line_similarity": 100,
                "token_similarity": 100,
                "lcs_similarity": 100,
                "ast_similarity": 100
            },
            "final_score": 100.0,
            "risk_level": "VERY HIGH",
            "risk_emoji": "🔴",
        })
    lang1  = detect_language(code1)
    lang2  = detect_language(code2)

    text_sim  = text_similarity(clean1, clean2)
    line_sim  = line_similarity(code1,  code2)
    token_sim = token_similarity(clean1, clean2)
    lcs_sim   = lcs_similarity(clean1,  clean2)
    if lang1 == "python" and lang2 == "python":
        ast_sim = ast_similarity(code1, code2)
    else:
        ast_sim = 0

    final = final_plagiarism_score(text_sim, line_sim, token_sim, lcs_sim, ast_sim)
    risk  = risk_level(final)

    user_email = request.session.get("user_email")
    if user_email:
        try:
            UserHistory.objects.create(
                user_email=user_email,
                result_type="code",
                title="Pasted Code vs Pasted Code",
                score=final,
                risk_level=risk,
            )
        except Exception as db_err:
            print(f"[compare_code] DB save error: {db_err}")

    return Response({
        "mode":                "paste_vs_paste",
        "detected_language_1": lang1,
        "detected_language_2": lang2,
        "language_match":      lang1 == lang2,
        "metrics": {
            "text_similarity":  text_sim,
            "line_similarity":  line_sim,
            "token_similarity": token_sim,
            "lcs_similarity":   lcs_sim,
            "ast_similarity":   ast_sim
        },
        "final_score": final,
        "risk_level":  risk,
        "risk_emoji":  risk_emoji(risk),
    })


# ════════════════════════════════════════════════════════════════
#  🔹 BATCH FILE COMPARISON  (ALL vs ALL, with non-code detection)
# ════════════════════════════════════════════════════════════════

@api_view(['POST'])
def compare_batch(request):
    """
    Compare multiple uploaded files pairwise (all vs all).

    POST body (multipart/form-data):
        files  — 2 or more source code files

    Returns:
        400  if fewer than 2 files uploaded
        400  if ANY uploaded file is not code
        200  with ranked pairwise similarity results
    """
    files = request.FILES.getlist("files")

    if len(files) < 2:
        return Response(
            {"error": "❌ Please upload at least 2 files to compare."},
            status=400
        )

    file_data      = []
    non_code_files = []

    for f in files:
        # Size guard per file — prevents SequenceMatcher hang on large files
        if f.size > MAX_PASTE_CHARS:
            return Response(
                {"error": f"❌ File '{f.name}' is too large ({f.size // 1024} KB). Maximum is 200 KB per file."},
                status=400,
            )
        try:
            content = f.read().decode("utf-8", errors="ignore")
        except Exception as e:
            return Response(
                {"error": f"❌ Failed to read file '{f.name}': {str(e)}"},
                status=400
            )

        ok, reason = is_code(content)
        if not ok:
            non_code_files.append({"filename": f.name, "reason": reason})
            continue

        cleaned = preprocess_code(content)
        file_data.append({
            "name":     f.name,
            "raw":      content,
            "clean":    cleaned,
            "language": detect_language(content),
        })

    if non_code_files:
        filenames = ", ".join(x["filename"] for x in non_code_files)
        return Response(
            {
                "error": (
                    f"❌ {len(non_code_files)} uploaded file(s) do not appear to contain "
                    f"source code: {filenames}"
                ),
                "rejected_files": [
                    {
                        "filename":   x["filename"],
                        "reason":     x["reason"],
                        "suggestion": (
                            "This file looks like an essay, paragraph, or non-code document. "
                            "Please upload only source code files (.py, .java, .cpp, .js, etc.)"
                        ),
                    }
                    for x in non_code_files
                ],
                "valid_file_count": len(file_data),
            },
            status=400
        )

    if len(file_data) < 2:
        return Response(
            {"error": "❌ After validation, fewer than 2 valid code files remain. Please check your uploads."},
            status=400
        )

    results    = []
    user_email = request.session.get("user_email")

    for f1, f2 in itertools.combinations(file_data, 2):
        text_sim  = text_similarity(f1["clean"], f2["clean"])
        line_sim  = line_similarity(f1["raw"],   f2["raw"])
        token_sim = token_similarity(f1["clean"], f2["clean"])
        lcs_sim   = lcs_similarity(f1["clean"],  f2["clean"])
        if f1["language"] == "python" and f2["language"] == "python":
            ast_sim = ast_similarity(f1["raw"], f2["raw"])
        else:
            ast_sim = 0

        final = final_plagiarism_score(text_sim, line_sim, token_sim, lcs_sim, ast_sim)
        risk  = risk_level(final)

        try:
            if user_email:
                UserHistory.objects.create(
                    user_email=user_email,
                    result_type="code",
                    title=f"{f1['name']} vs {f2['name']}",
                    score=final,
                    risk_level=risk
                )
        except Exception as e:
            print("DB SAVE ERROR:", str(e))

        results.append({
            "file1":          f1["name"],
            "file2":          f2["name"],
            "language_1":     f1["language"],
            "language_2":     f2["language"],
            "language_match": f1["language"] == f2["language"],
            "metrics": {
                "text_similarity":  text_sim,
                "line_similarity":  line_sim,
                "token_similarity": token_sim,
                "lcs_similarity":   lcs_sim,
                "ast_similarity":   ast_sim
            },
            "final_score": final,
            "risk_level":  risk,
            "risk_emoji":  risk_emoji(risk),
        })

    results.sort(key=lambda x: x["final_score"], reverse=True)

    return Response({
        "mode":                 "batch_comparison",
        "total_files":          len(files),
        "valid_code_files":     len(file_data),
        "total_comparisons":    len(results),
        "most_suspicious_pair": results[0] if results else None,
        "results":              results,
    })