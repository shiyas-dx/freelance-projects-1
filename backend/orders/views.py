from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Order, OrderItem
from .serializers import OrderSerializer
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count, Q

class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
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
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

    def update(self, request, *args, **kwargs):
        order = self.get_object()
        new_status = request.data.get("status")

        if new_status == "Cancelled":
            if order.status == "Cancelled":
                return Response({"detail": "Order is already cancelled."}, status=status.HTTP_400_BAD_REQUEST)

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


class AdminOrderListView(generics.ListAPIView):
    """
    ADMIN ONLY: View orders with search and filtering. 
    Supports viewing 'deleted' orders via query param.
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        # 1. Handle the 'is_deleted' toggle safely
        # We check for 'true' string. Anything else defaults to active orders (False).
        is_deleted_param = self.request.query_params.get('is_deleted', 'false').lower()
        show_deleted = (is_deleted_param == 'true')

        # 2. Initial Queryset with optimized fetching
        queryset = (
            Order.objects
            .filter(is_deleted=show_deleted)
            .select_related("user")
            .prefetch_related("items__product")
            .order_by("-created_at")
        )

        # 3. Search Filter (Only apply if search is NOT an empty string)
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(id__icontains=search) | 
                Q(name__icontains=search) |
                Q(user__username__icontains=search)
            )

        # 4. Status Filter
        status_param = self.request.query_params.get('status', '').strip()
        if status_param:
            queryset = queryset.filter(status=status_param)

        # 5. City Filter
        city_param = self.request.query_params.get('city', '').strip()
        if city_param:
            queryset = queryset.filter(city__iexact=city_param)

        # 6. Optional: Ordering (to match your React 'sortBy' state)
        ordering = self.request.query_params.get('ordering', '').strip()
        if ordering:
            # Check if it's a valid field to prevent errors
            valid_fields = ['created_at', '-created_at', 'total_price', '-total_price']
            if ordering in valid_fields:
                queryset = queryset.order_by(ordering)

        return queryset
    

class AdminOrderStatusUpdateView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_destroy(self, instance):
        # If order is already soft-deleted, perform a hard delete (Purge)
        if instance.is_deleted:
            instance.delete()
        else:
            # Soft delete
            instance.is_deleted = True
            instance.save()

    def patch(self, request, *args, **kwargs):
        # Explicitly support patching 'is_deleted' for individual "Restore" actions
        return self.partial_update(request, *args, **kwargs)


class OrderStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        active_orders = Order.objects.filter(is_deleted=False)
        
        stats = {
            "total": active_orders.count(),
            "pending": active_orders.filter(status="Pending").count(),
            "shipped": active_orders.filter(status="Shipped").count(),
            "revenue": active_orders.exclude(status="Cancelled").aggregate(Sum('total_price'))['total_price__sum'] or 0
        }
        return Response(stats)


class BulkOrderActionView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        order_ids = request.data.get("ids", [])
        action = request.data.get("action") 
        
        if not order_ids or not action:
            return Response({"error": "Missing data"}, status=400)

        queryset = Order.objects.filter(id__in=order_ids)
        
        with transaction.atomic():
            if action == "delete":
                queryset.update(is_deleted=True)
            elif action == "restore":
                queryset.update(is_deleted=False)
            elif action == "purge" or action == "permanent_delete":
                queryset.delete()
            elif action == "Cancelled":
                for order in queryset:
                    if order.status != "Cancelled":
                        for item in order.items.all():
                            item.product.stock += item.quantity
                            item.product.save()
                        order.status = "Cancelled"
                        order.save()
            else:
                queryset.update(status=action)

        return Response({"message": f"Bulk action '{action}' applied successfully."})


class ReorderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=pk, user=request.user)

                if order.status != "Cancelled":
                    return Response({"error": "Only cancelled orders can be reordered."}, status=status.HTTP_400_BAD_REQUEST)

                for item in order.items.all():
                    if item.product.stock < item.quantity:
                        return Response({"error": f"Product {item.product.name} is out of stock."}, status=status.HTTP_400_BAD_REQUEST)

                for item in order.items.all():
                    item.product.stock -= item.quantity
                    item.product.save()

                order.status = "Pending"
                order.created_at = timezone.now()
                order.save(update_fields=["status", "created_at"])

            return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)