import os
import re

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from detector.models import UserHistory


@api_view(["GET"])
def user_history(request):
    try:
        # Session-based auth check
        google_verified = request.session.get("google_verified", False)
        otp_verified = request.session.get("otp_verified", False)
        email = request.session.get("user_email")

        if not (google_verified and otp_verified and email):
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        history_qs = UserHistory.objects.filter(
            user_email=email
        ).order_by("-created_at")

        data = []

        for item in history_qs:
            title = item.title

            if title:
                # Remove folder path
                title = os.path.basename(title)

                # Remove Django random suffix before extension
                # sample_ABC123.txt -> sample.txt
                title = re.sub(
                    r'_[A-Za-z0-9]{6,}(?=\.[^.]+$)',
                    '',
                    title
                )

            # Fallback if title missing
            if not title:
                title = (
                    "Pasted Code"
                    if "code" in str(item.result_type).lower()
                    else "Pasted Content"
                )

            data.append({
                "result_type": item.result_type,
                "title": title,
                "score": round(float(item.score), 2),
                "risk_level": item.risk_level,
                "created_at": item.created_at,
            })

        return Response({
            "total": history_qs.count(),
            "results": data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["DELETE"])
def clear_history(request):
    user_email = request.session.get("user_email")

    if not user_email:
        return Response(
            {"error": "Unauthorized"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    deleted_count, _ = UserHistory.objects.filter(
        user_email=user_email
    ).delete()

    return Response({
        "message": "History cleared successfully",
        "deleted_records": deleted_count
    }, status=status.HTTP_200_OK)