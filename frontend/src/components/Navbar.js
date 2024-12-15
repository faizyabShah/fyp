import React, { useEffect, useState } from 'react';
import '../styles/Navbar.css';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ fixed, dashboard, token }) => {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(true);
    const [isAtTop, setIsAtTop] = useState(true);  // Track if we are at the top
    const [lastScrollTop, setLastScrollTop] = useState(0);
    const [scrollTimeout, setScrollTimeout] = useState(null);

    // Function to navigate to different destinations
    const goTo = (destination) => {
        navigate(destination);
        window.scrollTo(0, 0);
    };

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;

            // Check if we are at the top of the page
            if (currentScrollTop === 0) {
                setIsAtTop(true);
                setIsVisible(true);  // Always show the navbar at the top
                return;
            } else {
                setIsAtTop(false);
            }

            // If scrolling down, hide the navbar
            if (currentScrollTop > lastScrollTop) {
                setIsVisible(false);
            } 
            // If scrolling up, show the navbar
            else if (currentScrollTop < lastScrollTop) {
                setIsVisible(true);
            }

            // Update the last scroll position
            setLastScrollTop(currentScrollTop);

            // Reset timeout if scrolling stopped midway
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }

            // Set timeout to hide navbar after 1500ms if stopped (only when not at the top)
            if (currentScrollTop > 0) {
                setScrollTimeout(setTimeout(() => {
                    if (!isAtTop) {
                        setIsVisible(false);  // Hide if not at the top
                    }
                }, 1500));
            }
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeout) clearTimeout(scrollTimeout);
        };
    }, [lastScrollTop, scrollTimeout, isAtTop]);

    return (
        <nav className={`my-navbar ${isVisible ? 'visible' : 'invisible'}`}>
            <div className={`nav-blur ${dashboard ? 'dash-nav' : ''}`}>
                <div className="d-flex justify-content-between">
                    <img src="./media/wheat-plant.png" onClick={() => { goTo("/") }} className='nav-logo' />
                    <div className='d-flex justify-content-center px-4 mx-4 align-items-center'>
                        <div onClick={() => { goTo("/") }} className='navlink'>Home</div>
                        <div onClick={() => { goTo("/services") }} className='navlink'>Services</div>
                        <div onClick={() => { goTo("/aboutus") }} className='navlink'>About Us</div>
                        <div className='navlink'>Contact</div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
