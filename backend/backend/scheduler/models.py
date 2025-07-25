from django.db import models
from django.conf import settings
from django.utils import timezone

# Create your models here.

class UserTimetable(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='timetables', on_delete=models.CASCADE)
    semester = models.CharField(max_length=20)  # e.g., "1", "2", "Special Term I", etc.
    modules = models.JSONField()  # Store the list of module codes
    timetable_data = models.JSONField()  # Store the full timetable data
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)  # To mark the current active timetable

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.email}'s timetable - Sem {self.semester} ({self.created_at})"

    def save(self, *args, **kwargs):
        if self.is_active and self.pk is not None:
            # Set all other timetables of this user to inactive, except this one
            UserTimetable.objects.filter(user=self.user, is_active=True).exclude(pk=self.pk).update(is_active=False)
        elif self.is_active:
            # For new timetables, deactivate all existing ones
            UserTimetable.objects.filter(user=self.user, is_active=True).update(is_active=False)
        super().save(*args, **kwargs)

class SharedTimetable(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='shared_timetables_sent', on_delete=models.CASCADE)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='shared_timetables_received', on_delete=models.CASCADE)
    timetable_data = models.JSONField()
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.owner.email} → {self.recipient.email} @ {self.created_at}"
