// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';

// Create the context
const AuthContext = createContext();

// AuthContext provider component
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null); // Store JWT token
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Track login state

    // Load token from localStorage on initial render
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
            setIsAuthenticated(true);
        }
    }, []);

    // Save the token to localStorage and update state
    const login = (newToken) => {
        console.log("HERE")
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setIsAuthenticated(true);
    };

    // Clear token from localStorage and update state
    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);
