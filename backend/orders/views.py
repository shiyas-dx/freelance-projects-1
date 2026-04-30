from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Order, OrderItem
from .serializers import OrderSerializer
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Q
from django.shortcuts import get_object_or_404
from django.http import HttpResponse


# ═══════════════════════════════════════════════════════════
#  CUSTOMER VIEWS
# ═══════════════════════════════════════════════════════════

class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class   = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects
            .filter(user=self.request.user, is_deleted=False)
            .prefetch_related("items__product")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class OrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

    def update(self, request, *args, **kwargs):
        order      = self.get_object()
        new_status = request.data.get("status")

        if new_status == "Cancelled":
            if order.status == "Cancelled":
                return Response({"detail": "Order is already cancelled."}, status=400)

            with transaction.atomic():
                if request.user.is_staff:
                    order.status = "Cancelled"
                    for item in order.items.all():
                        item.product.stock += item.quantity
                        item.product.save()
                else:
                    order.status = "Cancellation Requested"
                order.save()

            return Response(OrderSerializer(order).data)

        return super().update(request, *args, **kwargs)


class ReorderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=pk, user=request.user)

                if order.status != "Cancelled":
                    return Response({"error": "Only cancelled orders can be reordered."}, status=400)

                for item in order.items.all():
                    if item.product.stock < item.quantity:
                        return Response(
                            {"error": f"Product '{item.product.name}' is out of stock."},
                            status=400,
                        )

                for item in order.items.all():
                    item.product.stock -= item.quantity
                    item.product.save()

                order.status     = "Pending"
                order.created_at = timezone.now()
                order.save(update_fields=["status", "created_at"])

            return Response(OrderSerializer(order).data, status=200)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=404)


# ═══════════════════════════════════════════════════════════
#  ADMIN — CONFIRMATION QUEUE  (/admin/orders/confirm-queue/)
#  Only surfaces Pending orders that need admin action.
# ═══════════════════════════════════════════════════════════

class AdminConfirmQueueView(generics.ListAPIView):
    """
    Returns Pending orders that are waiting for admin WhatsApp confirmation.
    Frontend: OrderConfirmationQueue page.
    """
    serializer_class   = OrderSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = (
            Order.objects
            .filter(is_deleted=False, status="Pending")
            .select_related("user")
            .prefetch_related("items__product")
            .order_by("created_at")          # oldest first — process in FIFO order
        )
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(id__icontains=search) |
                Q(name__icontains=search) |
                Q(user__username__icontains=search)
            )
        return qs

    def list(self, request, *args, **kwargs):
        qs   = self.get_queryset()
        data = self.get_serializer(qs, many=True).data
        return Response({
            "count":   qs.count(),
            "results": data,
        })


class AdminConfirmOrderView(APIView):
    """
    POST  /admin/orders/<pk>/admin-confirm/   → status = 'Admin Confirmed'
    POST  /admin/orders/<pk>/admin-cancel/    → status = 'Cancelled' + restock
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk, action):
        order = get_object_or_404(Order, pk=pk, is_deleted=False)

        if action == "confirm":
            if order.status != "Pending":
                return Response({"error": "Only Pending orders can be confirmed."}, status=400)
            order.status = "Admin Confirmed"
            order.save(update_fields=["status", "updated_at"])
            return Response(OrderSerializer(order).data)

        elif action == "cancel":
            if order.status == "Cancelled":
                return Response({"error": "Order is already cancelled."}, status=400)
            with transaction.atomic():
                for item in order.items.all():
                    item.product.stock += item.quantity
                    item.product.save()
                order.status = "Cancelled"
                order.save(update_fields=["status", "updated_at"])
            return Response(OrderSerializer(order).data)

        return Response({"error": f"Unknown action '{action}'."}, status=400)


# ═══════════════════════════════════════════════════════════
#  ADMIN — ORDER MANAGEMENT  (/admin/orders/)
#  Handles post-confirmation lifecycle: Shipped, Delivered, etc.
# ═══════════════════════════════════════════════════════════

class AdminOrderListView(generics.ListAPIView):
    """
    All non-deleted orders (optionally filter by is_deleted=true for history).
    Excludes pure 'Pending' orders — those belong in the confirm queue.
    Pass ?include_pending=true to include them (e.g. for global search).
    """
    serializer_class   = OrderSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        is_deleted_param  = self.request.query_params.get("is_deleted", "false").lower()
        show_deleted      = (is_deleted_param == "true")
        include_pending   = self.request.query_params.get("include_pending", "false").lower() == "true"

        qs = (
            Order.objects
            .filter(is_deleted=show_deleted)
            .select_related("user")
            .prefetch_related("items__product")
            .order_by("-created_at")
        )

        # By default hide pure Pending orders (they're handled by confirm queue)
        if not show_deleted and not include_pending:
            qs = qs.exclude(status="Pending")

        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(id__icontains=search) |
                Q(name__icontains=search) |
                Q(user__username__icontains=search)
            )

        status_param = self.request.query_params.get("status", "").strip()
        if status_param:
            qs = qs.filter(status=status_param)

        city_param = self.request.query_params.get("city", "").strip()
        if city_param:
            qs = qs.filter(city__iexact=city_param)

        ordering = self.request.query_params.get("ordering", "").strip()
        valid_orderings = {"created_at", "-created_at", "total_price", "-total_price"}
        if ordering in valid_orderings:
            qs = qs.order_by(ordering)

        return qs


class AdminOrderStatusUpdateView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Order.objects.all()
    serializer_class   = OrderSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_destroy(self, instance):
        if instance.is_deleted:
            instance.delete()           # hard delete (purge from history)
        else:
            instance.is_deleted = True
            instance.save()

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


class BulkOrderActionView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        order_ids = request.data.get("ids", [])
        action    = request.data.get("action")

        if not order_ids or not action:
            return Response({"error": "Missing 'ids' or 'action'."}, status=400)

        queryset = Order.objects.filter(id__in=order_ids)

        with transaction.atomic():
            if action == "delete":
                queryset.update(is_deleted=True)

            elif action == "restore":
                queryset.update(is_deleted=False)

            elif action in ("purge", "permanent_delete"):
                queryset.delete()

            elif action == "Cancelled":
                for order in queryset.prefetch_related("items__product"):
                    if order.status != "Cancelled":
                        for item in order.items.all():
                            item.product.stock += item.quantity
                            item.product.save()
                        order.status = "Cancelled"
                        order.save(update_fields=["status", "updated_at"])

            else:
                # Generic status update (Shipped, Delivered, Admin Confirmed, …)
                queryset.update(status=action)

        return Response({"message": f"Bulk action '{action}' applied to {len(order_ids)} order(s)."})


# ═══════════════════════════════════════════════════════════
#  ADMIN — STATS
# ═══════════════════════════════════════════════════════════

class OrderStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        active = Order.objects.filter(is_deleted=False)
        return Response({
            "total":             active.count(),
            "pending":           active.filter(status="Pending").count(),
            "admin_confirmed":   active.filter(status="Admin Confirmed").count(),
            "shipped":           active.filter(status="Shipped").count(),
            "delivered":         active.filter(status="Delivered").count(),
            "cancelled":         active.filter(status="Cancelled").count(),
            "revenue":           active.exclude(status="Cancelled")
                                       .aggregate(total=Sum("total_price"))["total"] or 0,
        })


# ═══════════════════════════════════════════════════════════
#  CUSTOMER-FACING TOKEN CONFIRMATION PAGE
#  Triggered when customer clicks the WhatsApp link
# ═══════════════════════════════════════════════════════════

def confirm_order_view(request, token, action):
    order = get_object_or_404(Order, confirmation_token=token)

    if action == "confirm":
        if order.status not in ("Pending", "Admin Confirmed"):
            return HttpResponse(
                "<h2>This order has already been processed.</h2>"
                "<p>No changes were made.</p>"
            )
        order.status = "Processing"
        order.save(update_fields=["status", "updated_at"])
        return HttpResponse("""
            <html><head><title>Order Confirmed</title>
            <style>body{font-family:sans-serif;max-width:420px;margin:80px auto;text-align:center}
            h1{color:#16a34a}p{color:#555}</style></head>
            <body><h1>✅ Order Confirmed!</h1>
            <p>Thank you for confirming your order. We'll ship it soon.</p></body></html>
        """)

    elif action == "cancel":
        if order.status == "Cancelled":
            return HttpResponse("<h2>Order was already cancelled.</h2>")
        with transaction.atomic():
            for item in order.items.all():
                item.product.stock += item.quantity
                item.product.save()
            order.status = "Cancelled"
            order.save(update_fields=["status", "updated_at"])
        return HttpResponse("""
            <html><head><title>Order Cancelled</title>
            <style>body{font-family:sans-serif;max-width:420px;margin:80px auto;text-align:center}
            h1{color:#dc2626}p{color:#555}</style></head>
            <body><h1>❌ Order Cancelled</h1>
            <p>Your order has been cancelled. Stock has been restored.</p></body></html>
        """)

    return HttpResponse("<h2>Invalid action.</h2>", status=400)