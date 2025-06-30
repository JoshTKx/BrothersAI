import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import './Friends.css'

export default function Friends() {
  const [received, setReceived] = useState([])
  const [sent, setSent] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const [requestEmail, setRequestEmail] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const token = localStorage.getItem("accessToken")
        if (!token) {
          navigate("/login")
          return
        }
        
        const res = await axios.get("http://127.0.0.1:8000/api/friend-requests/", {
          headers: { Authorization: `Bearer ${token}` }
        })
        setReceived(res.data.received)
        setSent(res.data.sent)
        
        const userRes = await axios.get("http://127.0.0.1:8000/api/user/", {
          headers: { Authorization: `Bearer ${token}` }
        })
        setFriends(userRes.data.friends || [])
      } catch (err) {
        setError("Failed to load friends or requests.")
      } finally {
        setLoading(false)
      }
    }
    fetchRequests()
  }, [navigate])

  const handleRespond = async (id, action) => {
    try {
      const token = localStorage.getItem("accessToken")
      await axios.post(
        `http://127.0.0.1:8000/api/friend-request/${id}/respond/`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setLoading(true)
      const res = await axios.get("http://127.0.0.1:8000/api/friend-requests/", {
        headers: { Authorization: `Bearer ${token}` }
      })
      setReceived(res.data.received)
      setSent(res.data.sent)
      const userRes = await axios.get("http://127.0.0.1:8000/api/user/", {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFriends(userRes.data.friends || [])
      setLoading(false)
    } catch (err) {
      setError("Failed to respond to request.")
    }
  }

  const handleSendRequest = async (e) => {
  e.preventDefault();
  setSending(true);
  setError(null);
  try {
    const token = localStorage.getItem("accessToken");
    await axios.post(
    "http://127.0.0.1:8000/api/friend-request/",
    { to_email: requestEmail },
    { headers: { Authorization: `Bearer ${token}` } }
   );
    setRequestEmail("");
    setError(null);
    setSent((prev) => [...prev]);
  } catch (err) {
    setError("Failed to send friend request. Make sure the email exists and isn't already your friend.");
  } finally {
    setSending(false);
  }
};

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>
return (
    <div className="friends-container">
      <h2>Friends</h2>
      <ul>
        {friends.length === 0 && <li>No friends yet.</li>}
        {friends.map(friend => (
          <li key={friend.id || friend}>
            <span className="friend-name">{friend.username || friend.email || friend}</span>

          </li>
        ))}
      </ul>

      <div className="divider"></div>

      <h3>Received Friend Requests</h3>
      <ul>
        {received.length === 0 && <li>No received requests.</li>}
        {received.map(req => (
          <li key={req.id}>
            <span className="friend-name">{req.from_user_email || req.from_user}</span>
            <span>
              <button onClick={() => handleRespond(req.id, "accept")}>Accept</button>
              <button onClick={() => handleRespond(req.id, "decline")} style={{ background: "#e74c3c" }}>Decline</button>
            </span>
          </li>
        ))}
      </ul>

      <div className="divider"></div>

      <h3>Sent Friend Requests</h3>
      <ul>
        {sent.length === 0 && <li>No sent requests.</li>}
        {sent.map(req => (
          <li key={req.id}>
            <span className="friend-name">{req.to_user_email || req.to_user}</span>
            <span className={`status ${req.status}`}>({req.status})</span>
          </li>
        ))}
      </ul>
        <div className="divider"></div>
        <form onSubmit={handleSendRequest}>
  <input
    type="email"
    placeholder="Enter email to add friend"
    value={requestEmail}
    onChange={e => setRequestEmail(e.target.value)}
    required
  />
  <button type="submit" disabled={sending}>
    {sending ? "Sending..." : "Add Friend"}
  </button>
</form>
    </div>
  )
}