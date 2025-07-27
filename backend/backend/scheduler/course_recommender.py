import os
import json
import requests
import google.generativeai as genai

class CourseRecommender:
    def __init__(self):
        # --- Gemini API Setup ---
        # Configure the Gemini API with your key from an environment variable
        try:
            genai.configure(api_key=os.getenv('AIzaSyDpJqfmtNv-URTsGdiupDK-ZiDh9Mdb700'))
        except Exception as e:
            print(f"Error configuring Gemini API: {e}")
            print("Please make sure you have set the 'GEMINI_API_KEY' environment variable.")
        
        # --- Caching and URL Setup ---
        self.module_cache = {}
        self.all_module_codes = set() # Use a set for efficient lookups
        self.module_list_url = 'https://api.nusmods.com/v2/2024-2025/moduleList.json'
        self.module_detail_url = 'https://api.nusmods.com/v2/2024-2025/modules/{}.json'
        
        # --- Pre-load all valid module codes for validation ---
        self._load_valid_module_codes()

    def _load_valid_module_codes(self):
        """Fetches the list of all module codes from NUSMods API for validation."""
        print("Loading the list of all valid NUS modules...")
        try:
            response = requests.get(self.module_list_url)
            response.raise_for_status()
            # Extract just the module codes into a set for fast lookups
            self.all_module_codes = {module['moduleCode'] for module in response.json()}
            print(f"Successfully loaded {len(self.all_module_codes)} module codes.")
        except requests.exceptions.RequestException as e:
            print(f"CRITICAL: Could not load the module list from NUSMods API: {e}")
            print("Validation of module codes will be skipped.")
        except (json.JSONDecodeError, TypeError):
            print("CRITICAL: Failed to parse the module list from NUSMods API.")
            print("Validation of module codes will be skipped.")


    def get_module_details(self, module_code):
        """
        Fetch module details from NUSMods API.
        This function remains unchanged.
        """
        if module_code not in self.module_cache:
            try:
                response = requests.get(self.module_detail_url.format(module_code))
                response.raise_for_status()  # Raises an HTTPError for bad responses (4xx or 5xx)
                self.module_cache[module_code] = response.json()
            except requests.exceptions.RequestException as e:
                print(f"Error fetching details for {module_code}: {e}")
                return None
        return self.module_cache.get(module_code)

    def format_completed_courses(self, completed_courses):
        """
        Validates and formats completed courses with their details for AI context.
        Invalid module codes are ignored.
        
        Note: Assuming 'completed_courses' is a list of objects
        with attributes like 'module_code', 'grade', 'semester', 'academic_year'.
        """
        formatted_courses = []
        for course in completed_courses:
            # --- Validation Step ---
            # Check if the module code is valid before fetching details.
            # This check is only performed if the module list was loaded successfully.
            if self.all_module_codes and course.module_code not in self.all_module_codes:
                print(f"Warning: Ignoring invalid or non-existent module code '{course.module_code}'.")
                continue # Skip to the next course

            details = self.get_module_details(course.module_code)
            if details:
                formatted_courses.append({
                    'code': course.module_code,
                    'title': details.get('title', 'N/A'),
                    'description': details.get('description', 'N/A'),
                    'grade': getattr(course, 'grade', 'N/A'),
                    'semester': getattr(course, 'semester', 'N/A'),
                    'academic_year': getattr(course, 'academic_year', 'N/A')
                })
        return formatted_courses

    def get_recommendations(self, completed_courses, num_recommendations=5):
        """Get AI-powered course recommendations using the Gemini API."""
        formatted_courses = self.format_completed_courses(completed_courses)
        
        if not formatted_courses:
            print("Could not format any completed courses, or all provided courses were invalid. Aborting recommendation.")
            return []

        # --- Prompt for Gemini API ---
        # The prompt is slightly adjusted for clarity and to specify the desired JSON output structure.
        prompt = f"""
You are an expert course advisor for National University of Singapore (NUS) students.
Based on the following list of completed courses, please recommend {num_recommendations} future modules that the student might be interested in taking.

Your recommendations should consider the student's academic history, potential interests revealed by their past choices, and prerequisite alignment.

Completed Courses:
{json.dumps(formatted_courses, indent=2)}

Please provide your response as a valid JSON array. Each object in the array should represent a single course recommendation and must contain the following fields:
- "module_code": The official module code (e.g., "CS2040S").
- "module_name": The full name of the module.
- "rationale": A brief, clear explanation for why this module is a good recommendation for the student.
- "prerequisites": A string listing the necessary prerequisites, or "None" if there are no official prerequisites.
- "suggested_semester": The semester (e.g., "Year 3, Semester 1") when it would be ideal for the student to take this module.
"""

        try:
            # --- Gemini API Call ---
            # Initialize the generative model
            model = genai.GenerativeModel('gemini-1.5-flash-latest')
            
            # Set generation config to ensure the output is JSON
            generation_config = genai.types.GenerationConfig(
                response_mime_type="application/json",
            )

            # Generate content
            response = model.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            # The Gemini API can directly return a JSON object when configured correctly.
            # We just need to parse the text part of the response.
            recommendations = json.loads(response.text)
            return recommendations
            
        except Exception as e:
            print(f"An error occurred while getting recommendations from the Gemini API: {e}")
            return []

# --- Example Usage ---
# To make this script runnable, let's create a simple mock class for completed courses.
class MockCourse:
    def __init__(self, module_code, grade, semester, academic_year):
        self.module_code = module_code
        self.grade = grade
        self.semester = semester
        self.academic_year = academic_year

if __name__ == '__main__':
    # Ensure you have set your GEMINI_API_KEY as an environment variable
    # For example, in your terminal: export GEMINI_API_KEY='your_api_key_here'
    
    if not os.getenv('GEMINI_API_KEY'):
        print("FATAL: The GEMINI_API_KEY environment variable is not set.")
        print("Please set it before running the script.")
    else:
        # Example list of completed courses, including an invalid one
        my_courses = [
            MockCourse("CS1101S", "A-", 1, "2023-2024"),
            MockCourse("MA1521", "B+", 1, "2023-2024"),
            MockCourse("GER1000", "A", 2, "2023-2024"),
            MockCourse("CS2030S", "A", 2, "2023-2024"),
            MockCourse("INVALID101", "C", 2, "2023-2024"), # This module is not valid
        ]

        recommender = CourseRecommender()
        recommendations = recommender.get_recommendations(my_courses)

        if recommendations:
            print("\nHere are your course recommendations:")
            print(json.dumps(recommendations, indent=4))
        else:
            print("\nSorry, no recommendations could be generated at this time.")
