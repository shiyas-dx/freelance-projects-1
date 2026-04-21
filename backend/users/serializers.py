from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

# ── Login Token Serializer ──────────────────────────────────────────────────
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['is_staff'] = self.user.is_staff
        data['username'] = self.user.username
        data['email'] = self.user.email
        return data

# ── Profile Serializer ──────────────────────────────────────────────────────
class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['image', 'phone', 'address', 'city']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.image:
            # Safely get the Cloudinary URL string
            representation['image'] = instance.image.url if hasattr(instance.image, 'url') else str(instance.image)
        return representation

# ── Registration Serializer ─────────────────────────────────────────────────
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    is_staff = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name', 'is_staff')

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        Profile.objects.get_or_create(user=user)
        return user

# ── User Update Serializer ──────────────────────────────────────────────────
class UserUpdateSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(source='profile.phone', required=False)
    address = serializers.CharField(source='profile.address', required=False)
    city = serializers.CharField(source='profile.city', required=False)
    # Removing read_only=True so the user can upload a new profile pic
    image = serializers.ImageField(source='profile.image', required=False)
    is_staff = serializers.BooleanField(required=False) 

    class Meta:
        model = User
        fields = (
            'id', 'username', 'first_name', 'last_name', 
            'email', 'image', 'phone', 'address', 'city', 
            'is_staff', 'date_joined'
        )
        read_only_fields = ('username', 'date_joined')

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Handle the nested profile image URL for the User object
        if hasattr(instance, 'profile') and instance.profile.image:
            representation['image'] = instance.profile.image.url
        return representation

    def update(self, instance, validated_data):
        # Extract profile data (this will handle image, phone, address, city)
        profile_data = validated_data.pop('profile', {}) 
        
        # Update User fields
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.email = validated_data.get('email', instance.email)
        instance.is_staff = validated_data.get('is_staff', instance.is_staff)
        instance.save()

        # Update Profile fields
        if profile_data:
            profile, _ = Profile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance