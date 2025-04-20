from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LoginView, LogoutView, UserProfileView, SellerProfileView,
    PasswordChangeView, PasswordResetRequestView, PasswordResetConfirmView,
    SellerReviewViewSet, UserAvatarView, EmailVerificationRequestView,
    EmailVerificationConfirmView, LoginVerificationView
)

app_name = 'users'

# ViewSet router
router = DefaultRouter()
router.register(r'sellers/(?P<seller_id>\d+)/reviews', SellerReviewViewSet, basename='seller-reviews')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('login/verify/', LoginVerificationView.as_view(), name='login_verification'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('profile/avatar/', UserAvatarView.as_view(), name='profile-avatar'),
    path('sellers/<int:user_id>/', SellerProfileView.as_view(), name='seller-profile'),
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),
    path('password/reset/request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('email/verify/request/', EmailVerificationRequestView.as_view(), name='email_verification_request'),
    path('email/verify/confirm/', EmailVerificationConfirmView.as_view(), name='email_verification_confirm'),
    path('', include(router.urls)),
]
