// filepath: /Users/cameronyeo/Desktop/Brothers AI login/frontend/BrothersAI/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Layout from './pages/Layout';
import './App.css';
import Timetable from './pages/timetable';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="register" element={<Register />} />
                    <Route path="login" element={<Login />} />
                    <Route path="timetable" element={<Timetable />} />
                    {/* Add more routes as needed */}
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;