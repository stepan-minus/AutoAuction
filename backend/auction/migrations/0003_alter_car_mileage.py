# Generated by Django 5.1.7 on 2025-03-16 17:32

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auction', '0002_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='car',
            name='mileage',
            field=models.PositiveIntegerField(blank=True, default=0, null=True),
        ),
    ]
