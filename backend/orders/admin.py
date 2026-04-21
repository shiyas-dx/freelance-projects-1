from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    # Link to the product change page so admin can quickly check stock
    readonly_fields = ["product_link", "quantity", "price_at_purchase"]
    fields = ["product_link", "quantity", "price_at_purchase"]
    can_delete = False

    def product_link(self, obj):
        if obj.product:
            url = reverse('admin:products_product_change', args=[obj.product.id])
            return format_html('<a href="{}">{}</a>', url, obj.product.name)
        return "Unknown Product"
    product_link.short_description = "Product"

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    # Added 'items_count' and 'user_link' for better overview
    list_display = [
        "id", "user_link", "name", "city", 
        "items_count", "total_price", "status", "created_at"
    ]
    list_filter = ["status", "created_at", "city"]
    list_editable = ["status"]
    search_fields = ["name", "phone", "address", "city", "user__username"]
    readonly_fields = ["id", "total_price", "created_at", "user_link"]
    ordering = ["-created_at"]
    inlines = [OrderItemInline]

    actions = ["mark_pending", "mark_shipped", "mark_delivered", "mark_cancelled"]

    # 1. Show how many items are in the order in the list view
    def items_count(self, obj):
        return obj.items.count()
    items_count.short_description = "Items"

    # 2. Link to the User Profile in the list view
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:auth_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.username)
        return "Guest"
    user_link.short_description = "Customer"

    # ── Actions with Inventory Logic ──────────────────────────────────────────

    @admin.action(description="Reset selected → Pending")
    def mark_pending(self, request, queryset):
        n = queryset.update(status="Pending")
        self.message_user(request, f"{n} order(s) reset to Pending.")

    @admin.action(description="Mark selected → Shipped")
    def mark_shipped(self, request, queryset):
        n = queryset.update(status="Shipped")
        self.message_user(request, f"{n} order(s) marked as Shipped.")

    @admin.action(description="Mark selected → Delivered")
    def mark_delivered(self, request, queryset):
        n = queryset.update(status="Delivered")
        self.message_user(request, f"{n} order(s) marked as Delivered.")

    @admin.action(description="Mark selected → Cancelled (Restock)")
    def mark_cancelled(self, request, queryset):
        """
        Custom logic to return items to stock when an order is cancelled.
        """
        for order in queryset:
            if order.status != "Cancelled":
                for item in order.items.all():
                    item.product.stock += item.quantity
                    item.product.save()
                order.status = "Cancelled"
                order.save()
        
        self.message_user(request, "Selected orders cancelled and items returned to stock.")