import React from 'react';
import '../styles/Home.css';
import { Link } from 'react-scroll';

const Home = () => {

    return (
        <div className="home" id="Home">
            <div className="d-flex justify-content-center flex-column h-100 align-items-center px-5">
                <h1 className='heading-home'>Take care of your crops</h1>
                <p className='heading-para'>from your home</p>
                <Link to="login" smooth={true} duration={500}>
                <button className='primary-btn'>Get Started</button>
                </Link>
            </div>
        </div>
    );
}

export default Home;
