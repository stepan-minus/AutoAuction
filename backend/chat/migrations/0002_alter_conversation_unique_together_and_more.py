# Generated by Django 5.1.7 on 2025-03-27 16:14

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auction', '0005_remove_car_payment_methods_remove_car_tags_carimage_and_more'),
        ('chat', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='conversation',
            unique_together=set(),
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['-updated_at'], name='chat_conver_updated_1f6ffe_idx'),
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['car'], name='chat_conver_car_id_14179b_idx'),
        ),
    ]
