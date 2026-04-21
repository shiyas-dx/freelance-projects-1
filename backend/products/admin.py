from django.contrib import admin
from django.utils.html import format_html
from .models import Product, Category, Slide, Review, ProductImage

# ── Category ──────────────────────────────────────────────────────────────────

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_image', 'name', 'slug']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)} # Automatically generates slug as you type

    def get_image(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width: 40px; height: 40px; border-radius: 4px;" />', obj.image.url)
        return "No Image"
    get_image.short_description = 'Preview'


# ── Product ───────────────────────────────────────────────────────────────────

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1 # Changed to 1 to keep the UI clean
    fields = ['image', 'get_preview']
    readonly_fields = ['get_preview']

    def get_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width: 80px; height: 80px; object-fit: cover;" />', obj.image.url)
        return ""

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    # Added 'preview' and 'colored_stock' for a high-end feel
    list_display = [
        'preview', 'name', 'category', 'price', 'colored_stock', 
        'is_active', 'is_today_sale', 'is_white_friday'
    ]
    
    list_editable = [
        'is_active', 'is_today_sale', 'is_white_friday'
    ]
    
    list_filter = [
        'category', 'is_active', 'is_today_sale', 
        'is_best_seller', 'is_new_arrival', 'is_white_friday'
    ]
    
    search_fields = ['name', 'description']
    inlines = [ProductImageInline]
    prepopulated_fields = {'slug': ('name',)}

    # Professional Fieldsets to organize the editor page
    fieldsets = (
        ('Main Info', {
            'fields': ('category', 'name', 'slug', 'description', 'image')
        }),
        ('Pricing & Inventory', {
            'fields': (('price', 'old_price'), 'stock', 'is_active'),
        }),
        ('Promotions', {
            'description': 'Select which homepage section this product appears in.',
            'classes': ('collapse',), # Collapsible section
            'fields': ('is_today_sale', 'is_best_seller', 'is_new_arrival', 'is_white_friday'),
        }),
    )

    # 1. Show product thumbnail in the list
    def preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width: 50px; height: 50px; border-radius: 5px;" />', obj.image.url)
        return "No Image"
    preview.short_description = 'Img'

    # 2. Color code the stock levels (Red for low stock)
    def colored_stock(self, obj):
        color = "green"
        if obj.stock <= 5:
            color = "red"
        elif obj.stock <= 15:
            color = "orange"
        return format_html('<b style="color: {};">{}</b>', color, obj.stock)
    colored_stock.short_description = 'Stock'


# ── Slide (Homepage Banner) ───────────────────────────────────────────────────

@admin.register(Slide)
class SlideAdmin(admin.ModelAdmin):
    list_display = ['get_preview', 'title', 'is_active', 'order']
    list_editable = ['is_active', 'order']

    def get_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width: 120px; height: 50px; object-fit: cover; border-radius: 4px;" />', obj.image.url)
        return "No Image"


# ── Review ────────────────────────────────────────────────────────────────────

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('name', 'product', 'rating', 'is_approved', 'created_at')
    list_filter = ('is_approved', 'rating', 'created_at')
    list_editable = ('is_approved',)
    search_fields = ('name', 'comment', 'product__name')


# ── ProductImage (Direct Access) ──────────────────────────────────────────────

@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['product', 'get_preview', 'created_at']
    
    def get_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width: 50px;" />', obj.image.url)
        return ""