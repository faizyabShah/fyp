import React from 'react';
import { Element } from 'react-scroll';
import Navbar from '../components/Navbar';
import Home from '../pages/Home';
import Services from '../components/Services';
import Login from '../pages/Login';
import ContactUsCard from '../components/ContactUsCard';
import '../styles/Home.css';

const Homepage = () => {
  return (
    <div className="App">
      <Navbar fixed={true} fromhome={true} />
      <Element name="home" className="element">
        <Home />
      </Element>
      <Element name="services" className="element">
        <Services />
      </Element>
      <Element name="login" className="element">
        <Login />
      </Element>
      <Element name="contact" className="element">
        <ContactUsCard />
      </Element>
    </div>
  );
};

export default Homepage;
