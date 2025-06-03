import React, { useState } from "react";
import axios from "axios";
import "./Register.css";

export default function Register() {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password1: "",
        password2: "",
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);
    const [error, setError] = useState(null);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        try {
            const response = await axios.post("http://127.0.0.1:8000/api/register/", formData);
            console.log("Success!", response.data);
            setSuccessMessage("Registration Successful!");
        } catch (error) {
            console.log("Error during registration!", error.response?.data);
            if (error.response && error.response.data) {
                Object.keys(error.response.data).forEach((field) => {
                    const errorMessages = error.response.data[field];
                    if (errorMessages && errorMessages.length > 0) {
                        setError(errorMessages[0]);
                    }
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <h2 className="register-title">Register</h2>
                {error && <p className="error-message">{error}</p>}
                {successMessage && <p className="success-message">{successMessage}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password1">Password</label>
                        <input
                            type="password"
                            id="password1"
                            name="password1"
                            value={formData.password1}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password2">Confirm Password</label>
                        <input
                            type="password"
                            id="password2"
                            name="password2"
                            value={formData.password2}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <button type="submit" className="submit-button" disabled={isLoading}>
                        {isLoading ? "Registering..." : "Register"}
                    </button>
                </form>
            </div>
        </div>
    );
}