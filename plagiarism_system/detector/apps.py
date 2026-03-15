from django.apps import AppConfig
import threading

class DetectorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'  # ← fix this
    name = 'detector'

    def ready(self):
        def preload():
            try:
                print("⏳ Pre-loading AI detector models...")
                from .utils.ai_heuristic import get_detector
                get_detector()
                print("✅ AI detector ready.")
            except Exception as e:
                print(f"⚠️ Detector preload failed: {e}")
        threading.Thread(target=preload, daemon=True).start()