from rest_framework import serializers
from .models import Product, Category, Slide, Review, ProductImage

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'image']

    # Ensure CloudinaryField returns the URL string
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.image:
            representation['image'] = instance.image.url
        return representation

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.image:
            representation['image'] = instance.image.url
        return representation


class ProductSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), 
        source='category', 
        write_only=True,
        required=False
    )
    category = CategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(max_length=1000000, allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )

    discount_percentage = serializers.ReadOnlyField()
    savings_amount = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'category', 'category_id', 'name', 'slug', 'description', 
            'price', 'old_price', 'discount_percentage', 'savings_amount',
            'stock', 'image', 'images', 'uploaded_images', 'is_active', 
            'is_today_sale', 'is_best_seller', 'is_new_arrival', 'is_white_friday',
            'created_at'
        ]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Ensure the main product image returns the Cloudinary URL
        if instance.image:
            representation['image'] = instance.image.url
        return representation

    def create(self, validated_data):
        request = self.context.get('request')
        uploaded_images = request.FILES.getlist('uploaded_images') if request else []
        
        validated_data.pop('uploaded_images', None)
        
        product = Product.objects.create(**validated_data)
        
        for img in uploaded_images:
            ProductImage.objects.create(product=product, image=img)
        return product

    def update(self, instance, validated_data):
        request = self.context.get('request')
        uploaded_images = request.FILES.getlist('uploaded_images') if request else []
        
        validated_data.pop('uploaded_images', None)

        if 'image' in validated_data and not validated_data['image']:
            validated_data.pop('image')

        instance = super().update(instance, validated_data)
        
        for img in uploaded_images:
            ProductImage.objects.create(product=instance, image=img)
        
        return instance
    

class SlideSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slide
        fields = '__all__'

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.image:
            representation['image'] = instance.image.url
        return representation


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'product', 'name', 'rating', 'comment', 'is_approved']