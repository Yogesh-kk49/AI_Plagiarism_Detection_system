from django.urls import path

# Main views
from .views import (
    home,
    test_api,
    upload_file,
    read_document,
    compare_documents,
    compare_with_all,
    highlight_plagiarism,
    report_history,
    ai_check,
    list_documents,
    compare_selected,
    send_otp,
    verify_otp,
    google_login,
    check_auth,
    logout,
    code_plagiarism,
    code_analyze,
    submit_feedback
)


from .utils.views_compare import compare_code, compare_batch

# History APIs
from .utils.views_history import user_history, clear_history
urlpatterns = [
    path('', home),
    path('api/test/', test_api),
    path('api/upload/', upload_file),
    path('api/read/<int:doc_id>/', read_document),
    path('api/compare/<int:doc1_id>/<int:doc2_id>/', compare_documents),
    path('api/compare-all/<int:doc_id>/', compare_with_all),
    path('api/highlight/<int:doc1_id>/<int:doc2_id>/', highlight_plagiarism),
    path('api/reports/<int:doc_id>/', report_history),
    path('api/ai-check/<int:doc_id>/', ai_check),
    path('api/ai-check-text/', ai_check),
    path('api/documents/', list_documents),
    path('api/compare-selected/', compare_selected),
    path('send-otp/', send_otp, name='send_otp'),
    path('verify-otp/', verify_otp, name='verify_otp'),
    path('api/google-login/', google_login, name='google_login'),
    path('api/check-auth/', check_auth),
    path('api/logout/', logout),
    path('api/code-plagiarism/', code_plagiarism), 
    path('api/code-analyze/', code_analyze),
    path('api/compare-code/', compare_code),
    path('api/compare-batch/', compare_batch),
    path("api/my-history/", user_history),
    path("api/clear-history/", clear_history),
    path('api/feedback/', submit_feedback),
]