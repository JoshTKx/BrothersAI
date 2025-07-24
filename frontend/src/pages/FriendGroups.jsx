import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './FriendGroups.css';

export default function FriendGroups() {
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('accessToken');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
  axios.get('http://127.0.0.1:8000/api/friend-groups/', config)
    .then(res => setGroups(res.data))
    .catch(() => setGroups([]));

  axios.get('http://127.0.0.1:8000/api/friends/', config)
    .then(res => {
    
      setFriends(res.data);
    })
    .catch(() => setFriends([]));
}, []);

const handleCreateGroup = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');
  if (!groupName.trim()) {
    setError('Group name is required.');
    return;
  }
  try {
    await axios.post(
      'http://127.0.0.1:8000/api/friend-groups/',
      { name: groupName, members },
      config
    );
    setGroupName('');
    setMembers([]);
    setSuccess('Group created!');
    // Only update groups after fetching from backend
    axios.get('http://127.0.0.1:8000/api/friend-groups/', config)
      .then(res => setGroups(res.data))
      .catch(() => setGroups([]));
  } catch (err) {
    setError('Failed to create group.');
  }
};

  return (
    <div className="friend-groups-page" style={{ maxWidth: 600, margin: "2em auto" }}>
      <h1>Friend Groups</h1>
      <form onSubmit={handleCreateGroup} style={{ marginBottom: "2em" }}>
        <input
          type="text"
          placeholder="Group name"
          value={groupName}
          onChange={e => setGroupName(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <select
          multiple
          value={members}
          onChange={e => {
            const selected = Array.from(e.target.selectedOptions, option => option.value);
            setMembers(selected);
          }}
          style={{ marginRight: 8, minWidth: 180 }}
        >
          {friends.map(friend => (
            <option key={friend.username} value={friend.username}>
              {friend.username}
            </option>
          ))}
        </select>
        <button type="submit">Create Group</button>
      </form>
      {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}
      {success && <div style={{ color: "green", marginBottom: 10 }}>{success}</div>}
      <h2>Your Groups</h2>
      <ul>
        {groups.length === 0 && <li>No groups yet.</li>}
        {groups.map(group => (
          <li key={group.id}>
            <strong>{group.name}</strong> (Owner: {group.owner})<br />
            Members: {group.members.join(', ')}
          </li>
        ))}
      </ul>
    </div>
  );
}