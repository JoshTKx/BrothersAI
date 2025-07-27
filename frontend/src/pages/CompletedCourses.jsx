import React, { useState, useEffect } from 'react';
import './CompletedCourses.css';
import './CourseRecommendations.css';
import { fetchWithToken } from '../utils/auth';

const baseURL = 'http://127.0.0.1:8000/';

function CompletedCourses() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        module_code: '',
        academic_year: '',
        semester: '',
        grade: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [recommendations, setRecommendations] = useState([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);

    // Fetch completed courses
    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await fetchWithToken(`${baseURL}timetableapi/completed-courses/`);
            if (!response.ok) throw new Error('Failed to fetch courses');
            const data = await response.json();
            setCourses(data.courses);
        } catch (err) {
            setError('Failed to load courses');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await fetchWithToken(`${baseURL}timetableapi/completed-courses/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            if (!response.ok) throw new Error('Failed to add course');
            await fetchCourses();
            setFormData({
                module_code: '',
                academic_year: '',
                semester: '',
                grade: ''
            });
        } catch (err) {
            setError('Failed to add course');
            console.error('Error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const getRecommendations = async () => {
        console.log("=== STARTING getRecommendations ===");
        console.log("Current courses:", courses);
        console.log("Number of courses:", courses.length);

        if (courses.length === 0) {
            console.log("ERROR: No courses available");
            setError('Please add some completed courses first before getting recommendations.');
            return;
        }

        console.log("Setting loading state...");
        setLoadingRecommendations(true);
        setError(''); // Clear any existing errors
        setRecommendations([]); // Clear previous recommendations

        try {
            const url = `${baseURL}timetableapi/completed-courses/recommendations/`;
            console.log("Making request to:", url);
            console.log("Base URL:", baseURL);

            console.log("Calling fetchWithToken...");
            const response = await fetchWithToken(url);

            console.log("Response received:");
            console.log("- Status:", response.status);
            console.log("- OK:", response.ok);
            console.log("- Headers:", Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                console.log("Response not OK, attempting to parse error...");
                let errorData;
                try {
                    errorData = await response.json();
                    console.log("Error data:", errorData);
                } catch (parseError) {
                    console.log("Could not parse error response:", parseError);
                    errorData = {};
                }
                throw new Error(errorData.error || `HTTP ${response.status}: Failed to get recommendations`);
            }

            console.log("Parsing successful response...");
            const data = await response.json();
            console.log("Response data:", data);
            console.log("Recommendations array:", data.recommendations);
            console.log("Number of recommendations:", data.recommendations ? data.recommendations.length : 0);

            if (data.recommendations && data.recommendations.length > 0) {
                console.log("Setting recommendations in state...");
                setRecommendations(data.recommendations);
                console.log("Recommendations set successfully");

                // Log each recommendation
                data.recommendations.forEach((rec, index) => {
                    console.log(`Recommendation ${index + 1}:`, {
                        module_code: rec.module_code,
                        module_name: rec.module_name,
                        rationale: rec.rationale?.substring(0, 50) + "...",
                        prerequisites: rec.prerequisites,
                        suggested_semester: rec.suggested_semester
                    });
                });
            } else {
                console.log("No recommendations in response");
                setRecommendations([]);
                setError('No recommendations could be generated at this time. This might be due to invalid module codes or AI service issues.');
            }

        } catch (err) {
            console.error("=== ERROR in getRecommendations ===");
            console.error("Error object:", err);
            console.error("Error message:", err.message);
            console.error("Error stack:", err.stack);

            setError(`Failed to get recommendations: ${err.message}`);
            setRecommendations([]);
        } finally {
            console.log("Setting loading state to false...");
            setLoadingRecommendations(false);
            console.log("=== getRecommendations COMPLETE ===");
        }
    };

    const handleDelete = async (courseId) => {
        if (!window.confirm('Are you sure you want to remove this course?')) return;

        try {
            const response = await fetchWithToken(`${baseURL}timetableapi/completed-courses/${courseId}/`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete course');
            await fetchCourses();
        } catch (err) {
            setError('Failed to delete course');
            console.error('Error:', err);
        }
    };

    // Group courses by academic year and semester
    const groupedCourses = courses.reduce((acc, course) => {
        if (!acc[course.academic_year]) {
            acc[course.academic_year] = {};
        }
        if (!acc[course.academic_year][course.semester]) {
            acc[course.academic_year][course.semester] = [];
        }
        acc[course.academic_year][course.semester].push(course);
        return acc;
    }, {});

    return (
        <div className="completed-courses">
            <h2>Completed Courses</h2>

            {/* Add Course Form */}
            <form onSubmit={handleSubmit} className="add-course-form">
                <div className="form-row">
                    <div className="form-group">
                        <label>Module Code</label>
                        <input
                            type="text"
                            value={formData.module_code}
                            onChange={e => setFormData({ ...formData, module_code: e.target.value.toUpperCase() })}
                            placeholder="e.g., CS2040S"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Academic Year</label>
                        <input
                            type="text"
                            value={formData.academic_year}
                            onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                            placeholder="e.g., AY22/23"
                            required
                        />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Semester</label>
                        <select
                            value={formData.semester}
                            onChange={e => setFormData({ ...formData, semester: e.target.value })}
                            required
                        >
                            <option value="">Select Semester</option>
                            <option value="1">Semester 1</option>
                            <option value="2">Semester 2</option>
                            <option value="ST1">Special Term 1</option>
                            <option value="ST2">Special Term 2</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Grade (Optional)</label>
                        <input
                            type="text"
                            value={formData.grade}
                            onChange={e => setFormData({ ...formData, grade: e.target.value.toUpperCase() })}
                            placeholder="e.g., A"
                        />
                    </div>
                </div>
                <button type="submit" disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add Course'}
                </button>
            </form>

            {loading && <div>Loading...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

            {/* Semester Selection */}
            <div className="semester-selection">
                <div className="selector-group">
                    <label>Academic Year:</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        <option value="">All Years</option>
                        {Object.keys(groupedCourses)
                            .sort((a, b) => b.localeCompare(a))
                            .map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))
                        }
                    </select>
                </div>
                <div className="selector-group">
                    <label>Semester:</label>
                    <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                    >
                        <option value="">All Semesters</option>
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                        <option value="ST1">Special Term 1</option>
                        <option value="ST2">Special Term 2</option>
                    </select>
                </div>
            </div>

            {/* Display Courses in Table Format */}
            <div className="courses-table-container">
                <table className="courses-table">
                    <thead>
                        <tr>
                            <th>Module Code</th>
                            <th>Academic Year</th>
                            <th>Semester</th>
                            <th>Grade</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(groupedCourses)
                            .filter(([year]) => !selectedYear || year === selectedYear)
                            .sort(([yearA], [yearB]) => yearB.localeCompare(yearA))
                            .flatMap(([year, semesters]) =>
                                Object.entries(semesters)
                                    .filter(([sem]) => !selectedSemester || sem === selectedSemester)
                                    .sort(([semA], [semB]) => semA.localeCompare(semB))
                                    .flatMap(([semester, semesterCourses]) =>
                                        semesterCourses.map(course => (
                                            <tr key={course.id}>
                                                <td>{course.module_code}</td>
                                                <td>{year}</td>
                                                <td>Semester {semester}</td>
                                                <td>{course.grade || '-'}</td>
                                                <td>
                                                    <button
                                                        className="delete-button-table"
                                                        onClick={() => handleDelete(course.id)}
                                                        title="Remove course"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )
                            )}
                    </tbody>
                </table>
            </div>

            {/* Course Recommendations Section */}
            <div className="course-recommendations">
                <h3>Course Recommendations</h3>
                <button
                    className="get-recommendations-button"
                    onClick={getRecommendations}
                    disabled={loadingRecommendations}
                >
                    {loadingRecommendations ? 'Getting Recommendations...' : 'Get AI Course Recommendations'}
                </button>

                <div className="recommendation-cards">
                    {recommendations.map((rec, index) => (
                        <div key={index} className="recommendation-card">
                            <h4>{rec.module_code}</h4>
                            <div className="module-name">{rec.module_name}</div>
                            <div className="rationale">{rec.rationale}</div>
                            <div className="prerequisites">
                                <strong>Prerequisites:</strong> {rec.prerequisites || 'None'}
                            </div>
                            <div className="semester">
                                Suggested: {rec.suggested_semester}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default CompletedCourses;
