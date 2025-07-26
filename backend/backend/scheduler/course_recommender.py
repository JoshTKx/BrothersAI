import os
import json
import requests
from openai import OpenAI

class CourseRecommender:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.module_cache = {}
        self.module_list_url = 'https://api.nusmods.com/v2/2024-2025/moduleList.json'
        self.module_detail_url = 'https://api.nusmods.com/v2/2024-2025/modules/{}.json'

    def get_module_details(self, module_code):
        """Fetch module details from NUSMods API"""
        if module_code not in self.module_cache:
            try:
                response = requests.get(self.module_detail_url.format(module_code))
                if response.status_code == 200:
                    self.module_cache[module_code] = response.json()
            except:
                return None
        return self.module_cache.get(module_code)

    def format_completed_courses(self, completed_courses):
        """Format completed courses with their details for AI context"""
        formatted_courses = []
        for course in completed_courses:
            details = self.get_module_details(course.module_code)
            if details:
                formatted_courses.append({
                    'code': course.module_code,
                    'title': details.get('title', ''),
                    'description': details.get('description', ''),
                    'grade': course.grade,
                    'semester': course.semester,
                    'academic_year': course.academic_year
                })
        return formatted_courses

    def get_recommendations(self, completed_courses, num_recommendations=5):
        """Get AI-powered course recommendations"""
        formatted_courses = self.format_completed_courses(completed_courses)
        
        # Prepare the prompt for GPT
        prompt = f"""Based on the following completed courses and their details, recommend {num_recommendations} NUS modules that the student might be interested in taking next. Consider the student's academic progression, prerequisites, and apparent interests.

Completed Courses:
{json.dumps(formatted_courses, indent=2)}

For each recommendation, provide:
1. Module code
2. Module name
3. A brief explanation of why this module is recommended
4. Any prerequisites
5. Suggested semester to take it

Format your response as a JSON array where each object has these fields: module_code, module_name, rationale, prerequisites, suggested_semester"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a course advisor for NUS students, knowledgeable about the NUS module system and curriculum."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
            )
            
            recommendations = json.loads(response.choices[0].message.content)
            return recommendations
            
        except Exception as e:
            print(f"Error getting recommendations: {str(e)}")
            return []
