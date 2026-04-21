from django.db import models
from django.conf import settings
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

class Order(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Processing', 'Processing'),
        ('Shipped', 'Shipped'),
        ('Delivered', 'Delivered'),
        ('Cancellation Requested', 'Cancellation Requested'),
        ('Cancelled', 'Cancelled'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    address = models.TextField()
    city = models.CharField(max_length=100)
    zip = models.CharField(max_length=10, default='')
    
    # Financials
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Status & Tracking
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Pending')
    is_deleted = models.BooleanField(default=False) # Supports "Move to History"
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.id} - {self.name}"

    def update_total_price(self):
        """Calculates total price based on items and saves it."""
        total = sum(item.get_cost() for item in self.items.all())
        # update_fields prevents infinite recursion if called within a signal
        self.total_price = total
        self.save(update_fields=['total_price'])


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE) 
    quantity = models.PositiveIntegerField(default=1)
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"

    def get_cost(self):
        return self.price_at_purchase * self.quantity

    def save(self, *args, **kwargs):
        if not self.price_at_purchase:
            self.price_at_purchase = self.product.price
        super().save(*args, **kwargs)

# --- Signals to keep total_price in sync ---

@receiver(post_save, sender=OrderItem)
@receiver(post_delete, sender=OrderItem)
def update_order_total(sender, instance, **kwargs):
    """Automatically updates Order total_price when items change."""
    if instance.order:
        instance.order.update_total_price()