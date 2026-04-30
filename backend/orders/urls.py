from django.urls import path
from . import views

urlpatterns = [

    # ── Customer endpoints ────────────────────────────────────────────────────
    path("orders/",
         views.OrderListCreateView.as_view(),
         name="order-list"),

    path("orders/<int:pk>/",
         views.OrderDetailView.as_view(),
         name="order-detail"),

    path("orders/<int:pk>/reorder/",
         views.ReorderView.as_view(),
         name="order-reorder"),

    # ── Customer-facing token confirmation (WhatsApp link destination) ────────
    # Customer clicks the WA link → lands here → confirms or cancels
    path("order/confirm/<uuid:token>/<str:action>/",
         views.confirm_order_view,
         name="order-confirm-action"),


    # ── Admin: Confirmation Queue ─────────────────────────────────────────────
    # GET  – list all Pending orders waiting for admin action
    path("admin/orders/confirm-queue/",
         views.AdminConfirmQueueView.as_view(),
         name="admin-confirm-queue"),

    # POST – admin confirms or cancels a specific order
    # action = "confirm"  → status becomes "Admin Confirmed"
    # action = "cancel"   → status becomes "Cancelled" + stock restored
    path("admin/orders/<int:pk>/<str:action>/",
         views.AdminConfirmOrderView.as_view(),
         name="admin-confirm-order"),


    # ── Admin: Order Management ───────────────────────────────────────────────
    # GET  – all post-confirmation orders (excludes Pending by default)
    # Pass ?is_deleted=true for Order History view
    path("admin/orders/",
         views.AdminOrderListView.as_view(),
         name="admin-order-list"),

    # GET / PATCH / DELETE – single order detail + soft-delete / hard-delete
    path("admin/orders/<int:pk>/",
         views.AdminOrderStatusUpdateView.as_view(),
         name="admin-order-detail"),

    # POST – bulk status change or bulk delete
    path("admin/orders/bulk-action/",
         views.BulkOrderActionView.as_view(),
         name="admin-order-bulk"),


    # ── Admin: Stats ──────────────────────────────────────────────────────────
    path("admin/orders/stats/",
         views.OrderStatsView.as_view(),
         name="admin-order-stats"),
]