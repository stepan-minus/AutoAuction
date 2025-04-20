from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.utils import timezone
from django.core.validators import MinValueValidator

from django.contrib.auth import get_user_model
from auction.models import Car, CarImage
from users.models import Profile

User = get_user_model()

class CarForm(forms.ModelForm):
    """Форма для создания и редактирования автомобиля"""
    
    class Meta:
        model = Car
        fields = [
            'seller', 'brand', 'model', 'year', 'mileage',
            'description', 'starting_price', 'min_bid_increment',
            'status', 'end_time', 'image'
        ]
        widgets = {
            'seller': forms.Select(attrs={'class': 'form-select'}),
            'brand': forms.TextInput(attrs={'class': 'form-control'}),
            'model': forms.TextInput(attrs={'class': 'form-control'}),
            'year': forms.NumberInput(attrs={'class': 'form-control'}),
            'mileage': forms.NumberInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 5}),
            'starting_price': forms.NumberInput(attrs={'class': 'form-control'}),
            'min_bid_increment': forms.NumberInput(attrs={'class': 'form-control'}),
            'status': forms.Select(attrs={'class': 'form-select'}, choices=Car.STATUS_CHOICES),
            'end_time': forms.DateTimeInput(attrs={'class': 'form-control', 'type': 'datetime-local'}),
            'image': forms.FileInput(attrs={'class': 'form-control'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['mileage'].required = False
        self.fields['image'].required = False
        
        # Преобразование datetime в правильный формат для datetime-local input
        if self.instance.end_time:
            self.initial['end_time'] = self.instance.end_time.strftime("%Y-%m-%dT%H:%M")
    
    def clean_end_time(self):
        end_time = self.cleaned_data.get('end_time')
        if end_time and end_time < timezone.now():
            raise forms.ValidationError("Дата окончания аукциона не может быть в прошлом.")
        return end_time
    
    def clean_year(self):
        year = self.cleaned_data.get('year')
        current_year = timezone.now().year
        if year > current_year:
            raise forms.ValidationError(f"Год выпуска не может быть больше текущего ({current_year}).")
        if year < 1900:
            raise forms.ValidationError("Год выпуска не может быть ранее 1900.")
        return year
    
    def clean_starting_price(self):
        starting_price = self.cleaned_data.get('starting_price')
        if starting_price <= 0:
            raise forms.ValidationError("Начальная цена должна быть больше 0.")
        return starting_price
    
    def clean_min_bid_increment(self):
        min_bid_increment = self.cleaned_data.get('min_bid_increment')
        if min_bid_increment <= 0:
            raise forms.ValidationError("Минимальный шаг ставки должен быть больше 0.")
        return min_bid_increment

class UserForm(forms.ModelForm):
    """Форма для создания и редактирования пользователя"""
    
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-control'}),
        required=False,
        help_text="Оставьте пустым, если не хотите менять пароль"
    )
    
    confirm_password = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-control'}),
        required=False,
        help_text="Подтвердите пароль"
    )
    
    is_email_verified = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'})
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'password', 'confirm_password', 'is_email_verified'
        ]
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'is_staff': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Добавляем обязательные поля
        for field_name in ['username', 'email']:
            self.fields[field_name].required = True
        
        # Если это существующий пользователь
        if self.instance.pk:
            # Получаем значение is_email_verified из профиля пользователя, если он существует
            try:
                self.fields['is_email_verified'].initial = getattr(self.instance, 'is_email_verified', False)
            except:
                self.fields['is_email_verified'].initial = False
    
    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')
        
        if password and password != confirm_password:
            self.add_error('confirm_password', "Пароли не совпадают")
        
        return cleaned_data
    
    def save(self, commit=True):
        user = super().save(commit=False)
        
        # Устанавливаем пароль, если он был предоставлен
        if self.cleaned_data.get('password'):
            user.set_password(self.cleaned_data['password'])
        
        # Устанавливаем значение is_email_verified
        user.is_email_verified = self.cleaned_data.get('is_email_verified', False)
        
        if commit:
            user.save()
        
        return user

class UserProfileForm(forms.ModelForm):
    """Форма для редактирования профиля пользователя"""
    
    class Meta:
        model = Profile
        fields = ['avatar', 'phone', 'bio']
        widgets = {
            'avatar': forms.FileInput(attrs={'class': 'form-control'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'bio': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Все поля необязательны
        for field_name in self.fields:
            self.fields[field_name].required = False