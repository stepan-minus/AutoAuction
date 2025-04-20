from django.urls import path
from .views import (
    CarListCreateView, CarDetailView, CarFilterView,
    BidCreateView, BidListView, AuctionHistoryView,
    CarImageView, CarImageSetPrimaryView
)

app_name = 'auction'

urlpatterns = [
    # Car endpoints
    path('cars/', CarListCreateView.as_view(), name='car-list-create'),
    path('cars/filter/', CarFilterView.as_view(), name='car-filter'),
    path('cars/<int:pk>/', CarDetailView.as_view(), name='car-detail'),
    
    # Bid endpoints
    path('cars/<int:car_id>/bids/', BidListView.as_view(), name='bid-list'),
    path('bids/create/', BidCreateView.as_view(), name='bid-create'),
    
    # Auction history
    path('history/', AuctionHistoryView.as_view(), name='auction-history'),
    path('history/<int:car_id>/', AuctionHistoryView.as_view(), name='car-auction-history'),
    
    # Car images endpoints
    path('images/<int:pk>/', CarImageView.as_view(), name='car-image-detail'),
    path('images/<int:pk>/set-primary/', CarImageSetPrimaryView.as_view(), name='car-image-set-primary'),
    
    # Маршруты для тегов и способов оплаты удалены
]
