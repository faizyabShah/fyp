import Home from './Home';
import Services from './Services';
import Login from './Login';
import Navbar from '../components/Navbar';


// create a home component that has the text Take care of your crops from home with a button that says Get Started
import React from 'react';
import './Home.css';

const Homepage = () => {
    return (
    <div className="App">
        <Navbar fixed={true}/>
            <Home />
            <Services />
            <Login />   
        </div>
    );
}

export default Homepage;