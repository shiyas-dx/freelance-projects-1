from django.urls import path
from . import views

urlpatterns = [
    # Customer Views
    path('orders/', views.OrderListCreateView.as_view(), name='order-list'),
    path('orders/<int:pk>/', views.OrderDetailView.as_view(), name='order-detail'),
    path('orders/<int:pk>/reorder/', views.ReorderView.as_view(), name='order-reorder'),

    # Admin Management Views
    path('admin/orders/', views.AdminOrderListView.as_view(), name='admin-order-list'),
    path('admin/orders/<int:pk>/', views.AdminOrderStatusUpdateView.as_view(), name='admin-order-detail'),
    path('admin/orders/bulk-action/', views.BulkOrderActionView.as_view(), name='admin-order-bulk'),
    
    # Dashboard Utility Views
    path('admin/orders/stats/', views.OrderStatsView.as_view(), name='admin-order-stats'),
]