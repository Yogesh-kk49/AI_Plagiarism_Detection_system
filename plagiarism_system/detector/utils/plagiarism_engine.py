"""
╔══════════════════════════════════════════════════════════════════════════════╗
║      🤖  AI CODE DETECTION ENGINE  v9.0  🧑‍💻  (APEX EDITION)              ║
║      Pure heuristics · No ML models · Handles up to 5000 lines             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  NEW IN v9.0 (+5 AST-powered features + extended sampling):                 ║
║   ✅ AST Subtree Dup Ratio       (repeated node fingerprints — low O(n))   ║
║   ✅ Identifier Root Entropy     (semantic cohesion of snake_case roots)   ║
║   ✅ AST Path Entropy            (3-node path repetition — AI clones path) ║
║   ✅ Identifier Reuse Distance   (avg token reuse gap — short = AI)        ║
║   ✅ Control Flow Uniformity     (branch-per-function ratio)               ║
║   ✅ Extended sampling: up to 5000 lines (stratified 8-zone sample)        ║
║  CARRIED FORWARD from v8.0 (all 207 raw features preserved):               ║
║   ✅ Operator distribution, conditional depth, func shape fingerprint,     ║
║      literal type entropy, redundant bool returns, loop body complexity,   ║
║      whitespace rhythm, token bigram rep, comment density gradient,        ║
║      keyword profile, stylometry fingerprint, function sig diversity,      ║
║      cross-func shape entropy, func length skewness, hallucination signals,║
║      semantic token density, AST structural, identifier clustering,        ║
║      control flow balance, naming consistency, comment semantics, template ║
║      density, loop entropy, dead code ratios, extended entropy, token rep, ║
║      exception patterns, pipeline detection, LLM fingerprints, complexity  ║
║  PRESERVED from v6.2:                                                       ║
║   ✅ No catastrophic backtracking regex (all O(n) line-by-line)            ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import re
import ast
import math
import unicodedata
import zlib
import statistics
from collections import Counter

# ════════════════════════════════════════════════════════════════
#  VERDICT / SIGNAL EMOJI MAPS
# ════════════════════════════════════════════════════════════════
def normalize_input(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r'[\u200B-\u200D\uFEFF]', '', text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\t", "    ")
    text = "\n".join(line.rstrip() for line in text.split("\n"))
    text = re.sub(r'\n{2,}', '\n', text)
    return text.strip()

VERDICT_EMOJI = {
    "Highly Likely AI-Generated":     "🤖",
    "Likely AI-Generated":            "🤖",
    "Likely AI-Assisted (Hybrid)":    "🔀",
    "Possibly Human with AI Touches": "🔀",
    "Likely Human-Written":           "🧑‍💻",
    "Highly Likely Human-Written":    "🧑‍💻",
    "Not Code":                       "❌",
    "Insufficient Code":              "⚠️",
}

SIGNAL_EMOJI     = {"AI": "🤖", "Human": "🧑", "Neutral": "➖"}
CONFIDENCE_EMOJI = {"Very High": "🔒", "High": "✅", "Moderate": "⚠️", "Low": "🔻", "N/A": "❓"}
TICK   = "✅"
CROSS  = "❌"
BULLET = "•"

COMMON_KEYWORDS = frozenset({
    "if","else","elif","for","while","return","def","class","import","from",
    "in","not","and","or","True","False","None","int","str","float","bool",
    "list","dict","set","try","except","finally","with","as","pass","break",
    "continue","lambda","yield","raise","assert","global","nonlocal","del",
    "is","print","var","let","const","function","new","this","self","public",
    "private","static","void","main","async","await","typeof","instanceof",
    "switch","case","default","null","undefined","super","extends","implements",
    "interface","enum","namespace","type","abstract","fn","pub","mut","impl",
    "struct","trait","mod","use","match","func","package","range","make",
    "chan","defer","go","map","select","echo","foreach","isset","empty","array",
    "true","false","len","sum","min","max","abs","round","open","close",
    "append","extend","insert","remove","pop","sorted","reversed","enumerate",
    "zip","filter","reduce","any","all","repr","tuple","frozenset",
})

# ════════════════════════════════════════════════════════════════
#  NON-CODE DETECTION
# ════════════════════════════════════════════════════════════════

_CODE_PATS = [
    r'\bdef \w+\s*\(', r'\bfunction\s+\w+\s*\(', r'\bclass\s+\w+',
    r'\bimport\s+\w+', r'\bfrom\s+\w+\s+import', r'#include\s*[<"]',
    r'\bpublic\s+static\s+void\b', r'console\.log\s*\(', r'\bprint\s*\(',
    r'(?:==|!=|<=|>=|&&|\|\|)', r'(?:\+=|-=|\*=|/=)', r'\breturn\s+\w',
    r'\bfor\s*\(', r'\bwhile\s*\(', r'\bif\s*\(', r'<\?php',
    r'SELECT\s+\w+\s+FROM', r'<!DOCTYPE\s+html>', r'\bfn\s+\w+\s*\(',
]
_PROSE_PATS = [
    r'\b(the|a|an|is|are|was|were|has|have)\b',
    r'\b(this|that|these|those|it|they|we|you)\b',
    r'\b(and|but|or|so|yet|although|because|since)\b',
    r'[A-Z][a-z]{3,}\s+[a-z]{2,}\s+[a-z]{2,}',
    r'\.\s+[A-Z]',
]

def is_code(text: str) -> tuple:
    if not text or len(text.strip()) < 10:
        return False, "Text is too short"
    lines      = text.strip().split("\n")
    line_count = len([l for l in lines if l.strip()])
    code_hits  = sum(1 for p in _CODE_PATS  if re.search(p, text, re.I | re.M))
    prose_hits = sum(1 for p in _PROSE_PATS if re.search(p, text, re.I))
    sym_den    = len(re.findall(r'[{}()\[\];=<>+\-*/&|^%!~@#]', text)) / max(len(text), 1)
    indented   = sum(1 for l in lines if l.startswith(("    ", "\t")))
    ind_ratio  = indented / max(line_count, 1)
    if code_hits >= 3:                             return True,  f"{code_hits} code patterns"
    if code_hits >= 1 and sym_den > 0.05:          return True,  "code + high symbol density"
    if sym_den > 0.10 and ind_ratio > 0.2:         return True,  "symbols + indentation"
    if prose_hits >= 6 and code_hits == 0:         return False, f"prose ({prose_hits} markers)"
    if prose_hits > code_hits * 2:                 return False, "prose outweighs code signals"
    if line_count < 3 and code_hits == 0:          return False, "too few lines, no code"
    return True, "borderline — treating as code"

# ════════════════════════════════════════════════════════════════
#  LANGUAGE DETECTION
# ════════════════════════════════════════════════════════════════

_LANG_SIGS = {
    "python":     [r"\bdef \w+\(", r"\bimport \w+", r"\bfrom \w+ import", r"\belif\b", r"\bNone\b", r'f".*"', r"__name__"],
    "javascript": [r"\bconst\b|\blet\b|\bvar\b", r"console\.log\s*\(", r"=>\s*{", r"===|!==", r"\.then\s*\("],
    "typescript": [r"\binterface\s+\w+", r"\btype\s+\w+\s*=", r":\s*string\b", r":\s*number\b", r"\benum\s+\w+"],
    "java":       [r"\bpublic\s+class\b", r"\bSystem\.out\.", r"\bpublic\s+static\s+void\s+main\b", r"@Override"],
    "cpp":        [r"#include\s*<", r"\busing\s+namespace\s+std\b", r"\bcout\b|\bcin\b", r"\btemplate\s*<"],
    "c":          [r"#include\s*<stdio\.h>", r"\bprintf\s*\(", r"\bint\s+main\s*\(", r"\bmalloc\s*\("],
    "html":       [r"<!DOCTYPE\s+html>", r"<html", r"<div\b", r"<script"],
    "css":        [r':\s*\w+;', r'@media\b', r'\.\w+\s*\{'],
    "sql":        [r'\bSELECT\b', r'\bFROM\b', r'\bWHERE\b', r'\bCREATE\s+TABLE\b'],
    "rust":       [r'\bfn\s+\w+\s*\(', r'\blet\s+mut\b', r'\bimpl\b', r'println!\s*\('],
    "go":         [r'\bfunc\s+\w+\s*\(', r'\bpackage\s+\w+', r'\bfmt\.Print', r':='],
    "php":        [r'<\?php', r'\$\w+\s*=', r'\becho\b', r'\bforeach\b'],
}
_LANG_EMOJI = {
    "python":"🐍","javascript":"🟨","typescript":"🔷","java":"☕","cpp":"⚙️",
    "c":"🔩","html":"🌐","css":"🎨","sql":"🗄️","rust":"🦀","go":"🐹","php":"🐘","unknown":"❓",
}

def detect_language(code: str) -> str:
    scores = {
        lang: sum(1 for p in pats if re.search(p, code, re.I | re.M))
        for lang, pats in _LANG_SIGS.items()
    }
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "unknown"

# ════════════════════════════════════════════════════════════════
#  HELPER: generic entropy
# ════════════════════════════════════════════════════════════════

def _entropy(vals):
    if not vals: return 0.0
    freq = Counter(vals); total = len(vals)
    return -sum((c / total) * math.log2(c / total) for c in freq.values())

def _ent_str(s):
    if not s: return 0.0
    freq = Counter(s); total = len(s)
    return round(-sum((c / total) * math.log2(c / total) for c in freq.values()), 4)

# ════════════════════════════════════════════════════════════════
#  FAST FEATURE EXTRACTION  — all O(n), no catastrophic backtracking
# ════════════════════════════════════════════════════════════════

def _extract_features(code: str, lines: list) -> dict:
    # Safety guard: _extract_features should never receive more than 5000 lines.
    # The caller (analyze_code_ai_likelihood) handles sampling; this is a final backstop.
    MAX_LINES = 5000
    if len(lines) > MAX_LINES:
        lines = lines[:MAX_LINES]
        code  = "\n".join(lines)

    non_empty = [l for l in lines if l.strip()]
    n_lines   = len(non_empty)

    # ── COMMENT FEATURES ─────────────────────────────────────────
    comment_lines    = [l for l in lines if l.strip().startswith(("#","//","*","/*","<!--"))]
    inline_comments  = len(re.findall(r'.+(?:#|//)\s+\w+', code))
    docstrings       = len(re.findall(r'"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'', code))
    comment_density  = len(comment_lines) / max(len(lines), 1)
    verbose_comments = len(re.findall(r'#\s{0,3}(This|The|We|Here|Now|Next|Finally|Note|Above|Below)', code, re.I))
    section_banners = len(re.findall(
    r'#\s*[\-=*#─═━─]{4,}.*[\-=*#─═━─]{4,}'  # Unicode dividers
    r'|#\s*[^\w\s]{3,}'                         # 3+ special/emoji chars
    r'|#\s{0,2}[A-Z][A-Z\s]{5,}$',             # ALL CAPS
    code, re.M | re.UNICODE
))
    import unicodedata
    emoji_comments = sum(
        1 for line in lines
        if line.strip().startswith('#')
        and any(unicodedata.category(c) in ('So', 'Sm') for c in line)
    )
    obvious_comments = len(re.findall(r'#\s*(increment|decrement|assign|set|get|return|check|loop|iterate|print|append|add|remove)\b', code, re.I))
    divider_comments = len(re.findall(r'#\s*[=\-\*]{5,}', code))
    todo_fixme       = len(re.findall(r'#\s*(TODO|FIXME|HACK|NOTE|BUG|XXX)', code, re.I))
    full_ratio       = len(comment_lines) / max(len(comment_lines) + inline_comments, 1)

    # ── GPT-STYLE COMMENTS ────────────────────────────────────────
    gpt_pats = [
        r'"""[\s\S]*?Args:', r'"""[\s\S]*?Returns:',
        r'#\s*Validate\s+(input|parameters)', r'#\s*Initialize\s+\w+',
        r'#\s*Process\s+\w+', r'#\s*Handle\s+(edge\s+cases?|errors?)',
        r'#\s*Check\s+(if|whether)', r'#\s*Calculate\s+\w+',
        r'#\s*Return\s+the\s+\w+', r'#\s*Create\s+(a|an|the)\s+\w+',
        r'#\s*Define\s+(a|an|the)?\s+\w+', r'#\s*Set\s+up\s+\w+',
        r'#\s*Ensure\s+\w+', r'#\s*Convert\s+\w+', r'#\s*Generate\s+\w+',
        r'#\s*Build\s+\w+', r'#\s*Sort\s+\w+', r'#\s*Filter\s+\w+',
    ]
    gpt_score  = sum(len(re.findall(p, code, re.I)) for p in gpt_pats)
    has_args   = bool(re.search(r'\bArgs\s*:', code))
    has_ret    = bool(re.search(r'\bReturns\s*:', code))
    has_raises = bool(re.search(r'\bRaises\s*:', code))
    triple_doc = has_args and has_ret and has_raises
    step_pats  = len(re.findall(r'#\s*Step\s*\d+', code, re.I))
    func_desc  = len(re.findall(r'#\s*(This\s+function|This\s+method|This\s+class|This\s+script)', code, re.I))
    structured_docstrings = len(re.findall(r'(Parameters|Returns|Raises|Args|Example|Note|Attributes)\s*:', code))

    # ── NEW: COMMENT SEMANTICS (Feature Group 8) ──────────────────
    # Action verb density in comments
    action_verbs = len(re.findall(
        r'#\s*(initialize|process|calculate|handle|generate|validate|create|build|'
        r'fetch|update|convert|check|ensure|define|setup|return|iterate|loop|add|remove)\b',
        code, re.I))
    comment_action_verb_ratio = round(action_verbs / max(len(comment_lines), 1), 4)
    # Comment-code alignment: comment followed immediately by a code line using similar words
    comment_code_alignment = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('#') and i + 1 < len(lines):
            comment_words = set(re.findall(r'\b\w{4,}\b', stripped.lower()))
            next_line     = lines[i + 1].lower()
            overlap       = sum(1 for w in comment_words if w in next_line)
            if overlap >= 2:
                comment_code_alignment += 1
    comment_redundancy_score = round(comment_code_alignment / max(len(comment_lines), 1), 4)

    # ── VARIABLE / NAMING ─────────────────────────────────────────
    all_tokens  = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', code)
    vars_       = [t for t in all_tokens if t.lower() not in COMMON_KEYWORDS]
    total_tok   = max(len(vars_), 1)
    short_vars  = sum(1 for v in vars_ if len(v) <= 2)
    long_vars   = sum(1 for v in vars_ if len(v) >= 12)
    avg_vlen    = sum(len(v) for v in vars_) / total_tok
    ttr         = len(set(vars_)) / total_tok
    desc_prefix = len(re.findall(r'\b(get_|set_|calculate_|validate_|process_|handle_|create_|build_|fetch_|update_|initialize_|generate_)\w+', code, re.I))
    snake       = len(re.findall(r'\b[a-z][a-z0-9]*_[a-z][a-z0-9_]*\b', code))
    camel       = len(re.findall(r'\b[a-z][a-z0-9]*[A-Z][a-zA-Z0-9]+\b', code))
    pascal      = len(re.findall(r'\b[A-Z][a-z][a-zA-Z0-9]+\b', code))
    naming_style = ("snake_case" if snake > camel and snake > pascal
                    else "PascalCase" if pascal > camel
                    else "camelCase" if camel > 0 else "mixed")

    # ── NEW: IDENTIFIER LENGTH DISTRIBUTION (Feature Group 3) ────
    unique_vars = list(set(vars_))
    var_lengths = [len(v) for v in unique_vars] if unique_vars else [0]
    median_var_len    = round(statistics.median(var_lengths), 2)
    var_length_std    = round(statistics.pstdev(var_lengths), 4) if len(var_lengths) > 1 else 0.0
    very_long_id_ratio = round(sum(1 for v in unique_vars if len(v) > 15) / max(len(unique_vars), 1), 4)
    very_short_id_ratio= round(sum(1 for v in unique_vars if len(v) < 2)  / max(len(unique_vars), 1), 4)

    # ── NEW: IDENTIFIER SIMILARITY CLUSTER (Feature Group 2) ─────
    # Count identifiers sharing common prefixes (AI tends to cluster: user_input, user_data, user_id)
    prefix_counter = Counter()
    for v in unique_vars:
        if '_' in v:
            prefix_counter[v.split('_')[0]] += 1
        elif len(v) >= 4:
            prefix_counter[v[:4]] += 1
    # Ratio of identifiers that share a prefix with at least one other
    clustered = sum(c for c in prefix_counter.values() if c >= 2)
    identifier_similarity_score = round(clustered / max(len(unique_vars), 1), 4)
    # How many distinct prefix clusters exist vs total identifiers
    prefix_cluster_count = sum(1 for c in prefix_counter.values() if c >= 2)
    # Suffix clustering (e.g., _data, _input, _result)
    suffix_counter = Counter()
    for v in unique_vars:
        if '_' in v:
            suffix_counter[v.split('_')[-1]] += 1
    suffix_cluster_count = sum(1 for c in suffix_counter.values() if c >= 2)

    # ── NEW: NAMING STYLE CONSISTENCY (Feature Group 6) ──────────
    total_named = max(snake + camel + pascal, 1)
    snake_ratio  = round(snake  / total_named, 4)
    camel_ratio  = round(camel  / total_named, 4)
    pascal_ratio = round(pascal / total_named, 4)
    # Consistency = dominance of the winning style
    naming_consistency_score = round(max(snake_ratio, camel_ratio, pascal_ratio), 4)

    # ── COMPLEXITY / STRUCTURE ────────────────────────────────────
    lengths    = [len(l) for l in non_empty] or [0]
    avg_len    = sum(lengths) / max(len(lengths), 1)
    sq_diff    = sum((x - avg_len) ** 2 for x in lengths)
    line_std   = math.sqrt(sq_diff / max(len(lengths), 1))
    branch_kw  = r'\b(if|elif|else|for|while|try|except|case|switch|catch|finally|with)\b'
    branches   = len(re.findall(branch_kw, code))
    cyclomatic = branches + 1
    indent_vals = [len(l) - len(l.lstrip()) for l in non_empty if l.strip()]
    max_indent  = max(indent_vals, default=0)
    max_depth   = max_indent // 4
    ind_mean    = sum(indent_vals) / max(len(indent_vals), 1)
    ind_sq      = sum((x - ind_mean) ** 2 for x in indent_vals)
    indent_std  = math.sqrt(ind_sq / max(len(indent_vals), 1))
    indent_set  = set(indent_vals)
    consistent_indent = len(indent_set) <= 4
    func_count  = len(re.findall(r'\bdef \w+\s*\(|\bfunction\s+\w+\s*\(', code))
    class_count = len(re.findall(r'\bclass\s+\w+', code))
    blank_lines = sum(1 for l in lines if not l.strip())
    blank_ratio = blank_lines / max(len(lines), 1)
    dbl_blanks  = len(re.findall(r'\n\n\n', code))
    uniform_cnt = sum(1 for l in lengths if abs(l - avg_len) < 15)
    uniformity  = uniform_cnt / max(len(lengths), 1)

    # ── NEW: CODE FORMATTING CONSISTENCY (Feature Group 7) ───────
    indentation_variance = round(indent_std ** 2, 4)
    line_length_variance = round(line_std ** 2, 4)
    # Blank line consistency: are blank lines evenly spaced?
    blank_positions = [i for i, l in enumerate(lines) if not l.strip()]
    if len(blank_positions) > 1:
        gaps = [blank_positions[i+1] - blank_positions[i] for i in range(len(blank_positions)-1)]
        gap_std = statistics.pstdev(gaps) if len(gaps) > 1 else 0.0
        blank_line_consistency = round(1.0 / (1.0 + gap_std / 10), 4)
    else:
        blank_line_consistency = 1.0

    # ── NEW: CODE NATURALNESS (Feature Group 1 of second set) ─────
    # Function body lengths via line-by-line scan
    func_starts = [i for i, l in enumerate(lines) if re.match(r'\s*(?:def|function)\s+\w+', l)]
    func_lengths = []
    for idx, start in enumerate(func_starts):
        end = func_starts[idx + 1] if idx + 1 < len(func_starts) else len(lines)
        func_lengths.append(end - start)
    avg_function_length   = round(sum(func_lengths) / max(len(func_lengths), 1), 2)
    func_length_std       = round(statistics.pstdev(func_lengths), 4) if len(func_lengths) > 1 else 0.0
    max_func_length       = max(func_lengths, default=0)
    max_function_length_ratio = round(max_func_length / max(n_lines, 1), 4)
    function_size_variance = round(func_length_std ** 2, 4)
    # Block size = average indented block length
    block_sizes = []
    cur_block   = 0
    for l in non_empty:
        if l.startswith(("    ", "\t")):
            cur_block += 1
        else:
            if cur_block > 0:
                block_sizes.append(cur_block)
            cur_block = 0
    if cur_block > 0: block_sizes.append(cur_block)
    avg_block_size        = round(sum(block_sizes) / max(len(block_sizes), 1), 2)
    block_length_variance = round(statistics.pstdev(block_sizes) ** 2, 4) if len(block_sizes) > 1 else 0.0

    # ── HUMAN TRACES ─────────────────────────────────────────────
    debug_pats = [r'\bprint\s*\(', r'console\.log\s*\(', r'\bdebug\b',
                  r'\btodo\b', r'\bfixme\b', r'\bhack\b', r'\bwip\b',
                  r'\bpdb\.set_trace\b', r'\bdebugger\b', r'breakpoint\s*\(']
    debug_hits     = sum(1 for p in debug_pats if re.search(p, code, re.I))
    commented_code = len(re.findall(r'^\s*#\s*(if|for|def|return|print|var|let)', code, re.M))
    commented_code += len(re.findall(r'^\s*//\s*(if|for|function|return|console)', code, re.M))
    magic_nums   = len(re.findall(r'(?<!\w)(?!0\.)\d{2,}(?!\w|\.)', code))
    typos        = len(re.findall(r'\b(teh|recieve|occured|seperate|definately|untill|becuase|sucess|adress)\b', code, re.I))
    exploratory  = len(re.findall(r'\b(tmp\d*|temp\d*|[a-z]\d+|[a-z]_new|[a-z]_old|stuff|thing|data2|val2)\b', code))
    hasty_alias  = len(re.findall(r'\b(fn|func|cb|evt|req|res|ctx|cfg|opts|args|kwargs|vals|mgr|util)\b', code))
    trial_names  = len(re.findall(r'\b\w+(?:2|_v2|_new|_old|_bak|_backup|_test|_final|_fixed)\b', code))
    missing_sp   = len(re.findall(r'\b(if|for|while|return|elif)\(', code))

    # ── NEW: HUMAN IMPERFECTION SIGNALS (Feature Group 16) ───────
    todo_density = round(todo_fixme / max(n_lines, 1), 4)
    # Versioned identifier count (data, data2, data_new, data_final)
    versioned_ids = len(re.findall(r'\b(\w+)(?:2|3|_v\d|_new|_old|_final|_bak|_backup|_fixed|_temp)\b', code, re.I))
    # Renamed variable patterns: detect chains like x, x_new, x_processed in same file
    all_base_names = re.findall(r'\b([a-zA-Z_]\w*?)(?:_new|_processed|_updated|_fixed|_final)\b', code)
    rename_chain_count = len(set(all_base_names))

    # ── NEW: DEBUG ARTIFACT DETECTION (Feature Group 14) ─────────
    temp_var_count       = len(re.findall(r'\b(tmp|temp|temp\d+|tmp\d+|temporary)\b', code, re.I))
    debug_comment_count  = len(re.findall(r'#\s*(debug|test|temp|remove|delete this|TODO|FIXME)', code, re.I))
    debug_statement_density = round(debug_hits / max(n_lines, 1), 4)
    temporary_variable_ratio = round(temp_var_count / max(total_tok, 1), 4)

    # ── AI PATTERNS ───────────────────────────────────────────────
    boilerplate_pats = [
        r'\binitialize\b', r'\bprocess\b', r'\banalyze\b', r'\bcalculate\b',
        r'\bperform\b', r'\bhandle\b', r'\bexecute\b', r'\boptimal\b',
        r'\befficient\b', r'\brobust\b', r'\bcomprehensive\b', r'\bsuccessfully\b',
        r'\bvalidat\w*\b', r'\bensure\b', r'\bmanage\b', r'\bgenerat\w*\b',
        r'\butiliz\w*\b', r'\bscalable\b', r'\bmaintainable\b', r'\bmodular\b',
        r'\bencapsulat\w*\b', r'\belegant\b', r'\bclean\b', r'\bstreamline\b',
    ]
    boilerplate   = sum(1 for p in boilerplate_pats if re.search(p, code, re.I))
    try_count     = len(re.findall(r'\btry\b', code))
    except_count  = len(re.findall(r'\bexcept\b|\bcatch\b', code))
    perfect_err   = try_count > 0 and try_count == except_count
    step_comments = len(re.findall(r'#\s*(step\s*\d+|step:|initialize|define|setup|create|build)', code, re.I))
    numbered_secs = len(re.findall(r'#\s*\d+[\.\)]\s+\w', code))
    type_annots   = len(re.findall(r':\s*(int|str|float|bool|list|dict|set|tuple|Any|Optional|Union|List|Dict|Callable)\b', code))
    ret_annots    = len(re.findall(r'\)\s*->\s*\w+', code))
    fstrings      = len(re.findall(r'f["\']', code))
    list_comps    = len(re.findall(r'\[.+\bfor\b.+\]', code))
    dunder_usage  = len(re.findall(r'__\w+__', code))
    dataclass_u   = len(re.findall(r'@dataclass|NamedTuple|TypedDict', code))
    if_count      = len(re.findall(r'\bif\b', code))
    else_count    = len(re.findall(r'\belse\b', code))
    balanced_br   = if_count > 0 and abs(if_count - else_count) <= 1

    # ── NEW: CONTROL FLOW DISTRIBUTION (Feature Group 4) ─────────
    for_count    = len(re.findall(r'\bfor\b', code))
    while_count  = len(re.findall(r'\bwhile\b', code))
    switch_count = len(re.findall(r'\bswitch\b|\bmatch\b', code))
    cf_total     = max(if_count + for_count + while_count + try_count + switch_count, 1)
    # Balance score: evenness of distribution (1.0 = perfectly even, 0 = all one type)
    cf_distribution = [if_count/cf_total, for_count/cf_total, while_count/cf_total,
                       try_count/cf_total, switch_count/cf_total]
    cf_nonzero = [x for x in cf_distribution if x > 0]
    # Shannon evenness of control flow
    cf_entropy = round(_entropy([int(x * 100) for x in cf_nonzero if x > 0]), 4)
    control_flow_balance_score = round(cf_entropy / max(math.log2(max(len(cf_nonzero), 2)), 1), 4)

    # ── NEW: EXCEPTION HANDLING PATTERNS (Feature Group 14) ──────
    # Exception specificity: specific exceptions vs bare except
    specific_excepts  = len(re.findall(r'\bexcept\s+(ValueError|TypeError|KeyError|IndexError|AttributeError|RuntimeError|IOError|OSError|FileNotFoundError|PermissionError)\b', code))
    bare_excepts      = len(re.findall(r'\bexcept\s*:', code))
    general_excepts   = len(re.findall(r'\bexcept\s+Exception\b', code))
    exception_specificity_score = round(specific_excepts / max(except_count, 1), 4)
    perfect_try_except_ratio    = round(try_count / max(except_count, 1), 4) if except_count > 0 else 0.0
    # Error message length: extract raise/throw messages and measure average length
    error_messages = re.findall(r'raise\s+\w+\s*\(\s*["\']([^"\']{1,200})["\']', code)
    error_messages += re.findall(r'throw\s+new\s+\w+\s*\(\s*["\']([^"\']{1,200})["\']', code)
    error_msg_len_avg    = round(sum(len(m) for m in error_messages) / max(len(error_messages), 1), 2)
    error_msg_token_avg  = round(sum(len(m.split()) for m in error_messages) / max(len(error_messages), 1), 2)
    # AI tends to write long descriptive error messages (>8 words)
    long_error_msgs = sum(1 for m in error_messages if len(m.split()) > 8)
    error_msg_specificity = round(long_error_msgs / max(len(error_messages), 1), 4)

    # ── FUNC RETURN DENSITY — FIXED (no re.DOTALL across whole file) ──────────
    func_ret_den = 0.0
    funcs_with_ret = 0
    funcs_with_return_last = 0
    funcs_with_validation  = 0
    funcs_with_processing  = 0
    func_complexities = []

    if func_starts:
        for idx, start in enumerate(func_starts):
            end = func_starts[idx + 1] if idx + 1 < len(func_starts) else len(lines)
            end = min(end, start + 60)
            body_lines = lines[start:end]
            body = "\n".join(body_lines)
            if re.search(r'\breturn\b', body):
                funcs_with_ret += 1
            # Last non-empty line of function body is a return?
            body_nonempty = [l.strip() for l in body_lines[1:] if l.strip()]
            if body_nonempty and body_nonempty[-1].startswith('return'):
                funcs_with_return_last += 1
            # Validation pattern: validate/check near top of function
            top_body = "\n".join(body_lines[1:min(6, len(body_lines))])
            if re.search(r'\b(validate|check|verify|isinstance|not\s+\w+|if\s+not)\b', top_body, re.I):
                funcs_with_validation += 1
            # Processing pattern: process/calculate/compute in middle
            if re.search(r'\b(process|calculate|compute|transform|convert|build|generate)\b', body, re.I):
                funcs_with_processing += 1
            # Per-function cyclomatic complexity
            func_branches = len(re.findall(r'\b(if|elif|for|while|try|except)\b', body))
            func_complexities.append(func_branches + 1)

        func_ret_den = round(funcs_with_ret / len(func_starts), 4)

    # ── NEW: FUNCTION STRUCTURE PATTERN (Feature Group 5) ────────
    functions_with_validation_pattern = funcs_with_validation
    functions_with_processing_pattern = funcs_with_processing
    functions_with_return_last_line   = funcs_with_return_last
    function_structure_consistency    = round(
        (funcs_with_validation + funcs_with_processing + funcs_with_return_last) /
        max(len(func_starts) * 3, 1), 4)
    # ── NEW: COMPLEXITY PROFILE (Feature Group 19) ───────────────
    avg_function_complexity  = round(sum(func_complexities) / max(len(func_complexities), 1), 4)
    complexity_variance      = round(statistics.pstdev(func_complexities) ** 2, 4) if len(func_complexities) > 1 else 0.0

    # ── NEW: RETURN PATTERN ANALYSIS (Feature Group 5 of set 2) ──
    # Single return per branch: if x: return True / else: return False pattern
    single_return_branches = len(re.findall(
        r'if\s+[^:]+:\s*\n\s+return\s+\w+\s*\n\s*else\s*:\s*\n\s+return\s+\w+', code))
    early_returns = len(re.findall(r'if\s+[^:]+:\s*\n\s+return\b', code))
    branch_return_density = round(
        (single_return_branches + early_returns) / max(func_count, 1), 4)

    # ── NEW: FUNCTION ARGUMENT PATTERNS (Feature Group 6 of set 2) ──
    func_sig_params = re.findall(r'def\s+\w+\s*\(([^)]*)\)', code)
    func_sig_params += re.findall(r'function\s+\w+\s*\(([^)]*)\)', code)
    param_counts = []
    long_param_count = 0
    for sig in func_sig_params:
        params = [p.strip() for p in sig.split(',') if p.strip() and p.strip() not in ('self', 'cls', 'this')]
        param_counts.append(len(params))
        for p in params:
            pname = p.split(':')[0].strip().split('=')[0].strip()
            if len(pname) > 10:
                long_param_count += 1
    avg_param_count         = round(sum(param_counts) / max(len(param_counts), 1), 2)
    long_param_name_ratio   = round(long_param_count / max(sum(param_counts), 1), 4)

    # ── NEW: FUNCTION NAMING SEMANTICS (Feature Group 4 of set 2) ─
    func_names = re.findall(r'\bdef\s+(\w+)\s*\(', code)
    func_names += re.findall(r'\bfunction\s+(\w+)\s*\(', code)
    verb_prefixes = ('get', 'set', 'create', 'build', 'fetch', 'update', 'delete',
                     'process', 'handle', 'validate', 'check', 'calculate', 'compute',
                     'generate', 'parse', 'format', 'convert', 'load', 'save', 'send',
                     'receive', 'initialize', 'setup', 'teardown', 'run', 'execute',
                     'perform', 'apply', 'transform', 'filter', 'sort', 'search', 'find')
    verb_func_count = sum(1 for fn in func_names
                          if any(fn.lower().startswith(vp) for vp in verb_prefixes))
    verb_prefix_ratio   = round(verb_func_count / max(len(func_names), 1), 4)
    action_function_ratio = verb_prefix_ratio  # alias

    # ── LOOP PATTERN RECOGNITION ──────────────────────────────────
    ai_loop_pats = [
        r'\bfor\s+\w+\s+in\s+range\s*\(\s*len\s*\(',
        r'\bfor\s+\w+\s+in\s+range\s*\(\s*0\s*,\s*len\s*\(',
        r'\bfor\s+(index|idx|i)\s+in\s+range\s*\(',
        r'\bfor\s+\w+,\s*\w+\s+in\s+\w+\.items\s*\(',
        r'\bfor\s+\w+,\s*\w+\s+in\s+enumerate\s*\(',
        r'\bfor\s+\w+\s+in\s+zip\s*\(',
        r'\bfor\s+\w+\s+in\s+sorted\s*\(',
    ]
    human_loop_pats = [
        r'\bwhile\s+True\b',
        r'\bfor\s+\w+\s+in\s+\w+\s*:',
        r'\bwhile\s+\w+\s*[<>!=]=?\s*\w+\s*:',
    ]
    ai_loops    = sum(len(re.findall(p, code)) for p in ai_loop_pats)
    human_loops = sum(len(re.findall(p, code)) for p in human_loop_pats)

    # ── NEW: LOOP STYLE ENTROPY (Feature Group 10) ───────────────
    range_len_loops  = len(re.findall(r'\bfor\s+\w+\s+in\s+range\s*\(\s*len\s*\(', code))
    enumerate_loops  = len(re.findall(r'\bfor\s+\w+,\s*\w+\s+in\s+enumerate\s*\(', code))
    natural_loops    = len(re.findall(r'\bfor\s+\w+\s+in\s+(?!range|enumerate|zip|sorted)\w+', code))
    loop_style_counts = [range_len_loops, enumerate_loops, natural_loops,
                         len(re.findall(r'\bwhile\b', code))]
    loop_style_entropy = round(_entropy(loop_style_counts), 4)

    # ── TEMPLATE DETECTION ───────────────────────────────────────
    template_pats = [
        r'if\s+__name__\s*==\s*[\'"]__main__[\'"]\s*:',
        r'except\s+Exception\s+as\s+e\s*:',
        r'\bdef\s+main\s*\(\s*\)\s*:',
        r'\bdef\s+__init__\s*\(\s*self',
        r'\blogging\.basicConfig\s*\(',
        r'\bargparse\.ArgumentParser\s*\(',
        r'@\s*property\b', r'@\s*staticmethod\b', r'@\s*classmethod\b',
        r'@\s*dataclass\b', r'\bsuper\s*\(\s*\)\s*\.__init__',
        r'"""[\s\S]{0,20}Args\s*:[\s\S]{0,100}Returns\s*:',
        r'\braise\s+TypeError\s*\(', r'\braise\s+ValueError\s*\(',
        r'\braise\s+NotImplementedError\s*\(',
        r'\bif\s+not\s+isinstance\s*\(',
    ]
    templates_found = sum(1 for p in template_pats if re.search(p, code, re.I))
    template_score  = sum(len(re.findall(p, code, re.I)) for p in template_pats)

    # ── NEW: TEMPLATE PATTERN DENSITY (Feature Group 9) ──────────
    template_pattern_density    = round(template_score / max(n_lines, 1), 4)
    # Diversity: how many unique template types triggered (not just total hits)
    template_pattern_diversity  = templates_found  # already = count of distinct patterns

    # ── NEW: LLM FINGERPRINTS (Feature Group 11 of set 2) ────────
    # Defensive programming patterns typical of LLMs
    defensive_pats = [
        r'\bif\s+not\s+isinstance\s*\(',
        r'\bif\s+\w+\s+is\s+None\b',
        r'\bif\s+not\s+\w+\s*:',
        r'\bif\s+len\s*\(\s*\w+\s*\)\s*==\s*0\b',
        r'\bassert\s+isinstance\s*\(',
        r'\bassert\s+\w+\s+is\s+not\s+None\b',
        r'\bif\s+not\s+\w+\s+or\s+not\s+isinstance\b',
    ]
    defensive_programming_density = sum(len(re.findall(p, code)) for p in defensive_pats)
    input_validation_patterns     = len(re.findall(
        r'if\s+not\s+(isinstance|is_valid|validate|check)\s*\(', code))
    llm_signature_pattern_count   = len(re.findall(
        r'if\s+not\s+isinstance\s*\([^,]+,\s*\w+\)\s*:\s*\n\s+raise\s+TypeError', code))

    # ── NEW: SEMANTIC CODE FLOW / PIPELINE (Feature Group 15) ────
    # Detect load→validate→process→return pipeline in function bodies
    pipeline_score = 0
    for idx, start in enumerate(func_starts):
        end = func_starts[idx + 1] if idx + 1 < len(func_starts) else len(lines)
        end = min(end, start + 80)
        body = "\n".join(lines[start:end]).lower()
        stages = 0
        if re.search(r'\b(load|read|fetch|get|receive|import)\b', body): stages += 1
        if re.search(r'\b(validate|check|verify|assert|ensure)\b', body): stages += 1
        if re.search(r'\b(process|compute|calculate|transform|convert)\b', body): stages += 1
        if re.search(r'\breturn\b', body): stages += 1
        if stages >= 3:
            pipeline_score += 1
    pipeline_pattern_score   = pipeline_score
    processing_sequence_count = pipeline_score

    # ── DEAD CODE ─────────────────────────────────────────────────
    imported_names = re.findall(r'\bimport\s+(\w+)', code)
    from_imported  = re.findall(r'\bfrom\s+\w+\s+import\s+([\w,\s]+)', code)
    all_imports    = list(imported_names)
    for g in from_imported:
        all_imports.extend(n.strip() for n in g.split(","))
    all_imports    = [n for n in all_imports if n and len(n) > 1]
    unused_imports = sum(
        1 for imp in all_imports
        if len(re.findall(r'\b' + re.escape(imp) + r'\b', code)) <= 1
    )
    commented_calls = len(re.findall(r'^\s*#\s*\w+\s*\(.*\)', code, re.M))
    pass_only_funcs = len(re.findall(r'def\s+\w+\s*\([^)]*\)\s*:\s*\n\s+pass\b', code))
    dead_total      = unused_imports + commented_calls + pass_only_funcs

    # ── NEW: DEAD CODE RATIOS (Feature Group 11) ─────────────────
    unused_import_ratio    = round(unused_imports / max(len(all_imports), 1), 4)
    commented_code_ratio   = round(commented_code / max(n_lines, 1), 4)
    total_debug_statements = debug_hits
    import_diversity_score = round(len(set(all_imports)) / max(len(all_imports), 1), 4)

    # ── ALGORITHM OPTIMALITY — FIXED (no multi-line backtracking regex) ───────
    nested_loops  = 0
    str_concat_lp = 0
    for i, line in enumerate(lines):
        if re.search(r'\bfor\b', line):
            base_indent = len(line) - len(line.lstrip())
            lookahead = lines[i + 1: i + 31]
            for inner in lookahead:
                if not inner.strip():
                    continue
                inner_indent = len(inner) - len(inner.lstrip())
                if inner_indent <= base_indent:
                    break
                if re.search(r'\bfor\b', inner):
                    nested_loops += 1
                    break
                if re.search(r'\w+\s*\+=\s*["\']', inner):
                    str_concat_lp += 1
                    break
    ineff_score   = nested_loops + str_concat_lp
    set_usage     = len(re.findall(r'\bset\s*\(|\bfrozenset\s*\(', code))
    counter_usage = len(re.findall(r'\bCounter\s*\(|\bdefaultdict\s*\(', code))
    heapq_usage   = len(re.findall(r'\bheapq\b', code))
    itertools_u   = len(re.findall(r'\bitertools\b|\bchain\s*\(|\bcombinations\s*\(', code))
    dict_comps    = len(re.findall(r'\{[^}]+\bfor\b[^}]+\}', code))
    optimal_score = set_usage + counter_usage + heapq_usage + itertools_u + dict_comps

    # ── NEW: LANGUAGE-SPECIFIC IDIOM USAGE (Feature Group 9 of set 2) ──
    python_idioms = [
        r'\bany\s*\(', r'\ball\s*\(', r'\bwith\s+open\s*\(',
        r'\.setdefault\s*\(', r'\bnext\s*\(', r'\bzip\s*\(',
        r'\benumerate\s*\(', r'dict\.items\s*\(', r'\.get\s*\(',
        r'\bmap\s*\(', r'\bfilter\s*\(', r'\bsorted\s*\(',
    ]
    idiomatic_pattern_count = sum(len(re.findall(p, code)) for p in python_idioms)
    native_construct_ratio  = round(idiomatic_pattern_count / max(n_lines, 1), 4)

    # ── STYLE ENTROPY ─────────────────────────────────────────────
    indent_entropy = round(_entropy([len(l) - len(l.lstrip()) for l in non_empty]), 4)
    len_buckets    = [len(l) // 10 for l in non_empty]
    len_entropy    = round(_entropy(len_buckets), 4)
    style_entropy  = round((indent_entropy + len_entropy) / 2, 4)

    # ── INFORMATION THEORY ────────────────────────────────────────
    entropy_score = _ent_str(code)
    comp_ratio    = round(len(zlib.compress(code.encode(), 9)) / max(len(code.encode()), 1), 4)
    rep_lines     = [l.strip() for l in lines if l.strip()]
    rep_counts    = Counter(rep_lines)
    rep_score     = round(sum(v - 1 for v in rep_counts.values() if v > 1) / max(len(rep_lines), 1), 4)
    all_tok2      = re.findall(r'\b[a-zA-Z_]\w*\b', code)
    lex_div       = round(len(set(all_tok2)) / max(len(all_tok2), 1), 4) if all_tok2 else 0.0
    lengths_f     = [len(l) for l in non_empty]
    mean_f        = sum(lengths_f) / max(len(lengths_f), 1)
    std_f         = math.sqrt(sum((x - mean_f) ** 2 for x in lengths_f) / max(len(lengths_f), 1))
    burstiness    = round(std_f / max(mean_f, 1), 4)

    # ── NEW: EXTENDED ENTROPY METRICS (Feature Group 12) ─────────
    # Token entropy: entropy over all token types
    token_freq        = Counter(re.findall(r'\b\w+\b', code.lower()))
    token_entropy     = round(_entropy(list(token_freq.values())), 4)
    # Identifier entropy: entropy over identifier tokens only
    id_freq           = Counter(v.lower() for v in vars_)
    identifier_entropy = round(_entropy(list(id_freq.values())), 4)
    # Operator entropy: entropy over operators
    ops               = re.findall(r'[+\-*/=<>!&|^%]{1,2}', code)
    operator_entropy  = round(_entropy(ops), 4)
    line_length_entropy = round(_entropy([len(l) // 5 for l in non_empty]), 4)

    # ── NEW: TOKEN PATTERN REPETITION (Feature Group 13) ─────────
    # Duplicate line ratio
    total_lines_ne    = max(len(rep_lines), 1)
    dup_lines         = sum(v - 1 for v in rep_counts.values() if v > 1)
    duplicate_line_ratio = round(dup_lines / total_lines_ne, 4)
    # Repeated code blocks: 3+ consecutive identical structure lines
    repeated_blocks   = 0
    for i in range(len(rep_lines) - 2):
        s1 = re.sub(r'\b\w+\b', 'X', rep_lines[i])
        s2 = re.sub(r'\b\w+\b', 'X', rep_lines[i+1])
        s3 = re.sub(r'\b\w+\b', 'X', rep_lines[i+2])
        if s1 == s2 == s3 and s1.strip():
            repeated_blocks += 1
    # if/return True / else / return False exact pattern
    bool_return_pattern = len(re.findall(
        r'if\s+\w[^:]*:\s*\n\s+return\s+True\s*\n\s*else\s*:\s*\n\s+return\s+False', code))

    # ── NEW: STRUCTURAL REPETITION FINGERPRINT (Feature Group 18) ─
    # Build structure string: F=function I=if L=loop R=return C=class T=try
    struct_chars = []
    for line in lines:
        s = line.strip()
        if re.match(r'(def |function )', s):    struct_chars.append('F')
        elif re.match(r'class ', s):             struct_chars.append('C')
        elif re.match(r'if |elif ', s):          struct_chars.append('I')
        elif re.match(r'(for |while )', s):      struct_chars.append('L')
        elif re.match(r'return ', s):            struct_chars.append('R')
        elif re.match(r'try:', s):               struct_chars.append('T')
        elif re.match(r'except', s):             struct_chars.append('X')
    struct_string          = ''.join(struct_chars)
    # Entropy of structure string characters
    structure_pattern_entropy = round(_entropy(struct_chars), 4) if struct_chars else 0.0
    # Pattern repetition: how often the same 3-char structure sequence repeats
    if len(struct_string) >= 3:
        triplets = [struct_string[i:i+3] for i in range(len(struct_string)-2)]
        trip_counts = Counter(triplets)
        pattern_repetition_index = round(
            sum(v-1 for v in trip_counts.values() if v > 1) / max(len(triplets), 1), 4)
    else:
        pattern_repetition_index = 0.0

    # ── NEW: STRUCTURAL VARIATION INDEX (Feature Group 10 of set 2) ──
    # Measure structure entropy per-function segment (how much each function differs)
    struct_variation_score = structure_pattern_entropy  # reuse
    structure_entropy      = structure_pattern_entropy

    # ── NEW: LITERAL VALUE DISTRIBUTION (Feature Group 7 of set 2) ──
    # Round number ratio: how many numeric literals are round numbers (powers of 10, multiples of 5/10)
    all_numbers = re.findall(r'(?<!\w)(\d+)(?!\w)', code)
    all_numbers_int = [int(n) for n in all_numbers if n.isdigit() and len(n) < 8]
    round_nums  = sum(1 for n in all_numbers_int if n > 0 and (n % 10 == 0 or n % 5 == 0 or n in (1,2,3,4,5,8,16,32,64,128,256,512,1024)))
    round_number_ratio = round(round_nums / max(len(all_numbers_int), 1), 4)
    literal_entropy    = round(_entropy(all_numbers_int[:200]), 4) if all_numbers_int else 0.0

    # ── AST (Python only) — single parse, all features in one block ──
    lang = detect_language(code)

    # ════════════════════════════════════════════════════════════════
    #  SINGLE AST PARSE — all AST features computed here, one pass
    #  tree, all_nodes, func_nodes are reused by all feature groups
    # ════════════════════════════════════════════════════════════════
    _ast_tree: ast.AST | None = None
    if lang in ("python", "unknown"):
        try:
            _ast_tree = ast.parse(code)
        except Exception:
            pass

    # defaults (used when AST unavailable or non-Python)
    ast_funcs = 0; ast_classes = 0; all_funcs_docd = False
    arg_ann_ratio = 0.0; ret_ann_ratio = 0.0; comprehensions = 0
    lambdas = 0; default_args = 0; raise_stmts = 0; assertions = 0
    ast_available = False
    ast_tree_depth = 0; avg_children_per_node = 0.0
    ast_if_count = 0; ast_for_count = 0; ast_try_count = 0; ast_return_count = 0
    ast_node_type_entropy = 0.0; ast_branching_factor = 0.0
    # v9 AST features
    ast_subtree_dup_ratio = 0.0
    ast_path_entropy      = 0.0
    cf_uniformity_ratio   = 0.0
    cf_uniformity_std     = 0.0

    if _ast_tree is not None:
        try:
            # ── ONE WALK to build reusable node list ──────────────
            all_nodes  = list(ast.walk(_ast_tree))
            func_nodes = [n for n in all_nodes if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
            class_nodes= [n for n in all_nodes if isinstance(n, ast.ClassDef)]
            ast_funcs  = len(func_nodes)
            ast_classes= len(class_nodes)

            # documented functions
            docd = sum(1 for f in func_nodes
                       if f.body and isinstance(f.body[0], ast.Expr)
                       and isinstance(f.body[0].value, ast.Constant))
            all_funcs_docd = ast_funcs > 0 and docd == ast_funcs

            # annotations
            total_args    = sum(len(f.args.args) for f in func_nodes)
            ann_args      = sum(1 for f in func_nodes for a in f.args.args if a.annotation)
            arg_ann_ratio = round(ann_args / max(total_args, 1), 4)
            ret_ann_ratio = round(sum(1 for f in func_nodes if f.returns) / max(ast_funcs, 1), 4)

            # misc counts — filter from all_nodes (no extra walk)
            comprehensions = sum(1 for n in all_nodes
                                 if isinstance(n, (ast.ListComp, ast.DictComp,
                                                   ast.SetComp, ast.GeneratorExp)))
            lambdas      = sum(1 for n in all_nodes if isinstance(n, ast.Lambda))
            default_args = sum(len(f.args.defaults) for f in func_nodes)
            raise_stmts  = sum(1 for n in all_nodes if isinstance(n, ast.Raise))
            assertions   = sum(1 for n in all_nodes if isinstance(n, ast.Assert))
            ast_available = True

            # ── AST STRUCTURAL FEATURES ───────────────────────────
            # depth via single-pass depth_map using all_nodes
            depth_map = {id(_ast_tree): 0}
            max_d = 0
            for node in all_nodes:
                d = depth_map.get(id(node), 0)
                if d > max_d: max_d = d
                for child in ast.iter_child_nodes(node):
                    depth_map[id(child)] = d + 1
            ast_tree_depth = max_d

            # children-per-node from all_nodes
            total_children    = sum(len(list(ast.iter_child_nodes(n))) for n in all_nodes)
            avg_children_per_node = round(total_children / max(len(all_nodes), 1), 4)

            # node type distribution from all_nodes
            node_types = Counter(type(n).__name__ for n in all_nodes)
            ast_if_count     = node_types.get('If', 0)
            ast_for_count    = node_types.get('For', 0) + node_types.get('AsyncFor', 0)
            ast_try_count    = node_types.get('Try', 0)
            ast_return_count = node_types.get('Return', 0)
            ast_node_type_entropy = round(_entropy(list(node_types.values())), 4)
            ast_branching_factor  = round(
                (ast_if_count + ast_for_count + ast_try_count) / max(ast_funcs, 1), 4)

            # ── v9: AST Subtree Duplication Ratio ─────────────────
            # fingerprint = (node_type, tuple_of_child_types) — reuse all_nodes
            def _fp(node):
                return (type(node).__name__,
                        tuple(type(c).__name__ for c in ast.iter_child_nodes(node)))
            _fp_counter = Counter(_fp(n) for n in all_nodes)
            _total_fp   = sum(_fp_counter.values())
            _dup_fp     = sum(v - 1 for v in _fp_counter.values() if v > 1)
            ast_subtree_dup_ratio = round(_dup_fp / max(_total_fp, 1), 4)

            # ── v9: AST Path Entropy ───────────────────────────────
            # Iterative DFS collecting 3-node ancestor paths; hard cap 20000 paths
            MAX_AST_PATHS = 20000
            _path_counts: Counter = Counter()
            _stack9 = [(n, ()) for n in ast.iter_child_nodes(_ast_tree)]
            _paths_seen = 0
            while _stack9:
                if _paths_seen >= MAX_AST_PATHS:
                    break
                _node9, _anc = _stack9.pop()
                _path = (_anc + (type(_node9).__name__,))[-3:]
                if len(_path) == 3:
                    _path_counts[_path] += 1
                    _paths_seen += 1
                for _ch in ast.iter_child_nodes(_node9):
                    _stack9.append((_ch, _path))
            _total_paths = sum(_path_counts.values())
            if _total_paths:
                ast_path_entropy = round(
                    -sum((c / _total_paths) * math.log2(c / _total_paths)
                         for c in _path_counts.values()), 4)

            # ── v9: Control Flow Uniformity ────────────────────────
            # branches-per-function using already-built func_nodes + all_nodes
            _func_branch_counts = []
            for _fn in func_nodes:
                _b = sum(1 for _n in ast.walk(_fn)
                         if isinstance(_n, (ast.If, ast.For, ast.While, ast.Try)))
                _func_branch_counts.append(_b)
            if _func_branch_counts:
                cf_uniformity_ratio = round(
                    sum(_func_branch_counts) / len(_func_branch_counts), 4)
                cf_uniformity_std = round(
                    statistics.pstdev(_func_branch_counts), 4
                ) if len(_func_branch_counts) > 1 else 0.0

        except Exception:
            pass

    # ── STYLE CONSISTENCY ─────────────────────────────────────────
    sq = len(re.findall(r"'[^']*'", code))
    dq = len(re.findall(r'"[^"]*"', code))
    quote_cons  = round(max(sq, dq) / max(sq + dq, 1), 4)
    trailing_ws = sum(1 for l in non_empty if l != l.rstrip())
    trailing_r  = round(trailing_ws / max(len(non_empty), 1), 4)
    mixed_ind   = (sum(1 for l in non_empty if l.startswith("\t")) > 0 and
                   sum(1 for l in non_empty if l.startswith(" ")) > 0)
    pep8_ops    = len(re.findall(r'\s[+\-*/=<>!]=?\s', code))
    total_ops   = len(re.findall(r'[+\-*/=<>!]', code))
    op_sp_ratio = round(pep8_ops / max(total_ops, 1), 4)

    # ── NEW: LOGICAL SYMMETRY DETECTION (Feature Group 15 of set 2) ──
    # if/else perfect symmetry: both branches same number of lines
    symmetric_branches = 0
    lines_lower = [l.lower() for l in lines]
    for i, l in enumerate(lines_lower):
        if re.match(r'\s*if\s+', l):
            # find matching else
            base_ind = len(lines[i]) - len(lines[i].lstrip())
            for j in range(i+1, min(i+20, len(lines))):
                if re.match(r'\s*else\s*:', lines_lower[j]):
                    else_ind = len(lines[j]) - len(lines[j].lstrip())
                    if else_ind == base_ind:
                        symmetric_branches += 1
                        break
    branch_symmetry_score = round(symmetric_branches / max(if_count, 1), 4)

    # ════════════════════════════════════════════════════════════════
    #  v9.0 NEW FEATURE BLOCKS  (5 AST-powered features)
    # ════════════════════════════════════════════════════════════════

    # ── v9 Feature 2: Identifier Root Entropy ────────────────────
    # Entropy over the first component of snake_case identifiers.
    # Low entropy → many identifiers share the same semantic root (AI clustering).
    # e.g. user_data / user_input / user_result → root "user" dominates
    _roots = [v.split("_")[0] for v in vars_ if "_" in v]
    identifier_root_entropy = round(_entropy(_roots), 4) if _roots else 0.0
    # Also count how concentrated the top root is
    if _roots:
        _root_ctr = Counter(_roots)
        _top_root_ratio = round(_root_ctr.most_common(1)[0][1] / len(_roots), 4)
    else:
        _top_root_ratio = 0.0

    # ── v9 Feature 4: Identifier Reuse Distance ──────────────────
    # Single pass over all tokens; compute average gap between reuses.
    # Short average distance → AI reuses the same variable names tightly together.
    _last_seen: dict = {}
    _id_distances: list = []
    for _i, _t in enumerate(all_tok2):  # all_tok2 already computed above
        if _t in _last_seen:
            _id_distances.append(_i - _last_seen[_t])
        _last_seen[_t] = _i
    identifier_reuse_distance = round(
        sum(_id_distances) / max(len(_id_distances), 1), 4) if _id_distances else 0.0

    # ════════════════════════════════════════════════════════════════
    #  v8.0 NEW FEATURE BLOCKS
    # ════════════════════════════════════════════════════════════════

    # ── v8 Feature 1: Operator Usage Distribution ────────────────
    # Fine-grained operator frequency entropy + explicit vs augmented assignment
    all_ops = re.findall(r'[+\-*/=<>!&|^%]{1,2}', code)
    op_freq_entropy = round(_entropy(all_ops), 4) if all_ops else 0.0
    # Explicit: result = result + value  vs  augmented: result += value
    explicit_assignments = len(re.findall(r'\b\w+\s*=\s*\w+\s*[+\-*/]\s*\w+', code))
    augmented_assignments = len(re.findall(r'\b\w+\s*[+\-*/]=\s*\w+', code))
    total_assign = max(explicit_assignments + augmented_assignments, 1)
    explicit_assignment_ratio  = round(explicit_assignments  / total_assign, 4)
    augmented_assignment_ratio = round(augmented_assignments / total_assign, 4)

    # ── v8 Feature 2: Conditional Depth Pattern ──────────────────
    # Track nesting depth of consecutive if-statements line-by-line
    if_depths = []
    cur_if_depth = 0
    prev_indent  = 0
    for line in lines:
        s = line.strip()
        cur_indent = len(line) - len(line.lstrip())
        if re.match(r'if\s+', s) or re.match(r'elif\s+', s):
            if cur_indent > prev_indent:
                cur_if_depth += 1
            elif cur_indent < prev_indent:
                cur_if_depth = max(0, cur_if_depth - (prev_indent - cur_indent) // max(4, 1))
            if_depths.append(cur_if_depth)
        if s:
            prev_indent = cur_indent
    avg_if_depth     = round(sum(if_depths) / max(len(if_depths), 1), 4)
    max_if_depth     = max(if_depths, default=0)
    if_depth_variance = round(statistics.pstdev(if_depths) ** 2, 4) if len(if_depths) > 1 else 0.0

    # ── v8 Feature 3: Control Flow Shape Fingerprint (per function) ──
    # Build shape string per function body and measure diversity across functions
    func_shape_strings = []
    for idx, start in enumerate(func_starts):
        end = func_starts[idx + 1] if idx + 1 < len(func_starts) else len(lines)
        end = min(end, start + 60)
        shape = []
        for l in lines[start:end]:
            s2 = l.strip()
            if re.match(r'if\b|elif\b', s2):  shape.append('I')
            elif re.match(r'for\b|while\b', s2): shape.append('L')
            elif re.match(r'return\b', s2):    shape.append('R')
            elif re.match(r'try\b', s2):        shape.append('T')
            elif re.match(r'except\b', s2):     shape.append('X')
        func_shape_strings.append(''.join(shape[:8]))  # cap at 8 tokens
    unique_shapes     = len(set(func_shape_strings))
    total_shapes      = max(len(func_shape_strings), 1)
    # Low diversity = AI (same shape repeated)
    func_shape_diversity = round(unique_shapes / total_shapes, 4)
    func_shape_entropy   = round(_entropy(func_shape_strings), 4) if func_shape_strings else 0.0

    # ── v8 Feature 4: Literal Type Distribution ──────────────────
    num_literals    = len(re.findall(r'(?<!\w)\d+(?!\w)', code))
    string_literal_count = len(re.findall(r'["\'][^"\']{1,80}["\']', code))
    bool_literal_count   = len(re.findall(r'\b(True|False)\b', code))
    none_literal_count   = len(re.findall(r'\bNone\b', code))
    lit_counts = [num_literals, string_literal_count, bool_literal_count, none_literal_count]
    literal_type_entropy = round(_entropy(lit_counts), 4) if any(lit_counts) else 0.0

    # ── v8 Feature 5: Redundant Boolean Returns ──────────────────
    redundant_bool_return_count = len(re.findall(
        r'if\s+[^:\n]+:\s*\n\s+return\s+True\s*\n\s*else\s*:\s*\n\s+return\s+False', code))
    # Also catch the inverse
    redundant_bool_return_count += len(re.findall(
        r'if\s+[^:\n]+:\s*\n\s+return\s+False\s*\n\s*else\s*:\s*\n\s+return\s+True', code))

    # ── v8 Feature 7: Loop Body Complexity ───────────────────────
    # Measure std of loop body lengths (line-by-line scan)
    loop_body_lengths = []
    for i, line in enumerate(lines):
        s = line.strip()
        if re.match(r'for\s+|while\s+', s):
            base_ind = len(line) - len(line.lstrip())
            body_len = 0
            for j in range(i + 1, min(i + 51, len(lines))):
                inner = lines[j]
                if not inner.strip():
                    continue
                inner_ind = len(inner) - len(inner.lstrip())
                if inner_ind <= base_ind:
                    break
                body_len += 1
            if body_len > 0:
                loop_body_lengths.append(body_len)
    loop_body_length_std = round(
        statistics.pstdev(loop_body_lengths), 4) if len(loop_body_lengths) > 1 else 0.0

    # ── v8 Feature 8: Boolean Expression Complexity ──────────────
    # Count comparison operators as density signal
    comparison_ops   = len(re.findall(r'[<>]=?|[!=]=', code))
    comparison_density = round(comparison_ops / max(n_lines, 1), 4)

    # ── v8 Feature 10: Whitespace Rhythm Analysis ────────────────
    blank_positions_all = [i for i, l in enumerate(lines) if not l.strip()]
    if len(blank_positions_all) > 2:
        intervals = [blank_positions_all[i+1] - blank_positions_all[i]
                     for i in range(len(blank_positions_all) - 1)]
        blank_interval_variance = round(statistics.pstdev(intervals) ** 2, 4)
    else:
        blank_interval_variance = 0.0

    # ── v8 Feature 11: Token Bigram Repetition ───────────────────
    # Find repeated "for X in", "if X :" bigram patterns
    all_tok_list = re.findall(r'\b\w+\b', code.lower())
    if len(all_tok_list) >= 2:
        bigrams = [f"{all_tok_list[i]}_{all_tok_list[i+1]}"
                   for i in range(len(all_tok_list) - 1)]
        bigram_counts = Counter(bigrams)
        repeated_bigrams = sum(v - 1 for v in bigram_counts.values() if v > 2)
        token_bigram_rep_score = round(repeated_bigrams / max(len(bigrams), 1), 4)
    else:
        token_bigram_rep_score = 0.0

    # ── v8 Feature 13: Comment Density Gradient ──────────────────
    # Split file into 4 regions, compute comment density per region, then variance
    region_size = max(len(lines) // 4, 1)
    region_densities = []
    for r in range(4):
        region_lines = lines[r * region_size: (r + 1) * region_size]
        if not region_lines:
            region_densities.append(0.0)
            continue
        cmt_count = sum(1 for l in region_lines if l.strip().startswith(('#', '//', '*', '/*')))
        region_densities.append(cmt_count / len(region_lines))
    comment_density_variance = round(
        statistics.pstdev(region_densities) ** 2, 4) if len(region_densities) > 1 else 0.0

    # ── v8 Feature 14: Keyword Ratio Profile ─────────────────────
    kw_list = ['if', 'for', 'while', 'return', 'try', 'def', 'class', 'import', 'else', 'elif']
    kw_counts = [len(re.findall(r'\b' + k + r'\b', code)) for k in kw_list]
    keyword_distribution_entropy = round(_entropy(kw_counts), 4) if any(kw_counts) else 0.0

    # ── v8 Feature A: Code Stylometry Fingerprint ────────────────
    # Create a style vector and measure its statistical spread
    # Very low variance = smooth/consistent = AI
    style_vector = [
        round(avg_vlen / 10.0, 4),                        # normalise to ~0-1
        round(indent_std / 10.0, 4),
        round(line_std / 50.0, 4),
        loop_style_entropy / max(math.log2(5), 1),
        control_flow_balance_score,
        op_sp_ratio,
    ]
    style_vector_variance = round(statistics.pstdev(style_vector) ** 2, 4)

    # ── v8 Feature B: Function Signature Diversity ───────────────
    # Entropy over parameter counts across functions (low = AI)
    func_sig_param_entropy = round(_entropy(param_counts), 4) if param_counts else 0.0

    # ── v8 Feature C: Cross-Function Structural Similarity ───────
    # Same as func_shape_entropy but focused on first 4 tokens of shape
    short_shapes = [s[:4] for s in func_shape_strings if s]
    cross_func_shape_entropy = round(_entropy(short_shapes), 4) if short_shapes else 0.0

    # ── v8 Feature D: Function Length Skewness ───────────────────
    # Low skewness = uniform function lengths = AI
    if len(func_lengths) >= 3:
        try:
            function_length_skewness = round(abs(statistics.mean(func_lengths) -
                                                 statistics.median(func_lengths)) /
                                             max(statistics.pstdev(func_lengths), 0.001), 4)
        except Exception:
            function_length_skewness = 0.0
    else:
        function_length_skewness = 0.0

    # ── v8 Feature E: AI Hallucination Signals ───────────────────
    # Detect redundant None checks (if x is None: return None / if not x: return None)
    redundant_none_checks = len(re.findall(
        r'if\s+\w+\s+is\s+None\s*:\s*\n\s+return\s+None', code))
    redundant_none_checks += len(re.findall(
        r'if\s+not\s+\w+\s*:\s*\n\s+return\s+(?:None|False|\[\]|\{\})', code))
    # print-in-except (AI hallucination: catching and printing but not re-raising)
    print_in_except = len(re.findall(
        r'except\s+\w[^:]*:\s*\n\s+print\s*\(', code))
    print_in_except += len(re.findall(
        r'except\s+\w[^:]*:\s*\n\s+(?:logging|logger)\.\w+\s*\(', code))
    hallucination_signal_count = redundant_none_checks + print_in_except

    # ── v8 Feature F: Semantic Token Density ─────────────────────
    # How densely packed are AI-typical semantic tokens?
    semantic_tokens = re.findall(
        r'\b(validate|process|calculate|result|output|input|data|config|handler|'
        r'manager|controller|service|repository|factory|builder|generator|'
        r'validator|processor|executor|dispatcher)\b', code, re.I)
    semantic_token_density = round(len(semantic_tokens) / max(n_lines, 1), 4)

    return {
        # ── Original features ─────────────────────────────────────
        "comment_density": comment_density, "verbose_comment_count": verbose_comments,
        "obvious_comment_count": obvious_comments, "section_banner_count": section_banners,
        "docstring_count": docstrings, "full_line_comment_ratio": full_ratio,
        "divider_comment_count": divider_comments, "todo_fixme_count": todo_fixme,
        "gpt_style_comment_score": gpt_score, "triple_section_docstring": triple_doc,
        "step_pattern_count": step_pats, "function_desc_comment_count": func_desc,
        "structured_docstrings": structured_docstrings,
        "short_var_ratio": round(short_vars / total_tok, 4),
        "long_var_ratio": round(long_vars / total_tok, 4),
        "avg_var_name_len": round(avg_vlen, 2), "type_token_ratio": round(ttr, 4),
        "descriptive_prefix_count": desc_prefix, "naming_style": naming_style,
        "hasty_alias_count": hasty_alias, "exploratory_name_count": exploratory,
        "trial_name_count": trial_names,
        "total_lines": n_lines, "avg_line_length": round(avg_len, 2),
        "line_length_std": round(line_std, 2), "cyclomatic_complexity": cyclomatic,
        "max_nesting_depth": max_depth, "indent_std": round(indent_std, 2),
        "function_count": func_count, "class_count": class_count,
        "blank_line_ratio": round(blank_ratio, 4), "double_blank_gaps": dbl_blanks,
        "line_uniformity_ratio": round(uniformity, 4),
        "consistent_indentation": consistent_indent, "boilerplate_keyword_hits": boilerplate,
        "perfect_error_handling": perfect_err, "step_style_comments": step_comments,
        "numbered_comment_sections": numbered_secs, "type_annotation_count": type_annots,
        "return_annotation_count": ret_annots, "fstring_count": fstrings,
        "list_comp_count": list_comps, "dunder_usage_count": dunder_usage,
        "dataclass_usage": dataclass_u, "balanced_branches": balanced_br,
        "func_return_density": func_ret_den,
        "debug_trace_count": debug_hits, "commented_out_code_lines": commented_code,
        "magic_number_count": magic_nums, "typo_indicator_count": typos,
        "awkward_spacing_count": len(re.findall(r'[^\n]{2,}  +[^\n]', code)),
        "inconsistent_op_spacing": len(re.findall(r'\w\s{2,}[+\-*/=]|\s[+\-*/=]\s{2,}\w', code)),
        "missing_space_count": missing_sp,
        "canonical_ai_loop_count": ai_loops, "natural_human_loop_count": human_loops,
        "template_score": template_score, "template_count": templates_found,
        "dead_code_total": dead_total, "unused_import_count": unused_imports,
        "commented_call_count": commented_calls, "pass_only_func_count": pass_only_funcs,
        "inefficiency_score": ineff_score, "optimal_pattern_score": optimal_score,
        "nested_loop_count": nested_loops,
        "counter_defaultdict_usage": counter_usage, "heapq_usage": heapq_usage,
        "style_entropy_score": style_entropy, "indentation_entropy": indent_entropy,
        "entropy_score": entropy_score, "compression_ratio": comp_ratio,
        "repetition_score": rep_score, "lexical_diversity": lex_div,
        "burstiness": burstiness,
        "ast_available": ast_available, "ast_function_count": ast_funcs,
        "ast_class_count": ast_classes, "all_functions_documented": all_funcs_docd,
        "arg_annotation_ratio": arg_ann_ratio, "return_annotation_ratio": ret_ann_ratio,
        "comprehension_count": comprehensions, "lambda_count": lambdas,
        "default_arg_count": default_args, "raise_statement_count": raise_stmts,
        "assertion_count": assertions,
        "quote_consistency": quote_cons, "trailing_ws_ratio": trailing_r,
        "mixed_indentation": mixed_ind, "operator_spacing_ratio": op_sp_ratio,
        "structural_symmetry": 0.5,

        # ── NEW: AST Structural Features ──────────────────────────
        "ast_tree_depth": ast_tree_depth,
        "avg_children_per_node": avg_children_per_node,
        "ast_if_count": ast_if_count,
        "ast_for_count": ast_for_count,
        "ast_try_count": ast_try_count,
        "ast_return_count": ast_return_count,
        "ast_node_type_entropy": ast_node_type_entropy,
        "ast_branching_factor": ast_branching_factor,

        # ── NEW: Identifier Clustering ────────────────────────────
        "identifier_similarity_score": identifier_similarity_score,
        "prefix_cluster_count": prefix_cluster_count,
        "suffix_cluster_count": suffix_cluster_count,

        # ── NEW: Identifier Length Distribution ───────────────────
        "median_var_length": median_var_len,
        "var_length_std": var_length_std,
        "very_long_identifier_ratio": very_long_id_ratio,
        "very_short_identifier_ratio": very_short_id_ratio,

        # ── NEW: Control Flow Distribution ────────────────────────
        "if_count": if_count, "for_count": for_count,
        "while_count": while_count, "switch_count": switch_count,
        "control_flow_balance_score": control_flow_balance_score,
        "control_flow_entropy": cf_entropy,

        # ── NEW: Function Structure Patterns ──────────────────────
        "functions_with_validation_pattern": functions_with_validation_pattern,
        "functions_with_processing_pattern": functions_with_processing_pattern,
        "functions_with_return_last_line": functions_with_return_last_line,
        "avg_function_length": avg_function_length,
        "function_structure_consistency": function_structure_consistency,

        # ── NEW: Naming Style Consistency ─────────────────────────
        "snake_case_ratio": snake_ratio,
        "camel_case_ratio": camel_ratio,
        "pascal_case_ratio": pascal_ratio,
        "naming_style_consistency_score": naming_consistency_score,

        # ── NEW: Code Formatting Consistency ──────────────────────
        "indentation_variance": indentation_variance,
        "line_length_variance": line_length_variance,
        "blank_line_consistency": blank_line_consistency,

        # ── NEW: Comment Semantics ────────────────────────────────
        "comment_action_verb_ratio": comment_action_verb_ratio,
        "comment_redundancy_score": comment_redundancy_score,
        "emoji_comment_count": emoji_comments,

        # ── NEW: Template Density ─────────────────────────────────
        "template_pattern_density": template_pattern_density,
        "template_pattern_diversity": template_pattern_diversity,

        # ── NEW: Loop Style Entropy ───────────────────────────────
        "range_len_loop_count": range_len_loops,
        "enumerate_loop_count": enumerate_loops,
        "natural_loop_count": natural_loops,
        "loop_style_entropy": loop_style_entropy,

        # ── NEW: Dead Code Ratios ─────────────────────────────────
        "unused_import_ratio": unused_import_ratio,
        "commented_code_ratio": commented_code_ratio,
        "import_diversity_score": import_diversity_score,

        # ── NEW: Extended Entropy Metrics ─────────────────────────
        "token_entropy": token_entropy,
        "identifier_entropy": identifier_entropy,
        "operator_entropy": operator_entropy,
        "line_length_entropy": line_length_entropy,

        # ── NEW: Token Repetition ─────────────────────────────────
        "duplicate_line_ratio": duplicate_line_ratio,
        "repeated_code_blocks": repeated_blocks,
        "bool_return_pattern_count": bool_return_pattern,

        # ── NEW: Exception Handling Patterns ─────────────────────
        "exception_specificity_score": exception_specificity_score,
        "perfect_try_except_ratio": perfect_try_except_ratio,
        "error_msg_length_avg": error_msg_len_avg,
        "error_msg_token_avg": error_msg_token_avg,
        "error_msg_specificity": error_msg_specificity,
        "bare_except_count": bare_excepts,
        "specific_except_count": specific_excepts,

        # ── NEW: Semantic Code Flow / Pipeline ───────────────────
        "pipeline_pattern_score": pipeline_pattern_score,
        "processing_sequence_count": processing_sequence_count,

        # ── NEW: Human Imperfection / Evolution Signals ──────────
        "todo_density": todo_density,
        "versioned_identifier_count": versioned_ids,
        "rename_chain_count": rename_chain_count,
        "debug_statement_density": debug_statement_density,
        "temporary_variable_ratio": temporary_variable_ratio,
        "debug_comment_count": debug_comment_count,

        # ── NEW: Structural Repetition Fingerprint ────────────────
        "structure_pattern_entropy": structure_pattern_entropy,
        "pattern_repetition_index": pattern_repetition_index,
        "structure_variation_score": struct_variation_score,

        # ── NEW: Complexity Profile ───────────────────────────────
        "avg_function_complexity": avg_function_complexity,
        "complexity_variance": complexity_variance,

        # ── NEW: Code Naturalness ─────────────────────────────────
        "avg_block_size": avg_block_size,
        "block_length_variance": block_length_variance,
        "avg_function_length_computed": avg_function_length,
        "function_size_variance": function_size_variance,
        "max_function_length_ratio": max_function_length_ratio,

        # ── NEW: LLM Fingerprints ─────────────────────────────────
        "defensive_programming_density": defensive_programming_density,
        "input_validation_patterns": input_validation_patterns,
        "llm_signature_pattern_count": llm_signature_pattern_count,

        # ── NEW: Function Naming Semantics ────────────────────────
        "verb_prefix_ratio": verb_prefix_ratio,
        "action_function_ratio": action_function_ratio,

        # ── NEW: Return Pattern Analysis ─────────────────────────
        "branch_return_density": branch_return_density,
        "early_return_count": early_returns,
        "single_return_branches": single_return_branches,

        # ── NEW: Function Argument Patterns ──────────────────────
        "avg_param_count": avg_param_count,
        "long_param_name_ratio": long_param_name_ratio,

        # ── NEW: Literal Value Distribution ──────────────────────
        "round_number_ratio": round_number_ratio,
        "literal_entropy": literal_entropy,

        # ── NEW: Language-Specific Idiom Usage ───────────────────
        "idiomatic_pattern_count": idiomatic_pattern_count,
        "native_construct_ratio": native_construct_ratio,

        # ── NEW: Logical Symmetry Detection ──────────────────────
        "branch_symmetry_score": branch_symmetry_score,
        "symmetric_branch_count": symmetric_branches,
        "bool_return_symmetry": bool_return_pattern,

        # ── NEW v8.0 features ────────────────────────────────────
        "op_freq_entropy": op_freq_entropy,
        "explicit_assignment_ratio": explicit_assignment_ratio,
        "augmented_assignment_ratio": augmented_assignment_ratio,
        "avg_if_depth": avg_if_depth,
        "max_if_depth": max_if_depth,
        "if_depth_variance": if_depth_variance,
        "func_shape_diversity": func_shape_diversity,
        "func_shape_entropy": func_shape_entropy,
        "literal_type_entropy": literal_type_entropy,
        "string_literal_count": string_literal_count,
        "bool_literal_count": bool_literal_count,
        "none_literal_count": none_literal_count,
        "redundant_bool_return_count": redundant_bool_return_count,
        "loop_body_length_std": loop_body_length_std,
        "comparison_density": comparison_density,
        "blank_interval_variance": blank_interval_variance,
        "token_bigram_rep_score": token_bigram_rep_score,
        "comment_density_variance": comment_density_variance,
        "keyword_distribution_entropy": keyword_distribution_entropy,
        "style_vector_variance": style_vector_variance,
        "func_sig_param_entropy": func_sig_param_entropy,
        "cross_func_shape_entropy": cross_func_shape_entropy,
        "function_length_skewness": function_length_skewness,
        "hallucination_signal_count": hallucination_signal_count,
        "semantic_token_density": semantic_token_density,

        # ── NEW v9.0 features ────────────────────────────────────
        "ast_subtree_dup_ratio": ast_subtree_dup_ratio,
        "identifier_root_entropy": identifier_root_entropy,
        "identifier_root_top_ratio": _top_root_ratio,
        "ast_path_entropy": ast_path_entropy,
        "identifier_reuse_distance": identifier_reuse_distance,
        "cf_uniformity_ratio": cf_uniformity_ratio,
        "cf_uniformity_std": cf_uniformity_std,
    }


# ════════════════════════════════════════════════════════════════
#  AI SCORING ENGINE  (v8.0 — extended with new signals)
# ════════════════════════════════════════════════════════════════

def _compute_ai_score(f: dict) -> float:
    score = 0.0

    # ── COMMENT SIGNALS ──────────────────────────────────────────
    cd = f["comment_density"]
    if cd > 0.35:    score += 3
    elif cd > 0.25:  score += 3
    elif cd > 0.15:  score += 4
    elif cd < 0.04:  score -= 8
    if f["verbose_comment_count"]   >= 3:  score += 12
    elif f["verbose_comment_count"] >= 1:  score += 6
    if f["obvious_comment_count"]   >= 3:  score += 8
    elif f["obvious_comment_count"] >= 1:  score += 3
    if f["section_banner_count"]    >= 2:  score += 8
    if f["structured_docstrings"]   >= 3:  score += 10
    if f["step_style_comments"]     >= 2:  score += 8
    if f["numbered_comment_sections"] >= 2: score += 8
    if f["divider_comment_count"]   >= 1:  score += 6
    if f["full_line_comment_ratio"] > 0.85 and f["docstring_count"] > 1: score += 5
    # NEW: comment semantics
    if f["comment_action_verb_ratio"]  > 0.4: score += 8
    elif f["comment_action_verb_ratio"] > 0.2: score += 4
    if f["comment_redundancy_score"]   > 0.3: score += 6
    elif f["comment_redundancy_score"] > 0.15: score += 3
    # NEW: emoji comments (strong AI signal)
    if f["emoji_comment_count"] >= 3:   score += 6
    elif f["emoji_comment_count"] >= 1: score += 3

    # ── GPT COMMENT PATTERNS ─────────────────────────────────────
    gpt = f["gpt_style_comment_score"]
    if gpt >= 5:    score += 14
    elif gpt >= 3:  score += 9
    elif gpt >= 1:  score += 4
    if f["triple_section_docstring"]:           score += 10
    if f["step_pattern_count"]          >= 2:  score += 6
    if f["function_desc_comment_count"] >= 2:  score += 7

    # ── VARIABLE / NAMING ─────────────────────────────────────────
    if f["long_var_ratio"]   > 0.20:  score += 5
    elif f["long_var_ratio"] > 0.12:  score += 6
    if f["short_var_ratio"]  > 0.40:  score -= 14
    elif f["short_var_ratio"] > 0.25: score -= 6
    if f["avg_var_name_len"] > 9:     score += 8
    elif f["avg_var_name_len"] < 4:   score -= 8
    if f["type_token_ratio"] < 0.40:  score += 5
    if f["hasty_alias_count"]   > 4:  score -= 5
    if f["descriptive_prefix_count"] >= 3: score += 8
    # NEW: identifier clustering (AI uses consistent naming clusters)
    if f["identifier_similarity_score"] > 0.5: score += 8
    elif f["identifier_similarity_score"] > 0.3: score += 4
    if f["prefix_cluster_count"]  >= 4: score += 5
    if f["suffix_cluster_count"]  >= 3: score += 4
    # NEW: identifier length distribution (AI uses very long, consistent names)
    if f["very_long_identifier_ratio"] > 0.12: score += 7
    elif f["very_long_identifier_ratio"] > 0.06: score += 3
    if f["very_short_identifier_ratio"] > 0.15: score -= 6
    if f["var_length_std"] < 2.0: score += 5  # very consistent lengths = AI
    elif f["var_length_std"] > 5.0: score -= 4
    # NEW: naming style consistency
    if f["naming_style_consistency_score"] > 0.90: score += 6
    elif f["naming_style_consistency_score"] > 0.75: score += 3
    # NEW: function naming semantics
    if f["verb_prefix_ratio"] > 0.7: score += 7
    elif f["verb_prefix_ratio"] > 0.5: score += 3
    # NEW: function argument patterns (many params with long names = AI)
    if f["avg_param_count"] > 3.5: score += 5
    if f["long_param_name_ratio"] > 0.4: score += 4

    # ── TYPE ANNOTATIONS ─────────────────────────────────────────
    if f["type_annotation_count"]   >= 5:  score += 10
    if f["arg_annotation_ratio"]    > 0.6: score += 8
    if f["return_annotation_count"] >= 3:  score += 6
    if f["return_annotation_ratio"] > 0.6: score += 5

    # ── FORMATTING CONSISTENCY ────────────────────────────────────
    if f["consistent_indentation"]:         score += 8
    if f["indent_std"] < 3.0:              score += 6
    elif f["indent_std"] > 8.0:            score -= 6
    if not f["mixed_indentation"]:          score += 3
    if f["operator_spacing_ratio"] > 0.7:  score += 5
    # NEW: formatting consistency metrics
    if f["indentation_variance"] < 4.0:    score += 4
    if f["blank_line_consistency"] > 0.8:  score += 4
    elif f["blank_line_consistency"] < 0.4: score -= 3
    if f["line_length_variance"] < 100:    score += 3

    # ── LINE UNIFORMITY / BURSTINESS ─────────────────────────────
    if f["line_uniformity_ratio"]  > 0.80:  score += 4
    elif f["line_uniformity_ratio"] > 0.65: score += 6
    if f["line_length_std"] < 10:           score += 8
    elif f["line_length_std"] > 35:         score -= 12
    bursty = f["burstiness"]
    if bursty > 0.55:   score -= 10
    elif bursty < 0.30: score += 8

    # ── NESTING / COMPLEXITY ─────────────────────────────────────
    if f["max_nesting_depth"] <= 2:      score += 5
    elif f["max_nesting_depth"] >= 6:    score -= 6
    if f["cyclomatic_complexity"] > 20:  score -= 10
    elif f["cyclomatic_complexity"] < 6: score += 4
    if 0.12 < f["blank_line_ratio"] < 0.30: score += 6
    if f["double_blank_gaps"] >= 2:      score += 4
    # NEW: complexity profile
    if f["complexity_variance"] < 2.0: score += 4   # very uniform complexity = AI
    elif f["complexity_variance"] > 10.0: score -= 4
    if 2.0 < f["avg_function_complexity"] < 6.0: score += 4  # moderate AI range

    # ── BOILERPLATE / AI PATTERNS ────────────────────────────────
    bp = f["boilerplate_keyword_hits"]
    if bp >= 8:   score += 6
    elif bp >= 5: score += 3
    elif bp >= 3: score += 6
    if f["perfect_error_handling"]:       score += 7
    if f["balanced_branches"]:            score += 4
    if f["func_return_density"] > 0.8:   score += 5
    if f["dunder_usage_count"]  > 5:     score += 4
    if f["default_arg_count"]   > 4:     score += 4
    if f["dataclass_usage"]     > 0:     score += 4
    if f["fstring_count"]       > 3:     score += 4
    if f["list_comp_count"]     > 3:     score += 4
    # NEW: LLM fingerprints
    if f["defensive_programming_density"] >= 4: score += 10
    elif f["defensive_programming_density"] >= 2: score += 5
    if f["llm_signature_pattern_count"] >= 2: score += 8
    if f["input_validation_patterns"]   >= 2: score += 5
    # NEW: function structure patterns
    if f["function_structure_consistency"] > 0.6: score += 3
    elif f["function_structure_consistency"] > 0.35: score += 4
    if f["pipeline_pattern_score"] >= 2: score += 7
    elif f["pipeline_pattern_score"] >= 1: score += 3
    if f["functions_with_validation_pattern"] >= 2: score += 5
    # NEW: return patterns
    if f["branch_return_density"] > 1.0: score += 6
    if f["bool_return_pattern_count"] >= 2: score += 5
    # NEW: control flow balance
    if f["control_flow_balance_score"] > 0.7: score += 5
    # NEW: template density
    if f["template_pattern_density"] > 0.04: score += 6
    elif f["template_pattern_density"] > 0.02: score += 3
    # NEW: exception handling
    if f["exception_specificity_score"] > 0.5: score += 5
    if f["error_msg_specificity"]       > 0.5: score += 4
    if f["error_msg_token_avg"]         > 8.0: score += 4
    # NEW: logical symmetry
    if f["branch_symmetry_score"] > 0.5: score += 5
    elif f["branch_symmetry_score"] > 0.25: score += 2

    # ── HUMAN TRACES ─────────────────────────────────────────────
    dt = f["debug_trace_count"]
    if dt >= 4:   score -= 16
    elif dt >= 2: score -= 9
    elif dt >= 1: score -= 4
    if f["commented_out_code_lines"] >= 3:   score -= 12
    elif f["commented_out_code_lines"] >= 1: score -= 5
    if f["magic_number_count"] > 8:          score -= 10
    elif f["magic_number_count"] > 4:        score -= 5
    if f["typo_indicator_count"]    > 0:     score -= 12
    if f["exploratory_name_count"]  > 4:     score -= 8
    if f["todo_fixme_count"]        >= 2:    score -= 8
    elif f["todo_fixme_count"]      >= 1:    score -= 3
    if f["trial_name_count"]        >= 2:    score -= 6
    if f["missing_space_count"]     >= 1:    score -= 5
    if f["trailing_ws_ratio"]       > 0.10:  score -= 5
    # NEW: human imperfection / evolution signals
    if f["todo_density"]               > 0.02: score -= 5
    if f["versioned_identifier_count"] >= 3:   score -= 8
    elif f["versioned_identifier_count"] >= 1: score -= 3
    if f["rename_chain_count"]         >= 2:   score -= 6
    if f["debug_statement_density"]    > 0.05: score -= 6
    if f["temporary_variable_ratio"]   > 0.05: score -= 5
    # NEW: literal values (humans use irregular numbers)
    if f["round_number_ratio"] > 0.7: score += 4  # AI uses round numbers
    elif f["round_number_ratio"] < 0.3: score -= 4

    # ── INFORMATION THEORY ────────────────────────────────────────
    ent = f["entropy_score"]
    if ent < 3.7:    score += 10
    elif ent < 4.0:  score += 5
    elif ent > 4.7:  score -= 8
    cr = f["compression_ratio"]
    if cr < 0.45:    score += 8
    elif cr < 0.55:  score += 4
    elif cr > 0.75:  score -= 6
    rep = f["repetition_score"]
    if rep > 0.12:   score += 8
    elif rep < 0.02: score -= 4
    ld = f["lexical_diversity"]
    if ld > 0.75:    score += 6
    elif ld < 0.55:  score -= 5
    if f["quote_consistency"] > 0.95: score += 4
    # NEW: extended entropy metrics
    if f["token_entropy"]      < 3.5: score += 5  # low token entropy = repetitive = AI
    if f["identifier_entropy"] < 3.0: score += 5
    if f["operator_entropy"]   < 1.5: score += 4  # uniform operator use = AI
    # NEW: token repetition
    if f["duplicate_line_ratio"] > 0.08: score += 6
    elif f["duplicate_line_ratio"] > 0.04: score += 3
    if f["repeated_code_blocks"] >= 3: score += 5
    # NEW: structural fingerprint
    se2 = f["structure_pattern_entropy"]
    if se2 < 1.0:   score += 6   # very uniform structure = AI
    elif se2 < 1.5: score += 3
    elif se2 > 2.5: score -= 5
    if f["pattern_repetition_index"] > 0.15: score += 6
    elif f["pattern_repetition_index"] > 0.07: score += 3

    # ── AST SIGNALS ───────────────────────────────────────────────
    if f["ast_available"]:
        if f["all_functions_documented"]:        score += 12
        if f["ast_function_count"] >= 3:         score += 4
        if f["assertion_count"]    >= 3:         score += 5
        if f["raise_statement_count"] >= 2:      score += 4
        if f["arg_annotation_ratio"]  > 0.7:     score += 6
        if f["lambda_count"]          > 5:       score += 4
        if f["comprehension_count"]   > 4:       score += 4
        # NEW: AST structural features
        if f["ast_tree_depth"] > 8:              score += 5
        if f["avg_children_per_node"] > 3.0:     score += 4
        if f["ast_node_type_entropy"] < 2.0:     score += 5   # low = repetitive structure
        if f["ast_branching_factor"]  > 3.0:     score += 4
        # High return count relative to functions = AI's explicit return style
        if f["ast_return_count"] > f["ast_function_count"] * 1.5: score += 4

    # ── LOOP SIGNALS ─────────────────────────────────────────────
    ai_l = f["canonical_ai_loop_count"]
    hu_l = f["natural_human_loop_count"]
    if ai_l >= 3:    score += 10
    elif ai_l >= 1:  score += 5
    if hu_l >= 3:    score -= 6
    elif hu_l >= 1:  score -= 2
    # NEW: loop style entropy (low = AI uses one preferred loop style)
    if f["loop_style_entropy"] < 0.5:  score += 5
    elif f["loop_style_entropy"] > 1.5: score -= 4
    if f["range_len_loop_count"] >= 2: score += 4
    if f["enumerate_loop_count"] >= 2: score += 3

    # ── STYLE ENTROPY ─────────────────────────────────────────────
    se = f["style_entropy_score"]
    if se < 0.5:    score += 8
    elif se < 1.0:  score += 4
    elif se > 2.0:  score -= 8
    elif se > 1.5:  score -= 4

    # ── DEAD CODE ─────────────────────────────────────────────────
    dc = f["dead_code_total"]
    if dc >= 5:   score -= 14
    elif dc >= 3: score -= 9
    elif dc >= 1: score -= 4
    if f["unused_import_count"] >= 2:    score -= 6
    elif f["unused_import_count"] >= 1:  score -= 3
    if f["pass_only_func_count"] >= 2:   score -= 5
    elif f["pass_only_func_count"] >= 1: score -= 2
    # NEW: dead code ratios
    if f["unused_import_ratio"]  > 0.4: score -= 5
    if f["commented_code_ratio"] > 0.05: score -= 5

    # ── TEMPLATES ────────────────────────────────────────────────
    ts = f["template_score"]
    if ts >= 6:    score += 5
    elif ts >= 3:  score += 8
    elif ts >= 1:  score += 3
    if f["template_count"] >= 5:   score += 8
    elif f["template_count"] >= 3: score += 4
    if f["template_pattern_diversity"] >= 5: score += 5

    # ── ALGORITHM OPTIMALITY ─────────────────────────────────────
    ineff = f["inefficiency_score"]
    if ineff >= 3:   score -= 12
    elif ineff >= 1: score -= 6
    opt = f["optimal_pattern_score"]
    if opt >= 5:   score += 8
    elif opt >= 2: score += 4
    # NEW: idiom usage
    if f["idiomatic_pattern_count"] > 8: score += 5
    elif f["idiomatic_pattern_count"] > 4: score += 2

    # ── CODE NATURALNESS ─────────────────────────────────────────
    # NEW: block size variance (low variance = AI)
    if f["block_length_variance"] < 2.0: score += 4
    elif f["block_length_variance"] > 15.0: score -= 4
    if f["function_size_variance"] < 20.0: score += 4
    elif f["function_size_variance"] > 100.0: score -= 4

    # ── LINE COUNT ────────────────────────────────────────────────
    if f["total_lines"]   > 80:  score += 6
    elif f["total_lines"] > 50:  score += 3
    elif f["total_lines"] < 10:  score -= 10

    # ── v8.0 NEW SCORING RULES ────────────────────────────────────

    # Operator distribution (low entropy = uniform = AI)
    if f["op_freq_entropy"] < 1.5:   score += 6
    elif f["op_freq_entropy"] < 2.0: score += 3
    # Explicit assignment style (AI prefers explicit; humans use +=)
    if f["explicit_assignment_ratio"]  > 0.6: score += 5
    if f["augmented_assignment_ratio"] > 0.6: score -= 5

    # Conditional depth (low variance = AI's shallow uniform nesting)
    if f["if_depth_variance"] < 0.5:  score += 5
    elif f["if_depth_variance"] > 2.0: score -= 4
    if f["avg_if_depth"] < 0.8:        score += 4   # very shallow = AI

    # Per-function shape diversity (low diversity = AI cloning the same pattern)
    if f["func_shape_diversity"] < 0.4:   score += 8
    elif f["func_shape_diversity"] < 0.6: score += 4
    if f["func_shape_entropy"] < 0.8:     score += 6
    elif f["func_shape_entropy"] < 1.2:   score += 3

    # Literal type distribution (high entropy = AI using balanced literal types)
    if f["literal_type_entropy"] > 1.5: score += 4

    # Redundant boolean returns (very specific AI pattern)
    if f["redundant_bool_return_count"] >= 2: score += 8
    elif f["redundant_bool_return_count"] >= 1: score += 4

    # Loop body complexity (low std = AI writes uniform loop bodies)
    if f["loop_body_length_std"] < 1.5:  score += 5
    elif f["loop_body_length_std"] > 5.0: score -= 4

    # Boolean expression complexity (high density = AI verbose conditions)
    if f["comparison_density"] > 3.0:   score += 5
    elif f["comparison_density"] > 1.5: score += 2

    # Whitespace rhythm (low variance = AI inserts blanks rhythmically)
    if f["blank_interval_variance"] < 4.0:   score += 5
    elif f["blank_interval_variance"] > 20.0: score -= 4

    # Token bigram repetition (high = AI reuses the same token patterns)
    if f["token_bigram_rep_score"] > 0.08: score += 6
    elif f["token_bigram_rep_score"] > 0.04: score += 3

    # Comment density gradient (low variance = AI distributes comments evenly)
    if f["comment_density_variance"] < 0.002: score += 5
    elif f["comment_density_variance"] > 0.02: score -= 4

    # Keyword ratio profile (low entropy = AI skewed to certain keywords)
    if f["keyword_distribution_entropy"] < 2.0: score += 4

    # Code stylometry fingerprint (low variance = AI = smooth style vector)
    if f["style_vector_variance"] < 0.005:  score += 3
    elif f["style_vector_variance"] < 0.015: score += 4
    elif f["style_vector_variance"] > 0.05:  score -= 6

    # Function signature diversity (low entropy = AI uses same param count)
    if f["func_sig_param_entropy"] < 0.5:  score += 5
    elif f["func_sig_param_entropy"] < 1.0: score += 2

    # Cross-function structural similarity (low entropy = AI template clones)
    if f["cross_func_shape_entropy"] < 0.5:   score += 8
    elif f["cross_func_shape_entropy"] < 1.0: score += 4
    elif f["cross_func_shape_entropy"] > 2.0: score -= 4

    # Function length skewness (near 0 = uniform = AI)
    if f["function_length_skewness"] < 0.3:   score += 6
    elif f["function_length_skewness"] > 1.0:  score -= 4

    # AI hallucination signals (redundant checks, print-in-except)
    if f["hallucination_signal_count"] >= 3: score += 7
    elif f["hallucination_signal_count"] >= 1: score += 3

    # Semantic token density (high density = AI code full of semantic boilerplate)
    if f["semantic_token_density"] > 0.3:   score += 8
    elif f["semantic_token_density"] > 0.15: score += 4

    # ── v9.0 NEW SCORING RULES ────────────────────────────────────

    # AST subtree duplication (high = AI clones structural templates)
    if f["ast_subtree_dup_ratio"] > 0.55:   score += 10
    elif f["ast_subtree_dup_ratio"] > 0.40: score += 6
    elif f["ast_subtree_dup_ratio"] > 0.25: score += 3

    # Identifier root entropy (low = AI clusters names under one root)
    if f["identifier_root_entropy"] < 1.5:   score += 8
    elif f["identifier_root_entropy"] < 2.5: score += 4
    elif f["identifier_root_entropy"] > 4.0: score -= 4
    if f["identifier_root_top_ratio"] > 0.4: score += 5
    elif f["identifier_root_top_ratio"] > 0.25: score += 2

    # AST path entropy (low = AI repeats same structural path)
    if f["ast_path_entropy"] < 2.0:   score += 8
    elif f["ast_path_entropy"] < 3.0: score += 4
    elif f["ast_path_entropy"] > 5.0: score -= 5

    # Identifier reuse distance (short = AI reuses variables tightly)
    if f["identifier_reuse_distance"] < 8:    score += 7
    elif f["identifier_reuse_distance"] < 15: score += 3
    elif f["identifier_reuse_distance"] > 40: score -= 5

    # Control flow uniformity (low std = AI has very regular branch counts per function)
    if f["cf_uniformity_std"] < 1.0:   score += 6
    elif f["cf_uniformity_std"] < 2.0: score += 3
    elif f["cf_uniformity_std"] > 4.0: score -= 4
    # Moderate branch/function ratio is typical of AI (neither too dense nor 0)
    cfu = f["cf_uniformity_ratio"]
    if 2.0 < cfu < 6.0: score += 4

    # scale down accumulated heuristic score
    score = score / 5

    import math
    prob = 1 / (1 + math.exp(-(score - 30) / 7))

    return round(prob * 100, 2)


def _label_and_confidence(ai_score: float, total_lines: int) -> tuple:
    if total_lines < 10:
        return "Highly Likely Human-Written", "N/A"
    if total_lines < 15:
        if ai_score >= 65:    return "Likely AI-Generated",          "Low"
        elif ai_score >= 55:  return "Likely AI-Assisted (Hybrid)",  "Low"
        else:                 return "Likely Human-Written",          "Low"
    if ai_score   >= 81: return "Highly Likely AI-Generated",    "Very High"
    elif ai_score >= 67: return "Likely AI-Generated",           "High"
    elif ai_score >= 53: return "Likely AI-Assisted (Hybrid)",   "Moderate"
    elif ai_score >= 41: return "Possibly Human with AI Touches","Moderate"
    elif ai_score >= 30: return "Likely Human-Written",          "Moderate"
    else:                return "Highly Likely Human-Written",   "High"


def _score_bar(score: float, width: int = 30) -> str:
    filled = int(score / 100 * width)
    char   = "█" if score >= 67 else ("▓" if score >= 38 else "░")
    return f"[{char * filled}{'·' * (width - filled)}] {score:.0f}%"


# ════════════════════════════════════════════════════════════════
#  PUBLIC API
# ════════════════════════════════════════════════════════════════

def analyze_code_ai_likelihood(code: str) -> dict:
    """
    Analyze code for AI vs Human likelihood.
    Fast: no ML models. Single AST parse. Handles up to 5000 lines fully.
    v10.0: 214+ features, unified single-parse AST, optimised sampling.
    """
    code = normalize_input(code)
    if not code or len(code.strip()) < 10:
        return {
            "label": "Insufficient Code", "emoji": "⚠️", "ai_probability": 0,
            "human_probability": 100, "confidence": "N/A", "confidence_emoji": "❓",
            "language": "unknown", "language_emoji": "❓", "score_bar": _score_bar(0),
            "is_code": False, "not_code_reason": "Input is empty or too short",
            "low_line_warning": None, "lines_of_code": 0,
            "ai_signal_count": 0, "human_signal_count": 0,
            "feature_breakdown": {}, "raw_features": {},
        }

    code_check, reason = is_code(code)
    if not code_check:
        return {
            "label": "Not Code", "emoji": "❌", "ai_probability": 0,
            "human_probability": 100, "confidence": "N/A", "confidence_emoji": "❓",
            "language": "unknown", "language_emoji": "❓", "score_bar": _score_bar(0),
            "is_code": False, "not_code_reason": reason, "low_line_warning": None,
            "lines_of_code": 0, "ai_signal_count": 0, "human_signal_count": 0,
            "feature_breakdown": {}, "raw_features": {},
        }

    # ── Sampling strategy ─────────────────────────────────────────
    # ≤ 5000 lines : full analysis — NO sampling, NO truncation
    # > 5000 lines : stratified 8-zone sample (~200 lines/zone ≈ 1600 lines)
    #                zones are evenly spaced across the full file
    FULL_LIMIT = 5000
    ZONE_SIZE  = 200
    N_ZONES    = 8

    all_lines           = code.split("\n")
    original_line_count = len(all_lines)
    sampled             = False

    if original_line_count > FULL_LIMIT:
        sampled = True
        n = original_line_count
        # Compute N_ZONES evenly-spaced start positions across the FULL file
        zone_starts = [
            int(i * (n - ZONE_SIZE) / max(N_ZONES - 1, 1))
            for i in range(N_ZONES)
        ]
        seen: dict = {}
        for z_start in zone_starts:
            for offset, line in enumerate(all_lines[z_start: z_start + ZONE_SIZE]):
                idx = z_start + offset
                if idx not in seen:
                    seen[idx] = line
        lines = [seen[k] for k in sorted(seen)]
        code  = "\n".join(lines)
    else:
        lines = all_lines

    language   = detect_language(code)
    lang_emoji = _LANG_EMOJI.get(language, "❓")

    f           = _extract_features(code, lines)
    total_lines = f["total_lines"]

    if total_lines < 10:
        return {
            "label": "Highly Likely Human-Written",
            "emoji": VERDICT_EMOJI["Highly Likely Human-Written"],
            "ai_probability": 5.0, "human_probability": 95.0,
            "score_bar": _score_bar(5), "confidence": "N/A", "confidence_emoji": "❓",
            "language": language, "language_emoji": lang_emoji,
            "is_code": True, "not_code_reason": None, "lines_of_code": total_lines,
            "low_line_warning": f"⚠️  Only {total_lines} lines. Under 10 → classified as Human.",
            "ai_signal_count": 0, "human_signal_count": 0,
            "feature_breakdown": {}, "raw_features": {},
        }

    ai_score    = round(_compute_ai_score(f), 2)
    human_score = round(100 - ai_score, 2)
    label, confidence = _label_and_confidence(ai_score, total_lines)

    low_line_warning = None
    if total_lines < 15:
        low_line_warning = f"⚠️  Only {total_lines} lines — low confidence."

    def _sig(cond_ai, cond_hum=None):
        if cond_ai: return "AI"
        if cond_hum is not None and cond_hum: return "Human"
        return "Neutral"

    def _row(sig, value):
        return {"value": value, "signal": sig,
                "tick": TICK if sig == "AI" else (CROSS if sig == "Human" else "➖"),
                "emoji": SIGNAL_EMOJI[sig]}

    bd = {
        # ── Original breakdown entries ────────────────────────────
        "📝 Comment Density":            _row(_sig(f['comment_density'] > 0.20, f['comment_density'] < 0.05), f"{f['comment_density']*100:.1f}%"),
        "📝 Verbose Comments":           _row(_sig(f['verbose_comment_count'] >= 2),     f['verbose_comment_count']),
        "📝 Obvious/Redundant Comments": _row(_sig(f['obvious_comment_count'] >= 2),     f['obvious_comment_count']),
        "📝 Section Banners":            _row(_sig(f['section_banner_count'] >= 1),      f['section_banner_count']),
        "📝 Structured Docstrings":      _row(_sig(f['structured_docstrings'] >= 3),     f['structured_docstrings']),
        "📝 Step-Style Comments":        _row(_sig(f['step_style_comments'] >= 2),       f['step_style_comments']),
        "📝 TODO / FIXME Count":         _row(_sig(False, f['todo_fixme_count'] >= 2),   f['todo_fixme_count']),
        "💬 GPT-Style Comment Score":    _row(_sig(f['gpt_style_comment_score'] >= 3),   f['gpt_style_comment_score']),
        "💬 Triple-Section Docstring":   _row(_sig(f['triple_section_docstring']),       str(f['triple_section_docstring'])),
        "💬 Step Pattern Count":         _row(_sig(f['step_pattern_count'] >= 2),        f['step_pattern_count']),
        "💬 Func Desc Comments":         _row(_sig(f['function_desc_comment_count'] >= 2), f['function_desc_comment_count']),
        "💬 Comment Action Verb Ratio":  _row(_sig(f['comment_action_verb_ratio'] > 0.3), f"{f['comment_action_verb_ratio']*100:.0f}%"),
        "💬 Comment Redundancy Score":   _row(_sig(f['comment_redundancy_score'] > 0.25), f"{f['comment_redundancy_score']:.3f}"),
        "💬 Emoji Comment Count":        _row(_sig(f['emoji_comment_count'] >= 2), f['emoji_comment_count']),
        "🏷️ Long Variable Ratio":        _row(_sig(f['long_var_ratio'] > 0.15, f['long_var_ratio'] < 0.05), f"{f['long_var_ratio']*100:.1f}%"),
        "🏷️ Short Variable Ratio":       _row(_sig(False, f['short_var_ratio'] > 0.35), f"{f['short_var_ratio']*100:.1f}%"),
        "🏷️ Avg Variable Name Len":      _row(_sig(f['avg_var_name_len'] > 9, f['avg_var_name_len'] < 4), f"{f['avg_var_name_len']:.1f} chars"),
        "🏷️ Descriptive Prefix Names":   _row(_sig(f['descriptive_prefix_count'] >= 3), f['descriptive_prefix_count']),
        "🏷️ Hasty Aliases":              _row(_sig(False, f['hasty_alias_count'] > 4),  f['hasty_alias_count']),
        "🏷️ Trial Names (_v2/_new)":     _row(_sig(False, f['trial_name_count'] >= 2),  f['trial_name_count']),
        "🏷️ Naming Style":               {"value": f['naming_style'], "signal": "Neutral", "tick": "➖", "emoji": "➖"},
        "🏷️ Naming Consistency Score":   _row(_sig(f['naming_style_consistency_score'] > 0.88), f"{f['naming_style_consistency_score']*100:.0f}%"),
        "🏷️ Identifier Similarity":      _row(_sig(f['identifier_similarity_score'] > 0.4), f"{f['identifier_similarity_score']:.3f}"),
        "🏷️ Prefix Cluster Count":       _row(_sig(f['prefix_cluster_count'] >= 4),    f['prefix_cluster_count']),
        "🏷️ Very Long Identifier Ratio": _row(_sig(f['very_long_identifier_ratio'] > 0.10), f"{f['very_long_identifier_ratio']*100:.1f}%"),
        "🏷️ Var Length Std Dev":         _row(_sig(f['var_length_std'] < 2.5, f['var_length_std'] > 5.0), f"{f['var_length_std']:.2f}"),
        "🔷 Type Annotations":           _row(_sig(f['type_annotation_count'] >= 5),    f['type_annotation_count']),
        "🔷 Arg Annotation Ratio":       _row(_sig(f['arg_annotation_ratio'] > 0.6),    f"{f['arg_annotation_ratio']*100:.0f}%"),
        "🔷 Return Annotations":         _row(_sig(f['return_annotation_count'] >= 3),  f['return_annotation_count']),
        "📐 Consistent Indentation":     _row(_sig(f['consistent_indentation']),        str(f['consistent_indentation'])),
        "📐 Line Uniformity":            _row(_sig(f['line_uniformity_ratio'] > 0.75, f['line_uniformity_ratio'] < 0.45), f"{f['line_uniformity_ratio']*100:.1f}%"),
        "📐 Line Length Std Dev":        _row(_sig(f['line_length_std'] < 10, f['line_length_std'] > 35), f"{f['line_length_std']:.1f}"),
        "📐 Burstiness":                 _row(_sig(f['burstiness'] < 0.30, f['burstiness'] > 0.55), f"{f['burstiness']:.3f}"),
        "📐 Quote Consistency":          _row(_sig(f['quote_consistency'] > 0.95),      f"{f['quote_consistency']*100:.0f}%"),
        "📐 Trailing Whitespace":        _row(_sig(False, f['trailing_ws_ratio'] > 0.10), f"{f['trailing_ws_ratio']*100:.1f}%"),
        "📐 Indentation Variance":       _row(_sig(f['indentation_variance'] < 4.0, f['indentation_variance'] > 20.0), f"{f['indentation_variance']:.2f}"),
        "📐 Blank Line Consistency":     _row(_sig(f['blank_line_consistency'] > 0.8),  f"{f['blank_line_consistency']:.3f}"),
        "🤖 Boilerplate Keywords":       _row(_sig(f['boilerplate_keyword_hits'] >= 5), f['boilerplate_keyword_hits']),
        "🤖 Perfect Error Handling":     _row(_sig(f['perfect_error_handling']),        str(f['perfect_error_handling'])),
        "🤖 Balanced If/Else":           _row(_sig(f['balanced_branches']),             str(f['balanced_branches'])),
        "🤖 f-string Usage":             _row(_sig(f['fstring_count'] > 3),             f['fstring_count']),
        "🤖 List Comprehensions":        _row(_sig(f['list_comp_count'] > 3),           f['list_comp_count']),
        "🤖 Dunder Methods":             _row(_sig(f['dunder_usage_count'] > 5),        f['dunder_usage_count']),
        "🤖 Defensive Programming":      _row(_sig(f['defensive_programming_density'] >= 3), f['defensive_programming_density']),
        "🤖 LLM Signature Patterns":     _row(_sig(f['llm_signature_pattern_count'] >= 1), f['llm_signature_pattern_count']),
        "🤖 Pipeline Pattern Score":     _row(_sig(f['pipeline_pattern_score'] >= 2),  f['pipeline_pattern_score']),
        "🤖 Function Structure Consist.":_row(_sig(f['function_structure_consistency'] > 0.5), f"{f['function_structure_consistency']:.3f}"),
        "🤖 Branch Return Density":      _row(_sig(f['branch_return_density'] > 0.8),  f"{f['branch_return_density']:.3f}"),
        "🤖 Bool Return Pattern":        _row(_sig(f['bool_return_pattern_count'] >= 2), f['bool_return_pattern_count']),
        "🤖 Control Flow Balance":       _row(_sig(f['control_flow_balance_score'] > 0.6), f"{f['control_flow_balance_score']:.3f}"),
        "🤖 Verb Prefix Ratio":          _row(_sig(f['verb_prefix_ratio'] > 0.65),     f"{f['verb_prefix_ratio']*100:.0f}%"),
        "🤖 Exception Specificity":      _row(_sig(f['exception_specificity_score'] > 0.5), f"{f['exception_specificity_score']:.3f}"),
        "🤖 Error Msg Detail (tokens)":  _row(_sig(f['error_msg_token_avg'] > 8.0),    f"{f['error_msg_token_avg']:.1f}"),
        "🤖 Branch Symmetry Score":      _row(_sig(f['branch_symmetry_score'] > 0.4),  f"{f['branch_symmetry_score']:.3f}"),
        "🧑 Debug Trace Count":          _row(_sig(False, f['debug_trace_count'] >= 2),        f['debug_trace_count']),
        "🧑 Commented-Out Code":         _row(_sig(False, f['commented_out_code_lines'] >= 2), f['commented_out_code_lines']),
        "🧑 Magic Numbers":              _row(_sig(False, f['magic_number_count'] > 5),         f['magic_number_count']),
        "🧑 Typo Indicators":            _row(_sig(False, f['typo_indicator_count'] > 0),       f['typo_indicator_count']),
        "🧑 Versioned Identifiers":      _row(_sig(False, f['versioned_identifier_count'] >= 2), f['versioned_identifier_count']),
        "🧑 TODO Density":               _row(_sig(False, f['todo_density'] > 0.02),    f"{f['todo_density']:.4f}"),
        "🧑 Rename Chain Count":         _row(_sig(False, f['rename_chain_count'] >= 2), f['rename_chain_count']),
        "🧑 Temp Variable Ratio":        _row(_sig(False, f['temporary_variable_ratio'] > 0.04), f"{f['temporary_variable_ratio']*100:.1f}%"),
        "📊 Shannon Entropy":            _row(_sig(f['entropy_score'] < 3.8, f['entropy_score'] > 4.7), f"{f['entropy_score']:.3f}"),
        "📊 Compression Ratio":          _row(_sig(f['compression_ratio'] < 0.50, f['compression_ratio'] > 0.75), f"{f['compression_ratio']:.3f}"),
        "📊 Lexical Diversity":          _row(_sig(f['lexical_diversity'] > 0.75, f['lexical_diversity'] < 0.55), f"{f['lexical_diversity']:.3f}"),
        "📊 Token Entropy":              _row(_sig(f['token_entropy'] < 3.5, f['token_entropy'] > 5.0), f"{f['token_entropy']:.3f}"),
        "📊 Identifier Entropy":         _row(_sig(f['identifier_entropy'] < 3.0, f['identifier_entropy'] > 4.5), f"{f['identifier_entropy']:.3f}"),
        "📊 Operator Entropy":           _row(_sig(f['operator_entropy'] < 1.5),        f"{f['operator_entropy']:.3f}"),
        "📊 Duplicate Line Ratio":       _row(_sig(f['duplicate_line_ratio'] > 0.06, f['duplicate_line_ratio'] < 0.01), f"{f['duplicate_line_ratio']*100:.1f}%"),
        "📊 Repeated Code Blocks":       _row(_sig(f['repeated_code_blocks'] >= 3),     f['repeated_code_blocks']),
        "🔬 All Functions Documented":   _row(_sig(f['all_functions_documented']),      str(f['all_functions_documented'])),
        "🔬 Assertions Used":            _row(_sig(f['assertion_count'] >= 3),          f['assertion_count']),
        "🔬 Raise Statements":           _row(_sig(f['raise_statement_count'] >= 2),    f['raise_statement_count']),
        "🔬 Comprehensions":             _row(_sig(f['comprehension_count'] > 4),       f['comprehension_count']),
        "🔬 AST Tree Depth":             _row(_sig(f['ast_tree_depth'] > 8),            f['ast_tree_depth']),
        "🔬 AST Branching Factor":       _row(_sig(f['ast_branching_factor'] > 3.0),   f"{f['ast_branching_factor']:.2f}"),
        "🔬 AST Node Type Entropy":      _row(_sig(f['ast_node_type_entropy'] < 2.0),  f"{f['ast_node_type_entropy']:.3f}"),
        "🔬 Avg Function Complexity":    _row(_sig(2.0 < f['avg_function_complexity'] < 6.0), f"{f['avg_function_complexity']:.2f}"),
        "🔬 Complexity Variance":        _row(_sig(f['complexity_variance'] < 2.0, f['complexity_variance'] > 10.0), f"{f['complexity_variance']:.2f}"),
        "🔁 AI Loop Patterns":           _row(_sig(f['canonical_ai_loop_count'] >= 2, f['natural_human_loop_count'] >= 3), f['canonical_ai_loop_count']),
        "🔁 Human Loop Patterns":        _row(_sig(False, f['natural_human_loop_count'] >= 3), f['natural_human_loop_count']),
        "🔁 Range/Len Loop Count":       _row(_sig(f['range_len_loop_count'] >= 2),    f['range_len_loop_count']),
        "🔁 Enumerate Loop Count":       _row(_sig(f['enumerate_loop_count'] >= 2),    f['enumerate_loop_count']),
        "🔁 Loop Style Entropy":         _row(_sig(f['loop_style_entropy'] < 0.5, f['loop_style_entropy'] > 1.5), f"{f['loop_style_entropy']:.3f}"),
        "🎨 Style Entropy":              _row(_sig(f['style_entropy_score'] < 0.5, f['style_entropy_score'] > 2.0), f"{f['style_entropy_score']:.3f}"),
        "🎨 Indentation Entropy":        _row(_sig(f['indentation_entropy'] < 0.5, f['indentation_entropy'] > 2.0), f"{f['indentation_entropy']:.3f}"),
        "🎨 Structure Pattern Entropy":  _row(_sig(f['structure_pattern_entropy'] < 1.0, f['structure_pattern_entropy'] > 2.5), f"{f['structure_pattern_entropy']:.3f}"),
        "🎨 Pattern Repetition Index":   _row(_sig(f['pattern_repetition_index'] > 0.12), f"{f['pattern_repetition_index']:.3f}"),
        "🎨 Block Length Variance":      _row(_sig(f['block_length_variance'] < 2.0, f['block_length_variance'] > 15.0), f"{f['block_length_variance']:.2f}"),
        "🎨 Native Construct Ratio":     _row(_sig(f['native_construct_ratio'] > 0.15), f"{f['native_construct_ratio']:.3f}"),
        "💀 Dead Code Total":            _row(_sig(False, f['dead_code_total'] >= 3),      f['dead_code_total']),
        "💀 Unused Imports":             _row(_sig(False, f['unused_import_count'] >= 1),  f['unused_import_count']),
        "💀 Pass-Only Functions":        _row(_sig(False, f['pass_only_func_count'] >= 1), f['pass_only_func_count']),
        "💀 Unused Import Ratio":        _row(_sig(False, f['unused_import_ratio'] > 0.3), f"{f['unused_import_ratio']*100:.0f}%"),
        "💀 Commented Code Ratio":       _row(_sig(False, f['commented_code_ratio'] > 0.04), f"{f['commented_code_ratio']*100:.1f}%"),
        "🏗️ Template Score":             _row(_sig(f['template_score'] >= 4),            f['template_score']),
        "🏗️ Template Patterns Found":    _row(_sig(f['template_count'] >= 3),            f['template_count']),
        "🏗️ Template Density":           _row(_sig(f['template_pattern_density'] > 0.03), f"{f['template_pattern_density']:.4f}"),
        "🏗️ Template Diversity":         _row(_sig(f['template_pattern_diversity'] >= 4), f['template_pattern_diversity']),
        "⏱️ Inefficiency Score (O(n²))": _row(_sig(False, f['inefficiency_score'] >= 2), f['inefficiency_score']),
        "⏱️ Optimal Pattern Score":      _row(_sig(f['optimal_pattern_score'] >= 3),     f['optimal_pattern_score']),
        "⏱️ Nested Loops":               _row(_sig(False, f['nested_loop_count'] >= 2),  f['nested_loop_count']),
        "⏱️ Round Number Ratio":         _row(_sig(f['round_number_ratio'] > 0.7),       f"{f['round_number_ratio']*100:.0f}%"),

        # ── v8.0 breakdown entries ────────────────────────────────
        "🔣 Op Freq Entropy":            _row(_sig(f['op_freq_entropy'] < 1.5, f['op_freq_entropy'] > 3.0), f"{f['op_freq_entropy']:.3f}"),
        "🔣 Explicit Assignment Ratio":  _row(_sig(f['explicit_assignment_ratio'] > 0.6), f"{f['explicit_assignment_ratio']*100:.0f}%"),
        "🔣 Augmented Assign Ratio":     _row(_sig(False, f['augmented_assignment_ratio'] > 0.6), f"{f['augmented_assignment_ratio']*100:.0f}%"),
        "🔣 Comparison Density":         _row(_sig(f['comparison_density'] > 2.5),       f"{f['comparison_density']:.2f}"),
        "🌊 Avg If Depth":               _row(_sig(f['avg_if_depth'] < 0.8, f['avg_if_depth'] > 2.0), f"{f['avg_if_depth']:.2f}"),
        "🌊 If Depth Variance":          _row(_sig(f['if_depth_variance'] < 0.5, f['if_depth_variance'] > 2.0), f"{f['if_depth_variance']:.3f}"),
        "🌊 Func Shape Diversity":       _row(_sig(f['func_shape_diversity'] < 0.4, f['func_shape_diversity'] > 0.85), f"{f['func_shape_diversity']:.3f}"),
        "🌊 Func Shape Entropy":         _row(_sig(f['func_shape_entropy'] < 0.8, f['func_shape_entropy'] > 2.0), f"{f['func_shape_entropy']:.3f}"),
        "🌊 Cross-Func Shape Entropy":   _row(_sig(f['cross_func_shape_entropy'] < 0.5, f['cross_func_shape_entropy'] > 2.0), f"{f['cross_func_shape_entropy']:.3f}"),
        "🌊 Func Sig Param Entropy":     _row(_sig(f['func_sig_param_entropy'] < 0.5),   f"{f['func_sig_param_entropy']:.3f}"),
        "🌊 Func Length Skewness":       _row(_sig(f['function_length_skewness'] < 0.3, f['function_length_skewness'] > 1.0), f"{f['function_length_skewness']:.3f}"),
        "🔢 Literal Type Entropy":       _row(_sig(f['literal_type_entropy'] > 1.5),     f"{f['literal_type_entropy']:.3f}"),
        "🔢 Redundant Bool Returns":     _row(_sig(f['redundant_bool_return_count'] >= 1), f['redundant_bool_return_count']),
        "🔢 Loop Body Length Std":       _row(_sig(f['loop_body_length_std'] < 1.5, f['loop_body_length_std'] > 5.0), f"{f['loop_body_length_std']:.2f}"),
        "🔢 Blank Interval Variance":    _row(_sig(f['blank_interval_variance'] < 4.0, f['blank_interval_variance'] > 20.0), f"{f['blank_interval_variance']:.2f}"),
        "🔢 Token Bigram Rep Score":     _row(_sig(f['token_bigram_rep_score'] > 0.06),  f"{f['token_bigram_rep_score']:.4f}"),
        "🔢 Comment Density Variance":   _row(_sig(f['comment_density_variance'] < 0.002, f['comment_density_variance'] > 0.02), f"{f['comment_density_variance']:.5f}"),
        "🔢 Keyword Dist Entropy":       _row(_sig(f['keyword_distribution_entropy'] < 2.0), f"{f['keyword_distribution_entropy']:.3f}"),
        "🔢 Style Vector Variance":      _row(_sig(f['style_vector_variance'] < 0.005, f['style_vector_variance'] > 0.05), f"{f['style_vector_variance']:.5f}"),
        "🤖 Hallucination Signals":      _row(_sig(f['hallucination_signal_count'] >= 2), f['hallucination_signal_count']),
        "🤖 Semantic Token Density":     _row(_sig(f['semantic_token_density'] > 0.2),   f"{f['semantic_token_density']:.3f}"),

        # ── v9.0 breakdown entries ────────────────────────────────
        "🧬 AST Subtree Dup Ratio":      _row(_sig(f['ast_subtree_dup_ratio'] > 0.40, f['ast_subtree_dup_ratio'] < 0.15), f"{f['ast_subtree_dup_ratio']:.4f}"),
        "🧬 Identifier Root Entropy":    _row(_sig(f['identifier_root_entropy'] < 1.5, f['identifier_root_entropy'] > 4.0), f"{f['identifier_root_entropy']:.3f}"),
        "🧬 Top Root Concentration":     _row(_sig(f['identifier_root_top_ratio'] > 0.35), f"{f['identifier_root_top_ratio']*100:.0f}%"),
        "🧬 AST Path Entropy":           _row(_sig(f['ast_path_entropy'] < 2.0, f['ast_path_entropy'] > 5.0), f"{f['ast_path_entropy']:.3f}"),
        "🧬 Identifier Reuse Distance":  _row(_sig(f['identifier_reuse_distance'] < 8, f['identifier_reuse_distance'] > 40), f"{f['identifier_reuse_distance']:.1f}"),
        "🧬 CF Uniformity (branch/fn)":  _row(_sig(2.0 < f['cf_uniformity_ratio'] < 6.0), f"{f['cf_uniformity_ratio']:.2f}"),
        "🧬 CF Uniformity Std Dev":      _row(_sig(f['cf_uniformity_std'] < 1.0, f['cf_uniformity_std'] > 4.0), f"{f['cf_uniformity_std']:.2f}"),
    }

    ai_sigs  = sum(1 for v in bd.values() if v["signal"] == "AI")
    hum_sigs = sum(1 for v in bd.values() if v["signal"] == "Human")

    return {
        "label": label, "emoji": VERDICT_EMOJI.get(label, "❓"),
        "ai_probability": ai_score, "human_probability": human_score,
        "score_bar": _score_bar(ai_score),
        "confidence": confidence, "confidence_emoji": CONFIDENCE_EMOJI.get(confidence, "❓"),
        "language": language, "language_emoji": lang_emoji,
        "is_code": True, "not_code_reason": None,
        "lines_of_code": total_lines,
        "original_line_count": original_line_count,
        "sampled": sampled,
        "sampling_note": (
            f"Stratified 8-zone sample (~200 lines/zone) from "
            f"{original_line_count} total lines" if sampled else None
        ),
        "low_line_warning": low_line_warning,
        "ai_signal_count": ai_sigs, "human_signal_count": hum_sigs,
        "feature_breakdown": bd, "raw_features": f,
    }


# ════════════════════════════════════════════════════════════════
#  FAST PLAGIARISM COMPARISON (unchanged from v6.2)
# ════════════════════════════════════════════════════════════════

def _strip_comments(code: str) -> str:
    code = re.sub(r"#.*",       "", code)
    code = re.sub(r"//.*",      "", code)
    code = re.sub(r"/\*.*?\*/", "", code, flags=re.DOTALL)
    return code.lower().strip()

def _token_set(code: str) -> set:
    return set(re.findall(r'\b\w+\b', _strip_comments(code)))

def _line_set(code: str) -> set:
    return {l.strip() for l in _strip_comments(code).split("\n") if len(l.strip()) > 4}

def _kgram_set(code: str, k: int = 5) -> set:
    tokens = re.findall(r'\b\w+\b', _strip_comments(code))
    if len(tokens) < k: return set()
    grams  = [tuple(tokens[i:i+k]) for i in range(len(tokens) - k + 1)]
    hashes = [hash(g) for g in grams]
    window = 4
    if len(hashes) < window: return set(hashes)
    return {min(hashes[i:i+window]) for i in range(len(hashes) - window + 1)}

def _normalize_ids(code: str) -> str:
    mapping = {}; counter = [0]
    def rep(m):
        t = m.group(0)
        if t.lower() in COMMON_KEYWORDS: return t
        if t not in mapping:
            mapping[t] = f"V{counter[0]}"; counter[0] += 1
        return mapping[t]
    return re.sub(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', rep, _strip_comments(code))

def compare_documents_content(content1: str, content2: str) -> dict:
    ok1, r1 = is_code(content1)
    ok2, r2 = is_code(content2)
    if not ok1 and not ok2:
        return {"error": f"{CROSS} Neither input is code.", "reason1": r1, "reason2": r2}
    if not ok1:
        return {"error": f"{CROSS} Document 1 is not code.", "reason": r1}
    if not ok2:
        return {"error": f"{CROSS} Document 2 is not code.", "reason": r2}

    t1, t2    = _token_set(content1), _token_set(content2)
    token_sim = round(len(t1 & t2) / max(len(t1 | t2), 1) * 100, 2)

    l1, l2   = _line_set(content1), _line_set(content2)
    line_sim = round(len(l1 & l2) / max(max(len(l1), len(l2)), 1) * 100, 2)

    k1, k2    = _kgram_set(content1), _kgram_set(content2)
    ngram_sim = round(len(k1 & k2) / max(len(k1 | k2), 1) * 100, 2) if k1 and k2 else 0.0

    n1, n2 = _normalize_ids(content1), _normalize_ids(content2)
    nt1    = set(re.findall(r'\b\w+\b', n1))
    nt2    = set(re.findall(r'\b\w+\b', n2))
    id_sim = round(len(nt1 & nt2) / max(len(nt1 | nt2), 1) * 100, 2)

    def _ast_bag(code):
        try: return Counter(type(n).__name__ for n in ast.walk(ast.parse(code)))
        except: return Counter()
    b1, b2  = _ast_bag(content1), _ast_bag(content2)
    all_k   = set(b1) | set(b2)
    ast_sim = round(
        sum(min(b1.get(k, 0), b2.get(k, 0)) for k in all_k) /
        max(sum(max(b1.get(k, 0), b2.get(k, 0)) for k in all_k), 1) * 100, 2
    ) if all_k else 0.0

    cf1      = sum(len(re.findall(p, content1)) for p in [r'\bif\b', r'\bfor\b', r'\bwhile\b', r'\btry\b'])
    cf2      = sum(len(re.findall(p, content2)) for p in [r'\bif\b', r'\bfor\b', r'\bwhile\b', r'\btry\b'])
    flow_sim = round(max(0, 100 - abs(cf1 - cf2) * 5), 2)

    final = round(
        0.20 * token_sim + 0.15 * line_sim + 0.25 * ngram_sim +
        0.20 * id_sim    + 0.15 * ast_sim  + 0.05 * flow_sim, 2)

    def _sev(s): return "High   🔴" if s >= 80 else "Medium 🟡" if s >= 50 else "Low    🟢"

    return {
        "final_similarity": final,
        "severity": _sev(final),
        "verdict": ("🔴 High plagiarism risk" if final >= 80
                    else "🟡 Moderate similarity" if final >= 50
                    else "🟢 Low similarity"),
        "factor_breakdown": {
            "token_similarity":       f"{token_sim:.1f}%",
            "line_similarity":        f"{line_sim:.1f}%",
            "ngram_fingerprint_sim":  f"{ngram_sim:.1f}%",
            "identifier_renamed_sim": f"{id_sim:.1f}%",
            "ast_node_bag_sim":       f"{ast_sim:.1f}%",
            "control_flow_sim":       f"{flow_sim:.1f}%",
        },
        "formula_used": "6-factor fast v7.0",
    }


# ════════════════════════════════════════════════════════════════
#  SINGLETON
# ════════════════════════════════════════════════════════════════

import threading as _threading

_detector      = None
_detector_lock = _threading.Lock()


class _HeuristicDetector:
    def detect(self, text: str) -> dict:
        return analyze_code_ai_likelihood(text)


def get_detector():
    global _detector
    with _detector_lock:
        if _detector is None:
            print("⏳ Initializing AI detector (heuristics only, no models)…")
            _detector = _HeuristicDetector()
            print("✅ AI detector ready (v10.0 — 214+ features, single-parse AST, 5000-line full analysis).")
    return _detector


def ai_likelihood_score(text: str) -> dict:
    """Entry point for views.py ai_check endpoint."""
    return analyze_code_ai_likelihood(text)


# ════════════════════════════════════════════════════════════════
#  PRETTY PRINT
# ════════════════════════════════════════════════════════════════

def print_report(result: dict) -> None:
    SEP = "═" * 65
    if not result.get("is_code", True):
        print(f"\n{SEP}\n  {result['emoji']}  {result['label']}\n{SEP}")
        print(f"  ℹ️  Reason : {result['not_code_reason']}\n{SEP}\n")
        return
    ai_p    = result["ai_probability"]
    sampled = result.get("sampled", False)
    s_note  = result.get("sampling_note")
    warning = result.get("low_line_warning")
    print(f"\n{SEP}\n  {result['emoji']}  VERDICT : {result['label']}\n{SEP}")
    if s_note:  print(f"  ⚡ {s_note}\n  {'─'*63}")
    if warning: print(f"  {warning}\n  {'─'*63}")
    print(f"  🤖 AI Probability    : {result['score_bar']}")
    print(f"  🧑 Human Probability : {100 - ai_p:.0f}%")
    print(f"  {result['confidence_emoji']} Confidence       : {result['confidence']}")
    print(f"  {result['language_emoji']} Language         : {result['language'].upper()}")
    loc  = result["lines_of_code"]
    orig = result.get("original_line_count", loc)
    if sampled: print(f"  📏 Lines Analyzed    : {loc} (sampled from {orig} total)")
    else:       print(f"  📏 Lines of Code     : {loc}")
    print(f"  🤖 AI Signals: {result['ai_signal_count']}   🧑 Human Signals: {result['human_signal_count']}")
    print(f"{SEP}")
    if not result.get("feature_breakdown"):
        print(f"\n  (No breakdown — insufficient lines)\n{SEP}\n"); return
    cats = {}
    for feat, data in result["feature_breakdown"].items():
        cat = feat.split(" ", 1)[0]; cats.setdefault(cat, []).append((feat, data))
    for cat, items in cats.items():
        non_neutral = [(f, d) for f, d in items if d["signal"] != "Neutral"]
        if not non_neutral: continue
        print(f"\n  {cat} Signals:")
        for feat, data in non_neutral:
            name = feat.split(" ", 1)[1] if " " in feat else feat
            print(f"    {data['tick']} [{data['signal']:6s}]  {name:<42s} {data['value']}")
    print(f"\n{SEP}\n")


def print_comparison_report(result: dict) -> None:
    SEP = "═" * 65
    if "error" in result:
        print(f"\n{SEP}\n  ❌  Comparison Failed\n{SEP}\n  {result['error']}")
        if "reason"  in result: print(f"  Reason : {result['reason']}")
        if "reason1" in result: print(f"  Doc1: {result['reason1']}  Doc2: {result['reason2']}")
        print(f"{SEP}\n"); return
    print(f"\n{SEP}\n  🔍  CODE SIMILARITY REPORT\n{SEP}")
    print(f"  📊 Final Score : {result['final_similarity']:.1f}%  ({result['severity']})")
    print(f"  {result['verdict']}")
    print(f"  📐 Formula     : {result['formula_used']}\n\n  Factor Breakdown:")
    for k, v in result["factor_breakdown"].items():
        print(f"    {BULLET} {k.replace('_', ' ').title():<35s} {v}")
    print(f"{SEP}\n")