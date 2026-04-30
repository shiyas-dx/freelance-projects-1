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
        data['email']    = self.user.email
        # Return full_name so Login.jsx can store it as user_name immediately
        data['name']     = self.user.get_full_name() or self.user.username
        return data


# ── Profile Serializer ──────────────────────────────────────────────────────
class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Profile
        fields = ['image', 'phone', 'address', 'city']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.image:
            representation['image'] = (
                instance.image.url if hasattr(instance.image, 'url') else str(instance.image)
            )
        return representation


# ── Registration Serializer ─────────────────────────────────────────────────
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    is_staff  = serializers.BooleanField(read_only=True)

    class Meta:
        model  = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name', 'is_staff')

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        Profile.objects.get_or_create(user=user)
        return user


# ── User Update Serializer ──────────────────────────────────────────────────
class UserUpdateSerializer(serializers.ModelSerializer):
    # Single "name" field the frontend uses — maps to first_name + last_name
    name    = serializers.SerializerMethodField()

    phone   = serializers.CharField(source='profile.phone',   required=False, allow_blank=True)
    address = serializers.CharField(source='profile.address', required=False, allow_blank=True)
    city    = serializers.CharField(source='profile.city',    required=False, allow_blank=True)
    image   = serializers.ImageField(source='profile.image',  required=False)
    is_staff = serializers.BooleanField(required=False)

    class Meta:
        model  = User
        fields = (
            'id', 'username', 'name', 'first_name', 'last_name',
            'email', 'image', 'phone', 'address', 'city',
            'is_staff', 'date_joined',
        )
        read_only_fields = ('username', 'date_joined')

    # ── GET: return combined full name ──────────────────────────────────────
    def get_name(self, instance):
        full = instance.get_full_name().strip()
        return full if full else instance.username

    # ── GET: resolve Cloudinary image URL ──────────────────────────────────
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if hasattr(instance, 'profile') and instance.profile.image:
            representation['image'] = instance.profile.image.url
        return representation

    # ── PATCH/PUT: split "name" back into first_name / last_name ───────────
    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})

        # If the frontend sends a raw "name" string, split it
        raw_name = self.initial_data.get('name', '').strip()
        if raw_name:
            parts = raw_name.split(' ', 1)
            instance.first_name = parts[0]
            instance.last_name  = parts[1] if len(parts) > 1 else ''

        # Standard User field updates
        instance.last_name  = validated_data.get('last_name',  instance.last_name)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.email      = validated_data.get('email',      instance.email)
        instance.is_staff   = validated_data.get('is_staff',   instance.is_staff)
        instance.save()

        # Profile field updates (phone, address, city, image)
        if profile_data:
            profile, _ = Profile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance