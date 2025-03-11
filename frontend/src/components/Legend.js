import React from 'react';
import '../styles/Legend.css';

const Legend = ({ legend }) => {
  return (
    <div className="legend-container">
      {legend.map((item, index) => (
        <div key={index} className="legend-item">
          <span 
            className="legend-color-box" 
            style={{ backgroundColor: item.color }}
          ></span>
          <span className="legend-text">{item.text}</span>
        </div>
      ))}
    </div>
  );
};

export default Legend;