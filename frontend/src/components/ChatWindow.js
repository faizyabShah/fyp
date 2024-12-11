import React, { useState } from 'react';
import './ChatWindow.css';

const ChatWindow = ({ messages, onClose, onSendMessage }) => {
    const [input, setInput] = useState('');

    const handleSendMessage = () => {
        if (input.trim() === '') return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <div className="chat-window">
            <div className="chat-header">
                <h3>AI Chat</h3>
                <button onClick={onClose} className="close-button">X</button>
            </div>
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`chat-message ${msg.sender === 'AI' ? 'ai' : 'user'}`}
                    >
                        <p>{msg.text}</p>
                    </div>
                ))}
            </div>
            <div className="chat-input">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                />
                <button onClick={handleSendMessage}>Send</button>
            </div>
        </div>
    );
};

export default ChatWindow;
