import React from 'react';
import '../styles/Modal.css';  // Create some basic CSS for the modal

const Modal = ({ showModal, onClose, children }) => {
    if (!showModal) return null; // Don't render anything if the modal is not visible

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>X</button>
                {children}  {/* Render the content passed from parent */}
            </div>
        </div>
    );
};

export default Modal;
