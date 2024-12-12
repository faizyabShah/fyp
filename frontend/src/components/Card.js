// create a card component that takes title and description

import React from 'react';
import '../styles/Card.css';

const Card = ({title, description}) => {
    return (
        <div className="cardd">
            <h2>{title}</h2>
            <div className="ptag">
            <p>{description}</p>
            </div>
        </div>
    );
}

export default Card;