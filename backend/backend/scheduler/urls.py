from django.urls import path
from . import views


urlpatterns = [
    path('modules/', views.get_module_list),
    path('modules/<str:mod_code>/', views.get_module_detail),
    path('generate-timetable/', views.generate_timetable),
]