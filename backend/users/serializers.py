from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, Profile, SellerReview

class ProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Profile
        fields = ['bio', 'phone', 'rating', 'rating_count', 'avatar', 'avatar_url']
        read_only_fields = ['rating', 'rating_count']
    
    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and hasattr(obj.avatar, 'url'):
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

class SellerReviewSerializer(serializers.ModelSerializer):
    reviewer_username = serializers.CharField(source='reviewer.username', read_only=True)
    reviewer_id = serializers.IntegerField(source='reviewer.id', read_only=True)
    
    class Meta:
        model = SellerReview
        fields = ['id', 'rating', 'comment', 'created_at', 'reviewer_username', 'reviewer_id']
        read_only_fields = ['created_at', 'reviewer_username', 'reviewer_id']

class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True, format="%d.%m.%Y")
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 'date_joined', 'is_email_verified']
        read_only_fields = ['id', 'date_joined', 'is_email_verified']

class UserDetailSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer()
    date_joined = serializers.DateTimeField(read_only=True, format="%d.%m.%Y")
    reviews = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 'date_joined', 'reviews', 'is_email_verified']
        read_only_fields = ['id', 'email', 'date_joined', 'reviews', 'is_email_verified']
    
    def get_reviews(self, obj):
        reviews = SellerReview.objects.filter(seller=obj)
        return SellerReviewSerializer(reviews, many=True).data
    
    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        profile = instance.profile
        
        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update Profile fields
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        
        return instance

class SellerProfileSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True, format="%d.%m.%Y")
    reviews = serializers.SerializerMethodField()
    has_reviewed = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile', 'date_joined', 'reviews', 'has_reviewed']
        read_only_fields = ['id', 'username', 'first_name', 'last_name', 'profile', 'date_joined', 'reviews', 'has_reviewed']
    
    def get_reviews(self, obj):
        reviews = SellerReview.objects.filter(seller=obj)
        return SellerReviewSerializer(reviews, many=True).data
    
    def get_has_reviewed(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return SellerReview.objects.filter(seller=obj, reviewer=request.user).exists()
        return False

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "User with this email already exists."})
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(request=self.context.get('request'), email=email, password=password)
            
            if not user:
                raise serializers.ValidationError('Unable to log in with provided credentials.')
            
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
        else:
            raise serializers.ValidationError('Must include "email" and "password".')
        
        attrs['user'] = user
        return attrs

class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect")
        return value

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user with this email address")
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(validators=[validate_password])

class EmailVerificationCodeSerializer(serializers.Serializer):
    code = serializers.CharField(required=True, min_length=6, max_length=6)
    email = serializers.EmailField(required=False)  # Необязательное поле для API верификации при входе
    
    def validate_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("Код подтверждения должен содержать только цифры")
        return value

class EmailVerificationRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        try:
            User.objects.get(email=value)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Пользователь с таким email не найден")
