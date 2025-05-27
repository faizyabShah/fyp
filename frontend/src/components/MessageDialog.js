// MessageDialog.js
import React from 'react';
import '../styles/MessageDialog.css'; // Import your CSS file for styling

const MessageDialog = ({ message, type, onClose }) => {
  const getTypeClass = () => {
    switch (type) {
      case 'success':
        return 'success-dialog';
      case 'error':
        return 'error-dialog';
      default:
        return '';
    }
  };

  return (
    <div className={`message-dialog ${getTypeClass()}`}>
      <div className="message-content">
        <p>{message}</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default MessageDialog;
