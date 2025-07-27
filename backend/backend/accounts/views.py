from django.shortcuts import render
from rest_framework.generics import GenericAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import *
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.views import APIView
from django.http import JsonResponse




class UserRegistrationAPIView(GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token = RefreshToken.for_user(user)
        data = serializer.data
        data["tokens"] = {"refresh":str(token),
                          "access": str(token.access_token)}
        return Response(data, status= status.HTTP_201_CREATED)


class UserLoginAPIView(GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = UserLoginSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data= request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data
        serializer = CustomUserSerializer(user)
        token = RefreshToken.for_user(user)
        data = serializer.data
        data["tokens"] = {"refresh":str(token),  
                          "access": str(token.access_token)}
        return Response(data, status=status.HTTP_200_OK)
    
class UserLogoutAPIView(GenericAPIView):
    permission_classes = (IsAuthenticated,)
    
    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status= status.HTTP_400_BAD_REQUEST)

class UserInfoAPIView(RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = CustomUserSerializer
    
    def get_object(self):
        return self.request.user
    
class SendFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        to_email = request.data.get('to_email')
        if not to_email:
            return Response({'error': 'to_email is required'}, status=400)
        try:
            to_user = CustomUser.objects.get(email=to_email)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        if FriendRequest.objects.filter(from_user=request.user, to_user=to_user, status='pending').exists():
            return Response({'error': 'Friend request already sent'}, status=400)
        if request.user == to_user:
            return Response({'error': 'Cannot send friend request to yourself'}, status=400)
        friend_request = FriendRequest.objects.create(from_user=request.user, to_user=to_user)
        serializer = FriendRequestSerializer(friend_request)
        return Response(serializer.data, status=201)

class RespondFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        action = request.data.get('action')
        try:
            friend_request = FriendRequest.objects.get(id=pk, to_user=request.user)
        except FriendRequest.DoesNotExist:
            return Response({'error': 'Friend request not found'}, status=404)
        if action == 'accept':
            friend_request.status = 'accepted'
            friend_request.save()
            # Add each other as friends
            request.user.friends.add(friend_request.from_user)
            friend_request.from_user.friends.add(request.user)
        elif action == 'decline':
            friend_request.status = 'declined'
            friend_request.save()
        else:
            return Response({'error': 'Invalid action'}, status=400)
        serializer = FriendRequestSerializer(friend_request)
        return Response(serializer.data)

class ListFriendRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        received = FriendRequest.objects.filter(to_user=request.user, status='pending')
        sent = FriendRequest.objects.filter(from_user=request.user, status='pending')
        return Response({
            'received': FriendRequestSerializer(received, many=True).data,
            'sent': FriendRequestSerializer(sent, many=True).data
        })
    
class TodoListCreateView(generics.ListCreateAPIView):
    serializer_class = TodoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Todo.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class TodoDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TodoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Todo.objects.filter(user=self.request.user)
    

class FriendGroupListCreateView(generics.ListCreateAPIView):
    serializer_class = FriendGroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Show groups where user is a member or owner
        return (
        FriendGroup.objects.filter(members=self.request.user) |
        FriendGroup.objects.filter(owner=self.request.user)
    ).distinct()

    def perform_create(self, serializer):
        # Accept usernames from the request
        member_usernames = self.request.data.get('members', [])
        if isinstance(member_usernames, str):
            # If sent as comma-separated string, split it
            member_usernames = [u.strip() for u in member_usernames.split(',') if u.strip()]
        # Look up users by username
        members = CustomUser.objects.filter(username__in=member_usernames)
        group = serializer.save(owner=self.request.user)
        # Optionally add the owner as a member
        group.members.set(list(members) + [self.request.user])

class FriendGroupDetailView(APIView):
    def get(self, request, pk):
        try:
            group = FriendGroup.objects.get(pk=pk)
            members = group.members.all().values('username', 'email')  # Fetch members with username and email
            return JsonResponse({
                'id': group.id,
                'name': group.name,
                'owner': group.owner.username,  # Include owner's username
                'members': list(members),  # Convert QuerySet to list
                'created_at': group.created_at,
            })
        except FriendGroup.DoesNotExist:
            return JsonResponse({'error': 'Group not found'}, status=404)

class GroupMeetupListCreateView(generics.ListCreateAPIView):
    serializer_class = GroupMeetupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        group_id = self.request.query_params.get('group')
        return GroupMeetup.objects.filter(group_id=group_id)

    def get_serializer_context(self):
        return {'request': self.request}
    
class GroupMeetupDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupMeetupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GroupMeetup.objects.filter(group__members=self.request.user)


class GroupTodoListCreateView(generics.ListCreateAPIView):
    serializer_class = GroupTodoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        group_id = self.request.query_params.get('group')
        return GroupTodo.objects.filter(group_id=group_id)

    def get_serializer_context(self):
        return {'request': self.request} 

class GroupTodoDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupTodoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GroupTodo.objects.filter(group__members=self.request.user)

class FriendsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Assuming you have a 'friends' ManyToManyField on your CustomUser model
        friends = request.user.friends.all()
        data = [{"username": friend.username, "email": friend.email} for friend in friends]
        return Response(data)
