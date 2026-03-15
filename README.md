# AI Plagiarism Detection System

An intelligent plagiarism detection system built with **Django** that analyzes text or code submissions and detects possible plagiarism and AI-generated content using advanced heuristic techniques.

This system is designed for **academic use**, helping instructors and institutions identify copied or AI-generated submissions efficiently.

---

## Features

* Plagiarism detection between submitted documents
* AI authorship likelihood detection
* Machine Learning-based detection
* Heuristic-based text analysis
* Severity scoring system
* Upload and analyze documents
* Fast processing for large files
* Simple web interface for testing and analysis

---

## Tech Stack

**Backend**

* Python
* Django

**Data Processing**

* Natural Language Processing
* Heuristic text analysis

**Frontend**

* React

---

## Project Structure

```
AI_PLAGARISM
│
├── plagiarism_system/     # Django project configuration
├── detector/              # Main plagiarism detection app
├── media/                 # Uploaded documents
│
├── manage.py              # Django management script
├── requirements.txt       # Python dependencies
├── .gitignore             # Files ignored by Git
└── README.md              # Project documentation
```

---

## Installation

Clone the repository

```
git clone https://github.com/yourusername/AI-Plagiarism-Detection-System.git
cd AI-Plagiarism-Detection-System
```

Create virtual environment

```
python -m venv env
```

Activate environment

Windows

```
env\Scripts\activate
```

Mac / Linux

```
source env/bin/activate
```

Install dependencies

```
pip install -r requirements.txt
```

Run migrations

```
python manage.py migrate
```

Start the development server

```
python manage.py runserver
```

Open in browser

```
http://127.0.0.1:8000
```

---

## How It Works

1. User uploads a document or code file.
2. The system analyzes text patterns and writing structure.
3. Heuristic algorithms evaluate similarity and AI-generated indicators.
4. A plagiarism score and AI likelihood score are generated.
5. Results are displayed through the web interface.

---

## Example Use Cases

* Academic plagiarism detection
* AI-generated assignment detection
* Code similarity checking
* Educational research

---

## Future Improvements

* Deep learning based detection models
* Large scale dataset training
* Multi-language code detection
* Better UI dashboard
* Integration with academic LMS systems

---

## Author

**Yogesh K**

Final Year Computer Science Project

---

## License

This project is created for **educational and research purposes**.
