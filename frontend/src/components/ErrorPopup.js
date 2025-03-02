import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles//ErrorPopup.css';

const ErrorPopup = ({ message, redirectPath, redirectDelay, onClose, block }) => {
  const navigate = useNavigate();

  React.useEffect(() => {
    let redirectTimer;
    
    if (redirectPath && redirectDelay) {
      redirectTimer = setTimeout(() => {
        navigate(redirectPath);
      }, redirectDelay);
    }
    
    // Cleanup timer on unmount
    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [navigate, redirectPath, redirectDelay]);

  const handleClose = () => {
    if (onClose) onClose();
    if (redirectPath) navigate(redirectPath);
  };

  return (
    <div className={block ? "error-popup-overlay-blocked" : "error-popup-overlay"}>
      <div className="error-popup-container">
        <button 
          className="error-popup-close-btn"
          onClick={handleClose}
        >
          ×
        </button>
        {message}
      </div>
    </div>
  );
};

export default ErrorPopup;