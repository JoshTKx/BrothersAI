import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './GroupView.css';

export default function GroupView() {
  const { groupId } = useParams();
  const [groupDetails, setGroupDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meetups, setMeetups] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newMeetup, setNewMeetup] = useState({ title: '', description: '', location: '', time: '' });
  const [newTask, setNewTask] = useState({ title: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get(
          `http://127.0.0.1:8000/api/friend-groups/${groupId}/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setGroupDetails(response.data);

        const meetupsRes = await axios.get(
          `http://127.0.0.1:8000/api/group-meetups/?group=${groupId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMeetups(meetupsRes.data.filter((meetup) => !meetup.completed)); // Filter out completed meetups

        const tasksRes = await axios.get(
          `http://127.0.0.1:8000/api/group-todos/?group=${groupId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setTasks(tasksRes.data.filter((task) => !task.completed)); // Filter out completed tasks
      } catch (err) {
        setError('Failed to load group details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupDetails();
  }, [groupId, navigate]);

  const handleCreateMeetup = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `http://127.0.0.1:8000/api/group-meetups/`,
        { ...newMeetup, group: groupId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMeetups((prev) => [...prev, response.data]);
      setNewMeetup({ title: '', description: '', location: '', time: '' });
    } catch (err) {
      console.error('Failed to create meetup:', err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `http://127.0.0.1:8000/api/group-todos/`,
        { ...newTask, group: groupId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTasks((prev) => [...prev, response.data]);
      setNewTask({ title: '' });
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const markMeetupAsComplete = async (id) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.patch(
        `http://127.0.0.1:8000/api/group-meetups/${id}/`,
        { completed: true },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMeetups((prev) => prev.filter((meetup) => meetup.id !== id)); // Remove completed meetup from the list
    } catch (err) {
      console.error('Failed to mark meetup as complete:', err);
    }
  };

  const markTaskAsComplete = async (id) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.patch(
        `http://127.0.0.1:8000/api/group-todos/${id}/`,
        { completed: true },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTasks((prev) => prev.filter((task) => task.id !== id)); // Remove completed task from the list
    } catch (err) {
      console.error('Failed to mark task as complete:', err);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="group-view">
      <div className="cards-container">
        <div className="card">
          <h2>Group Information</h2>
          <p><strong>Name:</strong> {groupDetails.name}</p>
          <p><strong>Owner:</strong> {groupDetails.owner}</p>
          <h3>Members</h3>
          <ul>
            {groupDetails.members.length > 0 ? (
              groupDetails.members.map((member, index) => (
                <li key={index}>
                  <strong>{member.username}</strong> ({member.email})
                </li>
              ))
            ) : (
              <p>No members found.</p>
            )}
          </ul>
        </div>

        <div className="card">
          <h2>Group Meetups</h2>
          <form onSubmit={handleCreateMeetup} className="form">
            <input
              type="text"
              placeholder="Title"
              value={newMeetup.title}
              onChange={(e) => setNewMeetup({ ...newMeetup, title: e.target.value })}
              required
            />
            <textarea
              placeholder="Description"
              value={newMeetup.description}
              onChange={(e) => setNewMeetup({ ...newMeetup, description: e.target.value })}
            />
            <input
              type="text"
              placeholder="Location"
              value={newMeetup.location}
              onChange={(e) => setNewMeetup({ ...newMeetup, location: e.target.value })}
              required
            />
            <input
              type="datetime-local"
              value={newMeetup.time}
              onChange={(e) => setNewMeetup({ ...newMeetup, time: e.target.value })}
              required
            />
            <button type="submit" className="btn">Create Meetup</button>
          </form>
          <ul>
            {meetups.map((meetup, index) => (
              <li key={index}>
                <strong>{meetup.title}</strong> - {meetup.time} at {meetup.location}
                <p>{meetup.description}</p>
                <button onClick={() => markMeetupAsComplete(meetup.id)} className="btn">
                  Mark as Complete
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2>Group Tasks</h2>
          <form onSubmit={handleCreateTask} className="form">
            <input
              type="text"
              placeholder="Task Title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              required
            />
            <button type="submit" className="btn">Create Task</button>
          </form>
          <ul>
            {tasks.map((task, index) => (
              <li key={index}>
                <strong>{task.title}</strong>
                <button onClick={() => markTaskAsComplete(task.id)} className="btn">
                  Mark as Complete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}