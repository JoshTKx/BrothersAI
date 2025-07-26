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
from .models import SharedTimetable, UserTimetable, CompletedCourse
from .serializers import CompletedCourseSerializer
from .course_recommender import CourseRecommender

# Create your views here.
MODULE_LIST_URL = 'https://api.nusmods.com/v2/2024-2025/moduleList.json'
MODULE_DETAIL_URL_TEMPLATE = 'https://api.nusmods.com/v2/2024-2025/modules/{}.json'

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_course_recommendations(request):
    """Get AI-powered course recommendations based on completed courses"""
    try:
        # Get user's completed courses
        completed_courses = CompletedCourse.objects.filter(user=request.user)
        
        # Initialize recommender
        recommender = CourseRecommender()
        
        # Get recommendations
        recommendations = recommender.get_recommendations(completed_courses)
        
        return Response({
            'recommendations': recommendations
        })
    except Exception as e:
        return Response({
            'error': 'Failed to get recommendations',
            'detail': str(e)
        }, status=500)

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

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def completed_courses_list(request):
    if request.method == 'GET':
        courses = CompletedCourse.objects.filter(user=request.user)
        serializer = CompletedCourseSerializer(courses, many=True)
        return Response({'courses': serializer.data})
    
    elif request.method == 'POST':
        serializer = CompletedCourseSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def completed_course_detail(request, pk):
    try:
        course = CompletedCourse.objects.get(pk=pk, user=request.user)
    except CompletedCourse.DoesNotExist:
        return Response(status=404)

    if request.method == 'DELETE':
        course.delete()
        return Response(status=204)

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

        # Validate required data
        if not email:
            return Response({'error': 'Email is required'}, status=400)
        if not timetable:
            return Response({'error': 'Timetable data is required'}, status=400)
        if not isinstance(timetable, dict):
            return Response({'error': 'Invalid timetable format'}, status=400)
        
        # Validate all required timetable components
        required_fields = ['modules', 'semester', 'timetable_data', 'selected_lessons']
        missing_fields = [field for field in required_fields if field not in timetable]
        if missing_fields:
            return Response({'error': f'Missing required fields: {", ".join(missing_fields)}'}, status=400)

        try:
            recipient = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Recipient not found'}, status=404)

        # Check if recipient is the same as sender
        if recipient == owner:
            return Response({'error': 'Cannot share timetable with yourself'}, status=400)

        # Create shared timetable with complete data
        shared = SharedTimetable.objects.create(
            owner=owner,
            recipient=recipient,
            timetable_data=timetable
        )

        return Response({
            'success': True,
            'message': f'Timetable shared successfully with {recipient.email}'
        })
    except Exception as e:
        import traceback
        print("Error sharing timetable:", str(e))
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=400)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_timetable(request):
    user = request.user
    data = request.data
    
    # Validate required fields
    required_fields = ['modules', 'semester', 'timetable_data']
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return Response({
            'error': f'Missing required fields: {", ".join(missing_fields)}'
        }, status=400)
    
    try:
        # Validate data types
        if not isinstance(data['modules'], list):
            return Response({'error': 'modules must be a list'}, status=400)
        
        if not isinstance(data['timetable_data'], dict):
            return Response({'error': 'timetable_data must be an object'}, status=400)
        
        if not str(data['semester']):
            return Response({'error': 'semester must be a string or number'}, status=400)
        
        # Create or update the user's timetable
        timetable = UserTimetable.objects.filter(
            user=user,
            semester=str(data['semester']),
        ).first()
        
        if timetable:
            # Update existing timetable
            timetable.modules = data['modules']
            timetable.timetable_data = data['timetable_data']
            timetable.is_active = True
            timetable.save()
        else:
            # Create new timetable
            timetable = UserTimetable.objects.create(
                user=user,
                semester=str(data['semester']),
                modules=data['modules'],
                timetable_data=data['timetable_data'],
                is_active=True
            )
        
        return Response({
            'message': 'Timetable saved successfully',
            'id': timetable.id,
            'created_at': timetable.created_at.isoformat(),
            'updated_at': timetable.updated_at.isoformat()
        })
    except Exception as e:
        import traceback
        print("Error saving timetable:", str(e))
        print(traceback.format_exc())
        return Response({
            'error': 'An error occurred while saving the timetable. Please try again.'
        }, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_timetable(request):
    user = request.user
    semester = request.query_params.get('semester')
    
    try:
        if semester:
            timetable = UserTimetable.objects.filter(
                user=user,
                semester=semester,
                is_active=True
            ).first()
        else:
            timetable = UserTimetable.objects.filter(
                user=user,
                is_active=True
            ).first()
        
        if not timetable:
            return Response({'message': 'No timetable found'}, status=404)
            
        return Response({
            'id': timetable.id,
            'semester': timetable.semester,
            'modules': timetable.modules,
            'timetable_data': timetable.timetable_data,
            'created_at': timetable.created_at.isoformat(),
            'updated_at': timetable.updated_at.isoformat()
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)

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

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def accept_shared_timetable(request, shared_id):
    try:
        shared = SharedTimetable.objects.get(id=shared_id, recipient=request.user)
        timetable_data = shared.timetable_data
        
        # Create a new UserTimetable from the shared data
        timetable = UserTimetable.objects.create(
            user=request.user,
            semester=timetable_data['semester'],
            modules=timetable_data['modules'],
            timetable_data=timetable_data['timetable_data'],
            is_active=True
        )
        
        return Response({
            'message': 'Shared timetable accepted successfully',
            'id': timetable.id
        })
    except SharedTimetable.DoesNotExist:
        return Response({'error': 'Shared timetable not found'}, status=404)
    except Exception as e:
        print("Error accepting shared timetable:", str(e))
        return Response({'error': str(e)}, status=400)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_completed_courses(request):
    user = request.user
    academic_year = request.query_params.get('academic_year')
    semester = request.query_params.get('semester')
    
    courses = CompletedCourse.objects.filter(user=user)
    if academic_year:
        courses = courses.filter(academic_year=academic_year)
    if semester:
        courses = courses.filter(semester=semester)
    
    result = [
        {
            'id': course.id,
            'module_code': course.module_code,
            'semester': course.semester,
            'academic_year': course.academic_year,
            'grade': course.grade,
            'created_at': course.created_at.isoformat(),
            'updated_at': course.updated_at.isoformat()
        }
        for course in courses
    ]
    
    return Response({'courses': result})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_completed_course(request):
    try:
        data = request.data
        user = request.user
        
        # Validate required fields
        required_fields = ['module_code', 'semester', 'academic_year']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return Response({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }, status=400)
        
        # Create or update completed course
        course, created = CompletedCourse.objects.update_or_create(
            user=user,
            module_code=data['module_code'],
            semester=data['semester'],
            defaults={
                'academic_year': data['academic_year'],
                'grade': data.get('grade')
            }
        )
        
        return Response({
            'message': 'Course added successfully',
            'id': course.id,
            'created': created
        })
    except Exception as e:
        print("Error adding completed course:", str(e))
        return Response({'error': str(e)}, status=400)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def remove_completed_course(request, course_id):
    try:
        course = CompletedCourse.objects.get(id=course_id, user=request.user)
        course.delete()
        return Response({'message': 'Course removed successfully'})
    except CompletedCourse.DoesNotExist:
        return Response({'error': 'Course not found'}, status=404)
    except Exception as e:
        print("Error removing completed course:", str(e))
        return Response({'error': str(e)}, status=400)