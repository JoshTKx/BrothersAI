import json
import requests

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from threading import Lock

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

@csrf_exempt
def generate_timetable(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            modules = data.get('modules', [])
            semester = data.get('semester', '')

            # Use cached module details here for timetable generation
            # For now, return mock timetable with lesson info from cache

            timetable = {}

            with cache_lock:
                for mod_code in modules:
                    detail = fetch_module_detail(mod_code)
                    if not detail:
                        continue
                    # Filter lessons by semester
                    sem_data = [s for s in detail.get('semesterData', []) if str(s.get('semester')) == semester]
                    if not sem_data:
                        continue
                    # Collect lesson info (lectures, tutorials, etc) for that semester
                    lessons = []
                    for lesson_type in ['Lecture', 'Tutorial', 'Laboratory', 'Sectional Teaching']:
                        lessons += [l for l in sem_data[0].get('timetable', []) if l.get('lessonType') == lesson_type]
                    timetable[mod_code] = lessons

            return JsonResponse(timetable)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Only POST method allowed'}, status=405)