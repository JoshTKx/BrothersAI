from flask import Flask, request, jsonify
from flask_cors import CORS
from course_recommender import CourseRecommender
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Initialize the recommender
recommender = CourseRecommender()

class CompletedCourse:
    """Simple class to match the structure expected by CourseRecommender"""
    def __init__(self, module_code, grade=None, semester=None, academic_year=None):
        self.module_code = module_code
        self.grade = grade
        self.semester = semester
        self.academic_year = academic_year

@app.route('/api/recommendations', methods=['POST'])
def get_course_recommendations():
    try:
        data = request.get_json()
        
        if not data or 'completed_courses' not in data:
            return jsonify({'error': 'No completed courses provided'}), 400
        
        completed_courses_data = data['completed_courses']
        num_recommendations = data.get('num_recommendations', 5)
        
        # Convert the completed courses data to CompletedCourse objects
        completed_courses = []
        for course_data in completed_courses_data:
            # Handle different possible data structures
            if isinstance(course_data, dict):
                module_code = course_data.get('module_code') or course_data.get('moduleCode')
                grade = course_data.get('grade')
                semester = course_data.get('semester')
                academic_year = course_data.get('academic_year') or course_data.get('academicYear')
            else:
                # If it's an object with attributes
                module_code = getattr(course_data, 'module_code', None) or getattr(course_data, 'moduleCode', None)
                grade = getattr(course_data, 'grade', None)
                semester = getattr(course_data, 'semester', None)
                academic_year = getattr(course_data, 'academic_year', None) or getattr(course_data, 'academicYear', None)
            
            if module_code:
                completed_courses.append(CompletedCourse(
                    module_code=module_code,
                    grade=grade,
                    semester=semester,
                    academic_year=academic_year
                ))
        
        if not completed_courses:
            return jsonify({'error': 'No valid completed courses found'}), 400
        
        # Get recommendations from the AI
        recommendations = recommender.get_recommendations(completed_courses, num_recommendations)
        
        return jsonify({
            'recommendations': recommendations,
            'count': len(recommendations)
        })
        
    except Exception as e:
        print(f"Error in get_course_recommendations: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    # Make sure the Gemini API key is set
    if not os.getenv('GEMINI_API_KEY'):
        print("WARNING: GEMINI_API_KEY environment variable not set!")
        print("The recommendation service may not work properly.")
    
    app.run(debug=True, port=5000)