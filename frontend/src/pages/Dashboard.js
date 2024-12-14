import React, { useEffect, useState } from 'react';
import '../styles/Dashboard.css';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Authcontext';
import Chatbot from '../components/Chatbot';
import WeatherWidget from '../components/WeatherWidget';
import FieldDisplay from '../components/FieldDisplay';
import PhenologyData from '../components/PhenologyData';

const Dashboard = () => {
    const { isAuthenticated, token } = useAuth();
    const [isToggled, setIsToggled] = useState(false);
    const [userFieldData, setUserFieldData] = useState(null);
    const [selectedField, setSelectedField] = useState('Field 1');
    const [userName, setUserName] = useState("Faizyab Ali Shah");
    const navigate = useNavigate();

    useEffect (() => {
        setUserFieldData(
            ['Field 1', 'Field 2']
            // []
        );
    }, []);


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

                <div className="row pad-5">
                    <div className="col-md-9">

                        <div className=" d-flex m-4 justify-content-start align-items-center">
                            <div className="profile">
                                <img className='profile-img' src='./media/profile.jpg' />
                            </div>
                            <div className="px-2">
                                <h2 className='welcome-heading' >{userName}</h2>
                                <div className='text-grey'>Manager - Farmer</div>
                            </div>
                        </div>
                        <p className='profile-para p-4'>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Omnis sint laborum odit, accusantium modi ipsum, harum quis  Omnis sint laborum odit, accusantium modi ipsum, harum quis, labore obcaecati voluptatum ratione. Placeat modi non unde blanditiis recusandae esse incidunt repudiandae?</p>

                    </div>
                    <div className="col-md-3">
                        <WeatherWidget />
                    </div>
                    {
                        userFieldData.length == 0 ?
                        <div className="col-md-12 p-3">
                            <div className="no-field box-cont d-flex justify-content-center flex-column align-items-center">
                                <h3 className='text-grey'>You don't have any fields yet</h3>
                                <button className='primary-btn '>Click to Add</button>
                            </div>
                        </div>
                        :
                        <>
                        <div className="col-md-7 p-3">
                            <FieldDisplay fieldInfo={userFieldData} selectedField={selectedField} setSelectedField={setSelectedField}/>
                        </div>
                        <div className="col-md-5 p-3">
                            <div className=" box-cont">
                                <PhenologyData selectedField={selectedField}/>
                            </div>
                        </div>
                        </>
                    }
                </div>
                
            </div>

        </>
    );
};

export default Dashboard;
