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
        setLoadingRecommendations(true);
        try {
            const response = await fetchWithToken(`${baseURL}timetableapi/completed-courses/recommendations/`);
            if (!response.ok) throw new Error('Failed to get recommendations');
            const data = await response.json();
            setRecommendations(data.recommendations);
        } catch (err) {
            setError('Failed to get course recommendations');
            console.error('Error:', err);
        } finally {
            setLoadingRecommendations(false);
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
                            onChange={e => setFormData({...formData, module_code: e.target.value.toUpperCase()})}
                            placeholder="e.g., CS2040S"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Academic Year</label>
                        <input
                            type="text"
                            value={formData.academic_year}
                            onChange={e => setFormData({...formData, academic_year: e.target.value})}
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
                            onChange={e => setFormData({...formData, semester: e.target.value})}
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
                            onChange={e => setFormData({...formData, grade: e.target.value.toUpperCase()})}
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
