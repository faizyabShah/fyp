import Home from './Home';
import Login from './Login';
import Navbar from '../components/Navbar';


// create a home component that has the text Take care of your crops from home with a button that says Get Started
import React from 'react';
import '../styles/Home.css';
import Services from '../components/Services';

const Homepage = () => {
    return (
    <div className="App">
        <Navbar fixed={true}/>
            <Home />
            <Services/>
            <Login />
        </div>
    );
}

export default Homepage;