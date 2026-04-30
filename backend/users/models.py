from django.db import models
from django.contrib.auth.models import User
from cloudinary.models import CloudinaryField
from django.utils import timezone
from datetime import timedelta

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    image = CloudinaryField('profile_pics', null=True, blank=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f'{self.user.username} Profile'
    
class UserOTP(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(default=timezone.now)

    def is_valid(self):
        return timezone.now() < self.created_at + timedelta(minutes=10)
    
    def __str__(self):
        return f"OTP for {self.user.username}"