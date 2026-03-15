from django.contrib import admin
from .models import UploadedDocument
from .models import FeedbackSubmission
admin.site.register(FeedbackSubmission)

admin.site.register(UploadedDocument)
