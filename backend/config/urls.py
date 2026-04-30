from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from orders.views import confirm_order_view
from users.views import GoogleLogin

urlpatterns = [
    
    path('admin/', admin.site.urls),
    path('api/auth/google/', GoogleLogin.as_view(), name='google_login'),
    path('api/', include('users.urls')),
    path('api/', include('products.urls')),
    path('api/', include('orders.urls')),
    path('order/confirm/<uuid:token>/<str:action>/', confirm_order_view, name='order-confirm'),
    path('accounts/', include('allauth.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)