import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './Home.css'

export default function Home() {
  const [username, setUsername] = useState("")
  const [isLoggedIn, setLoggedIn] = useState(false)

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
        }
      } catch {
        setLoggedIn(false)
        setUsername("")
      }
    }
    checkLoggedInUser()
  }, [])

  const handleLogout = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken")
      const refreshToken = localStorage.getItem("refreshToken")

      if (accessToken && refreshToken) {
        const config = {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
        await axios.post("http://127.0.0.1:8000/api/logout/", { refresh: refreshToken }, config)
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        setLoggedIn(false)
        setUsername("")
        console.log("Log out successful!")
      }
    } catch (error) {
      console.error("Failed to logout", error.response?.data || error.message)
    }
  }

  return (
    <div className="dashboard">
      <header className="header">
        <h1 className="logo"> Welcome to BrothersAI</h1>
        {isLoggedIn && <button className="logout" onClick={handleLogout}>Logout</button>}
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
