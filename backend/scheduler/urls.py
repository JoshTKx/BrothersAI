from django.urls import path
from .views import generate_timetable

urlpatterns = [
    path('generate-timetable/', generate_timetable, name = 'generate_timetable'),
]