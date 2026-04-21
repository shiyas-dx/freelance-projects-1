from django.db import models
from django.contrib.auth.models import User
from cloudinary.models import CloudinaryField

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    image = CloudinaryField('profile_pics', null=True, blank=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f'{self.user.username} Profile'