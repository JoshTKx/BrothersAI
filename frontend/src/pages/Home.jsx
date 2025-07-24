import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import './Home.css'
import TodoList from './TodoList'


export default function Home() {
  const [user, setUser] = useState(null)
  const [isLoggedIn, setLoggedIn] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("accessToken")
      if (!token) {
        setLoggedIn(false)
        setUser(null)
        navigate("/login")
        return
      }
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
        const response = await axios.get("http://127.0.0.1:8000/api/user/", config)
        setUser(response.data)
        setLoggedIn(true)
      } catch (err) {
        setLoggedIn(false)
        setUser(null)
        navigate("/login")
      }
    }
    fetchUser()
  }, [navigate])

return (
    <div className="dashboard">
      <header className="header">
        <h1 className="logo">User Profile</h1>
      </header>
      <main className="card">
        {isLoggedIn && user ? (
          <>
            <div className="profile-info">
              <h2 className="welcome">Welcome, <span className="highlight">{user.username}</span> 👋</h2>
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Email:</strong> {user.email}</p>
            </div>
            <TodoList />
          </>
        ) : (
          <>
            <h2 className="welcome">Please login to continue</h2>
            <p className="desc">You’re not authenticated yet.</p>
          </>
        )}
      </main>
    </div>
  )
}
