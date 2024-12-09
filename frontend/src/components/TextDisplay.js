import React from 'react';
import { formatText } from '../utils/textFormatter';

const TextDisplay = ({ text }) => {
    return (
        <div 
            dangerouslySetInnerHTML={{ __html: formatText(text) }} 
        />
    );
};

export default TextDisplay;
