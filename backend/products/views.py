from rest_framework import generics, permissions
from django.db.models import Q
from .models import Product, Category, Slide, Review, ProductImage
from .serializers import ProductSerializer, CategorySerializer, SlideSerializer, ReviewSerializer
from rest_framework.pagination import PageNumberPagination


# ── Helpers ──────────────────────────────────────────────────────────────────

def active_products():
    """Base queryset used by every product view with optimized database hits."""
    return Product.objects.filter(is_active=True).select_related('category').prefetch_related('images')

# ── Core product views ────────────────────────────────────────────────────────

class ProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer

    def get_queryset(self):
        queryset = active_products()
        category_param = self.request.query_params.get('category') # Usually what frontend sends
        category_id_param = self.request.query_params.get('category_id')
        search = self.request.query_params.get('search')
        sort = self.request.query_params.get('sort')

        # 1. Handle explicit category_id if provided
        if category_id_param:
            queryset = queryset.filter(category_id=category_id_param)
        
        # 2. Handle the 'category' parameter dynamically (ID or Slug)
        elif category_param:
            if category_param.isdigit():
                # If the param is "2", filter by ID
                queryset = queryset.filter(category_id=category_param)
            else:
                # If the param is "electronics", filter by slug
                queryset = queryset.filter(category__slug=category_param)

        # ... rest of your search and sort logic remains the same ...
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(description__icontains=search) |
                Q(category__name__icontains=search)
            )

        if sort == 'low':
            queryset = queryset.order_by('price')
        elif sort == 'high':
            queryset = queryset.order_by('-price')

        return queryset
    


class ProductDetailView(generics.RetrieveAPIView):
    queryset = active_products()
    serializer_class = ProductSerializer
    
    def get_object(self):
        lookup_url_kwarg = self.kwargs.get('pk') or self.kwargs.get('slug')
        if str(lookup_url_kwarg).isdigit():
            return generics.get_object_or_404(active_products(), pk=lookup_url_kwarg)
        return generics.get_object_or_404(active_products(), slug=lookup_url_kwarg)

# ── Specialized Promo Views ───────────────────────────────────────────────────

class TodaySaleView(generics.ListAPIView):
    serializer_class = ProductSerializer
    def get_queryset(self):
        return active_products().filter(is_today_sale=True)

class BestSellerView(generics.ListAPIView):
    serializer_class = ProductSerializer
    def get_queryset(self):
        return active_products().filter(is_best_seller=True)

class NewArrivalView(generics.ListAPIView):
    serializer_class = ProductSerializer
    def get_queryset(self):
        return active_products().filter(is_new_arrival=True).order_by('-created_at')

class WhiteFridayView(generics.ListAPIView):
    serializer_class = ProductSerializer
    def get_queryset(self):
        return active_products().filter(is_white_friday=True)

class PremiumPickView(generics.ListAPIView):
    """
    Returns the most expensive products for the premium section.
    Limit to 4 so the frontend grid stays clean.
    """
    serializer_class = ProductSerializer
    def get_queryset(self):
        return active_products().order_by('-price')[:4]

# ── Category & slide views ────────────────────────────────────────────────────

class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class CategoryDetailView(generics.RetrieveAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_object(self):
        lookup_url_kwarg = self.kwargs.get('pk') or self.kwargs.get('slug')
        if str(lookup_url_kwarg).isdigit():
            return generics.get_object_or_404(Category, pk=lookup_url_kwarg)
        return generics.get_object_or_404(Category, slug=lookup_url_kwarg)

class SlideListView(generics.ListAPIView):
    queryset = Slide.objects.filter(is_active=True).order_by('order')
    serializer_class = SlideSerializer

# ── Review views ──────────────────────────────────────────────────────────────

class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        queryset = Review.objects.all()
        approved = self.request.query_params.get('approved')
        product_id = self.request.query_params.get('product')

        if approved == 'true':
            queryset = queryset.filter(is_approved=True)
            
        # FIX: Check if product_id is not None and is actually a number
        if product_id and product_id != "undefined" and product_id.isdigit():
            queryset = queryset.filter(product_id=product_id)
        elif product_id == "undefined":
            # Return nothing if the frontend sent "undefined"
            return Review.objects.none()

        return queryset.order_by('-created_at')

class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer

class AdminProductPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100



class AdminProductListCreateView(generics.ListCreateAPIView):
    serializer_class    = ProductSerializer
    permission_classes  = [permissions.IsAdminUser]
    pagination_class    = AdminProductPagination
 
    def get_queryset(self):
        qs = Product.objects.all().select_related("category").prefetch_related("images")
 
        category  = self.request.query_params.get("category")
        search    = self.request.query_params.get("search")
        is_active = self.request.query_params.get("is_active")
        promo     = self.request.query_params.get("promo")   # e.g. "is_today_sale"
 
        if category:
            qs = qs.filter(category_id=category)
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        if is_active in ("true", "false"):
            qs = qs.filter(is_active=is_active == "true")
        if promo and promo in (
            "is_today_sale", "is_best_seller", "is_new_arrival", "is_white_friday"
        ):
            qs = qs.filter(**{promo: True})
 
        return qs.order_by("-created_at")
 
 
class AdminProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset            = Product.objects.all()
    serializer_class    = ProductSerializer
    permission_classes  = [permissions.IsAdminUser]

class ProductImageDeleteView(generics.DestroyAPIView):
    queryset = ProductImage.objects.all()
    permission_classes = [permissions.IsAdminUser]

# ── Slides (already perfect) ─────────────────────────────────────────────
class AdminSlideListCreateView(generics.ListCreateAPIView):
    serializer_class   = SlideSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset           = Slide.objects.all().order_by("order")


class AdminSlideDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = SlideSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset           = Slide.objects.all()


# ── Categories — NOW FULL CRUD ───────────────────────────────────────────
class AdminCategoryListCreateView(generics.ListCreateAPIView):
    """
    GET  /admin/categories/   → list all
    POST /admin/categories/   → create new (name + optional image)
    """
    serializer_class   = CategorySerializer
    permission_classes = [permissions.IsAdminUser]
    queryset           = Category.objects.all().order_by("name")


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /admin/categories/<id>/   → fetch
    PATCH  /admin/categories/<id>/   → update name + image
    DELETE /admin/categories/<id>/   → delete
    """
    serializer_class   = CategorySerializer
    permission_classes = [permissions.IsAdminUser]
    queryset           = Category.objects.all()