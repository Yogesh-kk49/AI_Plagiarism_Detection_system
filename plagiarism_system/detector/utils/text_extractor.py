# text_extractor.py
import signal
import sys
from PyPDF2 import PdfReader
import docx
import os

def _timeout_handler(signum, frame):
    raise TimeoutError("PDF extraction timed out")

def extract_text(file_path):
    ext = os.path.splitext(file_path)[1].lower()

    if ext == '.txt':
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()

    elif ext == '.pdf':

        # Only enable timeout on Linux/Mac
        if sys.platform != "win32":
            signal.signal(signal.SIGALRM, _timeout_handler)
            signal.alarm(15)

        try:
            reader = PdfReader(file_path)
            text = ""

            for page in reader.pages[:min(50, len(reader.pages))]:
                page_text = page.extract_text()
                if page_text:
                    text += page_text

            return text

        except TimeoutError:
            return ""

        finally:
            if sys.platform != "win32":
                signal.alarm(0)

    elif ext == '.docx':
        doc = docx.Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)

    return ""