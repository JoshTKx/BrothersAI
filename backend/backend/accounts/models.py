from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    friends = models.ManyToManyField('self', symmetrical=True, blank=True)
    USERNAME_FIELD="email"
    REQUIRED_FIELDS=["username"]
    
    def __str__(self) -> str:
        return self.email
    
class FriendRequest(models.Model):
    from_user = models.ForeignKey(CustomUser, related_name='sent_requests', on_delete=models.CASCADE)
    to_user = models.ForeignKey(CustomUser, related_name='received_requests', on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=[
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ], default='pending')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_user', 'to_user')

    def accept(self):
        self.status = 'accepted'
        self.save()
        self.from_user.friends.add(self.to_user)
        self.to_user.friends.add(self.from_user)

    def decline(self):
        self.status = 'declined'
        self.save()

    def __str__(self):
        return f"{self.from_user.email} ➡ {self.to_user.email} ({self.status})"
    
class Todo(models.Model):
    user = models.ForeignKey('CustomUser', on_delete=models.CASCADE, related_name='todos')
    title = models.CharField(max_length=255)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class FriendGroup(models.Model):
    name = models.CharField(max_length=100)
    owner = models.ForeignKey('CustomUser', on_delete=models.CASCADE, related_name='owned_groups')
    members = models.ManyToManyField('CustomUser', related_name='friend_groups')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (Owner: {self.owner.email})"

class GroupMeetup(models.Model):
    group = models.ForeignKey(FriendGroup, on_delete=models.CASCADE, related_name='meetups')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255)
    time = models.DateTimeField()
    completed = models.BooleanField(default=False)
    created_by = models.ForeignKey('CustomUser', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} at {self.location} for {self.group.name}"

    def __str__(self):
        return f"{self.title} at {self.location} for {self.group.name}"
class GroupTodo(models.Model):
    group = models.ForeignKey(FriendGroup, on_delete=models.CASCADE, related_name='group_todos')
    title = models.CharField(max_length=255)
    completed = models.BooleanField(default=False)
    created_by = models.ForeignKey('CustomUser', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({'Done' if self.completed else 'Pending'}) for {self.group.name}"