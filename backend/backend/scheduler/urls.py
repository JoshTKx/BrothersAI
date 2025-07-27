from django.urls import path
from . import views


urlpatterns = [
    path('modules/', views.get_module_list),
    path('modules/<str:mod_code>/', views.get_module_detail),
    path('generate-timetable/', views.generate_timetable),
    path('timetable/share/', views.share_timetable),
    path('timetable/shared-with-me/', views.shared_with_me),
    path('timetable/save/', views.save_timetable),
    path('timetable/my-timetable/', views.get_user_timetable),
    path('timetable/accept-shared/<int:shared_id>/', views.accept_shared_timetable),
    path('completed-courses/', views.completed_courses_list),
    path('completed-courses/<int:pk>/', views.completed_course_detail),
    path('completed-courses/recommendations/', views.get_course_recommendations, name='course_recommendations'),
    path('test-recommendations/', views.test_recommendations_setup, name='test_recommendations'),
    path('debug-env/', views.debug_environment, name='debug_environment'),
]