import json
import requests

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from threading import Lock
from django.core.mail import send_mail
from django.conf import settings
from django.views.decorators.http import require_GET
from django.contrib.auth.decorators import login_required
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.models import CustomUser
from .models import SharedTimetable

# Create your views here.
MODULE_LIST_URL = 'https://api.nusmods.com/v2/2024-2025/moduleList.json'
MODULE_DETAIL_URL_TEMPLATE = 'https://api.nusmods.com/v2/2024-2025/modules/{}.json'

module_list_cache = None
module_details_cache = {}
cache_lock = Lock()

def fetch_module_list():
    global module_list_cache
    if module_list_cache is None:
        resp = requests.get(MODULE_LIST_URL)
        if resp.status_code == 200:
            module_list_cache = resp.json()
    return module_list_cache

def fetch_module_detail(mod_code):
    global module_details_cache
    mod_code = mod_code.upper()
    if mod_code not in module_details_cache:
        url = MODULE_DETAIL_URL_TEMPLATE.format(mod_code)
        resp = requests.get(url)
        if resp.status_code == 200:
            module_details_cache[mod_code] = resp.json()
    return module_details_cache.get(mod_code)

def get_module_list(requests):
    with cache_lock:
        modules = fetch_module_list()
    if modules is None:
        return JsonResponse({'error': 'Failed to fetch module list'}, status=500)
    return JsonResponse(modules, safe=False)

def get_module_detail(requests, mod_code):
    with cache_lock:
        detail = fetch_module_detail(mod_code)
    if detail is None:
        return JsonResponse({'error': f'Failed to fetch module detail for {mod_code}'}, status=404)
    return JsonResponse(detail)

@api_view(["POST"])
@permission_classes([AllowAny])
def generate_timetable(request):
    try:
        data = request.data
        modules = data.get('modules', [])
        semester = data.get('semester', '')
        timetable = {}
        with cache_lock:
            for mod_code in modules:
                detail = fetch_module_detail(mod_code)
                if not detail:
                    continue
                sem_data = [s for s in detail.get('semesterData', []) if str(s.get('semester')) == semester]
                if not sem_data:
                    continue
                lessons = []
                for lesson_type in ['Lecture', 'Tutorial', 'Laboratory', 'Sectional Teaching']:
                    lessons += [l for l in sem_data[0].get('timetable', []) if l.get('lessonType') == lesson_type]
                timetable[mod_code] = lessons
        return Response(timetable)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def share_timetable(request):
    try:
        data = request.data
        email = data.get('email')
        timetable = data.get('timetable')
        owner = request.user
        if not email or not timetable:
            return Response({'error': 'Missing email or timetable'}, status=400)
        try:
            recipient = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Recipient not found'}, status=404)
        SharedTimetable.objects.create(owner=owner, recipient=recipient, timetable_data=timetable)
        return Response({'success': True})
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def shared_with_me(request):
    user = request.user
    shared = SharedTimetable.objects.filter(recipient=user).order_by('-created_at')
    result = [
        {
            'id': s.id,
            'owner': s.owner.email,
            'timetable_data': s.timetable_data,
            'created_at': s.created_at.isoformat()
        }
        for s in shared
    ]
    return Response({'shared': result})