import React from "react";
import { Outlet, Link } from "react-router-dom";
import "./Layout.css";

export default function Layout() {
  return (
    <div className="layout">
      <header className="taskbar">
        <div className="taskbar-left">
          <span className="logo">BrothersAI</span>
          <nav className="nav">
            <Link to="/">Home</Link>
            <Link to="/login/">Login</Link>
            <Link to="/register/">Register</Link>
            <Link to="/timetable/">Timetable</Link>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
