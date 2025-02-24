import React, { useEffect, useState } from 'react';
import '../styles/Navbar.css';
import { Link } from 'react-scroll';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ fixed, dashboard, token, fromhome }) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [scrollTimeout, setScrollTimeout] = useState(null);

  // Optional: for routing to other pages (e.g., signup)
  const goTo = (destination) => {
    navigate(destination);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (currentScrollTop === 0) {
        setIsAtTop(true);
        setIsVisible(true);
        return;
      } else {
        setIsAtTop(false);
      }

      if (currentScrollTop > lastScrollTop) {
        setIsVisible(false);
      } else if (currentScrollTop < lastScrollTop) {
        setIsVisible(true);
      }

      setLastScrollTop(currentScrollTop);

      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      if (currentScrollTop > 0) {
        setScrollTimeout(setTimeout(() => {
          if (!isAtTop) {
            setIsVisible(false);
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
          {/* Using react-scroll Link for smooth scrolling */}
          <Link 
            to="home" 
            smooth={true} 
            duration={500} 
            className="nav-logo-link"
          >
            <img
              src="./media/wheat-plant.png"
              className="nav-logo"
              alt="logo"
            />
          </Link>
          <div className="d-flex justify-content-center px-4 mx-4 align-items-center">
            {fromhome ? <Link to="home" smooth={true} duration={500} className="navlink">
              Home
            </Link> : <Link onClick={() => goTo('/')} className="navlink">Home</Link>}
            {fromhome && <Link to="services" smooth={true} duration={500} className="navlink">
              Services
            </Link>}
            {fromhome && (
              <Link to="login" smooth={true} duration={500} className="navlink">
                Login
              </Link>
            )}
            {fromhome && <Link to="contact" smooth={true} duration={500} className="navlink">
              Contact
            </Link>}
            {fromhome && (
              <div onClick={() => goTo('/signup')} className="navlink">
                Signup
              </div>
            )}
            {fromhome && (
              <div onClick={() => goTo('/dashboard')} className="navlink">
                Dashboard
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
