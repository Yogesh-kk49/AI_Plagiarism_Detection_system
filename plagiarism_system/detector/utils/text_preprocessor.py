import re
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

# Ensure required NLTK data is present. NLTK doesn't ship these corpora by
# default, so if this is the first time this process runs on a fresh
# environment (e.g. right after a new Render deploy), download them now
# instead of crashing. Safe to call every startup: nltk.download() is a
# no-op if the resource is already present.
for _resource, _path in (
    ("punkt", "tokenizers/punkt"),
    ("punkt_tab", "tokenizers/punkt_tab"),
    ("stopwords", "corpora/stopwords"),
):
    try:
        nltk.data.find(_path)
    except LookupError:
        nltk.download(_resource, quiet=True)

stop_words = set(stopwords.words('english'))

def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'[^a-z\s]', '', text)
    tokens = word_tokenize(text)
    tokens = [w for w in tokens if w not in stop_words]
    return " ".join(tokens)