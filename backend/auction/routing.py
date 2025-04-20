from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/auction/(?P<auction_id>\d+)/$', consumers.AuctionConsumer.as_asgi()),
    re_path(r'ws/auctions/$', consumers.AuctionsConsumer.as_asgi()),
    re_path(r'ws/notifications/$', consumers.NotificationsConsumer.as_asgi()),
]