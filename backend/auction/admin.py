from django.contrib import admin
from .models import Car, Bid, AuctionHistory, CarImage

@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = ('brand', 'model', 'year', 'seller', 'starting_price', 'current_price', 'status', 'end_time')
    list_filter = ('status', 'brand', 'year')
    search_fields = ('brand', 'model', 'description')
    readonly_fields = ('current_price',)

@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ('car', 'bidder', 'amount', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('car__brand', 'car__model', 'bidder__username')

@admin.register(CarImage)
class CarImageAdmin(admin.ModelAdmin):
    list_display = ('car', 'is_primary', 'created_at')
    list_filter = ('is_primary', 'created_at')
    search_fields = ('car__brand', 'car__model')

@admin.register(AuctionHistory)
class AuctionHistoryAdmin(admin.ModelAdmin):
    list_display = ('car', 'winner', 'final_price', 'ended_at')
    list_filter = ('ended_at',)
    search_fields = ('car__brand', 'car__model', 'winner__username')
