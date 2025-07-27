from .models import CustomUser, FriendRequest, Todo, FriendGroup, GroupMeetup, GroupTodo
from rest_framework import serializers
from django.contrib.auth import authenticate

class CustomUserSerializer(serializers.ModelSerializer):
    friends = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'friends']  # add other fields as needed

    def get_friends(self, obj):
        return [
            {
                "id": friend.id,
                "username": friend.username,
                "email": friend.email
            }
            for friend in obj.friends.all()
        ]


class UserRegistrationSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ("id", "username", "email", "password1", "password2")
        extra_kwargs = {"password": {"write_only": True}}

    def validate(self, attrs):
        if attrs['password1'] != attrs['password2']:
            raise serializers.ValidationError("Passwords do not match!")

        password = attrs.get("password1", "")
        if len(password) < 8:
            raise serializers.ValidationError(
                "Passwords must be at least 8 characters!")

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password1")
        validated_data.pop("password2")

        return CustomUser.objects.create_user(password=password, **validated_data)

class UserLoginSerializer(serializers.Serializer):
    email = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        user = authenticate(**data)
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Incorrect Credentials!")
    
class FriendRequestSerializer(serializers.ModelSerializer):
    from_user_email = serializers.EmailField(source='from_user.email', read_only=True)
    to_user_email = serializers.EmailField(source='to_user.email', read_only=True)

    class Meta:
        model = FriendRequest
        fields = ['id', 'from_user', 'from_user_email', 'to_user', 'to_user_email', 'status', 'timestamp']
        read_only_fields = ['from_user', 'status', 'timestamp']

class TodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Todo
        fields = ['id', 'title', 'completed', 'created_at']

class FriendGroupSerializer(serializers.ModelSerializer):
    members = serializers.SlugRelatedField(
        many=True,
        queryset=CustomUser.objects.all(),
        slug_field='username'
    )
    owner = serializers.SlugRelatedField(read_only=True, slug_field='username')

    class Meta:
        model = FriendGroup
        fields = ['id', 'name', 'owner', 'members', 'created_at']
        read_only_fields = ['owner', 'created_at']

class GroupMeetupSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupMeetup
        fields = ['id', 'group', 'title', 'description', 'location', 'time', 'completed', 'created_at']

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['created_by'] = request.user  # Set the `created_by` field to the authenticated user
        return super().create(validated_data)

class GroupTodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupTodo
        fields = ['id', 'group', 'title', 'completed', 'created_at']  # Exclude `created_by`

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['created_by'] = request.user  # Set the `created_by` field to the authenticated user
        return super().create(validated_data)

    class Meta:
         model = GroupTodo
         fields = ['id', 'group', 'title', 'completed', 'created_at']