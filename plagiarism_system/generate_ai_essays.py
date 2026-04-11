"""
generate_ai_essays.py
=====================
Generates 200 AI-written essays across 200 unique topics,
with mixed lengths (short/medium/long), and saves each as
a numbered .txt file in ./ai_essays/

SETUP:
    pip install anthropic

USAGE:
    export ANTHROPIC_API_KEY="sk-ant-..."
    python generate_ai_essays.py

    # OR pass key directly:
    python generate_ai_essays.py --api-key sk-ant-...

    # Resume from where you left off (safe to re-run):
    python generate_ai_essays.py --resume

OUTPUT:
    ai_essays/
        essay_001.txt
        essay_002.txt
        ...
        essay_200.txt
        manifest.json   ← topic, length, word count per file
"""

import os
import json
import time
import argparse
import anthropic

# ── 200 unique topics (no repeats) ───────────────────────────────────────────
TOPICS = [
    # Science & Nature
    "The role of mitochondria in cellular energy production",
    "How black holes form and what happens inside them",
    "The process of photosynthesis and its importance to life on Earth",
    "CRISPR gene editing: how it works and its medical potential",
    "The water cycle and its relationship to climate change",
    "Why quantum entanglement challenges classical physics",
    "The evolution of antibiotic resistance in bacteria",
    "How volcanoes shape Earth's geological history",
    "The human microbiome and its effects on mental health",
    "Dark matter: what we know and what remains unknown",

    # Technology & AI
    "How large language models are trained on text data",
    "The ethics of facial recognition technology in public spaces",
    "Blockchain technology and its applications beyond cryptocurrency",
    "Why self-driving cars have not yet replaced human drivers",
    "The rise of deepfake technology and its societal risks",
    "How recommendation algorithms shape what we see online",
    "Quantum computing: current state and future possibilities",
    "The environmental cost of training AI models",
    "5G networks and their impact on global connectivity",
    "Cybersecurity threats in an increasingly connected world",

    # History
    "The causes and consequences of the fall of the Roman Empire",
    "How the printing press transformed European society",
    "The economic factors behind the First World War",
    "The role of women in the French Revolution",
    "How the Silk Road shaped cultural exchange between civilizations",
    "The origins and global spread of the Black Death",
    "The legacy of colonialism in modern African nations",
    "Why the Byzantine Empire survived longer than Rome",
    "The scientific achievements of the Islamic Golden Age",
    "How the Cold War shaped modern geopolitics",

    # Social Issues
    "The causes of income inequality in developed nations",
    "How social media affects teenage mental health",
    "The case for and against universal basic income",
    "Mass incarceration and its impact on communities of color",
    "The gender pay gap: causes, myths, and realities",
    "How homelessness is addressed differently across countries",
    "The psychological effects of long-term unemployment",
    "Immigration policy and its economic consequences",
    "The ethics of affirmative action in university admissions",
    "How poverty cycles are reinforced through education systems",

    # Environment & Climate
    "The science of ocean acidification and its effects on marine life",
    "Deforestation in the Amazon and its global climate impact",
    "How renewable energy can replace fossil fuels by 2050",
    "The politics of international climate agreements",
    "Microplastics in the food chain: risks and solutions",
    "Urban heat islands and strategies to cool cities",
    "The impact of fast fashion on global carbon emissions",
    "How electric vehicles reduce — and sometimes increase — emissions",
    "Wildlife corridors and biodiversity conservation",
    "The ethics of geoengineering as a climate solution",

    # Philosophy & Ethics
    "Utilitarianism versus deontological ethics in moral decision-making",
    "The philosophical problem of free will in a deterministic universe",
    "What makes a life meaningful according to existentialist thinkers",
    "The ethics of eating meat in the 21st century",
    "Personal identity: are you the same person you were ten years ago",
    "The trolley problem and its real-world applications in AI",
    "Why Socrates chose death over exile",
    "The concept of justice in Rawls's theory of the veil of ignorance",
    "Moral relativism and its consequences for human rights",
    "The philosophy of mind: can machines truly be conscious",

    # Economics
    "How inflation erodes purchasing power and savings",
    "The economics of addiction and its costs to society",
    "Why free trade agreements benefit some and harm others",
    "The role of central banks in managing economic crises",
    "How monopolies form and why they are difficult to break",
    "The gig economy: freedom or exploitation for workers",
    "Why some nations fail to develop despite natural resources",
    "The behavioral economics of irrational financial decisions",
    "How automation is changing the labor market",
    "Cryptocurrency as a hedge against inflation: claims and reality",

    # Psychology
    "The psychology of conformity and social pressure",
    "How childhood trauma shapes adult behavior",
    "The science of habit formation and how to break bad ones",
    "Cognitive biases that affect everyday decision-making",
    "The Dunning-Kruger effect and why incompetent people overestimate themselves",
    "How sleep deprivation affects cognitive performance",
    "The psychology of conspiracy theories and why people believe them",
    "Attachment theory and its effects on romantic relationships",
    "How advertising exploits psychological vulnerabilities",
    "The difference between introversion and social anxiety",

    # Literature & Arts
    "Symbolism in George Orwell's Nineteen Eighty-Four",
    "How modernism broke with traditional literary conventions",
    "The role of unreliable narrators in contemporary fiction",
    "Shakespeare's influence on the English language",
    "The relationship between trauma and artistic expression",
    "How music affects emotions and cognitive performance",
    "The evolution of street art from vandalism to gallery walls",
    "Censorship in literature: historical and contemporary cases",
    "How architecture reflects the values of its era",
    "The cultural significance of oral storytelling traditions",

    # Health & Medicine
    "How vaccines train the immune system",
    "The opioid crisis: pharmaceutical responsibility and public health",
    "Mental health stigma and why it persists in many cultures",
    "How sugar consumption is linked to metabolic disease",
    "The placebo effect and what it reveals about the mind-body connection",
    "Antibiotic overuse and the looming post-antibiotic era",
    "How exercise changes the brain at a neurological level",
    "The challenges of diagnosing rare diseases",
    "Gene therapy: promises, risks, and ethical boundaries",
    "Healthcare disparities between wealthy and low-income nations",

    # Education
    "The case for abolishing standardized testing",
    "How project-based learning compares to traditional instruction",
    "The digital divide and unequal access to online education",
    "Why teacher salaries matter for educational outcomes",
    "The Montessori method and its long-term effectiveness",
    "How student loan debt shapes life decisions in the United States",
    "Bilingual education and its cognitive benefits",
    "The role of play in early childhood development",
    "Why critical thinking should be a core school subject",
    "The impact of smartphones in the classroom",

    # Politics & Governance
    "How gerrymandering undermines democratic representation",
    "The rise of populism in Western democracies",
    "Direct democracy versus representative democracy",
    "How lobbying shapes legislation in the United States",
    "The role of international organizations like the UN in conflict resolution",
    "Whistleblowers: heroes or threats to national security",
    "The ethics of political surveillance",
    "How disinformation campaigns influence elections",
    "The debate over term limits for elected officials",
    "Why voter turnout is declining in established democracies",

    # Space & Astronomy
    "The feasibility of human colonization of Mars",
    "How the James Webb Space Telescope is changing our view of the universe",
    "The search for extraterrestrial life and the Fermi paradox",
    "Space debris and the growing risk to satellites",
    "How gravitational waves are detected and what they reveal",
    "The commercial space race and its implications",
    "Terraforming: the science and ethics of changing another planet",
    "Neutron stars and the physics of extreme density",
    "How asteroids are monitored for Earth impact threats",
    "The origins of the Moon and the giant impact hypothesis",

    # Food & Agriculture
    "The environmental impact of beef production",
    "Vertical farming and its potential to feed urban populations",
    "How food deserts contribute to health disparities",
    "The science behind fermented foods and gut health",
    "GMO crops: risks, benefits, and public perception",
    "The history and economics of the global coffee trade",
    "How industrial agriculture depletes soil quality",
    "Food waste and strategies to reduce it at scale",
    "The cultural significance of food in national identity",
    "Lab-grown meat: technology, taste, and ethics",

    # Law & Justice
    "The debate over capital punishment in modern democracies",
    "How international law governs cyber warfare",
    "Restorative justice as an alternative to punitive sentencing",
    "The right to privacy in the digital age",
    "How intellectual property law stifles or encourages innovation",
    "The legal status of autonomous weapons systems",
    "Corporate criminal liability and how to make it effective",
    "The history and ongoing struggle for voting rights",
    "Animal rights and the limitations of current legal protections",
    "How legal systems fail victims of domestic violence",

    # Culture & Society
    "How globalization is reshaping cultural identity",
    "The ethics of cultural appropriation",
    "How video games have become a dominant cultural medium",
    "The decline of religion in Western societies",
    "How language shapes the way we think",
    "The cultural impact of the K-pop phenomenon",
    "Toxic masculinity: definition, causes, and consequences",
    "How nostalgia is used as a marketing and political tool",
    "The role of humor in coping with social trauma",
    "Cancel culture: accountability or mob justice",

    # Business & Innovation
    "How startups disrupt established industries",
    "The ethics of data collection by technology companies",
    "Why most mergers and acquisitions fail to create value",
    "The psychology of pricing and consumer behavior",
    "How remote work is permanently changing corporate culture",
    "The role of failure in fostering innovation",
    "Supply chain vulnerabilities exposed by the COVID-19 pandemic",
    "How platform monopolies like Amazon affect small businesses",
    "The ethics of planned obsolescence in consumer electronics",
    "Social entrepreneurship: profit with purpose",

    # Miscellaneous Unique Topics
    "The neuroscience of music and why it gives us chills",
    "How language extinction affects cultural diversity",
    "The mathematics of voting systems and why no system is perfect",
    "The history of cryptography from Caesar ciphers to modern encryption",
    "How urban planning affects social cohesion and mental health",
    "The psychology of loneliness in an age of social media",
    "How color perception differs across cultures",
    "The science and ethics of human enhancement technologies",
    "Why ancient civilizations independently developed similar structures",
    "The future of democracy in an age of artificial intelligence",
]

# ── length distribution: 200 essays, mixed ────────────────────────────────────
# short=67, medium=67, long=66
LENGTH_CONFIG = (
    [("short",  "100 to 200 words")] * 67 +
    [("medium", "300 to 500 words")] * 67 +
    [("long",   "600 to 900 words")] * 66
)

# Shuffle so lengths are interleaved, not in blocks
import random
random.seed(42)
random.shuffle(LENGTH_CONFIG)

assert len(TOPICS) == 200, f"Expected 200 topics, got {len(TOPICS)}"
assert len(LENGTH_CONFIG) == 200


def build_prompt(topic: str, length_label: str, word_range: str) -> str:
    return (
        f"Write a {length_label} essay ({word_range}) on the following topic:\n\n"
        f"Topic: {topic}\n\n"
        f"Requirements:\n"
        f"- Write in a formal, academic AI style\n"
        f"- Use transitional phrases like 'furthermore', 'moreover', 'consequently'\n"
        f"- Avoid personal anecdotes, contractions, slang, or first-person opinion\n"
        f"- Structure with a clear introduction, body, and conclusion\n"
        f"- Do NOT include a title or heading — body text only\n"
        f"- Stay strictly within the {word_range} word count"
    )


def generate_essay(client: anthropic.Anthropic, topic: str,
                   length_label: str, word_range: str) -> str:
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1200,
        messages=[
            {
                "role": "user",
                "content": build_prompt(topic, length_label, word_range)
            }
        ]
    )
    return message.content[0].text.strip()


def word_count(text: str) -> int:
    return len(text.split())


def main():
    parser = argparse.ArgumentParser(description="Generate 200 AI essays for dataset")
    parser.add_argument("--api-key", default=None,
                        help="Anthropic API key (or set ANTHROPIC_API_KEY env var)")
    parser.add_argument("--output-dir", default="dataset/ai",
                        help="Directory to save essays (default: dataset/ai/)")
    parser.add_argument("--resume", action="store_true",
                        help="Skip already-generated files and resume")
    parser.add_argument("--delay", type=float, default=0.5,
                        help="Seconds to wait between API calls (default: 0.5)")
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ No API key found.")
        print("   Set ANTHROPIC_API_KEY env var or pass --api-key sk-ant-...")
        return

    client = anthropic.Anthropic(api_key=api_key)
    out_dir = args.output_dir
    os.makedirs(out_dir, exist_ok=True)  # creates dataset/ai/ and any parent dirs

    manifest_path = os.path.join(out_dir, "manifest.json")
    manifest = {}
    if os.path.exists(manifest_path):
        with open(manifest_path) as f:
            manifest = json.load(f)

    print(f"📂 Output directory: {out_dir}/")
    print(f"📝 Generating 200 essays across 200 unique topics...")
    print(f"   Length mix: 67 short | 67 medium | 66 long\n")

    success = 0
    skipped = 0
    failed  = 0

    for i, (topic, (length_label, word_range)) in enumerate(
            zip(TOPICS, LENGTH_CONFIG), start=1):

        filename  = f"essay_{i:03d}.txt"
        filepath  = os.path.join(out_dir, filename)

        # Resume support
        if args.resume and os.path.exists(filepath):
            print(f"  ⏭️  [{i:03d}/200] Skipping (exists): {filename}")
            skipped += 1
            continue

        print(f"  ✍️  [{i:03d}/200] {length_label:6s} | {topic[:55]}...")

        try:
            essay = generate_essay(client, topic, length_label, word_range)
            wc    = word_count(essay)

            with open(filepath, "w", encoding="utf-8") as f:
                f.write(essay)

            manifest[filename] = {
                "index":      i,
                "topic":      topic,
                "length":     length_label,
                "word_range": word_range,
                "word_count": wc,
                "label":      "AI"
            }

            # Save manifest after every essay (safe against crashes)
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2)

            print(f"         ✅ Saved ({wc} words)")
            success += 1

        except anthropic.RateLimitError:
            print(f"         ⏳ Rate limited — waiting 60s...")
            time.sleep(60)
            # Retry once
            try:
                essay = generate_essay(client, topic, length_label, word_range)
                wc    = word_count(essay)
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(essay)
                manifest[filename] = {
                    "index": i, "topic": topic,
                    "length": length_label, "word_range": word_range,
                    "word_count": wc, "label": "AI"
                }
                with open(manifest_path, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2)
                print(f"         ✅ Saved after retry ({wc} words)")
                success += 1
            except Exception as e2:
                print(f"         ❌ Retry failed: {e2}")
                failed += 1

        except anthropic.APIError as e:
            print(f"         ❌ API error: {e}")
            failed += 1

        except Exception as e:
            print(f"         ❌ Unexpected error: {e}")
            failed += 1

        # Polite delay between calls
        if i < 200:
            time.sleep(args.delay)

    print(f"\n{'='*55}")
    print(f"✅ Done!")
    print(f"   Generated: {success} essays")
    print(f"   Skipped:   {skipped} (already existed)")
    print(f"   Failed:    {failed}")
    print(f"   Manifest:  {manifest_path}")
    print(f"\nEach file is labelled 'AI' in manifest.json.")
    print(f"Add human-written essays with label 'HUMAN' to complete your dataset.")


if __name__ == "__main__":
    main()