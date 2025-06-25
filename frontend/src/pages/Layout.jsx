import React from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import "./Layout.css";
import axios from "axios";



export default function Layout() {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();
  const hideTaskbar =
  path === "/" ||
  path.startsWith("/login") ||
  path.startsWith("/register");
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
        console.log("Log out successful!")
        navigate("/login");
      }
    } catch (error) {
      console.error("Failed to logout", error.response?.data || error.message)
    }
  }
  
  return (
    <div className="layout">
      {!hideTaskbar && (
        <header className="taskbar">
          <div className="taskbar-left">
            <span className="logo">BrothersAI</span>
            <nav className="nav">
              <Link to="/home">Home</Link>
              <Link to="/timetable">Timetable</Link>
              <button className="logout" onClick={handleLogout}>Logout</button>

            </nav>
          </div>
        </header>
      )}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}