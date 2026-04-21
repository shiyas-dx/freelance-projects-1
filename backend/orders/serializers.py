from rest_framework import serializers
from .models import Order, OrderItem
from products.models import Product
from django.contrib.auth import get_user_model

User = get_user_model()

class UserMiniSerializer(serializers.ModelSerializer):
    """Small serializer to provide user context in the order table."""
    class Meta:
        model = User
        fields = ['id', 'username']

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_slug = serializers.ReadOnlyField(source='product.slug') 
    product_image = serializers.SerializerMethodField()
    product_price = serializers.ReadOnlyField(source='product.price')

    class Meta:
        model = OrderItem
        fields = ['product', 'product_name', 'product_slug', 'product_image', 'product_price', 'quantity', 'price_at_purchase']
        read_only_fields = ['price_at_purchase']

    def get_product_image(self, obj):
        if obj.product.image:
            return obj.product.image.url
        return None

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'name', 'phone', 'address', 'city', 'zip', 
            'total_price', 'items', 'status', 'is_deleted', 'created_at'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = Order.objects.create(**validated_data)
      
        for item_data in items_data:
            product = item_data['product']
            OrderItem.objects.create(
                order=order, 
                product=product,
                quantity=item_data['quantity'],
                price_at_purchase=product.price 
            )
            
            # Stock management
            product.stock -= item_data['quantity']
            product.save()

        return order

    def update(self, instance, validated_data):
        # Allow updating is_deleted for Restore/Soft-Delete actions
        instance.is_deleted = validated_data.get('is_deleted', instance.is_deleted)
        instance.status = validated_data.get('status', instance.status)
        instance.save()
        return instance