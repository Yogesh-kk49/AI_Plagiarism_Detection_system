from django.db import models
from django.conf import settings

class UploadedDocument(models.Model):
    """
    Stores uploaded files (PDF, DOCX, TXT) used for plagiarism comparison
    """
    file = models.FileField(upload_to='documents/')
    filename = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Automatically store original filename for display
        if self.file and not self.filename:
            self.filename = self.file.name
        super().save(*args, **kwargs)

    def __str__(self):
        return self.filename or f"Document {self.id}"


class PlagiarismReport(models.Model):
    """
    Stores plagiarism comparison results between two documents
    """
    base_document = models.ForeignKey(
        UploadedDocument,
        related_name="base_reports",
        on_delete=models.CASCADE
    )
    compared_document = models.ForeignKey(
        UploadedDocument,
        related_name="compared_reports",
        on_delete=models.CASCADE
    )
    similarity_percentage = models.FloatField()
    severity = models.CharField(max_length=20, default="Low")
    checked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-checked_at']

    def __str__(self):
        return f"Doc {self.base_document.id} vs Doc {self.compared_document.id} - {self.similarity_percentage}%"


class EmailOTP(models.Model):
    """
    Stores OTP for email verification (2FA)
    """
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        status = "Verified" if self.is_verified else "Pending"
        return f"{self.email} - {status}"

class ComparisonHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    mode = models.CharField(max_length=50)  # paste_vs_paste / batch
    file1 = models.CharField(max_length=255, blank=True, null=True)
    file2 = models.CharField(max_length=255, blank=True, null=True)
    final_score = models.FloatField()
    risk_level = models.CharField(max_length=20)
    language_match = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.final_score}% - {self.created_at}"

class PlagiarismHistory(models.Model):
    RESULT_TYPE_CHOICES = (
        ("essay", "Essay Plagiarism"),
        ("code", "Code Plagiarism"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="plagiarism_history"
    )
    result_type = models.CharField(max_length=10, choices=RESULT_TYPE_CHOICES)
    title = models.CharField(max_length=255, blank=True, null=True)  # file name / comparison label
    score = models.FloatField()
    risk_level = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.result_type} - {self.score}%"
    
class UserHistory(models.Model):
    user_email = models.EmailField()
    result_type = models.CharField(max_length=20)  # essay / code / ai_code
    title = models.CharField(max_length=255)
    score = models.FloatField(default=0)
    risk_level = models.CharField(max_length=20, default="Low")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user_email} - {self.result_type} - {self.score}%"
    
class FeedbackSubmission(models.Model):
    name     = models.CharField(max_length=200)
    email    = models.EmailField()
    category = models.CharField(max_length=50)
    message  = models.TextField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.category}] {self.name} - {self.submitted_at.strftime('%Y-%m-%d')}"