import React, { useEffect, useState } from 'react';
import '../pages/Timetable.css';

const baseURL = 'http://127.0.0.1:8000/';

// Helper for timetable grid rendering (copied from timetable.jsx)
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const timeSlots = Array.from({ length: 13 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

function getColorForModule(modCode) {
  // Deterministic color assignment for modules
  const colors = [
    '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#fbbf24', '#fb923c', '#4ade80', '#f87171', '#38bdf8', '#818cf8'
  ];
  let hash = 0;
  for (let i = 0; i < modCode.length; i++) hash = modCode.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function displayTimetableGrid(timetableData) {
    // Validate input and unwrap timetable data
  if (!timetableData || typeof timetableData !== 'object') {
    console.error('Invalid timetable data:', timetableData);
    return null;
  }

  // Get the module data directly
  const moduleData = timetableData.timetable_data || timetableData;
  console.log('Full timetable data:', moduleData);
  
  // Debug log the full data structure
  console.log('Complete data structure:', {
    raw: timetableData,
    modules: moduleData,
    keys: Object.keys(moduleData || {}),
    sample: moduleData && moduleData.CS2040 ? moduleData.CS2040[0] : null
  });

  if (!moduleData || typeof moduleData !== 'object') {
    console.error('Invalid module data structure');
    return null;
  }

  // Flatten lessons for grid placement
  const lessons = [];
  try {
    // Process each module's lessons
    Object.entries(moduleData).forEach(([modCode, lessonArr]) => {
      if (!Array.isArray(lessonArr)) {
        console.warn(`Expected array for module ${modCode}, got:`, lessonArr);
        return;
      }

      console.log(`Processing lessons for module ${modCode}:`, lessonArr);
      
      // Group lessons by type (if lessonType exists)
      const lessonsByType = {};
      lessonArr.forEach(lesson => {
        // Debug log for complete lesson structure
        console.log(`Complete lesson object for ${modCode}:`, {
          ...lesson,
          keys: Object.keys(lesson),
          hasDay: 'day' in lesson
        });
        
        // Try to get lesson type from the lesson object
        const type = lesson.lessonType || lesson.type || 'Unknown';
        if (!lessonsByType[type]) {
          lessonsByType[type] = [];
        }
        lessonsByType[type].push(lesson);
      });

      // For each lesson type, take only the first lesson (assuming it's the selected one)
      Object.entries(lessonsByType).forEach(([lessonType, typeLessons]) => {
        console.log(`Processing ${modCode} - ${lessonType}:`, typeLessons);
        
        const selectedLesson = typeLessons[0]; // Take the first lesson of each type
        if (selectedLesson) {
          console.log(`Selected lesson for ${modCode} - ${lessonType}:`, selectedLesson);
          
          // Make sure we have all required fields
          const day = selectedLesson.day || selectedLesson.Day;
          const startTime = selectedLesson.startTime?.toString() || selectedLesson.start_time?.toString();
          const endTime = selectedLesson.endTime?.toString() || selectedLesson.end_time?.toString();
          
          console.log('Extracted fields:', {
            day,
            startTime,
            endTime,
            raw: selectedLesson
          });
          
          if (day && startTime && endTime) {
            // Format times from "1200" to "12:00" format
            const formattedStartTime = startTime.padStart(4, '0');
            const formattedEndTime = endTime.padStart(4, '0');
            const displayStartTime = `${formattedStartTime.slice(0, 2)}:${formattedStartTime.slice(2)}`;
            const displayEndTime = `${formattedEndTime.slice(0, 2)}:${formattedEndTime.slice(2)}`;
            
            lessons.push({
              ...selectedLesson,
              modCode,
              lessonType: selectedLesson.lessonType || selectedLesson.type || lessonType,
              startTime: formattedStartTime,
              endTime: formattedEndTime
            });
          } else {
            console.warn(`Missing required fields for lesson in ${modCode} - ${lessonType}:`, 
              {day, startTime, endTime});
          }
        }
      });
    });
  } catch (error) {
    console.error('Error processing timetable:', error);
    return null;
  }

  return (
    <div className="timetable-wrapper">
      <div className="timetable-grid">
        {/* Empty corner cell */}
        <div className="timetable-cell timetable-header corner-header"></div>
        {/* Time headers */}
        {timeSlots.map((time, idx) => (
          <div key={time} className="timetable-cell timetable-header" style={{ gridColumn: idx + 2 }}>{time}</div>
        ))}
        {/* Day headers and grid slots */}
        {weekdays.map((day, dayIdx) => (
          <React.Fragment key={day}>
            <div className="timetable-cell day-header" style={{ gridRow: dayIdx + 2 }}>{day}</div>
            {timeSlots.map((time, timeIdx) => (
              <div key={day + time} className="timetable-cell" style={{ gridColumn: timeIdx + 2, gridRow: dayIdx + 2 }}></div>
            ))}
          </React.Fragment>
        ))}
        {/* Lesson blocks */}
        {lessons.map((lesson, idx) => {
          const dayIdx = weekdays.indexOf(lesson.day);
          // Convert time strings to hours (format: "1600" -> 16)
          const startHour = parseInt(lesson.startTime.slice(0, 2));
          const endHour = parseInt(lesson.endTime.slice(0, 2));
          const startColumn = startHour - 8 + 2;
          const duration = endHour - startHour;
          const row = dayIdx + 2;
          return (
            <div
              key={lesson.modCode + lesson.lessonType + lesson.classNo + idx}
              className="timetable-lesson"
              style={{
                '--lesson-column': `${startColumn} / span ${duration}`,
                '--lesson-row': row,
                '--lesson-color': getColorForModule(lesson.modCode),
                gridColumn: `${startColumn} / span ${duration}`,
                gridRow: row,
                background: getColorForModule(lesson.modCode)
              }}
            >
              <div className="lesson-content">
                <strong>{lesson.modCode}</strong>
                <div>{lesson.lessonType}</div>
                <div>Group {lesson.classNo} • {lesson.venue}</div>
                <div>{lesson.startTime}-{lesson.endTime}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SharedTimetables() {
  const [shared, setShared] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchShared() {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${baseURL}timetableapi/timetable/shared-with-me/`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          setError('Failed to fetch shared timetables');
          setLoading(false);
          return;
        }
        const data = await res.json();
        console.log('Received shared timetables:', data);
        if (!data.shared || !Array.isArray(data.shared)) {
          throw new Error('Invalid response format');
        }
        setShared(data.shared);
      } catch (e) {
        setError('Network error');
      }
      setLoading(false);
    }
    fetchShared();
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h2>Timetables Shared With Me</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {shared.length === 0 && !loading && <div>No timetables shared with you yet.</div>}
      {shared.map((item) => (
        <div key={item.id} style={{ border: '1px solid #ccc', borderRadius: 8, margin: '24px 0', padding: 16, background: '#fafbfc' }}>
          <div style={{ marginBottom: 8 }}><strong>From:</strong> {item.owner}</div>
          <div style={{ marginBottom: 16 }}><strong>Shared at:</strong> {new Date(item.created_at).toLocaleString()}</div>
          <div style={{ overflow: 'auto' }}>
            {displayTimetableGrid(item.timetable_data)}
          </div>
        </div>
      ))}
    </div>
  );
}
