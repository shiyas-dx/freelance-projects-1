from django.conf import settings

# This forces the attribute to exist for the library
# while keeping your STORAGES dictionary as the source of truth
if not hasattr(settings, 'STATICFILES_STORAGE'):
    setattr(settings, 'STATICFILES_STORAGE', 'cloudinary_storage.storage.StaticCloudinaryStorage')