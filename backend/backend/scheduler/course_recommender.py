
import os
import json
import requests
import google.generativeai as genai
from django.conf import settings 

class CourseRecommender:
    def __init__(self):
        print("=== Initializing CourseRecommender ===")
        
        try:
            # Get API key from Django settings
            api_key = settings.GEMINI_API_KEY
            print(f"API key from Django settings: {bool(api_key)}")
            
            if not api_key:
                raise ValueError("GEMINI_API_KEY not configured in Django settings")
            
            print(f"API key starts with: {api_key[:10]}...")
            genai.configure(api_key=api_key)
            print("Gemini API configured successfully")
        except Exception as e:
            print(f"ERROR configuring Gemini API: {e}")
            raise
        
        # --- Caching and URL Setup ---
        self.module_cache = {}
        self.all_module_codes = set()
        self.module_list_url = 'https://api.nusmods.com/v2/2024-2025/moduleList.json'
        self.module_detail_url = 'https://api.nusmods.com/v2/2024-2025/modules/{}.json'
        print("URLs configured")
        
        # --- Pre-load all valid module codes for validation ---
        print("Loading valid module codes...")
        self._load_valid_module_codes()
        print(f"CourseRecommender initialization complete. {len(self.all_module_codes)} modules loaded.")

    def _load_valid_module_codes(self):
        """Fetches the list of all module codes from NUSMods API for validation."""
        print("Loading the list of all valid NUS modules...")
        try:
            print(f"Making request to: {self.module_list_url}")
            response = requests.get(self.module_list_url, timeout=30)
            print(f"Response status: {response.status_code}")
            response.raise_for_status()
            
            module_data = response.json()
            print(f"Received {len(module_data)} modules from API")
            
            # Extract just the module codes into a set for fast lookups
            self.all_module_codes = {module['moduleCode'] for module in module_data}
            print(f"Successfully loaded {len(self.all_module_codes)} module codes.")
            
            # Print first few module codes for verification
            sample_codes = list(self.all_module_codes)[:5]
            print(f"Sample module codes: {sample_codes}")
            
        except requests.exceptions.RequestException as e:
            print(f"CRITICAL: Could not load the module list from NUSMods API: {e}")
            print("Validation of module codes will be skipped.")
        except (json.JSONDecodeError, TypeError) as e:
            print(f"CRITICAL: Failed to parse the module list from NUSMods API: {e}")
            print("Validation of module codes will be skipped.")

    def get_module_details(self, module_code):
        """Fetch module details from NUSMods API."""
        print(f"Getting details for module: {module_code}")
        
        if module_code not in self.module_cache:
            try:
                url = self.module_detail_url.format(module_code)
                print(f"Making request to: {url}")
                response = requests.get(url, timeout=30)
                print(f"Response status for {module_code}: {response.status_code}")
                response.raise_for_status()
                
                module_data = response.json()
                self.module_cache[module_code] = module_data
                print(f"Cached details for {module_code}: {module_data.get('title', 'No title')}")
                
            except requests.exceptions.RequestException as e:
                print(f"Error fetching details for {module_code}: {e}")
                return None
        else:
            print(f"Using cached details for {module_code}")
            
        return self.module_cache.get(module_code)

    def format_completed_courses(self, completed_courses):
        """Validates and formats completed courses with their details for AI context."""
        print(f"=== Formatting {len(completed_courses)} completed courses ===")
        
        formatted_courses = []
        for i, course in enumerate(completed_courses):
            print(f"Processing course {i+1}: {course.module_code}")
            
            # Check if the module code is valid before fetching details
            if self.all_module_codes and course.module_code not in self.all_module_codes:
                print(f"WARNING: Ignoring invalid or non-existent module code '{course.module_code}'.")
                continue

            details = self.get_module_details(course.module_code)
            if details:
                formatted_course = {
                    'code': course.module_code,
                    'title': details.get('title', 'N/A'),
                    'description': details.get('description', 'N/A'),
                    'grade': getattr(course, 'grade', 'N/A'),
                    'semester': getattr(course, 'semester', 'N/A'),
                    'academic_year': getattr(course, 'academic_year', 'N/A')
                }
                formatted_courses.append(formatted_course)
                print(f"Formatted course: {course.module_code} - {details.get('title', 'N/A')}")
            else:
                print(f"Could not get details for {course.module_code}, skipping")
        
        print(f"Successfully formatted {len(formatted_courses)} courses")
        return formatted_courses

    def get_recommendations(self, completed_courses, num_recommendations=5):
        """Get AI-powered course recommendations using the Gemini API."""
        print(f"=== Getting {num_recommendations} recommendations ===")
        print(f"Input: {len(completed_courses)} completed courses")
        
        formatted_courses = self.format_completed_courses(completed_courses)
        
        if not formatted_courses:
            print("ERROR: Could not format any completed courses, or all provided courses were invalid.")
            return []

        print(f"Formatted {len(formatted_courses)} courses for AI processing")

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

        print("Prompt created, sending to Gemini API...")
        print(f"Prompt length: {len(prompt)} characters")

        try:
            # Initialize the generative model
            print("Initializing Gemini model...")
            model = genai.GenerativeModel('gemini-1.5-flash-latest')
            print("Model initialized")
            
            # Set generation config to ensure the output is JSON
            generation_config = genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
            print("Generation config set")

            # Generate content
            print("Generating content from Gemini...")
            response = model.generate_content(
                prompt,
                generation_config=generation_config
            )
            print(f"Received response from Gemini. Response type: {type(response)}")
            print(f"Response text length: {len(response.text) if response.text else 0}")
            
            if response.text:
                print(f"Raw response (first 200 chars): {response.text[:200]}...")
            else:
                print("ERROR: Empty response from Gemini")
                return []
            
            # Parse the JSON response
            print("Parsing JSON response...")
            recommendations = json.loads(response.text)
            print(f"Successfully parsed {len(recommendations)} recommendations")
            
            # Log each recommendation
            for i, rec in enumerate(recommendations):
                print(f"Recommendation {i+1}: {rec.get('module_code', 'N/A')} - {rec.get('module_name', 'N/A')}")
            
            return recommendations
            
        except json.JSONDecodeError as e:
            print(f"ERROR: Failed to parse JSON response from Gemini: {e}")
            print(f"Raw response was: {response.text if 'response' in locals() else 'No response'}")
            return []
        except Exception as e:
            print(f"ERROR: An error occurred while getting recommendations from the Gemini API: {e}")
            import traceback
            print(traceback.format_exc())
            return []