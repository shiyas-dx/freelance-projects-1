from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from cloudinary.models import CloudinaryField

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True, null=True)
    # Swapped to CloudinaryField
    image = CloudinaryField('category_images', null=True, blank=True)

    class Meta:
        verbose_name_plural = "Categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True, null=True)
    description = models.TextField()
    
    price = models.DecimalField(max_digits=10, decimal_places=2)
    old_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        help_text="Original price before discount"
    )
    
    stock = models.IntegerField(default=0)
    # Swapped to CloudinaryField
    image = CloudinaryField('product_images')
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    is_today_sale   = models.BooleanField(default=False, verbose_name="Today's Sale")
    is_best_seller  = models.BooleanField(default=False)
    is_new_arrival  = models.BooleanField(default=False)
    is_white_friday = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def discount_percentage(self):
        if self.old_price and self.old_price > self.price:
            discount = ((self.old_price - self.price) / self.old_price) * 100
            return round(discount)
        return 0

    @property
    def savings_amount(self):
        if self.old_price and self.old_price > self.price:
            return self.old_price - self.price
        return 0

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    """Gallery images for the product detail page slider."""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    # Swapped to CloudinaryField
    image = CloudinaryField('product_gallery')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Gallery for {self.product.name}"


class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    name = models.CharField(max_length=100)
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], default=5)
    comment = models.TextField()
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.rating} stars by {self.name}"


class Slide(models.Model):
    """Main Homepage Hero Banner Slider."""
    title    = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255)
    # Swapped to CloudinaryField
    image    = CloudinaryField('slides')
    link_url = models.CharField(max_length=500, default="/shop")
    order    = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title