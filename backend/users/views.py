import random
from django.contrib.auth.models import User
from django.contrib.auth.forms import PasswordResetForm
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.db.models import Sum

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserUpdateSerializer, MyTokenObtainPairSerializer
from .models import UserOTP
from .tasks import send_otp_email
from products.models import Product
from orders.models import Order
import random
from django.utils import timezone

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView

# ── Google Login View ─────────────────────────────────────────────────────────
class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = "http://localhost:5173"
    client_class = OAuth2Client

    def get_response(self):
        user = self.user
        refresh = RefreshToken.for_user(user)

        data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "username": user.username,
                "email": user.email,
                "is_staff": user.is_staff,
            }
        }
        return Response(data)

# ── Login View ────────────────────────────────────────────────────────────────
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    permission_classes = [AllowAny]

# ── Registration & OTP Verification ───────────────────────────────────────────
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 1. Create user but set is_active to False for manual registrations
        user = serializer.save(is_active=False)
        
        # 2. Generate 6-digit OTP
        otp_code = str(random.randint(100000, 999999))
        UserOTP.objects.update_or_create(user=user, defaults={'otp': otp_code})
        
        # 3. Trigger Celery task to send Brevo Email
        send_otp_email.delay(user.email, otp_code)
        
        headers = self.get_success_headers(serializer.data)
        response_data = serializer.data
        response_data['is_staff'] = user.is_staff
        response_data['message'] = "OTP sent to email. Please verify your account."
        
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

class VerifyOTPView(APIView):
    """
    Checks the submitted OTP. If valid, activates the user account.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp_received = request.data.get('otp')
        
        try:
            user = User.objects.get(email=email)
            otp_record = UserOTP.objects.get(user=user)
            
            if otp_record.otp == otp_received and otp_record.is_valid():
                user.is_active = True
                user.save()
                otp_record.delete() # Clean up after verification
                return Response({"detail": "Account successfully activated!"}, status=status.HTTP_200_OK)
            
            return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)
        
        except (User.DoesNotExist, UserOTP.DoesNotExist):
            return Response({"error": "User or OTP record not found."}, status=status.HTTP_404_NOT_FOUND)

# ── Profile Management ────────────────────────────────────────────────────────
class UserProfileUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    
    def perform_update(self, serializer):
        serializer.save()

class AllUserListView(generics.ListAPIView):
    queryset = User.objects.all().select_related('profile').order_by('-date_joined')
    serializer_class = UserUpdateSerializer
    permission_classes = [IsAdminUser]


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        try:
            user = User.objects.get(email=email)
            otp_code = str(random.randint(100000, 999999))
            
            # CRITICAL FIX: Explicitly update 'created_at' to reset the timer
            UserOTP.objects.update_or_create(
                user=user, 
                defaults={
                    'otp': otp_code,
                    'created_at': timezone.now() 
                }
            )
            
            send_otp_email.delay(user.email, otp_code)
            return Response({"detail": "Verification code sent!"}, status=200)
            
        except User.DoesNotExist:
            return Response({"detail": "If an account exists, a code has been sent."}, status=200)

class VerifyResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp_received = str(request.data.get('otp', '')).strip()

        try:
            user = User.objects.get(email=email)
            otp_record = UserOTP.objects.get(user=user)

            # Debugging logs for your terminal
            print(f"DEBUG: Input {otp_received} | DB {otp_record.otp}")
            print(f"DEBUG: Created {otp_record.created_at} | Now {timezone.now()}")

            if otp_record.otp != otp_received:
                return Response({"error": "Incorrect code."}, status=400)

            if not otp_record.is_valid():
                return Response({"error": "This code has expired. Please request a new one."}, status=400)

            return Response({"detail": "OTP Verified."}, status=200)

        except (User.DoesNotExist, UserOTP.DoesNotExist):
            return Response({"error": "Session invalid. Please try again."}, status=404)
        


# ── Password Reset Confirm (Verify OTP & Change Password) ────────────────────
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp_received = str(request.data.get('otp', '')).strip()
        new_password = request.data.get('new_password')

        try:
            user = User.objects.get(email=email)
            otp_record = UserOTP.objects.get(user=user)
            
            # 1. Check if OTP is correct and hasn't expired (10 min)
            if otp_record.otp == otp_received and otp_record.is_valid():
                # 2. Update Password
                user.set_password(new_password)
                user.save()
                
                # 3. Clean up OTP
                otp_record.delete()
                
                return Response({"detail": "Password updated successfully!"}, status=status.HTTP_200_OK)
            
            return Response({"error": "Invalid or expired verification code."}, status=status.HTTP_400_BAD_REQUEST)
        
        except (User.DoesNotExist, UserOTP.DoesNotExist):
            return Response({"error": "Reset process failed. Please request a new code."}, status=status.HTTP_404_NOT_FOUND)



# ── Admin Dashboard ──────────────────────────────────────────────────────────
class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_revenue = Order.objects.filter(status='Delivered').aggregate(Sum('total_price'))['total_price__sum'] or 0
        pending_orders = Order.objects.filter(status='Pending').count()
        total_orders = Order.objects.count()
        total_products = Product.objects.count()
        out_of_stock = Product.objects.filter(stock__lte=0).count()
        total_users = User.objects.count()
        recent_users = User.objects.order_by('-date_joined')[:5]
        user_serializer = UserUpdateSerializer(recent_users, many=True)

        return Response({
            "stats": {
                "total_revenue": total_revenue,
                "total_orders": total_orders,
                "pending_orders": pending_orders,
                "total_products": total_products,
                "out_of_stock": out_of_stock,
                "total_users": total_users,
            },
            "recent_users": user_serializer.data
        })

class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all().select_related('profile')
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_destroy(self, instance):
        if instance == self.request.user:
            return Response({"error": "You cannot delete your own admin account."}, status=400)
        instance.delete()