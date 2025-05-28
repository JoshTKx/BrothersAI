from django.shortcuts import render

# Create your views here.
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt
def generate_timetable(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            modules = data.get('modules', [])
            semester = data.get('semester', '')

            # Placeholder logic
            timetable = {
                "semester": semester,
                "modules": modules,
                "message": "Mock timetable generated!"
            }

            return JsonResponse(timetable)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Only POST method allowed'}, status=405)