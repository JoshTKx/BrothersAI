from django.test import TestCase

from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import FriendRequest, Todo, FriendGroup, GroupMeetup, GroupTodo

User = get_user_model()

class AccountsModelTest(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(email='a@example.com', username='a', password='pass')
        self.user2 = User.objects.create_user(email='b@example.com', username='b', password='pass')

    def test_friend_request_and_accept(self):
        req = FriendRequest.objects.create(from_user=self.user1, to_user=self.user2)
        self.assertEqual(req.status, 'pending')
        req.accept()
        self.assertEqual(req.status, 'accepted')
        self.assertIn(self.user2, self.user1.friends.all())
        self.assertIn(self.user1, self.user2.friends.all())

    def test_todo_creation(self):
        todo = Todo.objects.create(user=self.user1, title='Test Todo')
        self.assertEqual(str(todo), 'Test Todo')
        self.assertFalse(todo.completed)

    def test_friend_group(self):
        group = FriendGroup.objects.create(name='Group1', owner=self.user1)
        group.members.add(self.user1, self.user2)
        self.assertIn(self.user2, group.members.all())
        self.assertEqual(str(group), f"Group1 (Owner: {self.user1.email})")

    def test_group_meetup(self):
        group = FriendGroup.objects.create(name='Group1', owner=self.user1)
        group.members.add(self.user1)
        meetup = GroupMeetup.objects.create(
            group=group, title='Meet', location='Room 1', time='2025-01-01T10:00', created_by=self.user1
        )
        self.assertEqual(str(meetup), f"Meet for {group.name} at {meetup.time}")

    def test_group_todo(self):
        group = FriendGroup.objects.create(name='Group1', owner=self.user1)
        group.members.add(self.user1)
        gtodo = GroupTodo.objects.create(group=group, title='GTask', created_by=self.user1)
        self.assertIn(gtodo, group.group_todos.all())
        self.assertEqual(str(gtodo), f"GTask (Pending) for {group.name}")

class AccountsAPITest(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(email='a@example.com', username='a', password='pass')
        self.user2 = User.objects.create_user(email='b@example.com', username='b', password='pass')
        self.client = APIClient()

    def authenticate(self, user):
        url = reverse('login-user')
        resp = self.client.post(url, {'email': user.email, 'password': 'pass'}, format='json')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + resp.data['tokens']['access'])


    def test_send_and_accept_friend_request(self):
        self.authenticate(self.user1)
        url = reverse('send-friend-request')
        resp = self.client.post(url, {'to_email': self.user2.email}, format='json')
        self.assertEqual(resp.status_code, 201)
        req_id = resp.data['id']
        self.client.force_authenticate(user=self.user2)
        url = reverse('respond-friend-request', args=[req_id])
        resp = self.client.post(url, {'action': 'accept'}, format='json')
        self.assertEqual(resp.data['status'], 'accepted')

    def test_create_todo(self):
        self.authenticate(self.user1)
        url = reverse('todo-list-create')
        resp = self.client.post(url, {'title': 'API Todo'}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['title'], 'API Todo')

    def test_create_friend_group(self):
        self.authenticate(self.user1)
        url = reverse('friend-group-list-create')
        resp = self.client.post(url, {'name': 'API Group', 'members': [self.user2.username]}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['name'], 'API Group')

    def test_friends_list(self):
        self.user1.friends.add(self.user2)
        self.authenticate(self.user1)
        url = reverse('friends-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data[0]['username'], self.user2.username)