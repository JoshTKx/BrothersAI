import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import TodoList from './TodoList';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const displayTimetableGrid = (timetable) => {
  const timeSlots = [];
  // Generate time slots from 8:00 to 20:00
  for (let i = 8; i <= 20; i++) {
    timeSlots.push(`${i.toString().padStart(2, '0')}:00`);
  }

  return (
    <div className="timetable-wrapper">
      <div className="timetable-grid">
        {/* Empty corner cell */}
        <div className="timetable-cell timetable-header corner-header"></div>

        {/* Time headers */}
        {timeSlots.map((time, index) => (
          <div
            key={`time-${time}`}
            className="timetable-cell timetable-header"
            style={{ gridColumn: index + 2 }}
          >
            {time}
          </div>
        ))}

        {/* Days and time slots */}
        {WEEKDAYS.map((day, dayIndex) => (
          <React.Fragment key={day}>
            {/* Day header */}
            <div
              className="timetable-cell day-header"
              style={{ gridRow: dayIndex + 2 }}
            >
              {day}
            </div>

            {/* Time slots */}
            {timeSlots.map((time, timeIndex) => (
              <div
                key={`${day}-${time}`}
                className="timetable-cell"
                style={{
                  gridColumn: timeIndex + 2,
                  gridRow: dayIndex + 2,
                  position: 'relative',
                }}
              />
            ))}
          </React.Fragment>
        ))}

        {/* Lesson blocks */}
        {Object.entries(timetable).map(([modCode, lessons]) =>
          lessons.map((lesson, index) => {
            const startHour = parseInt(lesson.startTime.split(':')[0]);
            const endHour = parseInt(lesson.endTime.split(':')[0]);
            const duration = endHour - startHour;
            const dayIndex = WEEKDAYS.indexOf(lesson.day);

            return (
            <div
              className="timetable-lesson"
              style={{
                '--lesson-column': `${startHour - 7} / span ${duration}`,
                '--lesson-row': dayIndex + 2,
              }}
            >
              <div className="lesson-content">
                <strong>{modCode}</strong>
                <div>{lesson.lessonType}</div>
                <div>{lesson.startTime}-{lesson.endTime}</div>
                <div>{lesson.venue}</div>
              </div>
            </div>
          );
          })
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [timetable, setTimetable] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoggedIn(false);
        setUser(null);
        navigate('/login');
        return;
      }
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        const response = await axios.get('http://127.0.0.1:8000/api/user/', config);
        setUser(response.data);
        setLoggedIn(true);
      } catch (err) {
        setLoggedIn(false);
        setUser(null);
        navigate('/login');
      }
    };

    const fetchTimetable = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        const response = await axios.get(
          'http://127.0.0.1:8000/timetableapi/timetable/my-timetable/?semester=1',
          config
        );
        setTimetable(response.data.timetable_data || {});
      } catch (err) {
        console.error('Failed to fetch timetable:', err);
      }
    };

    fetchUser();
    fetchTimetable();
  }, [navigate]);

  return (
    <div className="dashboard">
      <main className="card">
        {isLoggedIn && user ? (
          <>
            <div className="profile-info">
              <h2 className="welcome">
                Welcome, <span className="highlight">{user.username}</span> 👋
              </h2>
              <p>
                <strong>Username:</strong> {user.username}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <div>
                <TodoList/>
              </div>
            </div>
            
          </>
        ) : (
          <>
            <h2 className="welcome">Please login to continue</h2>
            <p className="desc">You’re not authenticated yet.</p>
          </>
        )}
      </main>
    </div>
  );
}