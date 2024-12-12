import React from 'react';
import '../styles/Navbar.css';
import { Link as ScrollLink } from 'react-scroll';  // Rename to avoid confusion
import { Link as RouterLink } from 'react-router-dom';  // Import React Router Link

const Navbar = ({ fixed, dashboard, token }) => {
    return (
        <nav className={`navbar navbar-expand-lg  ${fixed ? "mynavbar" : "notmynavbar"}`}>
            <RouterLink to="/" className="navbar-brand">

                <img className="logo" src={'./media/wheat-plant.png'} alt="Wheat plant logo" />
                <span className='logo-text'>WheatInsight</span>
            </RouterLink>
            <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
                <ul className="navbar-nav">
                    <li className="nav-item active">
                        {dashboard ? (
                            <RouterLink to="/" className="nav-link">
                                Home
                            </RouterLink>
                        ) : (
                            <ScrollLink to="Home" smooth={true} duration={500} className="nav-link">
                                Home
                            </ScrollLink>
                        )}
                    </li>
                    {!dashboard ? (
                        <>
                            <li className="nav-item">
                                <ScrollLink to="services" smooth={true} duration={500} className="nav-link">
                                    Services
                                </ScrollLink>
                            </li>
                            <li className="nav-item">
                                <ScrollLink to="login" smooth={true} duration={500} className="nav-link">
                                    Log in
                                </ScrollLink>
                            </li>
                        </>
                    ) : (
                        <li className="nav-item username">
                            <RouterLink to="/dashboard" className="nav-link">
                                {token.name}
                            </RouterLink>
                        </li>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;