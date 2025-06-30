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

function displayTimetableGrid(timetable) {
  // timetable: { [modCode]: [lesson, ...] }
  // Flatten lessons for grid placement
  const lessons = [];
  Object.entries(timetable).forEach(([modCode, lessonArr]) => {
    lessonArr.forEach(lesson => lessons.push({ ...lesson, modCode }));
  });

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
          const startHour = parseInt(lesson.startTime.split(':')[0]);
          const endHour = parseInt(lesson.endTime.split(':')[0]);
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
        setShared(data.shared || []);
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
          {displayTimetableGrid(item.timetable_data)}
        </div>
      ))}
    </div>
  );
}
