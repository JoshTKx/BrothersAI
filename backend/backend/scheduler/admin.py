from django.contrib import admin
from .models import SharedTimetable

@admin.register(SharedTimetable)
class SharedTimetableAdmin(admin.ModelAdmin):
    list_display = ('owner', 'recipient', 'created_at')
    list_filter = ('owner', 'recipient', 'created_at')
    search_fields = ('owner__email', 'recipient__email')