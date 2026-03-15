from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def compare_essays(text1: str, text2: str):
    MAX_CHARS = 50_000
    text1 = text1[:MAX_CHARS]
    text2 = text2[:MAX_CHARS]

    if not text1.strip() or not text2.strip():
        return {"error": "Both documents are required."}

    vectorizer = TfidfVectorizer(
        stop_words="english",
        lowercase=True,
        ngram_range=(1, 2)
    )

    vectors = vectorizer.fit_transform([text1, text2])
    similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]

    percentage = round(similarity * 100, 2)

    if percentage >= 70:
        severity = "High"
    elif percentage >= 40:
        severity = "Medium"
    else:
        severity = "Low"

    return {
        "similarity_percentage": percentage,
        "severity": severity
    }