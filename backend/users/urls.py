from django.urls import path
from .views import (
    RegisterView, 
    UserProfileUpdateView, 
    PasswordResetRequestView, 
    PasswordResetConfirmView, 
    AllUserListView,
    MyTokenObtainPairView,
    AdminDashboardStatsView,
    AdminUserDetailView
)
from django.contrib.auth import views as auth_views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # Login and Token Management
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Registration and Profile
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', UserProfileUpdateView.as_view(), name='user-profile-update'),
    path('all-users/', AllUserListView.as_view(), name='all-users'),
    path('all-users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    
    # API endpoints for password reset logic
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_api'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm_api'),
    
    # This path is usually needed for the link sent in the email
    path('password-reset-confirm/<uidb64>/<token>/', 
         auth_views.PasswordResetConfirmView.as_view(), 
         name='password_reset_confirm'),

    path('admin-stats/', AdminDashboardStatsView.as_view(), name='admin-stats'),
]