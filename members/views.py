from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate, logout
from django.contrib import messages
from django.urls import reverse
from django.http import HttpResponse
# Create your views here.
#

def login_user(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            messages.success(request, 'Login successful!')
            return redirect(reverse('members:profile'))
        else:
            messages.error(request, 'Invalid username or password.')
    return render(request, 'members/login.html')

def homepage(request):
    return HttpResponse("Welcome to BrothersAI!")
