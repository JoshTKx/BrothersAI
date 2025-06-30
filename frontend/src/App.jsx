// filepath: /Users/cameronyeo/Desktop/Brothers AI login/frontend/BrothersAI/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Layout from './pages/Layout';
import Friends from './pages/Friends';
import './App.css';
import Timetable from './pages/timetable';
import SharedTimetables from './pages/SharedTimetables';
import RequireAuth from "./components/RequireAuth";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Login />} />
                    <Route path="register" element={<Register />} />
                    <Route path="friends" element={<RequireAuth><Friends /></RequireAuth>} />
                    <Route path="login" element={<Login />} />
                    <Route path="timetable" element={<RequireAuth><Timetable /></RequireAuth>} />
                    <Route path="home" element={<RequireAuth> <Home /> </RequireAuth>} /> 
                    <Route path="/shared-timetables" element={<RequireAuth><SharedTimetables /></RequireAuth>} />
                    </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;