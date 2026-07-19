from django.apps import AppConfig

class DetectorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'detector'

    # No eager model preload here on purpose: ai_heuristic.get_detector()
    # already lazy-loads and caches the model on first real call (see the
    # `_detector` singleton at the bottom of ai_heuristic.py). Loading torch
    # + transformers + the HF model at server boot competed with Django's
    # own startup for memory and caused OOM kills on smaller instances.
    # The model now only loads into memory the first time someone actually
    # hits the AI-check endpoint.