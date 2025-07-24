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
    path('friends/', FriendsListView.as_view(), name='friends-list'),
    path('todos/', TodoListCreateView.as_view(), name='todo-list-create'),
    path('todos/<int:pk>/', TodoDetailView.as_view(), name='todo-detail'),
    path('friend-groups/', FriendGroupListCreateView.as_view(), name='friend-group-list-create'),
    path('friend-groups/<int:pk>/', FriendGroupDetailView.as_view(), name='friend-group-detail'),
    path('group-meetups/', GroupMeetupListCreateView.as_view(), name='group-meetup-list-create'),
    path('group-meetups/<int:pk>/', GroupMeetupDetailView.as_view(), name='group-meetup-detail'),
    path('group-todos/', GroupTodoListCreateView.as_view(), name='group-todo-list-create'),
    path('group-todos/<int:pk>/', GroupTodoDetailView.as_view(), name='group-todo-detail'),
]
