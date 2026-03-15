from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from detector.models import UserHistory


@api_view(["GET"])
def user_history(request):
    try:
        # 🔐 Check session-based auth (your system)
        google_verified = request.session.get("google_verified", False)
        otp_verified = request.session.get("otp_verified", False)
        email = request.session.get("user_email")

        if not (google_verified and otp_verified and email):
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # ✅ Use UserHistory (NOT PlagiarismHistory)
        history_qs = UserHistory.objects.filter(
            user_email=email
        ).order_by("-created_at")

        data = [
            {
                "type": item.result_type,
                "title": item.title,
                "score": item.score,
                "risk_level": item.risk_level,
                "created_at": item.created_at,
            }
            for item in history_qs
        ]

        return Response({
            "total": history_qs.count(),
            "results": data
        }, status=200)

    except Exception as e:
        # This will show the exact error instead of silent 500
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        
@api_view(["DELETE"])
def clear_history(request):
    user_email = request.session.get("user_email")

    if not user_email:
        return Response({"error": "Unauthorized"}, status=401)

    deleted_count, _ = UserHistory.objects.filter(user_email=user_email).delete()

    return Response({
        "message": "History cleared successfully",
        "deleted_records": deleted_count
    })