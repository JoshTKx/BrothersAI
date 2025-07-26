from rest_framework import serializers
from .models import UserTimetable, CompletedCourse, SharedTimetable

class CompletedCourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompletedCourse
        fields = ['id', 'module_code', 'semester', 'academic_year', 'grade', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
