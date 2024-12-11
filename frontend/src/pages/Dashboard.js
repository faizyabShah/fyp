import React, { useState } from 'react';
import './Dashboard.css';
import Navbar from '../components/Navbar';
import ChatWindow from '../components/ChatWindow';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Authcontext';
import FieldInfo from '../components/FieldInfo';
import FieldActions from '../components/FieldActions';

const Dashboard = () => {
    const { isAuthenticated, token } = useAuth();
    const [isToggled, setIsToggled] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false); // State for chat window visibility
    const [chatMessages, setChatMessages] = useState([]); // State for chat messages
    const navigate = useNavigate();

    if (!isAuthenticated || token == null) {
        navigate('/signup'); // Redirect to signup if not authenticated
        return null;
    }

    
    const payload = token.split('.')[1];
    const data = JSON.parse(atob(payload));

    const handleToggle = () => {
        setIsToggled(!isToggled);
    };

    const fetchAIResponse = async () => {
        try {
            const response = await fetch('http://localhost:5000/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    text: "My wheat crop is currently in germination and tillering stage. Tell me what should be done in these stages for spring wheat for better crop health and more yield. Also tell me what are some of the dangers (IF THERE ARE ANY) in this stage of the crop and what I should do about it? Give a very brief and precise answer that a farmer should understand."
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setChatMessages((prevMessages) => [
                    ...prevMessages,
                    { sender: 'AI', text: data.response },
                ]);
            } else {
                console.error('Failed to fetch AI response');
            }
        } catch (error) {
            console.error('Error fetching AI response:', error);
        }
    };

    const toggleChatWindow = () => {
        setIsChatOpen(!isChatOpen); // Toggle chat window visibility
    };

    return (
        <>
            <Navbar fixed={false} dashboard={true} token={data} />
            <div className="dashboard" id="Dashboard">
                <div className="remaining">
                    <FieldInfo className="fieldinfodiv" data={data} toggle={isToggled} handleToggle={handleToggle}/>
                    <FieldActions className="fieldactionsdiv" fetchAIResponse={fetchAIResponse} />
                </div>
            </div>
            <button className="chat-button" onClick={toggleChatWindow}>
                💬 Chat
            </button>
            {isChatOpen && (
                <ChatWindow
                    messages={chatMessages}
                    onClose={toggleChatWindow}
                    onSendMessage={(message) =>
                        setChatMessages((prevMessages) => [
                            ...prevMessages,
                            { sender: 'User', text: message },
                        ])
                    }
                />
            )}
        </>
    );
};

export default Dashboard;
