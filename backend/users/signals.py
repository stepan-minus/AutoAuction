from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, Profile

# The signal handlers have already been defined in models.py
# This file exists to be imported by the app's ready() method
# The actual signal handling code remains in models.py