from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html
from .models import Profile

# Define an inline admin descriptor for Profile model
class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Profile Info'

# Re-define the User admin
class UserAdmin(BaseUserAdmin):
    inlines = (ProfileInline, )
    list_display = ('username', 'email', 'first_name', 'last_name', 'get_city', 'is_staff', 'get_image')
    
    def get_city(self, instance):
        return instance.profile.city
    get_city.short_description = 'City'

    def get_image(self, instance):
        if instance.profile.image:
            return format_html('<img src="{}" style="width: 30px; height: 30px; border-radius: 50%;" />', instance.profile.image.url)
        return "No Image"
    get_image.short_description = 'Avatar'

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)