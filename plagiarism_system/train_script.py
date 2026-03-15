import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score


def train_model(csv_path=r"C:\AI_plagarism\plagiarism_system\dataset_results.csv"):

    print("Loading dataset...")

    df = pd.read_csv(csv_path)

    print("Total rows:", len(df))

    # Clean label column
    df["true_label"] = df["true_label"].astype(str).str.strip().str.lower()

    # Feature columns used by your detector
    feature_columns = [
        "sentence_uniformity",
        "vocab_diversity",
        "repetition_score",
        "pos_pattern",
        "ai_phrases",
        "passive_voice",
        "ngram_diversity",
        "readability",
        "punctuation_diversity",
        "burstiness",
        "human_indicators",
        "sentence_perplexity_variance",
        "semantic_coherence",
        "statistical_outliers",
        "transition_dependency",
        "error_authenticity",
        "contextual_consistency",
        "writing_rhythm",
        "citation_density",
        "information_density",
        "quote_integration_pattern"
    ]

    # Ensure features exist
    for col in feature_columns:
        if col not in df.columns:
            raise ValueError(f"Missing column in dataset: {col}")

    # Convert features to numeric
    df[feature_columns] = df[feature_columns].apply(pd.to_numeric, errors="coerce")

    # Fill missing values
    df = df.fillna(0)

    # Convert labels
    df["label"] = df["true_label"].map({"human": 0, "ai": 1})

    # Remove invalid rows
    df = df.dropna(subset=["label"])

    print("\nLabel distribution:")
    print(df["label"].value_counts())

    X = df[feature_columns]
    y = df["label"]

    # Train test split
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    # Scale features
    scaler = StandardScaler()

    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train RF model
    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=20,
        random_state=42
    )

    print("\nTraining model...")

    model.fit(X_train_scaled, y_train)

    # Predictions
    y_pred = model.predict(X_test_scaled)

    # Evaluation
    accuracy = accuracy_score(y_test, y_pred)

    print("\nModel Accuracy:", round(accuracy, 4))
    print("\nClassification Report:\n")
    print(classification_report(y_test, y_pred))

    # Save model
    joblib.dump(model, "dataset_model.pkl")
    joblib.dump(scaler, "dataset_scaler.pkl")

    print("\nModel saved:")
    print("dataset_model.pkl")
    print("dataset_scaler.pkl")


if __name__ == "__main__":
    train_model()