import React from "react";
import "../styles/Footer.css";
import { FaFacebookF, FaLinkedinIn, FaInstagram } from 'react-icons/fa';
import { useMediaQuery } from "react-responsive";
import { useNavigate } from "react-router-dom";
import ContactUsCard from "./ContactUsCard";

const Footer = () => {

    const scrollToSection = async (sectionId) => {
        const section = document.getElementById(sectionId);
      
        if (section) {
          const offsetTop = section.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        } else {
          await navigate('/');
      
          setTimeout(() => {
            const newSection = document.getElementById(sectionId);
            if (newSection) {
              const offsetTop = newSection.getBoundingClientRect().top + window.scrollY;
              window.scrollTo({ top: offsetTop, behavior: 'smooth' });
            }
          }, 500);
        }
      };
      

  const navigate = useNavigate();

  const handleNavigate = (path) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' })
  };
  
    
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isDesktop = useMediaQuery({ minWidth: 768 });

    return (
        <>
        <footer className="footer">
            <div className="d-flex pt-3">
                <div className="col-4">
                    <div className="footer-content d-flex align-items-center my-3 justify-content-center text-start flex-column">
                        <div>
                        <div className="mb-3 footer-head">Company</div>
                            <div className="list-item">About Us</div>
                            <div className="list-item" onClick={() => scrollToSection('mission')}>Mission and Values</div>
                            <div className="list-item" onClick={() => scrollToSection('technologies')}>Technologies</div>
                            <div className="list-item" onClick={() => handleNavigate('/policy/privacy')}>Privacy Policy</div>
                            <div className="list-item" onClick={() => handleNavigate('/policy/cookies')}>Cookies Policy</div>
                            <div className="list-item" onClick={() => handleNavigate('/policy/TAS')}>Terms and Conditions</div>
                        </div>
                    </div>
                </div>
                <div className="col-4">
                    <div className="footer-content d-flex align-items-center my-3 mx-2 justify-content-center text-start flex-column">
                        <div>
                            <div className="mb-3 footer-head">Services</div>
                            <div className="list-item" onClick={() => handleNavigate('/services/AI/')}>Phenology Estimation</div>
                            <div className="list-item" onClick={() => handleNavigate('/services/mobileApp/')}>Yeild Estimation</div>
                            <div className="list-item" onClick={() => handleNavigate('/services/WebDev/')}>Actionable Recommendations</div>
                            <div className="list-item" onClick={() => handleNavigate('/services/GIS/')}>Satellite phenology estimation</div>
                        </div>
                    </div>
                </div>
                <div className="col-4 contact-col">
                    <div className="footer-content d-flex align-items-center my-3 justify-content-center text-start flex-column">
                        <div>
                            <div className="mb-3 footer-head">Contact</div>
                            <div className="list-item">faizyabshah0123@gmail.com</div>
                            <div className="list-item">Call us at: </div>
                            <div className="list-item"> +92 314 9853997 </div>
                            <div className="list-item"> </div>
                            <div className="list-item mt-4"> Address:<br/> Bolan Road, NUST, H-12 Islamabad</div>
                        </div>
                    </div>
                </div>
            </div>

      {isDesktop && (
            <>

            <div className="row footer-bottom">
                <div className="col-md-4 text-start d-flex align-items-end justify-content-start">
                    <div>
                        <div className="text-light">  +92 314 9853997 </div>
                        <div className="text-light">faizyabshah0123@gmail.com</div>
                    </div>
                </div>
                <div className="col-md-4 d-flex align-items-end">
                    <div>
                        <img 
                            src={`${process.env.PUBLIC_URL}/media/wheat-plant.png`} 
                            className='img-fluid footer-logo' 
                            alt="Company logo" // Added alt text here
                        />
                       <div className="list-item-small">
                            © {new Date().getFullYear()} WheatInsight. All Rights Reserved
                        </div>

                    </div>
                </div>
                <div className="col-md-4 d-flex align-items-end flex-column justify-content-end">
                    <div>
                        <div className="footer-icon-circle">
                            <a href="https://www.linkedin.com/company/neosyss/" target="_blank" rel="noreferrer"> {/* Added rel="noreferrer" */}
                                <FaLinkedinIn className="icon linkedin-icon" />
                            </a>
                        </div>
                        <div className="footer-icon-circle">
                            <a href="https://www.instagram.com/neosyssllc/" target="_blank" rel="noreferrer"> {/* Added rel="noreferrer" */}
                                <FaInstagram className="icon instagram-icon" />
                            </a>
                        </div>
                    </div>
                    <div className="list-item-small hoverClick" onClick={() => handleNavigate('/policy/TAS')}>
                        Terms and Conditions
                    </div>
                    <div className="d-flex flex-row">
                        <div className="list-item-small pt-1 hoverClick" onClick={() => handleNavigate('/policy/privacy')}>
                            Privacy Policy
                        </div>
                        <div className="mx-2">|</div>
                        <div className="list-item-small pt-1 hoverClick" onClick={() => handleNavigate('/policy/cookies')}>
                            Cookies Policy
                        </div>
                    </div>
                </div>
            </div>
            </>
            )}

      {isMobile && (
        <>
           <div className="row footer-bottom">
                  <div className="d-flex align-items-start justify-content-between">
                    <div className="contact-foot d-flex justify-content-start flex-column">
                        <div className="text-center contact-footer-text">faizyabshah0123@gmail.com</div>
                        <div className="text-center contact-footer-text"> +92 314 9853997 </div>
                    </div>
                    <div className=" d-flex justify-content-start flex-column">


                        <div>
                            <div className="footer-icon-circle">
                                <a href="https://www.linkedin.com/company/neosyss/" target="_blank" rel="noreferrer"> {/* Added rel="noreferrer" */}
                                    <FaLinkedinIn className="icon linkedin-icon" />
                                </a>
                            </div>
                            <div className="footer-icon-circle">
                                <a href="https://www.instagram.com/neosyssllc/" target="_blank" rel="noreferrer"> {/* Added rel="noreferrer" */}
                                    <FaInstagram className="icon instagram-icon" />
                                </a>
                            </div>
                        </div>
                        <img 
                            src={`${process.env.PUBLIC_URL}/logowhite.png`} 
                            className='img-fluid footer-logo' 
                            alt="Company logo" // Added alt text here
                        />


                    </div>
                  </div>

                <div className="col-md-4 my-2 d-flex align-items-center">
                    <div>                        
                    <div className="list-item mb-4 text-light foot-hidden"> 7901 4th St N # 22651 St. Petersburg, FL 33702</div>
                        <div className="list-item-small hoverClick" onClick={() => handleNavigate('/policy/TAS')}>
                            Terms and Conditions
                        </div>
                        <div className="d-flex flex-row text-center align-items-center justify-content-center">
                            <div className="list-item-small pt-1 hoverClick" onClick={() => handleNavigate('/policy/privacy')}>
                                Privacy Policy
                            </div>
                            <div className="mx-2">|</div>
                            <div className="list-item-small pt-1 hoverClick" onClick={() => handleNavigate('/policy/cookies')}>
                                Cookies Policy
                            </div>
                        </div>
                       <div className="mt-1 list-item-small">
                            © {new Date().getFullYear()} WheatInsight. All Rights Reserved
                        </div>

                    </div>
                </div>
            </div>

        </>
      )}
            
        </footer>
        </>

    );
};

export default Footer;
