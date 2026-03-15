import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

nltk.download('punkt', quiet=True)

def sentence_level_similarity(text1, text2, threshold=0.7):
    sentences1 = nltk.sent_tokenize(text1)
    sentences2 = nltk.sent_tokenize(text2)

    results = []

    for s1 in sentences1:
        vectorizer = TfidfVectorizer()
        tfidf = vectorizer.fit_transform([s1] + sentences2)

        similarities = cosine_similarity(tfidf[0:1], tfidf[1:])[0]
        max_similarity = similarities.max() if len(similarities) > 0 else 0

        if max_similarity >= threshold:
            results.append({
                "sentence": s1,
                "similarity_percentage": round(max_similarity * 100, 2)
            })

    return results
