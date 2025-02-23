import React, { useEffect, useState } from 'react';
import '../styles/Login.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Authcontext';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    // State variables
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [signUpIn, setSignUpIn] = useState(0); // 0 for login, 1 for sign-up
    const [error, setError] = useState(''); // To store error messages

    const handleLogin = async (e) => {
        e.preventDefault();

        const userData = {
            email,
            password,
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
                login(data.token); // Assuming the backend sends a token
                navigate('/dashboard');
                window.scrollTo(0, 0);
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Login failed');
            }
        } catch (error) {
            console.error('Error:', error);
            setError('An error occurred during login.');
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();

        const signUpData = {
            fullName,
            email,
            password,
        };

        try {
            const response = await fetch('http://localhost:5000/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(signUpData),
            });

            if (response.ok) {
                const data = await response.json();
                setSignUpIn(0); // Switch back to login form
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Sign-up failed');
            }
        } catch (error) {
            console.error('Error:', error);
            setError('An error occurred during sign-up.');
        }
    };

    useEffect(() => {
        setTimeout(() => {
            setError("");
        }, 2000);
    }, [error]);

    return (
        <div className="d-flex mt-5 justify-content-center pxx-4" id='login'>
            <div className="col-md-6">
                <div className="img-container-login">
                    <img src='./media/background.png' className='img-fluid' />
                </div>
            </div>

            <div className="col-md-6">
                <div className="login-cont">
                    {signUpIn === 0 ? (
                        <>
                            <div className="d-flex justify-content-between flex-column">
                                <h3 className='text-center py-5'>Login to your account</h3>
                                <div className='px-5 pt-4'>
                                    <label className='label-login'>Username</label>
                                    <input
                                        type='email'
                                        className='form-control mb-3'
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <label className='label-login'>Password</label>
                                    <input
                                        type='password'
                                        className='form-control'
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    {error && <div className="text-danger text-center">{error}</div>}
                                    <div className="py-4 text-center">
                                        <button type='submit' className='primary-btn w-100' onClick={handleLogin}>
                                            Login
                                        </button>
                                    </div>
                                    <div className="text-center">
                                        <label className='label-login'>
                                            Don't have an account?{' '}
                                            <a className='signuplink' onClick={() => setSignUpIn(1)}>
                                                Sign Up
                                            </a>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="d-flex justify-content-between flex-column">
                                <h3 className='text-center py-4 pt-5'>Create your account</h3>
                                <div className='px-5 pt-4'>
                                    <label className='label-login'>Full Name</label>
                                    <input
                                        type='text'
                                        className='form-control mb-3'
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                    <label className='label-login'>Email</label>
                                    <input
                                        type='email'
                                        className='form-control mb-3'
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    <label className='label-login'>Password</label>
                                    <input
                                        type='password'
                                        className='form-control'
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    {error && <div className="text-danger text-center">{error}</div>}
                                    <div className="py-4 text-center">
                                        <button className='primary-btn w-100' onClick={handleSignUp}>
                                            Sign Up
                                        </button>
                                    </div>
                                    <div className="text-center">
                                        <label className='label-login'>
                                            Already have an account?{' '}
                                            <a className='signuplink' onClick={() => setSignUpIn(0)}>
                                                Sign In
                                            </a>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
