import React from 'react';
import '../styles/Home.css';

const Home = () => {

    const scrollToLogin = () => {
        const loginSection = document.getElementById('login');
        if (loginSection){
            loginSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="home" id="Home">
            <div className="d-flex justify-content-center flex-column h-100 align-items-center px-5">
                <h1 className='heading-home'>Take care of your crops</h1>
                <p className='heading-para'>from your home</p>
                <button className='primary-btn' onClick={scrollToLogin}>Get Started</button>
            </div>
        </div>
    );
}

export default Home;
