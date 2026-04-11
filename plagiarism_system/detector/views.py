# Django REST Framework
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.authentication import BasicAuthentication
from rest_framework import status
from django.conf import settings
# Django
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.core.mail import send_mail
from django.utils import timezone
from django.core.mail import EmailMessage
# Google OAuth
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

# Standard Library
import itertools
import random
import os
import re
from datetime import timedelta
from difflib import SequenceMatcher

# Models
from .models import (
    UploadedDocument,
    PlagiarismReport,
    UserHistory,
    EmailOTP,
    FeedbackSubmission
)

# Utility modules
from .utils.text_extractor import extract_text
from .utils.text_preprocessor import preprocess_text
from .utils.similarity import calculate_similarity
from .utils.severity import get_severity
from .utils.sentence_similarity import sentence_level_similarity
from .utils.essay_plagiarism import compare_essays
from .utils.ai_heuristic import ai_likelihood_score

# Code plagiarism APIs
from .utils.views_compare import compare_code, compare_batch, code_analyze, is_code


# ---------------- HOME ----------------
@api_view(['GET'])
def home(request):
    return Response({
        "message": "AI Plagiarism Detection Backend Running",
        "endpoints": {
            "test": "/api/test/",
            "upload": "/api/upload/",
            "read": "/api/read/<id>/",
            "compare": "/api/compare/<id1>/<id2>/"
        }
    })


# ---------------- TEST ----------------
@api_view(['GET'])
def test_api(request):
    return Response({"message": "API working"})


# ---------------- UPLOAD (CSRF-FREE) ----------------
@csrf_exempt
@api_view(['POST'])
@authentication_classes([BasicAuthentication])  # disables SessionAuthentication (CSRF)
@permission_classes([AllowAny])
def upload_file(request):
    file = request.FILES.get('document')

    if not file:
        return Response(
            {"error": "No file uploaded"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ---------- VALIDATION ----------
    allowed_extensions = ['.txt', '.pdf', '.docx']
    max_size_mb = 5

    if file.size > max_size_mb * 1024 * 1024:
        return Response(
            {"error": "File too large (max 5MB)"},
            status=status.HTTP_400_BAD_REQUEST
        )

    ext = "." + file.name.lower().split('.')[-1]
    if ext not in allowed_extensions:
        return Response(
            {"error": "Unsupported file type"},
            status=status.HTTP_400_BAD_REQUEST
        )
    # ---------- END VALIDATION ----------

    doc = UploadedDocument.objects.create(file=file)

    return Response({
        "message": "File uploaded successfully",
        "id": doc.id,
        "file_name": doc.file.name
    }, status=status.HTTP_201_CREATED)


# ---------------- READ + PREPROCESS ----------------
@api_view(['GET'])
def read_document(request, doc_id):
    try:
        doc = UploadedDocument.objects.get(id=doc_id)

        raw_text = extract_text(doc.file.path)

        if not raw_text or raw_text.strip() == "":
            return Response(
                {"error": "No readable text found in document"},
                status=status.HTTP_204_NO_CONTENT
            )

        clean_text = preprocess_text(raw_text)

        return Response({
            "id": doc.id,
            "file_name": doc.file.name,
            "raw_length": len(raw_text),
            "clean_length": len(clean_text),
            "raw_preview": raw_text[:300],
            "clean_preview": clean_text[:500]
        }, status=status.HTTP_200_OK)

    except UploadedDocument.DoesNotExist:
        return Response(
            {"error": "Document not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    except Exception as e:
        return Response(
            {"error": "Internal server error", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ---------------- COMPARE ----------------
@api_view(['GET'])
def compare_documents(request, doc1_id, doc2_id):  
    try:
        # Fetch documents using IDs from URL
        doc1 = UploadedDocument.objects.get(id=doc1_id)
        doc2 = UploadedDocument.objects.get(id=doc2_id)

        # Ensure files exist in DB
        if not doc1.file or not doc2.file:
            return Response({"error": "One or both documents have no file"}, status=400)

        # Get absolute file paths (VERY IMPORTANT for FileField)
        path1 = doc1.file.path
        path2 = doc2.file.path

        # Check if files actually exist in media/documents
        if not os.path.exists(path1) or not os.path.exists(path2):
            return Response({"error": "File not found in media/documents folder"}, status=400)

        # Extract text from files (your existing extractor)
        text1 = extract_text(path1)
        text2 = extract_text(path2)

        if not text1 or not text2:
            return Response({"error": "Text extraction failed or empty file"}, status=400)
        iscode1, reason1 = is_code(text1)
        iscode2, reason2 = is_code(text2)

        if iscode1:
            return Response(
                {
                    "error": "Code detected in first document.",
                    "message": f"{doc1.file.name} appears to contain source code. Use Code Plagiarism instead."
                },
                status=400
            )

        if iscode2:
            return Response(
                {
                    "error": "Code detected in second document.",
                    "message": f"{doc2.file.name} appears to contain source code. Use Code Plagiarism instead."
                },
                status=400
            )
        # Run plagiarism engine
        result = compare_essays(text1, text2)
        
        user_email = request.session.get("user_email")
        if user_email:
            UserHistory.objects.create(
                user_email=user_email,
                result_type="essay",
                title=f"{doc1.file.name} vs {doc2.file.name}",
                score=result.get("similarity_percentage", 0),
                risk_level=result.get("severity", "Low")
            )

        # Save report to database
        PlagiarismReport.objects.create(
            base_document=doc1,
            compared_document=doc2,
            similarity_percentage=result.get("similarity_percentage", 0),
            severity=result.get("severity", "Low")
        )

        return Response(result)

    except UploadedDocument.DoesNotExist:
        return Response({"error": "Document not found"}, status=404)

    except Exception as e:
        # This will show real backend error instead of generic 500
        return Response({"error": str(e)}, status=500)
    
@api_view(['GET'])
def compare_with_all(request, doc_id):
    try:
        base_doc = UploadedDocument.objects.get(id=doc_id)
        base_text = preprocess_text(extract_text(base_doc.file.path))

        iscode_base, reason = is_code(base_text)

        if iscode_base:
            return Response({
                "error": "Code detected in uploaded document.",
                "message": "This file contains source code. Use the Code Plagiarism section."
            }, status=400)
            
        if not base_text:
            return Response(
                {"error": "Base document has no readable text"},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = []

        other_docs = UploadedDocument.objects.exclude(id=doc_id)

        for doc in other_docs:
            other_text = preprocess_text(extract_text(doc.file.path))
            
            iscode_other, reason = is_code(other_text)

            if iscode_other:
                continue
            if not other_text:
                continue

            similarity = calculate_similarity(base_text, other_text)

            results.append({
                "compared_with_id": doc.id,
                "file_name": doc.file.name,
                "similarity_percentage": similarity
            })

        return Response({
            "base_document": base_doc.id,
            "comparisons": results
        }, status=status.HTTP_200_OK)

    except UploadedDocument.DoesNotExist:
        return Response(
            {"error": "Document not found"},
            status=status.HTTP_404_NOT_FOUND
        )
@api_view(['GET'])
def highlight_plagiarism(request, doc1_id, doc2_id):
    try:
        doc1 = UploadedDocument.objects.get(id=doc1_id)
        doc2 = UploadedDocument.objects.get(id=doc2_id)

        text1 = extract_text(doc1.file.path)
        text2 = extract_text(doc2.file.path)

        plagiarized_sentences = sentence_level_similarity(text1, text2)

        return Response({
            "document_1": doc1.id,
            "document_2": doc2.id,
            "plagiarized_sentences": plagiarized_sentences,
            "total_matches": len(plagiarized_sentences)
        }, status=status.HTTP_200_OK)

    except UploadedDocument.DoesNotExist:
        return Response(
            {"error": "One or both documents not found"},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
def report_history(request, doc_id):
    reports = PlagiarismReport.objects.filter(base_document_id=doc_id)

    data = []
    for r in reports:
        data.append({
            "compared_with_id": r.compared_document.id,
            "similarity_percentage": r.similarity_percentage,
            "checked_at": r.checked_at
        })

    return Response({
        "base_document": doc_id,
        "reports": data
    }, status=status.HTTP_200_OK)

@api_view(['POST', 'GET'])
def ai_check(request, doc_id=None):
    text = None
    source = None

    # ================= STORED DOCUMENT =================
    if doc_id is not None:
        try:
            doc = UploadedDocument.objects.get(id=doc_id)
            text = extract_text(doc.file.path)
            source = "document"

        except UploadedDocument.DoesNotExist:
            return Response(
                {"error": "Document not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    # ================= COPY-PASTED TEXT =================
    else:
        text = request.data.get("text", "")
        source = "pasted_text"

    # ================= VALIDATION =================
    if not text or len(text.strip()) < 30:
        return Response(
            {"error": "Text too short for AI analysis"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ================= CODE DETECTION =================
    iscode, reason = is_code(text)

    if iscode:
        return Response(
            {
                "error": "Code detected in input.",
                "message": "It looks like you've pasted source code. Please use the Code Plagiarism section for code comparison."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # ================= AI DETECTION =================
    result = ai_likelihood_score(text)
    user_email = request.session.get("user_email")

    if user_email and not result.get('error'):
        ai_score = result.get("ai_percentage", 0)
        risk = "High AI" if ai_score > 70 else "Medium AI" if ai_score > 40 else "Human-like"

        title = doc.file.name if source == "document" else "Pasted Content"

        UserHistory.objects.create(
            user_email=user_email,
            result_type="essay_ai",
            title=title,
            score=ai_score,
            risk_level=risk
        )

    return Response({
        "source": source,
        "ai_analysis": result
    }, status=status.HTTP_200_OK)
    
@api_view(['GET'])
def list_documents(request):
    docs = UploadedDocument.objects.all().order_by('-id')

    return Response([
        {
            "id": d.id,
            "file_name": d.file.name,
            "uploaded_at": d.uploaded_at if hasattr(d, "uploaded_at") else None
        }
        for d in docs
    ])
@api_view(['POST'])
def compare_selected(request):
    try:
        doc_ids = request.data.get("document_ids", [])

        if not doc_ids or len(doc_ids) < 2:
            return Response(
                {"error": "At least 2 documents required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        documents = UploadedDocument.objects.filter(id__in=doc_ids)

        if documents.count() < 2:
            return Response(
                {"error": "Valid documents not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        results = []

        # Compare only among selected files (NOT database)
        for doc1, doc2 in itertools.combinations(documents, 2):
            text1 = preprocess_text(extract_text(doc1.file.path))
            text2 = preprocess_text(extract_text(doc2.file.path))

            # ================= CODE DETECTION =================
            code_detected_in = None
            iscode1, reason1 = is_code(text1)
            iscode2, reason2 = is_code(text2)

            if iscode1:
                code_detected_in = doc1.file.name
            elif iscode2:
                code_detected_in = doc2.file.name

            if code_detected_in:
                return Response(
                    {
                        "error": "Code detected in uploaded file.",
                        "message": f"'{code_detected_in}' appears to contain source code. Please use the Code Plagiarism section for code comparison."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            # ===================================================

            if not text1 or not text2:
                continue

            similarity = calculate_similarity(text1, text2)
            severity = get_severity(similarity)

            results.append({
                "document_1_id": doc1.id,
                "document_1_name": doc1.file.name,
                "document_2_id": doc2.id,
                "document_2_name": doc2.file.name,
                "similarity_percentage": similarity,
                "severity": severity
            })

        return Response({
            "total_documents": len(doc_ids),
            "comparisons": results
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": "Comparison failed", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        
@api_view(['POST'])
def google_login(request):
    try:
        token = request.data.get("token")

        if not token:
            return Response({"error": "Token not provided"}, status=400)

        # Verify Google ID token
        idinfo = id_token.verify_oauth2_token(
            token,
            grequests.Request(),
            settings.GOOGLE_CLIENT_ID
        )

        name    = idinfo.get("name")
        email   = idinfo.get("email")
        picture = idinfo.get("picture")

        # Store everything in session
        request.session["user_name"]      = name
        request.session["user_email"]     = email
        request.session["user_picture"]   = picture
        request.session["google_verified"] = True
        request.session["otp_verified"]   = False
        request.session["code_access"]    = False

        # Force session save so cookie is written
        request.session.modified = True
        request.session.save()

        return Response({
            "name":    name,
            "email":   email,
            "picture": picture,
            "google":  "verified",
            "message": "Google login successful. Please verify OTP."
        }, status=200)

    except ValueError as e:
        # Invalid token signature / expired
        print("GOOGLE TOKEN ERROR:", str(e))
        return Response({"error": "Invalid Google token"}, status=401)

    except Exception as e:
        print("GOOGLE LOGIN ERROR:", str(e))
        return Response({"error": str(e)}, status=500)


# ─────────────────────────────────────────────
# STEP 2: Send OTP
# ─────────────────────────────────────────────
@api_view(['POST'])
def send_otp(request):
    print("SESSION DATA:", dict(request.session))  # debug

    google_email    = request.session.get("user_email")
    google_verified = request.session.get("google_verified", False)

    # Must have completed Google login first
    if not google_email or not google_verified:
        return Response({
            "error":          "Google login required before OTP",
            "session_user":   google_email,
            "google_verified": google_verified
        }, status=403)

    # Generate OTP
    otp = str(random.randint(100000, 999999))

    # Remove old OTPs, save new one
    EmailOTP.objects.filter(email=google_email).delete()
    EmailOTP.objects.create(email=google_email, otp=otp)

    # Send email
    send_mail(
        subject="AI Plagiarism System - Code Access OTP",
        message=f"Your OTP for Code Access is: {otp}\n\nThis OTP expires in 5 minutes.",
        from_email="ai.plagiarism49@gmail.com",
        recipient_list=[google_email],
        fail_silently=False,
    )

    return Response({
        "message": f"OTP sent to {google_email}"
    }, status=200)


# ─────────────────────────────────────────────
# STEP 3: Verify OTP
# ─────────────────────────────────────────────
@api_view(['POST'])
def verify_otp(request):
    google_email = request.session.get("user_email")
    entered_otp  = request.data.get("otp")

    if not google_email:
        return Response({"error": "Google login required before OTP"}, status=403)

    if not entered_otp:
        return Response({"error": "OTP required"}, status=400)

    otp_record = EmailOTP.objects.filter(email=google_email).last()

    if not otp_record:
        return Response({"error": "No OTP found. Please request a new one."}, status=404)

    # Check expiry (5 minutes)
    if timezone.now() - otp_record.created_at > timedelta(minutes=5):
        otp_record.delete()
        return Response({"error": "OTP expired. Please request a new one."}, status=400)

    # Check match
    if otp_record.otp != str(entered_otp):
        return Response({"error": "Invalid OTP. Please try again."}, status=400)

    # ✅ Mark verified in DB
    otp_record.is_verified = True
    otp_record.save()

    # ✅ Grant access in session
    request.session["otp_verified"] = True
    request.session["code_access"]  = True
    request.session.modified = True
    request.session.save()

    return Response({
        "message": "2FA Verified Successfully",
        "access":  "granted",
        "email":   google_email
    }, status=200)


# ─────────────────────────────────────────────
# CHECK AUTH  ← THE FIXED VERSION
# Problem was: checking request.user.is_authenticated
# which is Django's user system — NOT your session system.
# Fix: read directly from session keys.
# ─────────────────────────────────────────────
@api_view(['GET'])
def check_auth(request):
    # Read directly from session — no Django user auth needed
    google_verified = request.session.get("google_verified", False)
    otp_verified    = request.session.get("otp_verified",    False)
    code_access     = request.session.get("code_access",     False)
    email           = request.session.get("user_email",      None)
    name            = request.session.get("user_name",       None)
    picture         = request.session.get("user_picture",    None)

    # Require BOTH Google + OTP for code access
    # (re-derive this so it can't be spoofed by a stale session flag)
    effective_code_access = google_verified and otp_verified

    return JsonResponse({
        "google_verified": google_verified,
        "otp_verified":    otp_verified,
        "code_access":     effective_code_access,
        "email":           email,
        "name":            name,
        "picture":         picture,
    }, status=200)


# ─────────────────────────────────────────────
# LOGOUT
# ─────────────────────────────────────────────
@api_view(['POST'])
def logout(request):
    request.session.flush()  # wipes entire session + deletes DB record
    return JsonResponse({"message": "Logged out successfully"}, status=200)


# ─────────────────────────────────────────────
# PROTECTED: Code Plagiarism
# ─────────────────────────────────────────────
@api_view(['POST'])
def code_plagiarism(request):
    google_verified = request.session.get("google_verified", False)
    otp_verified    = request.session.get("otp_verified",    False)

    # Enforce full 2FA
    if not (google_verified and otp_verified):
        return Response({
            "error":  "2FA required (Google login + OTP verification)",
            "access": "denied"
        }, status=403)

    code1 = str(request.data.get("code1", "")).strip()
    code2 = str(request.data.get("code2", "")).strip()

    if not code1 or not code2:
        return Response({"error": "Both code inputs are required"}, status=400)

    similarity = calculate_similarity(code1, code2)
    user_email = request.session.get("user_email")
    if user_email:
        risk = "High" if similarity > 75 else "Medium" if similarity > 40 else "Low"

        UserHistory.objects.create(
            user_email=user_email,
            result_type="code",
            title="Pasted Code vs Pasted Code",
            score=similarity,
            risk_level=risk
        )

    return Response({
        "similarity_percentage": similarity,
        "user": {
            "name":    request.session.get("user_name"),
            "email":   request.session.get("user_email"),
            "picture": request.session.get("user_picture"),
        },
        "auth": {
            "google_verified": google_verified,
            "otp_verified":    otp_verified,
            "access":          "granted"
        },
        "message": "Code comparison successful"
    }, status=200)
    
@api_view(['POST'])
def submit_feedback(request):
    # 🔒 Require login
    user_email = request.session.get("user_email")
    user_name  = request.session.get("user_name", "User")

    if not user_email:
        return Response(
            {"error": "Login required to submit feedback"},
            status=403
        )

    # 📥 Get data from frontend
    category = request.data.get("category", "other").strip()
    message  = request.data.get("message", "").strip()

    if not message:
        return Response(
            {"error": "Message is required."},
            status=400
        )

    # ✅ Save to DB
    FeedbackSubmission.objects.create(
        name=user_name,
        email=user_email,
        category=category,
        message=message
    )

    # ✅ Send email (FIXED)
    try:
        email = EmailMessage(
            subject=f"[Feedback] {category.upper()} from {user_name}",
            body=(
                f"Name: {user_name}\n"
                f"Email: {user_email}\n"
                f"Category: {category}\n\n"
                f"Message:\n{message}"
            ),
            from_email="ai.plagiarism49@gmail.com",
            to=["ai.plagiarism49@gmail.com"],
            reply_to=[user_email],   # ✅ Now works
        )

        email.send()

    except Exception as e:
        # ⚠️ Don't crash API if email fails
        print("EMAIL ERROR:", str(e))

    return Response(
        {"message": "Feedback submitted successfully."},
        status=200
    )