from django.contrib import admin
from .models import CustomUser
from .forms import CustomUserChangeForm, CustomUserCreationForm
from django.contrib.auth.admin import UserAdmin

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, FriendRequest, FriendGroup, GroupMeetup, GroupTodo
from .forms import CustomUserCreationForm, CustomUserChangeForm

@admin.register(CustomUser)
class CustomAdminUser(UserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = CustomUser

    list_display = ('email', 'username', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_superuser', 'is_active')

    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('friends',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('email', 'friends')}),
    )

    search_fields = ('email', 'username')
    ordering = ('email',)
    filter_horizontal = ('friends',)

# Register the FriendRequest model
@admin.register(FriendRequest)
class FriendRequestAdmin(admin.ModelAdmin):
    list_display = ('from_user', 'to_user', 'status', 'timestamp')
    list_filter = ('status', 'timestamp')
    search_fields = ('from_user__email', 'to_user__email')

@admin.register(FriendGroup)
class FriendGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'owner__email', 'owner__username')
    filter_horizontal = ('members',)

@admin.register(GroupMeetup)
class GroupMeetupAdmin(admin.ModelAdmin):
    list_display = ('title', 'group', 'location', 'time', 'created_by', 'created_at')
    list_filter = ('group', 'time', 'created_at')
    search_fields = ('title', 'group__name', 'location', 'created_by__email')

@admin.register(GroupTodo)
class GroupTodoAdmin(admin.ModelAdmin):
    list_display = ('title', 'group', 'completed', 'created_by', 'created_at')
    list_filter = ('group', 'completed', 'created_at')
    search_fields = ('title', 'group__name', 'created_by__email')