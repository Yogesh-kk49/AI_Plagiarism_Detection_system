import os
import csv
from detector.utils.ai_heuristic import ai_likelihood_score

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, "dataset")
OUTPUT_FILE = os.path.join(BASE_DIR, "dataset_results.csv")


def analyze_folder(folder_name, label):
    results = []
    folder_path = os.path.join(DATASET_PATH, folder_name)

    for filename in os.listdir(folder_path):
        if filename.endswith(".txt"):
            file_path = os.path.join(folder_path, filename)

            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()

            result = ai_likelihood_score(text)

            row = {
                "file": filename,
                "true_label": label,
                "ai_percentage": result["ai_percentage"],
                "confidence": result["confidence"],
                "strong_signals": result.get("strong_signals", 0),
                "strong_human_signals": result.get("strong_human_signals", 0)
            }

            # Add heuristic breakdown if exists
            if "heuristic_breakdown" in result:
                for key, value in result["heuristic_breakdown"].items():
                    row[key] = value

            results.append(row)

    return results


def main():
    all_results = []

    print("🔍 Analyzing Human Texts...")
    all_results += analyze_folder("human", "human")

    print("🔍 Analyzing AI Texts...")
    all_results += analyze_folder("ai", "ai")

    if not all_results:
        print("❌ No files found.")
        return

    keys = all_results[0].keys()

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=keys)
        writer.writeheader()
        writer.writerows(all_results)

    print("✅ Dataset analysis complete.")
    print(f"📁 Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
