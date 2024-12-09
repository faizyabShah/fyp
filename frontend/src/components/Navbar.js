// create a navbar component and its styles
import React from 'react';
import './Navbar.css';
import image from '../media/wheat-plant.png';
import { Link } from 'react-scroll';


const Navbar = ( { fixed, dashboard, token} ) => {
    return (
        <nav className={`navbar navbar-expand-lg navbar-light bg-light ${fixed ? " mynavbar" : " notmynavbar"}`}>
        <a className="navbar-brand" href="#"> <img className= "logo" src={image}></img><span>WheatInsight</span></a>
        <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav">
            <li className="nav-item active">
                <Link to={dashboard ? "/" : "Home"} smooth={true} duration={500} className="nav-link">
                Home
                </Link>
            </li>
            { !dashboard ?
            (<><li className="nav-item">
                            <Link to="services" smooth={true} duration={500} className="nav-link">
                                Services
                            </Link>
                        </li><li className="nav-item">
                                <Link to="login" smooth={true} duration={500} className="nav-link">
                                    Log in
                                </Link>
                            </li></>) :
            (<>
                <li className="nav-item">
                                <Link to="/dashboard" smooth={true} duration={500} className="nav-link">
                                    {token.name}
                                </Link>
                            </li>
            </>)
            }
            </ul>
        </div>
        </nav>
    );
    }

export default Navbar;