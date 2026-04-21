from django.contrib.auth.models import User
from django.contrib.auth.forms import PasswordResetForm
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import RegisterSerializer, UserUpdateSerializer, MyTokenObtainPairSerializer
from rest_framework.response import Response
from django.db.models import Sum
from products.models import Product
from orders.models import Order


# ── Login View ────────────────────────────────────────────────────────────────

class MyTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT Login View that uses our custom serializer to return is_staff.
    """
    serializer_class = MyTokenObtainPairSerializer
    permission_classes = [AllowAny]


# ── Registration ──────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        """
        Overridden to return is_staff status immediately after registration
        so the frontend can handle initial routing if needed.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        headers = self.get_success_headers(serializer.data)
        
        # Adding is_staff to the response data explicitly
        response_data = serializer.data
        response_data['is_staff'] = user.is_staff
        
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)


# ── Profile Management ────────────────────────────────────────────────────────

class UserProfileUpdateView(generics.RetrieveUpdateAPIView):
    """
    Handles fetching and updating user details + profile fields.
    """
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    
    def perform_update(self, serializer):
        serializer.save()


class AllUserListView(generics.ListAPIView):
    """
    ADMIN ONLY: Returns a list of all registered users for the Admin Dashboard.
    """
    queryset = User.objects.all().select_related('profile').order_by('-date_joined')
    serializer_class = UserUpdateSerializer
    permission_classes = [IsAdminUser] # Only staff/admins can access this


# ── Password Reset Flow ───────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name='dispatch')
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email')
        form = PasswordResetForm({'email': email})
        
        if form.is_valid():
            form.save(
                request=request,
                use_https=request.is_secure(),
                from_email=settings.DEFAULT_FROM_EMAIL,
                email_template_name='registration/password_reset_email.html',
            )
            return Response({"detail": "Password reset email sent."}, status=status.HTTP_200_OK)
        
        return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response({"detail": "Password has been reset successfully."}, status=status.HTTP_200_OK)
        
        return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
    





class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # 1. Revenue (Sum of total_price from delivered orders)
        total_revenue = Order.objects.filter(status='Delivered').aggregate(Sum('total_price'))['total_price__sum'] or 0
        
        # 2. Order Counts
        pending_orders = Order.objects.filter(status='Pending').count()
        total_orders = Order.objects.count()
        
        # 3. Product Stats
        total_products = Product.objects.count()
        out_of_stock = Product.objects.filter(stock__lte=0).count()
        
        # 4. User Stats
        total_users = User.objects.count()

        # 5. Recent Activity (Latest 5 Users)
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
    """
    ADMIN ONLY: Full control (Update/Delete) over any user account.
    """
    queryset = User.objects.all().select_related('profile')
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_destroy(self, instance):
        # Prevent Admin from deleting themselves accidentally
        if instance == self.request.user:
            return Response({"error": "You cannot delete your own admin account."}, status=400)
        instance.delete()