from rest_framework import serializers
from .models import Car, Bid, AuctionHistory, CarImage
from users.serializers import UserSerializer
from django.utils import timezone
from django.conf import settings

# Helper function to get absolute URL for media files
def get_media_absolute_url(url):
    if not url:
        return None
        
    # Если URL уже абсолютный и не использует 0.0.0.0
    if url.startswith(('http://', 'https://')) and '0.0.0.0' not in url:
        return url
    
    # Используем относительный URL для медиа-файлов
    # Это позволит браузеру запрашивать их через тот же домен, через который
    # он загрузил фронтенд, а прокси в Vite перенаправит запрос к бэкенду
    
    # Получаем часть пути после /media/
    if '/media/' in url:
        path = url.split('/media/')[1]
        return f"/media/{path}"
    
    # Если URL начинается с /, считаем это уже относительным путем
    if url.startswith('/'):
        return url
    
    # В иных случаях добавляем / в начало
    return f"/{url}"

class CarImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CarImage
        fields = ['id', 'car', 'image', 'is_primary', 'created_at', 'image_url']
        read_only_fields = ['created_at']
        
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            # Используем helper функцию если нет request
            return get_media_absolute_url(obj.image.url)
        return None

class BidSerializer(serializers.ModelSerializer):
    bidder = UserSerializer(read_only=True)
    
    class Meta:
        model = Bid
        fields = ['id', 'car', 'bidder', 'amount', 'created_at']
        read_only_fields = ['created_at', 'bidder']
    
    def validate(self, data):
        car = data.get('car')
        if not car:
            raise serializers.ValidationError({"error": "Не указан лот для ставки"})
            
        if not car.is_active():
            raise serializers.ValidationError({"error": "Этот аукцион не активен или уже завершен"})
        
        # Проверяем, не пытается ли продавец сделать ставку на свой лот
        request = self.context.get('request')
        if request and request.user == car.seller:
            raise serializers.ValidationError({"error": "Вы не можете делать ставки на свой собственный аукцион"})
            
        # Проверяем, не пытается ли пользователь перебить свою последнюю ставку
        if request:
            latest_bid = Bid.objects.filter(car=car).order_by('-created_at').first()
            if latest_bid and latest_bid.bidder == request.user:
                raise serializers.ValidationError({"error": "Вы не можете перебить свою собственную ставку"})
        
        amount = data.get('amount')
        if not amount:
            raise serializers.ValidationError({"error": "Необходимо указать сумму ставки"})
            
        # Проверяем соответствие минимальной сумме ставки
        min_increment = car.min_bid_increment
        min_required = car.current_price + min_increment
        
        if amount < min_required:
            raise serializers.ValidationError({
                "error": f"Ставка должна быть не менее {min_required} (текущая цена + {min_increment})"
            })
        
        return data

class AuctionHistorySerializer(serializers.ModelSerializer):
    winner = UserSerializer(read_only=True)
    car_details = serializers.SerializerMethodField()
    
    class Meta:
        model = AuctionHistory
        fields = ['id', 'car', 'car_details', 'winner', 'final_price', 'ended_at']
        read_only_fields = ['ended_at']
    
    def get_car_details(self, obj):
        return {
            'id': obj.car.id,
            'brand': obj.car.brand,
            'model': obj.car.model,
            'year': obj.car.year
        }

class CarListSerializer(serializers.ModelSerializer):
    seller = UserSerializer(read_only=True)
    bid_count = serializers.SerializerMethodField()
    time_remaining = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Car
        fields = [
            'id', 'seller', 'brand', 'model', 'year', 'current_price',
            'status', 'end_time', 'bid_count', 'time_remaining',
            'image', 'image_url'
        ]
    
    def get_bid_count(self, obj):
        return obj.bids.count()
    
    def get_time_remaining(self, obj):
        return obj.time_remaining()
        
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            # Используем helper функцию если нет request
            return get_media_absolute_url(obj.image.url)
        return None

class CarDetailSerializer(serializers.ModelSerializer):
    seller = UserSerializer(read_only=True)
    bids = BidSerializer(many=True, read_only=True)
    time_remaining = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    images = CarImageSerializer(many=True, read_only=True, source='images.all')
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Car
        fields = [
            'id', 'seller', 'brand', 'model', 'year', 'mileage',
            'description', 'starting_price', 'current_price', 'min_bid_increment',
            'status', 'created_at', 'start_time', 'end_time', 'image', 'image_url',
            'images', 'primary_image', 'bids', 'time_remaining'
        ]
        read_only_fields = ['current_price', 'created_at', 'images', 'primary_image']

    def get_time_remaining(self, obj):
        return obj.time_remaining()
        
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            # Используем helper функцию если нет request
            return get_media_absolute_url(obj.image.url)
        return None
        
    def get_primary_image(self, obj):
        # Находим основное изображение
        primary_image = obj.images.filter(is_primary=True).first()
        
        # Если основного изображения нет, берем первое
        if not primary_image:
            primary_image = obj.images.first()
            
        if primary_image:
            serializer = CarImageSerializer(primary_image, context=self.context)
            return serializer.data
        
        # Если нет изображений, возвращаем старое поле image (для обратной совместимости)
        if obj.image:
            return {
                'id': None,
                'image': obj.image.url,
                'image_url': self.get_image_url(obj),
                'is_primary': True
            }
            
        return None

    def validate_starting_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Начальная цена должна быть больше 0")
        return value

    def validate_year(self, value):
        current_year = timezone.now().year
        if value < 1900 or value > current_year + 1:
            raise serializers.ValidationError("Некорректный год выпуска")
        return value

    def validate_mileage(self, value):
        if value and value < 0:
            raise serializers.ValidationError("Пробег не может быть отрицательным")
        return value or 0

    def create(self, validated_data):
        # Set current_price equal to starting_price initially
        validated_data['current_price'] = validated_data.get('starting_price')
        
        # Устанавливаем start_time в текущее время, аукцион стартует немедленно
        validated_data['start_time'] = timezone.now()
        
        # Извлекаем изображения из запроса если они есть
        images_data = self.context.get('request').FILES.getlist('images', [])
        
        car = Car.objects.create(**validated_data)
        
        # Создаем объекты изображений
        for i, image_data in enumerate(images_data):
            # Первое изображение делаем основным
            is_primary = (i == 0)
            CarImage.objects.create(car=car, image=image_data, is_primary=is_primary)
            
        return car
        
    def update(self, instance, validated_data):
        # Обновляем основные поля
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        # Сохраняем экземпляр
        instance.save()
        
        # Обрабатываем изображения, если они есть в запросе
        request = self.context.get('request')
        if request and request.FILES:
            images_data = request.FILES.getlist('images', [])
            if images_data:
                # Если загружаются новые изображения
                for i, image_data in enumerate(images_data):
                    # Если это первое изображение и у автомобиля нет других изображений,
                    # то делаем его основным
                    is_primary = (i == 0 and not instance.images.exists())
                    CarImage.objects.create(car=instance, image=image_data, is_primary=is_primary)
        
        return instance