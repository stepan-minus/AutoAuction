from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import get_user_model, authenticate, login, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models import Q, Sum, Count, F, DecimalField
from django.http import HttpResponse, JsonResponse
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST

from auction.models import Car, Bid, CarImage, AuctionHistory
from chat.models import Conversation, Message

User = get_user_model()

# Функция проверки, является ли пользователь администратором
def is_admin(user):
    return user.is_staff or user.is_superuser

# Декоратор для проверки прав доступа к админке
admin_required = user_passes_test(is_admin, login_url='custom_admin:admin_login')

# --- АУТЕНТИФИКАЦИЯ ---

def admin_login(request):
    """Страница входа в админ-панель"""
    # Проверка, авторизован ли пользователь и является ли он админом
    if request.user.is_authenticated and is_admin(request.user):
        return redirect('custom_admin:admin_index')
    
    # Обработка отправки формы
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None and is_admin(user):
            login(request, user)
            return redirect('custom_admin:admin_index')
        else:
            messages.error(request, 'Неверное имя пользователя или пароль, или у вас нет прав администратора.')
    
    return render(request, 'custom_admin/login.html')

def admin_logout(request):
    """Выход из админ-панели"""
    logout(request)
    return redirect('custom_admin:admin_login')

@login_required
@admin_required
def admin_index(request):
    """Главная страница панели администратора"""
    # Статистика
    active_cars_count = Car.objects.filter(status='active').count()
    completed_cars_count = Car.objects.filter(status='completed').count()
    users_count = User.objects.count()
    total_bids_amount = Bid.objects.aggregate(total=Sum('amount'))['total'] or 0
    
    # Скоро завершающиеся аукционы
    ending_soon_cars = Car.objects.filter(
        status='active',
        end_time__gt=timezone.now()
    ).order_by('end_time')[:5]
    
    # Последние ставки
    recent_bids = Bid.objects.order_by('-created_at')[:5]
    
    # Новые пользователи
    new_users = User.objects.order_by('-date_joined')[:5]
    
    # Недавно завершенные аукционы
    recent_completed_auctions = AuctionHistory.objects.order_by('-ended_at')[:5]
    
    context = {
        'active_cars_count': active_cars_count,
        'completed_cars_count': completed_cars_count,
        'users_count': users_count,
        'total_bids_amount': total_bids_amount,
        'ending_soon_cars': ending_soon_cars,
        'recent_bids': recent_bids,
        'new_users': new_users,
        'recent_completed_auctions': recent_completed_auctions,
    }
    
    return render(request, 'custom_admin/dashboard.html', context)

# --- УПРАВЛЕНИЕ АВТОМОБИЛЯМИ ---

@login_required
@admin_required
def car_list(request):
    """Список автомобилей"""
    # Получение параметров из запроса
    search_query = request.GET.get('search', '')
    status_filter = request.GET.get('status', '')
    sort_by = request.GET.get('sort', 'created_desc')
    
    # Базовый запрос
    cars = Car.objects.all()
    
    # Применение фильтров
    if search_query:
        cars = cars.filter(
            Q(brand__icontains=search_query) | 
            Q(model__icontains=search_query) | 
            Q(description__icontains=search_query) |
            Q(seller__username__icontains=search_query)
        )
    
    if status_filter:
        cars = cars.filter(status=status_filter)
    
    # Сортировка
    if sort_by == 'created_desc':
        cars = cars.order_by('-created_at')
    elif sort_by == 'created_asc':
        cars = cars.order_by('created_at')
    elif sort_by == 'price_desc':
        cars = cars.order_by('-current_price', '-starting_price')
    elif sort_by == 'price_asc':
        cars = cars.order_by('current_price', 'starting_price')
    elif sort_by == 'end_time_asc':
        cars = cars.order_by('end_time')
    
    # Пагинация
    paginator = Paginator(cars, 10)  # 10 автомобилей на страницу
    page = request.GET.get('page')
    try:
        cars = paginator.page(page)
    except PageNotAnInteger:
        cars = paginator.page(1)
    except EmptyPage:
        cars = paginator.page(paginator.num_pages)
    
    context = {
        'cars': cars,
        'search_query': search_query,
        'status_filter': status_filter,
        'sort_by': sort_by,
    }
    
    return render(request, 'custom_admin/cars/list.html', context)

@login_required
@admin_required
def car_detail(request, pk):
    """Детальная информация об автомобиле"""
    car = get_object_or_404(Car, pk=pk)
    
    context = {
        'car': car,
    }
    
    return render(request, 'custom_admin/cars/detail.html', context)

@login_required
@admin_required
def car_create(request):
    """Создание нового автомобиля"""
    # Используем модельную форму для создания автомобиля
    from .forms import CarForm
    
    if request.method == 'POST':
        form = CarForm(request.POST, request.FILES)
        if form.is_valid():
            car = form.save()
            messages.success(request, f'Лот "{car.brand} {car.model}" успешно создан')
            return redirect('custom_admin:car_detail', pk=car.id)
    else:
        form = CarForm()
    
    context = {
        'form': form,
        'is_create': True,
    }
    
    return render(request, 'custom_admin/cars/form.html', context)

@login_required
@admin_required
def car_edit(request, pk):
    """Редактирование автомобиля"""
    from .forms import CarForm
    
    car = get_object_or_404(Car, pk=pk)
    
    if request.method == 'POST':
        form = CarForm(request.POST, request.FILES, instance=car)
        if form.is_valid():
            car = form.save()
            messages.success(request, f'Лот "{car.brand} {car.model}" успешно обновлен')
            return redirect('custom_admin:car_detail', pk=car.id)
    else:
        form = CarForm(instance=car)
    
    context = {
        'form': form,
        'car': car,
        'is_create': False,
    }
    
    return render(request, 'custom_admin/cars/form.html', context)

@login_required
@admin_required
@require_POST
def car_delete(request, pk):
    """Удаление автомобиля"""
    car = get_object_or_404(Car, pk=pk)
    brand_model = f"{car.brand} {car.model}"
    car.delete()
    messages.success(request, f'Лот "{brand_model}" успешно удален')
    return redirect('custom_admin:car_list')

@login_required
@admin_required
@require_POST
def car_change_status(request, pk):
    """Изменение статуса автомобиля"""
    car = get_object_or_404(Car, pk=pk)
    status = request.POST.get('status')
    
    if status in ['active', 'completed', 'cancelled']:
        car.status = status
        car.save()
        messages.success(request, f'Статус лота "{car.brand} {car.model}" изменен на {status}')
    
    return redirect('custom_admin:car_detail', pk=car.id)

# --- УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ---

@login_required
@admin_required
def user_list(request):
    """Список пользователей"""
    # Получение параметров из запроса
    search_query = request.GET.get('search', '')
    is_staff_filter = request.GET.get('is_staff', '')
    
    # Базовый запрос
    users = User.objects.all()
    
    # Применение фильтров
    if search_query:
        users = users.filter(
            Q(username__icontains=search_query) | 
            Q(email__icontains=search_query) | 
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query)
        )
    
    if is_staff_filter == 'true':
        users = users.filter(is_staff=True)
    elif is_staff_filter == 'false':
        users = users.filter(is_staff=False)
    
    # Сортировка
    users = users.order_by('-date_joined')
    
    # Пагинация
    paginator = Paginator(users, 10)  # 10 пользователей на страницу
    page = request.GET.get('page')
    try:
        users = paginator.page(page)
    except PageNotAnInteger:
        users = paginator.page(1)
    except EmptyPage:
        users = paginator.page(paginator.num_pages)
    
    context = {
        'users': users,
        'search_query': search_query,
        'is_staff_filter': is_staff_filter,
    }
    
    return render(request, 'custom_admin/users/list.html', context)

@login_required
@admin_required
def user_detail(request, pk):
    """Детальная информация о пользователе"""
    user_obj = get_object_or_404(User, pk=pk)
    
    # Получить лоты пользователя
    cars = Car.objects.filter(seller=user_obj)
    
    # Получить ставки пользователя
    bids = Bid.objects.filter(bidder=user_obj)
    
    context = {
        'user_obj': user_obj,
        'cars': cars,
        'bids': bids,
    }
    
    return render(request, 'custom_admin/users/detail.html', context)

@login_required
@admin_required
def user_create(request):
    """Создание нового пользователя"""
    from .forms import UserForm, UserProfileForm
    
    if request.method == 'POST':
        user_form = UserForm(request.POST)
        profile_form = UserProfileForm(request.POST, request.FILES)
        
        if user_form.is_valid() and profile_form.is_valid():
            user = user_form.save()
            profile = profile_form.save(commit=False)
            profile.user = user
            profile.save()
            
            messages.success(request, f'Пользователь "{user.username}" успешно создан')
            return redirect('custom_admin:user_detail', pk=user.id)
    else:
        user_form = UserForm()
        profile_form = UserProfileForm()
    
    context = {
        'user_form': user_form,
        'profile_form': profile_form,
        'is_create': True,
    }
    
    return render(request, 'custom_admin/users/form.html', context)

@login_required
@admin_required
def user_edit(request, pk):
    """Редактирование пользователя"""
    from .forms import UserForm, UserProfileForm
    
    user_obj = get_object_or_404(User, pk=pk)
    
    # Обработка быстрых действий
    if request.method == 'POST' and ('is_active' in request.POST or 'is_staff' in request.POST):
        if 'is_active' in request.POST:
            user_obj.is_active = request.POST.get('is_active') == 'true'
            user_obj.save()
            status = 'активирован' if user_obj.is_active else 'деактивирован'
            messages.success(request, f'Пользователь "{user_obj.username}" {status}')
        elif 'is_staff' in request.POST:
            # Проверка, чтобы администратор не лишил сам себя прав
            if user_obj == request.user and request.POST.get('is_staff') == 'false':
                messages.error(request, 'Вы не можете снять с себя права администратора')
            else:
                user_obj.is_staff = request.POST.get('is_staff') == 'true'
                user_obj.save()
                status = 'назначен администратором' if user_obj.is_staff else 'снят с роли администратора'
                messages.success(request, f'Пользователь "{user_obj.username}" {status}')
        
        return redirect('custom_admin:user_detail', pk=user_obj.id)
    
    # Обычное редактирование через форму
    if request.method == 'POST':
        user_form = UserForm(request.POST, instance=user_obj)
        try:
            profile_form = UserProfileForm(request.POST, request.FILES, instance=user_obj.profile)
        except:
            profile_form = UserProfileForm(request.POST, request.FILES)
        
        if user_form.is_valid() and profile_form.is_valid():
            user = user_form.save()
            
            profile = profile_form.save(commit=False)
            profile.user = user
            profile.save()
            
            messages.success(request, f'Пользователь "{user.username}" успешно обновлен')
            return redirect('custom_admin:user_detail', pk=user.id)
    else:
        user_form = UserForm(instance=user_obj)
        try:
            profile_form = UserProfileForm(instance=user_obj.profile)
        except:
            profile_form = UserProfileForm()
    
    context = {
        'user_form': user_form,
        'profile_form': profile_form,
        'user_obj': user_obj,
        'is_create': False,
    }
    
    return render(request, 'custom_admin/users/form.html', context)

@login_required
@admin_required
@require_POST
def user_delete(request, pk):
    """Удаление пользователя"""
    user_obj = get_object_or_404(User, pk=pk)
    
    # Проверка, чтобы администратор не удалил сам себя
    if user_obj == request.user:
        messages.error(request, 'Вы не можете удалить самого себя')
        return redirect('custom_admin:user_detail', pk=user_obj.id)
    
    username = user_obj.username
    user_obj.delete()
    messages.success(request, f'Пользователь "{username}" успешно удален')
    return redirect('custom_admin:user_list')

# --- УПРАВЛЕНИЕ СТАВКАМИ ---

@login_required
@admin_required
def bid_list(request):
    """Список ставок"""
    # Получение параметров из запроса
    search_query = request.GET.get('search', '')
    car_id = request.GET.get('car_id', '')
    
    # Базовый запрос
    bids = Bid.objects.all()
    
    # Применение фильтров
    if search_query:
        bids = bids.filter(
            Q(bidder__username__icontains=search_query) | 
            Q(car__brand__icontains=search_query) |
            Q(car__model__icontains=search_query)
        )
    
    if car_id:
        bids = bids.filter(car_id=car_id)
    
    # Сортировка
    bids = bids.order_by('-created_at')
    
    # Пагинация
    paginator = Paginator(bids, 20)  # 20 ставок на страницу
    page = request.GET.get('page')
    try:
        bids = paginator.page(page)
    except PageNotAnInteger:
        bids = paginator.page(1)
    except EmptyPage:
        bids = paginator.page(paginator.num_pages)
    
    context = {
        'bids': bids,
        'search_query': search_query,
        'car_id': car_id,
    }
    
    return render(request, 'custom_admin/bids/list.html', context)

@login_required
@admin_required
@require_POST
def bid_delete(request, pk):
    """Удаление ставки"""
    bid = get_object_or_404(Bid, pk=pk)
    car = bid.car
    bid_amount = bid.amount
    bid.delete()
    
    # Обновление текущей цены автомобиля после удаления ставки
    highest_bid = Bid.objects.filter(car=car).order_by('-amount').first()
    if highest_bid:
        car.current_price = highest_bid.amount
    else:
        car.current_price = None
    car.save()
    
    messages.success(request, f'Ставка на сумму {bid_amount} ₽ успешно удалена')
    
    # Проверка, нужно ли вернуться на страницу деталей автомобиля
    redirect_url = request.POST.get('redirect_url')
    if redirect_url:
        return redirect(redirect_url)
    
    return redirect('custom_admin:bid_list')

# --- УПРАВЛЕНИЕ ЧАТАМИ ---

@login_required
@admin_required
def chat_list(request):
    """Список чатов"""
    # Получение параметров из запроса
    search_query = request.GET.get('search', '')
    
    # Базовый запрос
    conversations = Conversation.objects.all()
    
    # Применение фильтров
    if search_query:
        conversations = conversations.filter(
            Q(participants__username__icontains=search_query) |
            Q(car__brand__icontains=search_query) |
            Q(car__model__icontains=search_query)
        ).distinct()
    
    # Сортировка
    conversations = conversations.order_by('-updated_at')
    
    # Пагинация
    paginator = Paginator(conversations, 10)  # 10 чатов на страницу
    page = request.GET.get('page')
    try:
        conversations = paginator.page(page)
    except PageNotAnInteger:
        conversations = paginator.page(1)
    except EmptyPage:
        conversations = paginator.page(paginator.num_pages)
    
    context = {
        'conversations': conversations,
        'search_query': search_query,
    }
    
    return render(request, 'custom_admin/chats/list.html', context)

@login_required
@admin_required
def chat_detail(request, pk):
    """Детальная информация о чате"""
    conversation = get_object_or_404(Conversation, pk=pk)
    messages_list = Message.objects.filter(conversation=conversation).order_by('timestamp')
    
    context = {
        'conversation': conversation,
        'messages_list': messages_list,
    }
    
    return render(request, 'custom_admin/chats/detail.html', context)

@login_required
@admin_required
@require_POST
def chat_delete(request, pk):
    """Удаление чата"""
    conversation = get_object_or_404(Conversation, pk=pk)
    conversation_id = conversation.id
    conversation.delete()
    
    messages.success(request, f'Чат (ID: {conversation_id}) успешно удален')
    return redirect('custom_admin:chat_list')