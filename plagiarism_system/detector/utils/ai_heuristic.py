"""
UltimateAIDetector v5.0
=======================
ARCHITECTURE:
  Heuristics (primary) : varies by word count
  RF + TF-IDF          : varies by word count
  RoBERTa              : varies by word count
  GPT-2 perplexity     : varies by word count

ENSEMBLE WEIGHTS BY TEXT LENGTH:
  < 20 words  : BLOCKED — returns warning + human-like score, no confident prediction
  20-29 words : 95% heuristic + 2% RF + 2% RoBERTa + 1% GPT-2
  30-49 words : 90% heuristic + 5% RF + 3% RoBERTa + 2% GPT-2
  50-74 words : 80% heuristic + 10% RF + 5% RoBERTa + 5% GPT-2
  75-150 words: 70% heuristic + 20% RF + 5% RoBERTa + 5% GPT-2
  150-250 words: 60% heuristic + 30% RF + 5% RoBERTa + 5% GPT-2
  251-399 words: 50% heuristic + 40% RF + 5% RoBERTa + 5% GPT-2
  400-4999 words: 40% heuristic + 40% RF + 10% RoBERTa + 10% GPT-2
  5000+ words : sampled to 5000 words from distributed sections, then
                35% heuristic + 40% RF + 15% RoBERTa + 10% GPT-2

  Note: If a model is unavailable its weight redistributes to heuristics.
  Note: Texts > 5000 words are sampled evenly from beginning, middle sections,
        and end to preserve representativeness before analysis.

ACADEMIC HEURISTIC FIXES:
  1. Expanded transition words (per, yet, amidst, wherein, albeit, ergo ...)
  2. Fixed citation regex — catches (Author, 2005) & (Author et al., 2005)
  3. Wider stylometric thresholds for academic AI text
  4. academic_vocab_score — graduate-level AI vocabulary detector
  5. academic_structure_score — conclusion + references + citations = AI signal
  6. All v3.1 bug fixes

REPETITION EXCEPTIONS:
  Common function words (I, me, you, is, are, the, a, ...) are excluded from
  the repetition scorer so they never inflate the AI score.

FILES REQUIRED:
  model.pkl   — your trained Random Forest classifier
  tfidf.pkl   — your fitted TF-IDF vectorizer (or embedded Pipeline)

USAGE:
  detector = UltimateAIDetector(model_path='model.pkl', tfidf_path='tfidf.pkl')
  result   = detector.detect("your text here")
  print(result['ai_percentage'])

  results  = detector.detect_batch(["text1", "text2", ...])

  from ultimate_ai_detector_v50 import ai_likelihood_score
  result = ai_likelihood_score("text")
"""

import os
import re
import math
import string
import statistics
import warnings
warnings.filterwarnings("ignore")

import numpy as np
from collections import Counter

# ── optional heavy deps ────────────────────────────────────────────────────────
try:
    import joblib
    JOBLIB_AVAILABLE = True
except ImportError:
    JOBLIB_AVAILABLE = False

try:
    import torch
    from transformers import (AutoTokenizer, AutoModelForSequenceClassification,
                              GPT2LMHeadModel, GPT2TokenizerFast)
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

import nltk
from nltk.corpus import stopwords
from nltk import pos_tag, sent_tokenize, word_tokenize
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from nltk.stem import WordNetLemmatizer


# ── NLTK setup ─────────────────────────────────────────────────────────────────
def _safe_nltk_setup():
    resources = {
        'punkt':                          'tokenizers/punkt',
        'punkt_tab':                      'tokenizers/punkt_tab',
        'stopwords':                      'corpora/stopwords',
        'averaged_perceptron_tagger':     'taggers/averaged_perceptron_tagger',
        'averaged_perceptron_tagger_eng': 'taggers/averaged_perceptron_tagger_eng',
        'vader_lexicon':                  'sentiment/vader_lexicon',
        'wordnet':                        'corpora/wordnet',
    }
    for name, path in resources.items():
        try:
            nltk.data.find(path)
        except LookupError:
            try:
                nltk.download(name, quiet=True)
            except Exception:
                pass

_safe_nltk_setup()


# ── safe tokenisers ────────────────────────────────────────────────────────────
def _sent_tok(text):
    try:
        return sent_tokenize(text)
    except Exception:
        return re.split(r'(?<=[.!?])\s+', text)

def _word_tok(text):
    try:
        return word_tokenize(text)
    except Exception:
        return text.split()

def _pos_tag_safe(words):
    try:
        return pos_tag(words)
    except Exception:
        return [(w, 'NN') for w in words]


# ══════════════════════════════════════════════════════════════════════════════
#  SYNONYM GROUPS
# ══════════════════════════════════════════════════════════════════════════════
SYNONYM_GROUPS = [
    {'however', 'nevertheless', 'nonetheless', 'yet', 'still', 'that said'},
    {'furthermore', 'moreover', 'additionally', 'in addition', 'also', 'besides'},
    {'therefore', 'thus', 'hence', 'consequently', 'as a result', 'accordingly'},
    {'important', 'significant', 'crucial', 'vital', 'essential', 'critical', 'key'},
    {'show', 'demonstrate', 'illustrate', 'reveal', 'highlight', 'underscore', 'exemplify'},
    {'use', 'utilize', 'employ', 'leverage', 'apply'},
    {'make', 'create', 'produce', 'generate', 'develop', 'craft'},
    {'look at', 'examine', 'explore', 'investigate', 'analyze', 'consider', 'delve into'},
    {'said', 'stated', 'noted', 'argued', 'contended', 'posited', 'asserted', 'claimed'},
    {'big', 'large', 'substantial', 'considerable', 'significant', 'major', 'immense'},
    {'help', 'assist', 'support', 'aid', 'facilitate', 'enable'},
    {'change', 'transform', 'alter', 'modify', 'shift', 'reshape'},
    {'problem', 'issue', 'challenge', 'concern', 'difficulty', 'obstacle'},
    {'good', 'excellent', 'outstanding', 'exceptional', 'remarkable', 'notable', 'noteworthy'},
]


# ══════════════════════════════════════════════════════════════════════════════
#  RF + TF-IDF  WRAPPER
# ══════════════════════════════════════════════════════════════════════════════
class RFModelWrapper:
    def __init__(self, model_path, tfidf_path=None):
        self.model       = None
        self.vectorizer  = None
        self.available   = False
        self.is_pipeline = False
        self._load(model_path, tfidf_path)

    def _load(self, model_path, tfidf_path):
        if not JOBLIB_AVAILABLE:
            print("   ⚠️  joblib not installed — pip install joblib")
            return
        if not os.path.exists(model_path):
            print(f"   ⚠️  RF model not found: {model_path}")
            return
        try:
            loaded = joblib.load(model_path)
            if not hasattr(loaded, 'predict_proba'):
                print(f"   ⚠️  Model has no predict_proba: {type(loaded)}")
                return
            self.model = loaded
            if hasattr(loaded, 'steps'):
                self.is_pipeline = True
                print(f"   RF: sklearn Pipeline detected (vectorizer embedded)")
            elif tfidf_path and os.path.exists(tfidf_path):
                self.vectorizer = joblib.load(tfidf_path)
                print(f"   RF: model + vectorizer loaded")
            else:
                print(f"   ⚠️  tfidf_path missing or not found: {tfidf_path}")
                return
            self.available = True
        except Exception as e:
            print(f"   ⚠️  RF load error: {e}")

    def predict(self, text):
        if not self.available:
            return None
        try:
            X      = [text] if self.is_pipeline else self.vectorizer.transform([text])
            proba  = self.model.predict_proba(X)[0]
            cls    = list(self.model.classes_) if hasattr(self.model, 'classes_') else [0, 1]
            ai_idx = cls.index(1) if 1 in cls else 1
            return float(np.clip(proba[ai_idx] * 100, 0, 100))
        except Exception as e:
            print(f"   ⚠️  RF predict error: {e}")
            return None

    def predict_batch(self, texts):
        if not self.available:
            return [None] * len(texts)
        try:
            X      = texts if self.is_pipeline else self.vectorizer.transform(texts)
            probas = self.model.predict_proba(X)
            cls    = list(self.model.classes_) if hasattr(self.model, 'classes_') else [0, 1]
            ai_idx = cls.index(1) if 1 in cls else 1
            return [float(np.clip(p[ai_idx] * 100, 0, 100)) for p in probas]
        except Exception as e:
            print(f"   ⚠️  RF batch error: {e}")
            return [None] * len(texts)


# ══════════════════════════════════════════════════════════════════════════════
#  ROBERTA  WRAPPER
# ══════════════════════════════════════════════════════════════════════════════
class RobertaWrapper:
    """
    Tries local folder first, then falls back to roberta-base-openai-detector.
    Returns AI probability 0-100, or None if unavailable.
    Tokenization uses truncation — text truncated to model max length (512 tokens).
    """
    LOCAL_PATHS = ['./roberta_model', './roberta-detector', './models/roberta']
    HF_MODEL    = 'roberta-base-openai-detector'

    def __init__(self):
        self.model     = None
        self.tokenizer = None
        self.available = False
        self.device    = 'cpu'
        if TRANSFORMERS_AVAILABLE:
            self._load()

    def _load(self):
        # try local first
        for path in self.LOCAL_PATHS:
            if os.path.isdir(path):
                try:
                    self.tokenizer = AutoTokenizer.from_pretrained(path)
                    self.model     = AutoModelForSequenceClassification.from_pretrained(path)
                    self.model.eval()
                    self.available = True
                    print(f"   RoBERTa: loaded from local {path}")
                    return
                except Exception:
                    continue
        # fall back to HuggingFace
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.HF_MODEL)
            self.model     = AutoModelForSequenceClassification.from_pretrained(self.HF_MODEL)
            self.model.eval()
            self.available = True
            print(f"   RoBERTa: loaded from HuggingFace ({self.HF_MODEL})")
        except Exception as e:
            print(f"   RoBERTa: unavailable ({e})")

    def predict(self, text):
        if not self.available:
             return None
        try:
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                padding=True
            )

            with torch.no_grad():
                logits = self.model(**inputs).logits

            probs = torch.softmax(logits, dim=-1)[0]

            ai_prob = float(probs[1].item()) * 100

            return float(np.clip(ai_prob, 0, 100))

        except Exception as e:
            print(f"   ⚠️ RoBERTa predict error: {e}")
            return None

# ══════════════════════════════════════════════════════════════════════════════
#  GPT-2  PERPLEXITY  WRAPPER
# ══════════════════════════════════════════════════════════════════════════════
class GPT2Wrapper:
    """
    Perplexity-based signal.
    Lower perplexity → text is more predictable → more likely AI-generated.
    Returns AI probability 0-100, or None if unavailable.
    """
    def __init__(self):
        self.model     = None
        self.tokenizer = None
        self.available = False
        if TRANSFORMERS_AVAILABLE:
            self._load()

    def _load(self):
        try:
            self.tokenizer = GPT2TokenizerFast.from_pretrained('gpt2')
            self.model     = GPT2LMHeadModel.from_pretrained('gpt2')
            self.model.eval()
            self.available = True
            print("   GPT-2: loaded")
        except Exception as e:
            print(f"   GPT-2: unavailable ({e})")

    def perplexity(self, text):
        if not self.available:
            return None
        try:
            inputs = self.tokenizer(
                text, return_tensors='pt', truncation=True, max_length=512)
            input_ids = inputs['input_ids']
            if input_ids.shape[1] < 5:
                return None
            with torch.no_grad():
                loss = self.model(input_ids, labels=input_ids).loss
            return float(torch.exp(loss).item())
        except Exception:
            return None

    def predict(self, text):
        """Convert perplexity → AI probability 0-100."""
        ppl = self.perplexity(text)
        if ppl is None:
            return None
        # Calibration:
        #   ppl < 15  → very predictable → likely AI  → high score
        #   ppl 15-25 → high
        #   ppl 25-40 → moderate-high
        #   ppl 40-60 → moderate
        #   ppl 60-100→ lower
        #   ppl > 100 → unpredictable → likely human → low score
        if ppl < 15:
            return 95
        elif ppl < 25:
            return 85
        elif ppl < 40:
            return 70
        elif ppl < 60:
            return 50
        elif ppl < 100:
            return 30
        else:
            return 10


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN DETECTOR
# ══════════════════════════════════════════════════════════════════════════════
class UltimateAIDetector:

    # ── Maximum words analysed in one pass ────────────────────────────────────
    MAX_WORDS = 5000

    # ── expanded repetition exceptions (function words never penalised) ────────
    REPETITION_EXCEPTIONS = {
        # personal pronouns
        'i','me','my','mine','myself',
        'you','your','yours','yourself','yourselves',
        'he','him','his','himself',
        'she','her','hers','herself',
        'it','its','itself',
        'we','us','our','ours','ourselves',
        'they','them','their','theirs','themselves',
        # to be
        'is','are','was','were','am','be','been','being',
        # articles & determiners
        'a','an','the','this','that','these','those',
        # conjunctions & prepositions
        'and','but','or','nor','so','yet','for','because','although',
        'though','while','whereas','if','unless','until','since','when',
        'where','in','on','at','to','for','with','of','from','by',
        'about','as','into','through','during','before','after',
        'above','below','between','among','under','over',
        # auxiliaries
        'do','does','did','have','has','had','will','would','shall',
        'should','may','might','must','can','could',
        # common short words
        'not','no','also','very','more','most','just','than','then',
        'here','there','now','each','both','all','some','any','few',
        'other','such','same','own',
    }

    def __init__(self, model_path='dataset_model.pkl', tfidf_path='dataset_scaler.pkl'):
        self.stop_words = set(stopwords.words('english'))
        self.lemmatizer = WordNetLemmatizer()
        self.sia        = SentimentIntensityAnalyzer()

        print("\n✅ UltimateAIDetector v5.0 initialising …")

        # ── load models ───────────────────────────────────────────────────────
        self.rf      = RFModelWrapper(model_path, tfidf_path)
        self.roberta = RobertaWrapper()
        self.gpt2    = GPT2Wrapper()

        # ── word lists ────────────────────────────────────────────────────────
        self.ai_phrases = [
            "in conclusion","furthermore","moreover","it is important to note",
            "this essay discusses","overall","additionally","to sum up",
            "in addition","consequently","therefore","it is evident that",
            "one can argue","it should be noted","as previously mentioned",
            "fundamentally","delve into","realm of","testament to",
            "pivotal role","unparalleled","noteworthy","it is worth noting",
            "underscores","exemplifies","highlights","demonstrates",
            "conversely","notably","paradigmatic","echoes this",
            "it is clear that","plays a crucial role","in today's world",
            "it goes without saying","a wide range of","a variety of",
            "in terms of","it is essential","it is crucial","it is vital",
            "this highlights","this demonstrates","this underscores",
            "it is worth noting","has been shown","has been demonstrated",
            "it can be argued","it is widely accepted","it is generally agreed",
        ]

        # Academic transitions (EXPANDED)
        self.transition_words = {
            'however','moreover','furthermore','additionally','consequently',
            'therefore','nevertheless','nonetheless','meanwhile','subsequently',
            'thus','hence','accordingly','similarly','likewise','conversely',
            'notably','specifically','particularly','essentially',
            # academic variants
            'per','yet','amidst','wherein','albeit','thereby','therein',
            'notwithstanding','henceforth','inasmuch','insofar','ergo',
            'whence','thence','herein','heretofore','wherefore','whereas',
            'vis-a-vis','whilst','upon','among','amid','concerning',
            'regarding','respecting','considering','given','indeed',
            'granted','admittedly','certainly','undoubtedly','ostensibly',
            'putatively','purportedly',
        }

        self.human_indicators = [
            "i think","i feel","in my opinion","personally","i believe",
            "from my experience","i remember","i've seen","i noticed",
            "honestly","frankly","to be honest","actually","basically",
            "kind of","sort of","pretty much","a bit","really","very",
            "totally","literally","like","you know","i mean",
        ]

        self.human_error_patterns = [
            r'\bthe\s+the\b', r'\ban\s+a\b', r'\ba\s+an\b',
            r'\b(\w+)\s+\1\b',
        ]

        # Graduate-level AI academic vocabulary
        self.academic_ai_vocab = [
            'neurobiological','volitional','affiliative','eudaimonic',
            'paradigmatically','multifaceted','delineates','corroborated',
            'conceptualized','transcending','propelled','interrogates',
            'necessitate','engendered','commodification','epistemological',
            'dialectic','subjectivity','objectification','imperatives',
            'honed','mediated','operationalized','theorized','instantiated',
            'scaffolded','foregrounded','problematized','nuanced','robust',
            'holistic','synergistic','transformative','paradigm','hegemonic',
            'discursive','ontological','teleological','reified','valorized',
            'predicated','instantiate','delineate','elucidate','explicate',
            'posit','contend','assert','argue','suggest','corroborate',
            'substantiate','underscores','exemplify',
        ]

        self.hedging_words = {
            'may','might','could','possibly','arguably','somewhat','perhaps',
            'probably','potentially','seemingly','apparently','presumably',
            'likely','unlikely','conceivably','ostensibly','purportedly',
        }

        self.anecdote_markers = [
            "i remember when","last week","last month","yesterday",
            "my friend","my family","when i was","i once","i used to",
            "back then","growing up","as a kid","in my experience",
        ]

        self.self_correction_markers = [
            "well, actually","i mean,","or rather","wait,","no wait",
            "scratch that","let me rephrase","to be more precise",
            "more accurately","what i meant","correction:",
        ]

        self.slang_terms = {
            'lol','omg','tbh','ngl','fr','lowkey','highkey','bruh',
            'gonna','wanna','gotta','kinda','sorta','dunno','yeah',
            'nah','yup','yep','nope','idk','ikr','smh','fyi',
            'btw','imo','imho','afaik','thx','pls',
        }

        self.filler_words = {
            'um','uh','like','you know','i mean','well','so',
            'basically','literally','actually','honestly','seriously',
        }

        self.direct_address = {
            'hey','listen','look','dude','man','bro','guys',
            'folks','yall',"y'all",'mate','buddy',
        }

        self.casual_time_refs = [
            'yesterday','today','tomorrow','last night','this morning',
            'just now','right now','a sec ago','the other day','a while back',
        ]

        self.strong_opinions = {
            'definitely','obviously','clearly','totally','absolutely',
            'completely','entirely','utterly','perfectly','exactly',
        }

        self.rare_words = {
            'ephemeral','perspicacious','sanguine','melancholy','serendipity',
            'labyrinthine','cathartic','esoteric','obfuscate','ubiquitous',
            'cacophony','loquacious','perspicuity','inscrutable','limpid',
            'tenuous','precipitous','vociferous','magnanimous','recalcitrant',
            'idiosyncratic','perfidious','enigmatic','transcendent','mercurial',
            'equivocal','pernicious','obstinate','querulous',
        }

        self.cliches = [
            "piece of cake","hit the nail on the head","break the ice",
            "at the end of the day","think outside the box","low hanging fruit",
            "throw under the bus","get the ball rolling","touch base",
            "circle back","win-win","game changer","paradigm shift",
        ]

        self.meta_commentary = [
            "let me explain","as i mentioned","bear with me","to clarify",
            "what i mean is","in other words","let me rephrase",
            "to put it simply","going back to","as i said","like i said",
        ]

        self.common_starters = {
            'the','this','it','however','there','these','in','that',
            'while','although','when','as','for','with','by',
        }

        rf_s      = '✅' if self.rf.available      else '❌ (excluded from blend)'
        rob_s     = '✅' if self.roberta.available  else '❌ (excluded from blend)'
        gpt2_s    = '✅' if self.gpt2.available     else '❌ (excluded from blend)'
        print(f"\n   RF + TF-IDF : {rf_s}")
        print(f"   RoBERTa     : {rob_s}")
        print(f"   GPT-2       : {gpt2_s}")
        print(f"   Weights     : varies by word count (see docstring)")
        print(f"   Min words   : 20  (texts < 20 words show warning + human score)")
        print(f"   Max words   : {self.MAX_WORDS}  (longer texts sampled from distributed sections)")
        print(f"   Ready.\n")

    # ══════════════════════════════════════════════════════════════════════════
    #  LONG-TEXT SAMPLER
    #  Texts exceeding MAX_WORDS are reduced by sampling evenly-spaced
    #  sentence-windows from beginning, middle thirds, and end so that
    #  all structural regions of the document are represented.
    # ══════════════════════════════════════════════════════════════════════════

    def _sample_text(self, text, original_word_count):
        """
        Sample up to MAX_WORDS words from a long text while preserving
        representativeness across all sections of the document.

        Strategy:
          - Split into sentences to avoid cutting words mid-sentence.
          - Divide sentences into 5 equally-sized regions.
          - Draw sentences from each region proportionally until MAX_WORDS
            is reached, cycling through regions round-robin so coverage is
            spread evenly rather than front-loaded.

        Returns:
          sampled_text  (str)  — the reconstructed text ready for analysis
        """
        sentences = _sent_tok(text)
        if not sentences:
            # Fallback: word-level slice if sentence tokeniser fails
            words = text.split()
            return ' '.join(words[:self.MAX_WORDS])

        # Divide sentences into NUM_REGIONS equal buckets
        NUM_REGIONS = 5
        n = len(sentences)
        region_size = max(1, n // NUM_REGIONS)
        regions = []
        for i in range(NUM_REGIONS):
            start = i * region_size
            # Last region takes any remainder
            end   = start + region_size if i < NUM_REGIONS - 1 else n
            bucket = sentences[start:end]
            if bucket:
                regions.append(bucket)

        # Round-robin: take one sentence at a time from each region
        # until we hit MAX_WORDS
        region_indices = [0] * len(regions)   # pointer into each region
        selected       = []
        word_count     = 0
        exhausted      = [False] * len(regions)

        while word_count < self.MAX_WORDS and not all(exhausted):
            made_progress = False
            for r_idx, region in enumerate(regions):
                if exhausted[r_idx]:
                    continue
                s_idx = region_indices[r_idx]
                if s_idx >= len(region):
                    exhausted[r_idx] = True
                    continue
                sent  = region[s_idx]
                sw    = len(sent.split())
                if word_count + sw > self.MAX_WORDS:
                    # Try to fit a partial sentence only if we have room
                    # for at least 5 more words; otherwise stop this region
                    if self.MAX_WORDS - word_count >= 5:
                        partial = ' '.join(sent.split()[:self.MAX_WORDS - word_count])
                        selected.append(partial)
                        word_count += len(partial.split())
                    exhausted[r_idx] = True
                    continue
                selected.append(sent)
                word_count           += sw
                region_indices[r_idx] += 1
                made_progress = True
                if word_count >= self.MAX_WORDS:
                    break
            if not made_progress:
                break

        return ' '.join(selected)

    # ══════════════════════════════════════════════════════════════════════════
    #  HEURISTIC FEATURE METHODS
    # ══════════════════════════════════════════════════════════════════════════

    def _sentence_uniformity(self, sentences):
        lengths = [len(_word_tok(s)) for s in sentences]
        if len(lengths) < 2:
            return 50
        return max(0, (15 - min(statistics.stdev(lengths), 15)) / 15 * 100)

    def _vocab_diversity(self, filtered):
        if len(filtered) < 5:
            return 50
        return min((1 - len(set(filtered)) / len(filtered)) * 120, 100)

    def _repetition_detector(self, text):
        """Repetition scorer — EXPANDED exception list so function words never fire."""
        words    = _word_tok(text.lower())
        filtered = [
            self.lemmatizer.lemmatize(w) for w in words
            if w.isalpha()
            and w not in self.stop_words
            and w not in self.REPETITION_EXCEPTIONS   # ← expanded exceptions
            and len(w) > 2
        ]
        if len(filtered) < 10:
            return 50
        freq       = Counter(filtered)
        total      = len(filtered)
        top        = freq.most_common(5)
        top1_ratio = top[0][1] / total if top else 0
        top3_ratio = sum(c for _, c in top[:3]) / total if len(top) >= 3 else 0
        high_freq  = sum(1 for c in freq.values() if c > max(3, total * 0.03))
        bigrams    = [' '.join(filtered[i:i+2]) for i in range(len(filtered)-1)]
        trigrams   = [' '.join(filtered[i:i+3]) for i in range(len(filtered)-2)]
        rep_bi     = sum(1 for c in Counter(bigrams).values()  if c > 2)
        rep_tri    = sum(1 for c in Counter(trigrams).values() if c > 1)
        if top1_ratio > 0.10:       score = 95
        elif top1_ratio > 0.06:     score = 85 + (top1_ratio - 0.06) * 250
        elif top3_ratio > 0.20:     score = 75
        elif rep_tri >= 3:          score = 70 + min(rep_tri * 5, 25)
        elif high_freq >= 4:        score = 60 + min(high_freq * 5, 30)
        elif rep_bi >= 3:           score = 50 + min(rep_bi * 5, 30)
        else:                       score = max(0, top1_ratio * 300 + high_freq * 8)
        return min(score, 99)

    def _pos_distribution(self, words):
        tags  = _pos_tag_safe(words)
        total = max(len(tags), 1)
        dist  = Counter(t for _, t in tags)
        return min(
            (dist.get('NN', 0) + dist.get('NNS', 0)) / total * 150
            + dist.get('JJ', 0) / total * 100,
            100)

    def _ai_phrases_score(self, text_lower):
        return min(sum(1 for p in self.ai_phrases if p in text_lower) * 10, 100)

    def _passive_voice(self, text):
        return min(len(re.findall(
            r"\b(?:is|was|are|were|been|be)\s+\w+(?:ed|en)\b",
            text.lower())) * 10, 100)

    def _ngram_diversity(self, text):
        ngrams = set(text.lower()[i:i+4] for i in range(max(0, len(text) - 4)))
        ratio  = len(ngrams) / max(1, len(text) / 12)
        return (1 - min(ratio, 1)) * 100

    def _readability(self, words, sentences):
        if not sentences or not words:
            return 50
        alpha = [w for w in words if w.isalpha()]
        if not alpha:
            return 50
        syl     = sum(self._syllables(w) for w in alpha)
        avg_sl  = len(words) / max(len(sentences), 1)
        avg_syl = syl / max(len(alpha), 1)
        flesch  = 206.835 - 1.015 * avg_sl - 84.6 * avg_syl
        if 30 <= flesch <= 65: return 65
        elif flesch < 30:      return 58
        else:                  return 40

    def _punctuation_diversity(self, text):
        return max(0, (10 - len(set(c for c in text if c in string.punctuation))) / 10 * 100)

    def _lexical_burstiness(self, filtered):
        if len(filtered) < 10:
            return 50
        burst = statistics.stdev([len(w) for w in filtered]) if len(filtered) > 1 else 0
        return max(0, (3.0 - min(burst, 3.0)) / 3.0 * 100)

    def _human_indicator_detector(self, text):
        tl   = text.lower()
        pp   = len(re.findall(r'\b(i|my|mine|myself|me)\b', tl))
        hp   = sum(1 for p in self.human_indicators if p in tl)
        cont = len(re.findall(
            r"\b\w+n't\b|\b\w+'ll\b|\b\w+'ve\b|\b\w+'re\b|\b\w+'s\b|\b\w+'d\b", tl))
        inf  = len(re.findall(r'[!?]{2,}|\.{3,}', text))
        q    = text.count('?')
        emp  = len(re.findall(
            r'\b(really|very|so|totally|absolutely|definitely|literally)\b', tl))
        if len(text.split()) < 20:
            return 50
        score = (min(pp*3, 30) + min(hp*8, 30) + min(cont*2, 20)
                 + min(inf*5, 10) + min(q*3, 10) + min(emp*2, 10))
        return max(0, 100 - score)

    def _statistical_outlier_detection(self, text):
        words     = _word_tok(text)
        sentences = _sent_tok(text)
        if len(sentences) < 3:
            return 50
        sl = [len(_word_tok(s)) for s in sentences]
        wl = [len(w) for w in words if w.isalpha()]
        if not wl or not sl:
            return 50
        def outliers(data):
            if len(data) < 4:
                return 0
            q1, q3 = np.percentile(data, [25, 75])
            iqr    = q3 - q1
            return sum(1 for x in data if x < q1 - 1.5*iqr or x > q3 + 1.5*iqr)
        total = outliers(sl) + outliers(wl) / 10
        if total == 0:    return 58
        elif total < 1:   return 38
        elif total < 2:   return 28
        else:             return max(0, 28 - total * 8)

    def _transition_dependency(self, words):
        if len(words) < 20:
            return 50
        ratio = sum(1 for w in words if w in self.transition_words) / len(words)
        if ratio > 0.07:    return 95
        elif ratio > 0.05:  return 70 + (ratio - 0.05) * 1250
        elif ratio > 0.03:  return 45 + (ratio - 0.03) * 1250
        elif ratio > 0.01:  return 30 + (ratio - 0.01) * 750
        else:               return ratio * 3000

    def _error_authenticity(self, text):
        errors = sum(len(re.findall(p, text, re.IGNORECASE))
                     for p in self.human_error_patterns)
        brit   = len(re.findall(r'\b\w+our\b|\b\w+ise\b', text))
        amer   = len(re.findall(r'\b\w+or\b|\b\w+ize\b', text))
        if brit > 0 and amer > 0:
            errors += 1
        for s in _sent_tok(text):
            if s and s[-1] not in '.!?':
                errors += 1
        if errors == 0:    return 58
        elif errors == 1:  return 38
        elif errors == 2:  return 25
        else:              return max(0, 25 - errors * 7)

    def _contextual_consistency(self, text):
        sentences = _sent_tok(text)
        if len(sentences) < 3:
            return 50
        past    = len(re.findall(r'\b\w+ed\b', text))
        present = len(re.findall(r'\b\w+ing\b|\b\w+s\b', text))
        total   = past + present
        if total == 0:
            return 50
        ratio = abs(past - present) / total
        base  = 55 if ratio < 0.3 else (50 if ratio < 0.6 else 42)
        fp    = len(re.findall(r'\b(I|we|my|our)\b', text, re.IGNORECASE))
        tp    = len(re.findall(r'\b(he|she|they|his|her|their)\b', text, re.IGNORECASE))
        if (fp + tp) > 5 and (fp == 0 or tp == 0):
            base += 8
        return min(base, 75)

    def _writing_rhythm(self, text, sentences):
        if len(sentences) < 4:
            return 50
        pp = [i for i, c in enumerate(text) if c in '.!?']
        if len(pp) < 3:
            return 50
        intervals = [pp[i+1] - pp[i] for i in range(len(pp)-1)]
        iv        = np.std(intervals)
        sl        = [len(_word_tok(s)) for s in sentences]
        alt       = sum(1 for i in range(len(sl)-1)
                        if (sl[i] > 15 and sl[i+1] < 10)
                        or (sl[i] < 10 and sl[i+1] > 15))
        score     = (50 if iv < 20 else 35 if iv < 40 else max(0, 35 - (iv-40)/5))
        score    += (40 if alt == 0 else 22 if alt < 2 else max(0, 22 - alt*6))
        return min(score, 99)

    # ACADEMIC FIX 2: fixed citation regex
    def _citation_density(self, text):
        patterns = [
            r'\[\d+\]',
            r'\(\d{4}\)',
            r'\([A-Z][a-zA-Z\s]+,?\s*\d{4}\)',
            r'\([A-Z][a-zA-Z\s]+et al\.?,?\s*\d{4}\)',
            r'\bet al\.',
            r'\bibid\b',
            r'pp?\.\s*\d+',
        ]
        total = sum(len(re.findall(p, text)) for p in patterns)
        words = len(text.split())
        if words < 20:
            return 50
        ratio = total / words
        if ratio > 0.05:    return 97
        elif ratio > 0.03:  return 85 + (ratio - 0.03) * 600
        elif ratio > 0.015: return 68 + (ratio - 0.015) * 1133
        elif ratio > 0.005: return 55 + (ratio - 0.005) * 1300
        else:               return ratio * 11000

    def _information_density(self, text):
        sentences = _sent_tok(text)
        if len(sentences) < 2:
            return 50
        academic_markers = [
            "posits","asserted","contends","elucidates","underscores",
            "paradigmatic","quintessential","seminal","canonical",
            "vis-à-vis","qua","per se","ergo","albeit",
        ]
        scores = []
        for s in sentences:
            words = _word_tok(s)
            if len(words) < 5:
                continue
            tags   = _pos_tag_safe(words)
            proper = len([w for w, t in tags if t in ('NNP', 'NNPS')])
            cplx   = len([w for w in words if len(w) > 7 and w.isalpha()])
            acad   = sum(1 for m in academic_markers if m in s.lower())
            qs     = s.count('"')
            scores.append((proper + cplx + acad + qs) / len(words))
        if not scores:
            return 50
        avg = np.mean(scores)
        if avg > 0.4:    return 97
        elif avg > 0.3:  return 78 + (avg - 0.3) * 190
        elif avg > 0.2:  return 58 + (avg - 0.2) * 200
        else:            return 50 + avg * 400

    def _paragraph_structure(self, text):
        paras   = re.split(r'\n\s*\n', text.strip())
        if len(paras) < 2:
            return 50
        lengths = [len(_sent_tok(p)) for p in paras]
        var     = np.std(lengths)
        perf    = sum(1 for l in lengths if 3 <= l <= 5) / len(lengths)
        score   = (55 if var < 1 else 40 if var < 2 else max(0, 40 - (var-2)*5))
        score  += (40 if perf > 0.7 else 25 if perf > 0.5 else max(0, 25 - (0.5-perf)*50))
        return min(score, 99)

    def _hedging_language(self, words):
        if len(words) < 20:
            return 50
        ratio = sum(1 for w in words if w in self.hedging_words) / len(words)
        if ratio > 0.04:    return 95
        elif ratio > 0.03:  return 75 + (ratio - 0.03) * 2000
        elif ratio > 0.02:  return 50 + (ratio - 0.02) * 2500
        else:               return ratio * 2500

    def _sentence_starter_repetition(self, sentences):
        if len(sentences) < 3:
            return 50
        starters = []
        for s in sentences:
            toks = _word_tok(s.lower())
            if toks and toks[0].isalpha():
                starters.append(toks[0])
        if not starters:
            return 50
        freq     = Counter(starters)
        top_r    = freq.most_common(1)[0][1] / len(starters)
        common_r = sum(1 for s, c in freq.items() if s in self.common_starters and c > 1)
        score    = (55 if top_r > 0.4 else 40 if top_r > 0.3 else top_r * 100)
        score   += min(common_r * 10, 40)
        return min(score, 99)

    def _comma_splice_runon(self, text, sentences):
        splices   = len(re.findall(
            r'\b(I|we|he|she|they|it)\s+\w+[^.!?]*,\s*(I|we|he|she|they|it)\s+\w+',
            text, re.IGNORECASE))
        runons    = sum(1 for s in sentences
                        if len(_word_tok(s)) > 30 and s.count(',') < 2)
        fragments = sum(1 for s in sentences
                        if not any(t.startswith('VB')
                                   for _, t in _pos_tag_safe(_word_tok(s)))
                        and len(_word_tok(s)) > 3)
        total = splices + runons + fragments
        if total == 0:    return 58
        elif total == 1:  return 40
        elif total == 2:  return 28
        else:             return max(0, 28 - (total-2) * 8)

    def _vocabulary_consistency(self, text):
        words    = _word_tok(text.lower())
        filtered = [w for w in words if w.isalpha()]
        if len(filtered) < 20:
            return 50
        var = np.std([len(w) for w in filtered])
        if var < 1.5:    return 72
        elif var < 2.5:  return 55
        else:            return max(0, 50 - (var-2.5)*8)

    def _question_density(self, sentences):
        if len(sentences) < 3:
            return 50
        ratio = sum(1 for s in sentences if '?' in s) / len(sentences)
        if ratio == 0:     return 55
        elif ratio < 0.1:  return 45
        elif ratio < 0.2:  return 30
        else:              return max(0, 30 - (ratio-0.2)*100)

    def _personal_anecdote(self, text):
        tl  = text.lower()
        ac  = sum(1 for m in self.anecdote_markers if m in tl)
        st  = len(re.findall(
            r'\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|'
            r'january|february|march|april|may|june|july|august|september|'
            r'october|november|december|\d{4})\b', tl))
        fp  = len(re.findall(
            r'\b(i|we)\s+(was|were|went|did|saw|felt|thought|said|told)\b', tl))
        total = ac + st*0.5 + fp*0.3
        if total == 0:    return 58
        elif total < 2:   return 45
        elif total < 4:   return 32
        else:             return max(0, 32 - (total-4)*4)

    def _emotional_variation(self, sentences):
        if len(sentences) < 3:
            return 50
        sents = [abs(self.sia.polarity_scores(s)['compound']) for s in sentences]
        var   = np.std(sents)
        spks  = sum(1 for s in sents if s > 0.5)
        score = (52 if var < 0.1 else 35 if var < 0.2 else max(0, 35 - (var-0.2)*100))
        score+= (38 if spks == 0 else 22 if spks == 1 else max(0, 22 - spks*6))
        return min(score, 99)

    def _cliche_usage(self, text):
        tl    = text.lower()
        count = sum(1 for c in self.cliches if c in tl)
        words = len(text.split())
        if words < 20 or count == 0:
            return 50
        ratio = count / (words / 100)
        if ratio > 3:     return 65
        elif ratio > 0.5: return 20
        else:             return 50

    def _meta_commentary(self, text):
        count = sum(1 for p in self.meta_commentary if p in text.lower())
        if count == 0:    return 50
        elif count == 1:  return 35
        else:             return max(0, 35 - (count-1)*15)

    def _numbered_list(self, text, sentences):
        pats  = [r'\n\s*\d+\.\s+', r'\n\s*\d+\)\s+', r'\n\s*\(\d+\)\s+']
        total = sum(len(re.findall(p, text)) for p in pats)
        total+= len(re.findall(r'\n\s*[a-z]\.\s+', text))
        if len(sentences) < 3:
            return 50
        ratio = total / len(sentences)
        if ratio > 0.3:   return 90
        elif ratio > 0.2: return 70
        elif ratio > 0.1: return 50
        else:             return ratio * 500

    def _sentence_complexity(self, sentences):
        if len(sentences) < 3:
            return 50
        subs = ['because','although','though','while','whereas','if','unless',
                'until','since','when','where','that','which','who','whom']
        scores = []
        for s in sentences:
            tl  = s.lower()
            mc  = sum(1 for m in subs if f' {m} ' in f' {tl} ')
            cc  = s.count(',')
            wc  = len(_word_tok(s))
            scores.append((mc + cc) / max(wc/10, 1))
        avg = np.mean(scores)
        var = np.std(scores)
        score = (72 if avg > 2.5 and var < 0.8
                 else 58 + (avg-2.0)*25 if avg > 2.0 and var < 1.2
                 else avg * 28)
        if var < 0.5:
            score = min(score + 12, 99)
        return min(score, 99)

    # ── casual / human tone ────────────────────────────────────────────────────
    def _slang(self, words):
        count = sum(1 for w in words if w in self.slang_terms)
        if count == 0:    return 58
        elif count == 1:  return 35
        elif count == 2:  return 20
        else:             return max(0, 20 - count*5)

    def _contractions(self, text):
        n     = len(re.findall(
            r"\b\w+n't\b|\b\w+'ll\b|\b\w+'ve\b|\b\w+'re\b|\b\w+'s\b|\b\w+'d\b|\b\w+'m\b",
            text.lower()))
        words = text.split()
        if len(words) < 5:
            return 50
        r = n / len(words)
        if n == 0:      return 60
        elif r > 0.15:  return 10
        elif r > 0.10:  return 25
        elif r > 0.05:  return 40
        else:           return 55

    def _first_person_immediacy(self, text):
        patterns = [r"\bi'm\b", r"\bi just\b", r"\bi've\b", r"\bright now\b",
                    r"\btoday\b", r"\bcurrently\b", r"\bat the moment\b"]
        count = sum(len(re.findall(p, text.lower())) for p in patterns)
        if count == 0:    return 55
        elif count == 1:  return 35
        elif count == 2:  return 25
        else:             return max(0, 25 - count*8)

    def _filler_words(self, text):
        count = sum(1 for f in self.filler_words if f in text.lower())
        if count == 0:    return 58
        elif count == 1:  return 35
        elif count == 2:  return 20
        else:             return max(0, 20 - count*10)

    def _sentence_fragments(self, sentences):
        if len(sentences) < 2:
            return 50
        frags = sum(1 for s in sentences
                    if len(_word_tok(s)) < 3
                    or not any(t.startswith('VB')
                               for _, t in _pos_tag_safe(_word_tok(s))))
        ratio = frags / len(sentences)
        if ratio == 0:     return 58
        elif ratio < 0.3:  return 35
        elif ratio < 0.5:  return 20
        else:              return 10

    def _emphatic_punctuation(self, text):
        total = (len(re.findall(r'!{2,}', text))
                 + len(re.findall(r'\?{2,}', text))
                 + len(re.findall(r'\.{3,}', text)))
        if total == 0:    return 58
        elif total == 1:  return 35
        elif total == 2:  return 20
        else:             return max(0, 20 - total*8)

    def _punctuation_chaos(self, text):
        c = (len(re.findall(r',{2,}', text))
             + len(re.findall(r'\.{4,}', text))
             + len(re.findall(r'[!?\.]{3,}', text))
             + len(re.findall(r'\s+[!?,.](?=\s|$)', text)))
        if c == 0:    return 58
        elif c == 1:  return 30
        else:         return max(0, 30 - c*15)

    def _informal_punctuation(self, text):
        c = (len(re.findall(r'-{2,}', text))
             + len(re.findall(r'[:;][)D(]|<3', text))
             + len(re.findall(r'[.,!?][a-zA-Z]', text)))
        if c == 0:    return 55
        elif c == 1:  return 30
        else:         return max(0, 30 - c*12)

    def _direct_address(self, text):
        c = sum(1 for w in self.direct_address if w in text.lower())
        if c == 0:    return 55
        elif c == 1:  return 25
        else:         return max(0, 25 - c*10)

    def _casual_time_refs(self, text):
        c = sum(1 for r in self.casual_time_refs if r in text.lower())
        if c == 0:    return 55
        elif c == 1:  return 25
        else:         return max(0, 25 - c*12)

    def _strong_opinions(self, words):
        if len(words) < 5:
            return 50
        ratio = sum(1 for w in words if w in self.strong_opinions) / len(words)
        if ratio > 0.05:    return 20
        elif ratio > 0.03:  return 35
        elif ratio > 0:     return 45
        else:               return 55

    def _self_correction_markers(self, text):
        count = sum(1 for m in self.self_correction_markers if m in text.lower())
        if count == 0:    return 58
        elif count == 1:  return 28
        elif count == 2:  return 15
        else:             return 5

    # ── stylometric ────────────────────────────────────────────────────────────
    def _burstiness_score(self, sentences):
        if len(sentences) < 3:
            return 50
        var = np.std([len(_word_tok(s)) for s in sentences])
        if var < 3:    return 85
        elif var < 6:  return 65
        elif var < 10: return 42
        else:          return 22

    def _sentence_entropy(self, text):
        words = _word_tok(text.lower())
        if len(words) < 20:
            return 50
        freq = Counter(words)
        probs = [c/len(words) for c in freq.values()]
        ent = -sum(p*math.log2(p) for p in probs if p > 0)
        if ent < 4: return 88
        elif ent < 5: return 65
        elif ent < 6: return 42
        else: return 22

    def _sentence_perplexity_variance(self, sentences):
        if len(sentences) < 3:
            return 50
        lengths = [len(_word_tok(s)) for s in sentences]
        if len(lengths) < 2:
            return 50
        var = np.var(lengths)
        if var < 5:
            return 80
        elif var < 10:
            return 60
        elif var < 20:
            return 40
        else:
            return 20

    # ACADEMIC FIX 3: widened thresholds
    def _stylometric_signature(self, text, sentences):
        words = _word_tok(text)
        if len(words) < 20:
            return 50
        avg_wl = np.mean([len(w) for w in words if w.isalpha()])
        avg_sl = np.mean([len(_word_tok(s)) for s in sentences]) if sentences else 18
        score  = 0
        if 4.5 < avg_wl < 7.5:  score += 35
        if 15  < avg_sl < 45:   score += 40
        return min(score, 99)

    def _discourse_coherence(self, text):
        paras = [p.strip() for p in re.split(r'\n\s*\n', text.strip())
                 if len(p.split()) > 10]
        if len(paras) < 2:
            sents = _sent_tok(text)
            if len(sents) < 4:
                return 50
            paras = [' '.join(sents[i:i+3]) for i in range(0, len(sents)-2, 3)]

        def kw(para):
            words = _word_tok(para.lower())
            return {self.lemmatizer.lemmatize(w) for w in words
                    if w.isalpha() and w not in self.stop_words and len(w) > 3}

        overlaps = []
        for i in range(len(paras)-1):
            a, b  = kw(paras[i]), kw(paras[i+1])
            union = a | b
            if union:
                overlaps.append(len(a & b) / len(union))
        if not overlaps:
            return 50
        avg = np.mean(overlaps)
        var = np.std(overlaps)
        score = (50 if avg > 0.35 else 35 if avg > 0.25
                 else 20 if avg > 0.15 else 5)
        score+= (42 if var < 0.05 else 26 if var < 0.10
                 else 12 if var < 0.15 else 0)
        return min(score, 99)

    def _synonym_overuse(self, text):
        words = set(_word_tok(text.lower()))
        hits  = 0
        for group in SYNONYM_GROUPS:
            found = sum(1 for term in group if term in words)
            if found >= 3:   hits += 2
            elif found >= 2: hits += 1
        if hits == 0:    return 50
        elif hits == 1:  return 60
        elif hits == 2:  return 68
        elif hits == 3:  return 75
        else:            return min(50 + hits*10, 99)

    def _specificity_ratio(self, text):
        words = _word_tok(text)
        if len(words) < 20:
            return 50
        tags    = _pos_tag_safe(words)
        proper  = sum(1 for _, t in tags if t in ('NNP', 'NNPS'))
        numbers = len(re.findall(r'\b\d+\.?\d*\b', text))
        dates   = len(re.findall(
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(jan|feb|mar|apr|may|jun|'
            r'jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b',
            text.lower()))
        density = (proper + numbers + dates*2) / len(words)
        if 0.05 < density < 0.15:  return 65
        elif density > 0.20 or density < 0.02: return 28
        else:                       return 50

    def _punctuation_rhythm(self, text):
        positions = [i for i, c in enumerate(text) if c in '.,;:!?']
        if len(positions) < 5:
            return 50
        intervals = [positions[i+1]-positions[i] for i in range(len(positions)-1)]
        cv = np.std(intervals) / max(np.mean(intervals), 1)
        if cv < 0.3:    return 80
        elif cv < 0.5:  return 62
        elif cv < 0.8:  return 42
        else:           return 22

    def _sentence_transition_quality(self, sentences):
        if len(sentences) < 4:
            return 50
        def topic_words(s):
            words = _word_tok(s.lower())
            return {self.lemmatizer.lemmatize(w) for w in words
                    if w.isalpha() and w not in self.stop_words and len(w) > 3}
        transitions = []
        for i in range(len(sentences)-1):
            a, b  = topic_words(sentences[i]), topic_words(sentences[i+1])
            union = a | b
            transitions.append(len(a & b) / len(union) if union else 0)
        if not transitions:
            return 50
        avg = np.mean(transitions)
        var = np.std(transitions)
        score  = (48 if avg > 0.30 else 32 if avg > 0.20 else 16 if avg > 0.10 else 0)
        score += (48 if var < 0.05 else 30 if var < 0.10 else 14 if var < 0.15 else 0)
        return min(score, 99)

    def _lexical_sophistication(self, text):
        words = _word_tok(text.lower())
        alpha = [w for w in words if w.isalpha() and len(w) > 4]
        if len(alpha) < 10:
            return 50
        rare_count = sum(1 for w in alpha if w in self.rare_words)
        long_count = sum(1 for w in alpha if len(w) >= 10)
        ratio      = (rare_count + long_count) / len(alpha)
        if 0.10 < ratio < 0.30:  return 65
        elif ratio > 0.40:       return 28
        elif ratio < 0.05:       return 28
        else:                    return 50

    def _paragraph_topic_consistency(self, text):
        paras = [p.strip() for p in re.split(r'\n\s*\n', text.strip())
                 if len(p.split()) > 15]
        if len(paras) < 2:
            return 50
        consistencies = []
        for para in paras:
            sents = _sent_tok(para)
            if len(sents) < 2:
                continue
            def kw(s):
                words = _word_tok(s.lower())
                return {self.lemmatizer.lemmatize(w) for w in words
                        if w.isalpha() and w not in self.stop_words and len(w) > 3}
            pairs = []
            for i in range(len(sents)-1):
                a, b  = kw(sents[i]), kw(sents[i+1])
                union = a | b
                if union:
                    pairs.append(len(a & b) / len(union))
            if pairs:
                consistencies.append(np.mean(pairs))
        if not consistencies:
            return 50
        avg = np.mean(consistencies)
        if avg > 0.40:    return 82
        elif avg > 0.30:  return 65
        elif avg > 0.20:  return 48
        else:             return 28

    # ACADEMIC FIX 4: graduate-level AI vocabulary
    def _academic_vocab_score(self, text):
        tl    = text.lower()
        words = _word_tok(tl)
        if len(words) < 30:
            return 50
        hits  = sum(1 for w in self.academic_ai_vocab if w in tl)
        ratio = hits / (len(words) / 100)
        if ratio > 8:    return 95
        elif ratio > 5:  return 85
        elif ratio > 3:  return 75
        elif ratio > 2:  return 65
        elif ratio > 1:  return 58
        else:            return 50

    # ACADEMIC FIX 5: formal essay structure
    def _academic_structure_score(self, text):
        tl    = text.lower()
        score = 0
        if re.search(r'\bin conclusion\b|\bto conclude\b|\bin summary\b|\bto summarize\b', tl):
            score += 25
        if re.search(r'\breferences\b|\bbibliography\b|\bworks cited\b', tl):
            score += 30
        if re.search(r'\bthis essay\b|\bthis paper\b|\bthis study\b|\bthis analysis\b', tl):
            score += 20
        cite_count = len(re.findall(r'\([A-Z][a-zA-Z\s]+,?\s*\d{4}\)', text))
        if cite_count >= 3:    score += 20
        elif cite_count >= 1:  score += 10
        if re.search(r'\btheoretical\b|\bconceptual\b|\bempirical\b|\banalytical\b', tl):
            score += 5
        return min(score, 99)

    def _quote_integration(self, text):
        quote_count  = len(re.findall(r'"[^"]{10,}"', text))
        smooth_intro = len(re.findall(
            r'\b(according to|as stated by|notes that|argues that|suggests that|'
            r'posits that|contends that|asserts that|demonstrates that|shows that)\b',
            text.lower()))
        words = len(text.split())
        if words < 20:
            return 50
        if quote_count == 0 and smooth_intro == 0:
            return 52
        ratio = (quote_count + smooth_intro) / (words / 100)
        if ratio > 2 and smooth_intro > 0: return 75
        elif smooth_intro > 0:             return 62
        else:                              return 45

    def _syllables(self, word):
        word = word.lower()
        count, prev_vowel = 0, False
        for c in word:
            v = c in 'aeiouy'
            if v and not prev_vowel:
                count += 1
            prev_vowel = v
        if word.endswith('e'):
            count -= 1
        return max(count, 1)

    # ══════════════════════════════════════════════════════════════════════════
    #  MASTER FEATURE EXTRACTION
    # ══════════════════════════════════════════════════════════════════════════

    def _extract_all_features(self, text):
        tl        = text.lower()
        words     = _word_tok(tl)
        sentences = _sent_tok(text)
        filtered  = [self.lemmatizer.lemmatize(w) for w in words
                     if w.isalpha() and w not in self.stop_words]

        f = {
            # core
            'sentence_uniformity':         self._sentence_uniformity(sentences),
            'sentence_perplexity_variance': self._sentence_perplexity_variance(sentences),
            'vocab_diversity':             self._vocab_diversity(filtered),
            'repetition_score':            self._repetition_detector(text),
            'pos_pattern':                 self._pos_distribution(words),
            'ai_phrases':                  self._ai_phrases_score(tl),
            'passive_voice':               self._passive_voice(text),
            'ngram_diversity':             self._ngram_diversity(text),
            'readability':                 self._readability(words, sentences),
            'punctuation_diversity':       self._punctuation_diversity(text),
            'burstiness':                  self._lexical_burstiness(filtered),
            'human_indicators':            self._human_indicator_detector(text),
            # advanced
            'semantic_coherence':           self._discourse_coherence(text),
            'statistical_outliers':        self._statistical_outlier_detection(text),
            'transition_dependency':       self._transition_dependency(words),
            'error_authenticity':          self._error_authenticity(text),
            'contextual_consistency':      self._contextual_consistency(text),
            'writing_rhythm':              self._writing_rhythm(text, sentences),
            'citation_density':            self._citation_density(text),
            'information_density':         self._information_density(text),
            'quote_integration_pattern':   self._quote_integration(text),
            'paragraph_structure':         self._paragraph_structure(text),
            'hedging_language':            self._hedging_language(words),
            'sentence_starter_repetition': self._sentence_starter_repetition(sentences),
            'comma_splice_runon':          self._comma_splice_runon(text, sentences),
            'vocabulary_consistency':      self._vocabulary_consistency(text),
            'question_density':            self._question_density(sentences),
            'personal_anecdote':           self._personal_anecdote(text),
            'emotional_variation':         self._emotional_variation(sentences),
            'cliche_usage':                self._cliche_usage(text),
            'meta_commentary':             self._meta_commentary(text),
            'numbered_list':               self._numbered_list(text, sentences),
            'sentence_complexity':         self._sentence_complexity(sentences),
            # casual / human
            'slang':                       self._slang(words),
            'contractions':                self._contractions(text),
            'first_person_immediacy':      self._first_person_immediacy(text),
            'filler_words':                self._filler_words(text),
            'sentence_fragments':          self._sentence_fragments(sentences),
            'emphatic_punctuation':        self._emphatic_punctuation(text),
            'punctuation_chaos':           self._punctuation_chaos(text),
            'informal_punctuation':        self._informal_punctuation(text),
            'direct_address':              self._direct_address(text),
            'casual_time_refs':            self._casual_time_refs(text),
            'strong_opinions':             self._strong_opinions(words),
            # stylometric
            'burstiness_score':            self._burstiness_score(sentences),
            'sentence_entropy':            self._sentence_entropy(text),
            'stylometric_signature':       self._stylometric_signature(text, sentences),
            # discourse
            'discourse_coherence':         self._discourse_coherence(text),
            'synonym_overuse':             self._synonym_overuse(text),
            'specificity_ratio':           self._specificity_ratio(text),
            'punctuation_rhythm':          self._punctuation_rhythm(text),
            'sentence_transition_quality': self._sentence_transition_quality(sentences),
            'lexical_sophistication':      self._lexical_sophistication(text),
            'paragraph_topic_consistency': self._paragraph_topic_consistency(text),
            'self_correction':             self._self_correction_markers(text),
            # NEW academic
            'academic_vocab_score':        self._academic_vocab_score(text),
            'academic_structure_score':    self._academic_structure_score(text),
        }

        for k in f:
            f[k] = float(np.clip(f[k], 0, 100))
        return f

    # ══════════════════════════════════════════════════════════════════════════
    #  HEURISTIC WEIGHTED SCORE  (weights verified to sum 1.00)
    # ══════════════════════════════════════════════════════════════════════════

    def _heuristic_score(self, f, word_count):
        is_short = word_count < 50

        if is_short:
            # Short text (20-49 words): human tone signals carry more weight
            score = (
                f['human_indicators']          * 0.11 +
                f['slang']                     * 0.07 +
                f['contractions']              * 0.07 +
                f['first_person_immediacy']    * 0.05 +
                f['filler_words']              * 0.05 +
                f['emphatic_punctuation']      * 0.04 +
                f['sentence_fragments']        * 0.04 +
                f['punctuation_chaos']         * 0.04 +
                f['informal_punctuation']      * 0.03 +
                f['direct_address']            * 0.03 +
                f['casual_time_refs']          * 0.03 +
                f['strong_opinions']           * 0.03 +
                f['repetition_score']          * 0.07 +
                f['ai_phrases']                * 0.06 +
                f['vocab_diversity']           * 0.04 +
                f['error_authenticity']        * 0.03 +
                f['question_density']          * 0.03 +
                f['personal_anecdote']         * 0.02 +
                f['academic_vocab_score']      * 0.06 +
                f['academic_structure_score']  * 0.04 +
                f['emotional_variation']       * 0.02 +
                f['vocabulary_consistency']    * 0.01 +
                f['synonym_overuse']           * 0.03
            )   # sum = 1.00

        else:
            # Long text (50+ words): academic & discourse signals carry more weight
            score = (
                # Core AI phrases (15%)
                f['ai_phrases']                  * 0.07 +
                f['repetition_score']            * 0.05 +
                f['transition_dependency']       * 0.03 +
                # Academic AI detection (21%)
                f['academic_vocab_score']        * 0.09 +
                f['academic_structure_score']    * 0.09 +
                f['citation_density']            * 0.03 +
                # Discourse / coherence (16%)
                f['discourse_coherence']         * 0.05 +
                f['synonym_overuse']             * 0.04 +
                f['sentence_transition_quality'] * 0.04 +
                f['paragraph_topic_consistency'] * 0.03 +
                # Stylometric (10%)
                f['sentence_entropy']            * 0.03 +
                f['stylometric_signature']       * 0.03 +
                f['burstiness_score']            * 0.02 +
                f['sentence_uniformity']         * 0.02 +
                # Linguistic (12%)
                f['information_density']         * 0.04 +
                f['hedging_language']            * 0.03 +
                f['sentence_complexity']         * 0.03 +
                f['vocabulary_consistency']      * 0.02 +
                # Human tone (16%)
                f['human_indicators']            * 0.03 +
                f['slang']                       * 0.02 +
                f['contractions']                * 0.02 +
                f['filler_words']                * 0.02 +
                f['self_correction']             * 0.02 +
                f['emphatic_punctuation']        * 0.02 +
                f['sentence_fragments']          * 0.01 +
                f['personal_anecdote']           * 0.02 +
                # Misc (10%)
                f['error_authenticity']          * 0.02 +
                f['contextual_consistency']      * 0.02 +
                f['emotional_variation']         * 0.02 +
                f['writing_rhythm']              * 0.02 +
                f['punctuation_rhythm']          * 0.02
            )   # sum = 1.00

        return float(np.clip(score, 0, 100))

    # ══════════════════════════════════════════════════════════════════════════
    #  SIGNAL COUNTING
    # ══════════════════════════════════════════════════════════════════════════

    def _count_signals(self, f, rf_score, roberta_score, gpt2_score):
        ai_signals    = 0
        human_signals = 0

        # heuristic AI signals
        if f['ai_phrases'] > 25:                   ai_signals += 1
        if f['repetition_score'] > 60:             ai_signals += 1
        if f['sentence_uniformity'] > 60:          ai_signals += 1
        if f['burstiness_score'] > 60:             ai_signals += 1
        if f['sentence_entropy'] > 55:             ai_signals += 1
        if f['discourse_coherence'] > 50:          ai_signals += 1
        if f['synonym_overuse'] > 55:              ai_signals += 1
        if f['sentence_transition_quality'] > 55:  ai_signals += 1
        if f['paragraph_topic_consistency'] > 55:  ai_signals += 1
        if f['transition_dependency'] > 40:        ai_signals += 1
        if f['information_density'] > 50:          ai_signals += 1
        if f['hedging_language'] > 45:             ai_signals += 1
        if f['academic_vocab_score'] > 55:         ai_signals += 1
        if f['academic_structure_score'] > 40:     ai_signals += 1
        if f['citation_density'] > 40:             ai_signals += 1
        # ML AI signals
        if rf_score is not None      and rf_score > 55:      ai_signals += 1
        if roberta_score is not None and roberta_score > 55: ai_signals += 1
        if gpt2_score is not None    and gpt2_score > 55:    ai_signals += 1

        # human signals (only fire when markers actively present)
        if f['slang'] < 30:                  human_signals += 2
        if f['contractions'] < 35:           human_signals += 2
        if f['filler_words'] < 30:           human_signals += 1
        if f['emphatic_punctuation'] < 30:   human_signals += 1
        if f['first_person_immediacy'] < 30: human_signals += 1
        if f['punctuation_chaos'] < 30:      human_signals += 1
        if f['error_authenticity'] < 35:     human_signals += 1
        if f['self_correction'] < 25:        human_signals += 2
        if f['personal_anecdote'] < 32:      human_signals += 1
        if f['casual_time_refs'] < 25:       human_signals += 1
        if f['direct_address'] < 25:         human_signals += 1
        if f['human_indicators'] < 30:       human_signals += 2

        return ai_signals, human_signals

    # ══════════════════════════════════════════════════════════════════════════
    #  ENSEMBLE BLEND — weights vary by word count
    #
    #  < 30 words  : 95% heuristic + 2% RF + 2% RoBERTa +  1% GPT-2
    #  30-49 words : 90% heuristic + 5% RF + 3% RoBERTa +  2% GPT-2
    #  50-74 words : 80% heuristic + 10% RF + 5% RoBERTa + 5% GPT-2
    #  75-150 words: 70% heuristic + 20% RF + 5% RoBERTa + 5% GPT-2
    #  150-250 wds : 60% heuristic + 30% RF + 5% RoBERTa + 5% GPT-2
    #  251-399 wds : 50% heuristic + 40% RF + 5% RoBERTa + 5% GPT-2
    #  400-4999 wds: 40% heuristic + 40% RF + 10% RoBERTa + 10% GPT-2
    #  5000+ words : 35% heuristic + 40% RF + 15% RoBERTa + 10% GPT-2
    #                (applied to sampled 5000-word representation)
    #
    #  If a model is unavailable its weight redistributes to heuristics.
    # ══════════════════════════════════════════════════════════════════════════

    def _blend(self, heuristic, rf, roberta, gpt2, word_count):
        # Select base weights by word count
        if word_count < 30:
            w_h, w_rf, w_rob, w_g = 0.95, 0.02, 0.02, 0.01
        elif word_count < 50:
            w_h, w_rf, w_rob, w_g = 0.90, 0.05, 0.03, 0.02
        elif word_count < 75:
            w_h, w_rf, w_rob, w_g = 0.80, 0.10, 0.05, 0.05
        elif word_count < 150:
            w_h, w_rf, w_rob, w_g = 0.70, 0.20, 0.05, 0.05
        elif word_count < 250:
            w_h, w_rf, w_rob, w_g = 0.60, 0.30, 0.05, 0.05
        elif word_count < 400:
            w_h, w_rf, w_rob, w_g = 0.50, 0.40, 0.05, 0.05
        elif word_count < 5000:
            w_h, w_rf, w_rob, w_g = 0.40, 0.40, 0.10, 0.10
        else:
            # 5000+ words: sampled text, lean more on ML models which
            # are not biased by positional coverage the way heuristics can be
            w_h, w_rf, w_rob, w_g = 0.35, 0.40, 0.15, 0.10

        # Redistribute unavailable model weights to heuristics
        if rf is None:      w_h += w_rf;  w_rf  = 0.0
        if roberta is None: w_h += w_rob; w_rob = 0.0
        if gpt2 is None:    w_h += w_g;   w_g   = 0.0

        final = (heuristic * w_h
                 + (rf      or 0) * w_rf
                 + (roberta or 0) * w_rob
                 + (gpt2    or 0) * w_g)

        return float(np.clip(final, 0, 100))

    # ══════════════════════════════════════════════════════════════════════════
    #  CONFIDENCE
    #  Formula: agreement = 1 - (spread / 100)
    #           strength  = abs(final - 50) * 2
    #           confidence = strength * agreement
    # ══════════════════════════════════════════════════════════════════════════

    def _calibrate_confidence(self, heuristic, rf, roberta, gpt2, final_score, word_count):
        available = [s for s in [heuristic, rf, roberta, gpt2] if s is not None]

        if len(available) < 2:
            spread = 0
        else:
            spread = max(available) - min(available)

        agreement  = 1.0 - (spread / 100.0)
        strength   = abs(final_score - 50) * 2.0
        confidence = strength * agreement

        return float(np.clip(confidence, 0, 99))

    # ══════════════════════════════════════════════════════════════════════════
    #  LABELS
    # ══════════════════════════════════════════════════════════════════════════

    def _get_label(self, score):
        if score >= 85:   return '🤖 AI-GENERATED (Very High Confidence)'
        elif score >= 70: return '🤖 AI-GENERATED (High Confidence)'
        elif score >= 60: return '⚠️ LIKELY AI-GENERATED'
        elif score >= 50: return '🔀 MIXED HUMAN + AI CONTENT'
        elif score >= 31: return 'ℹ️ LIKELY HUMAN-WRITTEN'
        else:             return '✅ HUMAN-WRITTEN (High Confidence)'

    def _get_recommendation(self, score, confidence):
        if score >= 70 and confidence >= 60:
            return 'HIGH_AI — automated flagging recommended'
        elif score >= 60:
            return 'MODERATE_AI — manual review recommended'
        elif score >= 50:
            return 'HYBRID — possible AI-assisted writing'
        else:
            return 'HUMAN — likely authentic writing'

    # ══════════════════════════════════════════════════════════════════════════
    #  MAIN DETECT
    # ══════════════════════════════════════════════════════════════════════════

    def detect(self, text):
        text             = text.strip()
        original_wc      = len(text.split())
        was_sampled      = False
        sampled_wc       = original_wc

        # ── HARD BLOCK: < 20 words — return error, no detection attempted ──────
        if original_wc < 20:
            return {
                'error':            True,
                'label':            '❌ ERROR: Text Too Short',
                'message':          (
                    f'Input has only {original_wc} word'
                    + ('s' if original_wc != 1 else '')
                    + '. A minimum of 20 words is required for detection. '
                    + 'Please provide more text.'
                ),
                'word_count':       original_wc,
                'min_required':     20,
                'ai_percentage':    None,
                'human_percentage': None,
                'confidence':       None,
                'warning':          (
                    f'⚠️ ERROR: Input has only {original_wc} word'
                    + ('s' if original_wc != 1 else '')
                    + '. A minimum of 20 words is required for detection. '
                    + 'Please provide more text.'
                ),
            }

        # ── LONG-TEXT SAMPLING: > MAX_WORDS words ─────────────────────────────
        # Sample representatively from all sections so analysis is not
        # front-loaded. The original word count is preserved for reporting;
        # detection runs on the sampled text only.
        if original_wc > self.MAX_WORDS:
            text        = self._sample_text(text, original_wc)
            sampled_wc  = len(text.split())
            was_sampled = True

        # word_count used for weight selection uses the ORIGINAL count so that
        # the 5000+ blend tier is correctly selected for very long documents.
        word_count = original_wc

        # ── feature extraction ────────────────────────────────────────────────
        features  = self._extract_all_features(text)

        # ── RF score ──────────────────────────────────────────────────────────
        rf_score = None
        if self.rf.available:
            try:
                rf_features = [[
                    features["sentence_uniformity"],
                    features["vocab_diversity"],
                    features["repetition_score"],
                    features["pos_pattern"],
                    features["ai_phrases"],
                    features["passive_voice"],
                    features["ngram_diversity"],
                    features["readability"],
                    features["punctuation_diversity"],
                    features["burstiness"],
                    features["human_indicators"],
                    features["sentence_perplexity_variance"],
                    features["semantic_coherence"],
                    features["statistical_outliers"],
                    features["transition_dependency"],
                    features["error_authenticity"],
                    features["contextual_consistency"],
                    features["writing_rhythm"],
                    features["citation_density"],
                    features["information_density"],
                    features["quote_integration_pattern"]
                ]]

                rf_scaled = self.rf.vectorizer.transform(rf_features)  # scaler
                rf_prob   = self.rf.model.predict_proba(rf_scaled)[0][1]
                rf_score  = float(np.clip(rf_prob * 100, 0, 100))

            except Exception as e:
                print(f"   ⚠️ RF predict error: {e}")
                rf_score = None

        roberta_score = self.roberta.predict(text)
        gpt2_score    = self.gpt2.predict(text)

        # ── heuristic score ───────────────────────────────────────────────────
        heuristic_score = self._heuristic_score(features, word_count)

        # ── signal counting ───────────────────────────────────────────────────
        ai_signals, human_signals = self._count_signals(
            features, rf_score, roberta_score, gpt2_score)

        # ── ensemble blend ────────────────────────────────────────────────────
        final = self._blend(heuristic_score, rf_score, roberta_score, gpt2_score, word_count)

        # ── academic AI boost ─────────────────────────────────────────────────
        if (features.get('academic_structure_score', 0) > 50
                and features.get('academic_vocab_score', 0) > 55
                and word_count >= 50):
            final = min(final + 5, 99)

        # ── AI signal boosts ──────────────────────────────────────────────────
        # Suppressed entirely for short texts — human must dominate below 50 words
        if word_count >= 50:
            if ai_signals >= 14:    final = min(final * 1.18, 99)
            elif ai_signals >= 11:  final = min(final * 1.12, 99)
            elif ai_signals >= 8:   final = min(final * 1.07, 99)
            elif ai_signals >= 5:   final = min(final * 1.03, 99)

        # ── human signal reductions ───────────────────────────────────────────
        if word_count < 50:
            # Strong human-dominance bias for short texts
            # Base dampening: always pull score toward human territory
            final *= 0.55
            # Additional reductions for active human markers
            if human_signals >= 6:      final *= 0.55
            elif human_signals >= 4:    final *= 0.65
            elif human_signals >= 2:    final *= 0.75
            # Hard cap: short texts cannot exceed 55% AI
            final = min(final, 55.0)
        else:
            if human_signals >= 6:      final *= 0.75
            elif human_signals >= 4:    final *= 0.85
            elif human_signals >= 2:    final *= 0.92

        final = float(np.clip(final, 0, 100))
        # Fix floating-point precision — round to 2 decimal places
        final = round(final, 2)
        human = round(100.0 - final, 2)

        # ── confidence ────────────────────────────────────────────────────────
        confidence = self._calibrate_confidence(
            heuristic_score, rf_score, roberta_score, gpt2_score, final, word_count)
        confidence = float(np.clip(confidence, 0, 99))

        # ── build result ──────────────────────────────────────────────────────
        result = {
            'label':             self._get_label(final),
            'ai_percentage':     final,
            'human_percentage':  human,
            'confidence':        round(confidence, 2),
            'strong_ai_signals': ai_signals,
            'human_signals':     human_signals,
            'word_count':        original_wc,
            'recommendation':    self._get_recommendation(final, confidence),
            'components': {
                'Heuristics':    f'{heuristic_score:.1f}%',
                'RF Model':      f'{rf_score:.1f}%'      if rf_score      is not None else 'N/A',
                'RoBERTa':       f'{roberta_score:.1f}%' if roberta_score is not None else 'N/A',
                'GPT-2':         f'{gpt2_score:.1f}%'   if gpt2_score   is not None else 'N/A',
                'Blend':         self._blend_label(word_count,
                                                   rf_score, roberta_score, gpt2_score),
            },
            'heuristic_breakdown': {k: round(v, 1) for k, v in features.items()},
        }

        # ── warnings ──────────────────────────────────────────────────────────
        if was_sampled:
            result['warning'] = (
                f'ℹ️ Text is very long ({original_wc:,} words). '
                f'Analysed a representative {sampled_wc:,}-word sample drawn '
                f'evenly from 5 sections of the document (beginning, three '
                f'middle thirds, and end). Full structural coverage maintained.'
            )
            result['sampled']           = True
            result['original_word_count'] = original_wc
            result['sampled_word_count']  = sampled_wc
        elif word_count < 50:
            result['warning'] = f'⚠️ Short text ({word_count} words). Reduced confidence.'
        elif word_count < 100:
            result['warning'] = 'ℹ️ 150+ words gives best accuracy.'

        return result

    def _blend_label(self, wc, rf, rob, gpt2):
        """Generate a human-readable blend label showing active model weights."""
        if wc < 30:
            w_rf, w_rob, w_g = (0.0 if rf is None else 0.02,
                                 0.0 if rob is None else 0.02,
                                 0.0 if gpt2 is None else 0.01)
        elif wc < 50:
            w_rf, w_rob, w_g = (0.0 if rf is None else 0.05,
                                 0.0 if rob is None else 0.03,
                                 0.0 if gpt2 is None else 0.02)
        elif wc < 75:
            w_rf, w_rob, w_g = (0.0 if rf is None else 0.10,
                                 0.0 if rob is None else 0.05,
                                 0.0 if gpt2 is None else 0.05)
        elif wc < 150:
            w_rf, w_rob, w_g = (0.0 if rf is None else 0.20,
                                 0.0 if rob is None else 0.05,
                                 0.0 if gpt2 is None else 0.05)
        elif wc < 250:
            w_rf, w_rob, w_g = (0.0 if rf is None else 0.30,
                                 0.0 if rob is None else 0.05,
                                 0.0 if gpt2 is None else 0.05)
        elif wc < 400:
            w_rf, w_rob, w_g = (0.0 if rf is None else 0.40,
                                 0.0 if rob is None else 0.05,
                                 0.0 if gpt2 is None else 0.05)
        elif wc < 5000:
            w_rf, w_rob, w_g = (0.0 if rf is None else 0.40,
                                 0.0 if rob is None else 0.10,
                                 0.0 if gpt2 is None else 0.10)
        else:
            # 5000+ words
            w_rf, w_rob, w_g = (0.0 if rf is None else 0.40,
                                 0.0 if rob is None else 0.15,
                                 0.0 if gpt2 is None else 0.10)

        w_h = round(1.0 - w_rf - w_rob - w_g, 2)

        parts = [f'{int(round(w_h * 100))}% heuristic']
        if w_rf  > 0: parts.append(f'{int(round(w_rf  * 100))}% RF')
        if w_rob > 0: parts.append(f'{int(round(w_rob * 100))}% RoBERTa')
        if w_g   > 0: parts.append(f'{int(round(w_g   * 100))}% GPT-2')
        return ' + '.join(parts)

    # ══════════════════════════════════════════════════════════════════════════
    #  BATCH DETECT
    # ══════════════════════════════════════════════════════════════════════════

    def detect_batch(self, texts):
        """
        Efficient batch detection — RF predictions are vectorised in one call.
        Texts exceeding MAX_WORDS are sampled before processing.
        """
        texts_stripped = [t.strip() for t in texts]

        # Pre-sample any texts that exceed MAX_WORDS; track original counts
        processed_texts  = []
        original_wcs     = []
        sampled_flags    = []
        sampled_wcs      = []

        for t in texts_stripped:
            owc = len(t.split())
            original_wcs.append(owc)
            if owc > self.MAX_WORDS:
                sampled = self._sample_text(t, owc)
                processed_texts.append(sampled)
                sampled_flags.append(True)
                sampled_wcs.append(len(sampled.split()))
            else:
                processed_texts.append(t)
                sampled_flags.append(False)
                sampled_wcs.append(owc)

        # batch RF (fast — single transform) on valid texts
        valid_texts = [t for t, owc in zip(processed_texts, original_wcs) if owc >= 20]
        rf_batch    = self.rf.predict_batch(valid_texts) if valid_texts else []
        rf_iter     = iter(rf_batch)

        results = []
        for text, original_wc, was_sampled, sampled_wc in zip(
                processed_texts, original_wcs, sampled_flags, sampled_wcs):

            if original_wc < 20:
                # Hard error — below minimum word count
                results.append({
                    'error':            True,
                    'label':            '❌ ERROR: Text Too Short',
                    'message':          (
                        f'Input has only {original_wc} word'
                        + ('s' if original_wc != 1 else '')
                        + '. A minimum of 20 words is required for detection. '
                        + 'Please provide more text.'
                    ),
                    'word_count':       original_wc,
                    'min_required':     20,
                    'ai_percentage':    None,
                    'human_percentage': None,
                    'confidence':       None,
                    'warning':          (
                        f'⚠️ ERROR: Input has only {original_wc} word'
                        + ('s' if original_wc != 1 else '')
                        + '. A minimum of 20 words is required for detection. '
                        + 'Please provide more text.'
                    ),
                })
                continue

            # Use original_wc for blend-tier selection; sampled text for features
            word_count    = original_wc
            rf_score      = next(rf_iter, None)
            roberta_score = self.roberta.predict(text)
            gpt2_score    = self.gpt2.predict(text)
            features      = self._extract_all_features(text)
            heuristic     = self._heuristic_score(features, word_count)
            ai_sig, hu_sig = self._count_signals(features, rf_score, roberta_score, gpt2_score)

            final = self._blend(heuristic, rf_score, roberta_score, gpt2_score, word_count)

            if (features.get('academic_structure_score', 0) > 50
                    and features.get('academic_vocab_score', 0) > 55
                    and word_count >= 50):
                final = min(final + 5, 99)

            # AI signal boosts suppressed for short texts
            if word_count >= 50:
                if ai_sig >= 14:    final = min(final * 1.18, 99)
                elif ai_sig >= 11:  final = min(final * 1.12, 99)
                elif ai_sig >= 8:   final = min(final * 1.07, 99)
                elif ai_sig >= 5:   final = min(final * 1.03, 99)

            if word_count < 50:
                # Strong human-dominance bias for short texts
                final *= 0.55
                if hu_sig >= 6:     final *= 0.55
                elif hu_sig >= 4:   final *= 0.65
                elif hu_sig >= 2:   final *= 0.75
                final = min(final, 55.0)
            else:
                if hu_sig >= 6:     final *= 0.60
                elif hu_sig >= 4:   final *= 0.72
                elif hu_sig >= 2:   final *= 0.86

            final      = round(float(np.clip(final, 0, 100)), 2)
            confidence = self._calibrate_confidence(
                heuristic, rf_score, roberta_score, gpt2_score, final, word_count)

            entry = {
                'label':             self._get_label(final),
                'ai_percentage':     final,
                'human_percentage':  round(100.0 - final, 2),
                'confidence':        round(float(np.clip(confidence, 0, 99)), 2),
                'strong_ai_signals': ai_sig,
                'human_signals':     hu_sig,
                'word_count':        original_wc,
                'recommendation':    self._get_recommendation(final, confidence),
            }

            if was_sampled:
                entry['warning'] = (
                    f'ℹ️ Text is very long ({original_wc:,} words). '
                    f'Analysed a representative {sampled_wc:,}-word sample drawn '
                    f'evenly from 5 sections of the document.'
                )
                entry['sampled']             = True
                entry['original_word_count'] = original_wc
                entry['sampled_word_count']  = sampled_wc

            results.append(entry)

        return results


# ══════════════════════════════════════════════════════════════════════════════
#  DROP-IN EXPORT
# ══════════════════════════════════════════════════════════════════════════════
_detector = None

def get_detector(model_path='dataset_model.pkl', tfidf_path='dataset_scaler.pkl'):
    global _detector
    if _detector is None:
        _detector = UltimateAIDetector(model_path=model_path, tfidf_path=tfidf_path)
    return _detector

def ai_likelihood_score(text, model_path='dataset_model.pkl', tfidf_path='dataset_scaler.pkl'):
    return get_detector(model_path, tfidf_path).detect(text)


# ══════════════════════════════════════════════════════════════════════════════
#  QUICK TEST
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', default='dataset_model.pkl')
    parser.add_argument('--tfidf', default='dataset_scaler.pkl')
    args = parser.parse_args()

    detector = UltimateAIDetector(model_path=args.model, tfidf_path=args.tfidf)

    tests = [
        ("SHORT WARNING — too short (shows human score + warning)",
         "This is AI text."),

        ("AI essay (general)",
         "Artificial intelligence represents a pivotal paradigm shift in modern technology. "
         "Furthermore, it is important to note that machine learning algorithms demonstrate "
         "remarkable capabilities in data processing. Additionally, neural networks exemplify "
         "the potential of computational intelligence. Consequently, it is evident that AI "
         "will fundamentally transform numerous industries. Moreover, the implications of "
         "these advancements underscore the need for comprehensive regulatory frameworks. "
         "In conclusion, artificial intelligence posits both significant opportunities and "
         "challenges that necessitate careful consideration by policymakers and stakeholders."),

        ("Human casual",
         "ok so i've been thinking about this for a while and honestly? i'm not sure AI "
         "is as great as everyone says lol. like yeah it can write stuff but it feels "
         "so... robotic? idk. my friend showed me this essay it wrote and i was like "
         "wow that's actually kinda impressive but then i read it again and something "
         "felt off. you know what i mean? it's hard to explain. anyway i gotta go "
         "finish my actual homework lol"),

        ("Formal human academic",
         "The epistemological foundations of democratic governance rest upon an informed "
         "citizenry capable of critical deliberation. When citizens lack access to reliable "
         "information, the legitimacy of collective decision-making becomes questionable. "
         "This essay argues that media literacy education should be mandatory in secondary "
         "schools, drawing on empirical evidence from three countries. The data suggest — "
         "though do not conclusively prove — that early exposure to source evaluation "
         "techniques correlates with higher civic participation rates in adulthood."),

        ("AI academic (love essay)",
         "Love, conceptualized as profound attachment and affiliative bonding, constitutes "
         "a cornerstone of human experience, transcending subjective sentiment to reveal "
         "adaptive mechanisms honed by natural selection. From an evolutionary vantage, "
         "Helen Fisher delineates three neural circuits: lust (testosterone/estrogen-driven), "
         "attraction (dopamine/norepinephrine-fueled), and attachment (oxytocin/vasopressin-mediated), "
         "as corroborated by fMRI studies showing ventral tegmental area activation akin to "
         "addictive states (Fisher et al., 2005). Psychologically, love manifests as a "
         "multifaceted construct. In conclusion, love integrates neurobiological imperatives "
         "with volitional agency, demanding ethical navigation to foster resilience."),

        ("Long-text sampling test (6000 simulated words)",
         " ".join([
             "The researcher examined multiple paradigms of computational theory.",
             "Furthermore, the analysis demonstrated significant correlations.",
             "Additionally, it is important to note the broader implications.",
             "Consequently, the framework necessitates further investigation.",
             "Moreover, these findings underscore the complexity of the domain.",
         ] * 400)),  # ~6000 words
    ]

    print(f"\n{'='*65}")
    for name, text in tests:
        result = detector.detect(text)
        print(f"\nTest:        {name}")
        print(f"Label:       {result['label']}")
        print(f"AI score:    {result['ai_percentage']}%")
        print(f"Human score: {result['human_percentage']}%")
        print(f"Confidence:  {result['confidence']}%")
        print(f"AI signals:  {result['strong_ai_signals']}  |  Human: {result['human_signals']}")
        print(f"Word count:  {result['word_count']:,}")
        print(f"Components:  {result['components']}")
        if result.get('error'):
            print(f"⚠️  WARNING:  {result['warning']}")
        elif 'warning' in result:
            print(f"Warning:     {result['warning']}")
        print(f"{'='*65}")