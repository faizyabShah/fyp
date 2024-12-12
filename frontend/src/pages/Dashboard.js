import React, { useState } from 'react';
import '../styles/Dashboard.css';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Authcontext';
import FieldInfo from '../components/FieldInfo';
import Chatbot from '../components/Chatbot';
import WeatherWidget from '../components/WeatherWidget';

const Dashboard = () => {
    const { isAuthenticated, token } = useAuth();
    const [isToggled, setIsToggled] = useState(false);
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
            } else {
                console.error('Failed to fetch AI response');
            }
        } catch (error) {
            console.error('Error fetching AI response:', error);
        }
    };


    return (
        <>
            <Chatbot />
            <Navbar fixed={false} dashboard={true} token={data} />
            <div className="dashboards" id="Dashboard">
                {/* <div className="remaining"> */}
                    {/* <FieldInfo className="fieldinfodiv" data={data} toggle={isToggled} handleToggle={handleToggle}/> */}
                {/* </div> */}

                <div className="row p-5">
                    <div className="col-md-9">

                    </div>
                    <div className="col-md-3">
                    <WeatherWidget />
                    </div>
                </div>
            </div>

        </>
    );
};

export default Dashboard;
