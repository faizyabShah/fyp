// create a home component that has the text Take care of your crops from home with a button that says Get Started

import React from 'react';
import '../styles/Home.css';

const Home = () => {
    return (
        <div className="home" id="Home">
            <h1>Take care of your crops from home</h1>
            <button>Get Started</button>
        </div>
    );
}

export default Home;