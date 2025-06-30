from django.urls import path
from .views import *
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("register/", UserRegistrationAPIView.as_view(), name="register-user"),
    path("login/", UserLoginAPIView.as_view(), name="login-user"),
    path("logout/", UserLogoutAPIView.as_view(), name="logout-user"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("user/", UserInfoAPIView.as_view(), name="user-info"),
    path('friend-request/', SendFriendRequestView.as_view(), name='send-friend-request'),
    path('friend-request/<int:pk>/respond/', RespondFriendRequestView.as_view(), name='respond-friend-request'),
    path('friend-requests/', ListFriendRequestsView.as_view(), name='list-friend-requests'),
]