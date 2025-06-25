import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import './Home.css'

export default function Home() {
  const [username, setUsername] = useState("")
  const [isLoggedIn, setLoggedIn] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const checkLoggedInUser = async () => {
      try {
        const token = localStorage.getItem("accessToken")
        if (token) {
          const config = {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
          const response = await axios.get("http://127.0.0.1:8000/api/user/", config)
          setLoggedIn(true)
          setUsername(response.data.username)
        } else {
          setLoggedIn(false)
          setUsername("")
          navigate("/login")
        }
      } catch {
        setLoggedIn(false)
        setUsername("")
        navigate("/login")
      }
    }
    checkLoggedInUser()
  }, [])



  return (
    <div className="dashboard">
      <header className="header">
        <h1 className="logo"> Welcome to BrothersAI</h1>
      </header>

      <main className="card">
        {isLoggedIn ? (
          <>
            <h2 className="welcome">Welcome back, <span className="highlight">{username}</span> 👋</h2>
            <p className="desc">You're now logged in to BrothersAI.</p>
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
