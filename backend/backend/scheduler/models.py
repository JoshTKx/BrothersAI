from django.db import models
from django.conf import settings
from django.utils import timezone

# Create your models here.

class SharedTimetable(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='shared_timetables_sent', on_delete=models.CASCADE)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='shared_timetables_received', on_delete=models.CASCADE)
    timetable_data = models.JSONField()
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.owner.email} → {self.recipient.email} @ {self.created_at}"
