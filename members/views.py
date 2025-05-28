from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate, logout
from django.contrib import messages
from django.urls import reverse
from django.http import HttpResponse
from django.contrib.auth.models import User
from django.db import IntegrityError
from django.http import HttpResponseRedirect
from datetime import date, timedelta
# members/views.py
# Create your views here.
#

def homepage(request):
    return HttpResponse("Welcome to BrothersAI!")

def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("home"))
        else:
            return render(request, "login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]
        image = request.FILES ["profileimage"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
            
        except IntegrityError:
            return render(request, "register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("home"))
    else:
        return render(request, "register.html")

def index(request):
    return render(request, "index.html")

def home(request):
    user = request.user
    today = date.today()
    startdate = today -timedelta(days = today.weekday())
    enddate = startdate + timedelta(days =6)
    if user.is_authenticated:
        return render(request, "home.html", {
            "user": user,
            "startdate": startdate,
            "enddate": enddate
        })
    else:
        return redirect('login')  # Redirect to login if not authenticated
