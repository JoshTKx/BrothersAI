import React, { useState } from 'react';
import './CourseRecommendations.css';

const CourseRecommendations = ({ completedCourses }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getRecommendations = async () => {
    if (!completedCourses || completedCourses.length === 0) {
      setError('Please add some completed courses first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed_courses: completedCourses,
          num_recommendations: 5
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="course-recommendations">
      <h3>Course Recommendations</h3>
      
      <button 
        className="get-recommendations-button"
        onClick={getRecommendations}
        disabled={loading || !completedCourses || completedCourses.length === 0}
      >
        {loading ? 'Getting Recommendations...' : 'Get AI Recommendations'}
      </button>

      {error && (
        <div className="error-message" style={{
          color: '#dc3545',
          padding: '12px',
          background: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="recommendation-cards">
          {recommendations.map((rec, index) => (
            <div key={index} className="recommendation-card">
              <h4>{rec.module_code}</h4>
              <div className="module-name">{rec.module_name}</div>
              <div className="rationale">{rec.rationale}</div>
              <div className="prerequisites">
                <strong>Prerequisites:</strong> {rec.prerequisites}
              </div>
              <div className="semester">
                <strong>Suggested:</strong> {rec.suggested_semester}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && recommendations.length === 0 && !error && (
        <div style={{ 
          textAlign: 'center', 
          color: '#666', 
          fontStyle: 'italic',
          padding: '20px'
        }}>
          Click "Get AI Recommendations" to see suggested courses based on your completed modules.
        </div>
      )}
    </div>
  );
};

export default CourseRecommendations;