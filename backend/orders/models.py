from django.db import models
import uuid
from django.conf import settings
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


class Order(models.Model):
    STATUS_CHOICES = (
        ('Pending',            'Pending'),
        ('Admin Confirmed',    'Admin Confirmed'),   # ← NEW: admin sent WA + internally confirmed
        ('Processing',         'Processing'),
        ('Shipped',            'Shipped'),
        ('Delivered',          'Delivered'),
        ('Cancellation Requested', 'Cancellation Requested'),
        ('Cancelled',          'Cancelled'),
    )

    user               = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    name               = models.CharField(max_length=255)
    phone              = models.CharField(max_length=20)
    address            = models.TextField()
    city               = models.CharField(max_length=100)
    zip                = models.CharField(max_length=10, default='')
    confirmation_token = models.UUIDField(default=uuid.uuid4, editable=False, null=True)

    # Financials
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # Status & Tracking
    status      = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Pending')
    notes       = models.TextField(blank=True, default='')
    is_deleted  = models.BooleanField(default=False)   # soft-delete / "move to history"

    # Timestamps
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.id} – {self.name} [{self.status}]"

    def update_total_price(self):
        """Recalculates and persists total_price from items."""
        total = sum(item.get_cost() for item in self.items.all())
        self.total_price = total
        self.save(update_fields=['total_price'])


class OrderItem(models.Model):
    order              = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product            = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    quantity           = models.PositiveIntegerField(default=1)
    price_at_purchase  = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} × {self.product.name}"

    def get_cost(self):
        return self.price_at_purchase * self.quantity

    def save(self, *args, **kwargs):
        if not self.price_at_purchase:
            self.price_at_purchase = self.product.price
        super().save(*args, **kwargs)


# ── Signals: keep total_price in sync automatically ──────────────────────────

@receiver(post_save, sender=OrderItem)
@receiver(post_delete, sender=OrderItem)
def update_order_total(sender, instance, **kwargs):
    if instance.order_id:
        instance.order.update_total_price()