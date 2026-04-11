# 🤖 AI Plagiarism Detection System

An advanced **AI-powered plagiarism detection system** built using **Django**, designed to detect both **content similarity** and **AI-generated text** using heuristic and intelligent analysis techniques.

This project is ideal for **academic institutions, instructors, and evaluation systems** to identify copied or AI-assisted submissions effectively.

---

## 📌 Project Overview

The system analyzes uploaded documents or code and provides:

* 🔍 **Plagiarism Detection Score**
* 🤖 **AI Authorship Likelihood**
* ⚠️ **Severity Levels (Low / Medium / High)**

It combines **heuristic-based analysis** with structured evaluation techniques to simulate intelligent plagiarism detection without relying on heavy external APIs.

---

## ✨ Key Features

* 📄 Document & code file upload
* 🔍 Plagiarism detection between submissions
* 🤖 AI-generated content detection (heuristic-based)
* 📊 Severity scoring system (Low / Medium / High)
* ⚡ Fast processing for large files
* 🧠 Intelligent text pattern analysis
* 🔐 OTP-based user authentication system
* 👤 Secure user login & verification
* 📁 File storage and management system
* 📄 Professional downloadable PDF analysis reports
* 🌐 Web-based interface for easy usage

---

## 🛠️ Tech Stack

### **Backend**

* Python
* Django

### **Frontend**

* React (for UI components)

### **Data Processing**

* Natural Language Processing (NLP)
* Heuristic-based text analysis

### **Security**

* OTP Authentication System

---

## 📂 Project Structure

```bash id="z3k8df"
AI_PLAGARISM/
│
├── plagiarism_system/     # Django project settings
├── detector/              # Core detection logic
├── media/                 # Uploaded files
│
├── manage.py              # Django management script
├── requirements.txt       # Dependencies
├── db.sqlite3
├── .gitignore
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash id="k1g8xt"
git clone https://github.com/YOUR_USERNAME/AI-Plagiarism-Detection-System.git
cd AI-Plagiarism-Detection-System
```

### 2️⃣ Create virtual environment

```bash id="p8d9sd"
python -m venv env
```

### 3️⃣ Activate environment

**Windows**

```bash id="w9x2ab"
env\Scripts\activate
```

**Mac/Linux**

```bash id="m3d2ka"
source env/bin/activate
```

### 4️⃣ Install dependencies

```bash id="q7t1vn"
pip install -r requirements.txt
```

### 5️⃣ Apply migrations

```bash id="v2n1px"
python manage.py migrate
```

### 6️⃣ Run server

```bash id="y5b8rf"
python manage.py runserver
```

👉 Open:

```id="g2x7lt"
http://127.0.0.1:8000/
```

---

## 🔐 Authentication System

* OTP-based verification system implemented
* Secure login flow
* Prevents unauthorized access
* Enhances reliability for academic usage

---

## ⚙️ How It Works

1. User uploads document or code file
2. System preprocesses and analyzes text
3. Heuristic algorithms detect:

   * Similarity patterns
   * AI-generated indicators
4. Generates:

   * 📊 Plagiarism Score
   * 🤖 AI Likelihood Score
   * ⚠️ Severity Level
5. Displays results through web interface

---

## 🚀 Future Enhancements

* Deep learning-based detection models
* Large-scale dataset training
* Multi-language & code detection
* REST API integration
* Advanced dashboard with analytics
* LMS integration (Moodle, etc.)

---

## 🎯 Use Cases

* Academic plagiarism detection
* AI-generated assignment identification
* Code similarity checking
* Research and educational analysis

---

## 👨‍💻 Author

**Yogesh K**
Final Year Computer Science Student

---

## 📄 License

This project is developed for **educational and research purposes**.

---

⭐ If you found this project useful, consider giving it a star!
