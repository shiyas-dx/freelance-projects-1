from django.urls import path
from .views import (
    ProductListView, ProductDetailView,
    CategoryListView, CategoryDetailView,
    SlideListView,
    ReviewListCreateView, ReviewDetailView,
    TodaySaleView, BestSellerView,
    NewArrivalView, WhiteFridayView,
    PremiumPickView,
    AdminProductListCreateView,
    AdminProductDetailView,
    ProductImageDeleteView,
    AdminSlideListCreateView,
    AdminSlideDetailView,
    AdminCategoryListCreateView,
    AdminCategoryDetailView
)

urlpatterns = [
    # ── 1. Promo & Specialized Sections (MUST BE FIRST) ──────────
    path('products/today-sale/', TodaySaleView.as_view(), name='today-sale'),
    path('products/best-sellers/', BestSellerView.as_view(), name='best-sellers'),
    path('products/new-arrivals/', NewArrivalView.as_view(), name='new-arrivals'),
    path('products/white-friday/', WhiteFridayView.as_view(), name='white-friday'),
    path('products/premium-pick/', PremiumPickView.as_view(), name='premium-pick'),

    # ── 2. General Lists ──────────────────────────────────────────
    path('products/', ProductListView.as_view(), name='product-list'),
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('slides/', SlideListView.as_view(), name='slide-list'),

    # ── 3. Detail Views (ID and Slug) ────────────────────────────
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('products/<slug:slug>/', ProductDetailView.as_view(), name='product-detail-slug'),
    
    path('categories/<int:pk>/', CategoryDetailView.as_view(), name='category-detail'),
    path('categories/<slug:slug>/', CategoryDetailView.as_view(), name='category-detail-slug'),

    # ── 4. Reviews ────────────────────────────────────────────────
    path('reviews/', ReviewListCreateView.as_view(), name='review-list-create'),
    path('reviews/<int:pk>/', ReviewDetailView.as_view(), name='review-detail'),


    path('admin-products/', AdminProductListCreateView.as_view(), name='admin-product-list-create'),
    path('admin-products/<int:pk>/', AdminProductDetailView.as_view(), name='admin-product-detail'),
    path('product-images/<int:pk>/', ProductImageDeleteView.as_view(), name='product-image-delete'),
    path("admin/slides/",          AdminSlideListCreateView.as_view(), name="admin-slide-list"),
    path("admin/slides/<int:pk>/", AdminSlideDetailView.as_view(),     name="admin-slide-detail"),
 
    # Categories
    path("admin/categories/",          AdminCategoryListCreateView.as_view(), name="admin-category-list"),
    path("admin/categories/<int:pk>/", AdminCategoryDetailView.as_view(),    name="admin-category-detail"),
]