// create login page with clases login, login-container

import React from 'react';
import './Login.css';
import agri from '../media/agri.jpg';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Authcontext';

const Login = () => {

    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const userData = {
            email: email,
            password: password,
        };

        try {
            const response = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Login successful:', data);
                login(data.token)
                navigate('/dashboard');
            } else {
                const errorData = await response.json();
                console.error('Login failed:', errorData);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }


    return (
        <div className="login" id="Login">
            <div className="agriimage">
                <img src={agri} alt="agri"></img>
            </div>
            <div className="login-container">
                <h1>Log in</h1>
                <div className="inputfields">
                <input type="text" placeholder="Email" onChange={(e) => setEmail(e.target.value)}></input>
                <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)}></input>
                <div className="noaccount">
                    <p>Don't have an account? <Link to="signup"> Sign up</Link></p>
                </div>
                </div>
                <button onClick={handleSubmit}>Log in</button>
            </div>
        </div>
    );
}


export default Login;