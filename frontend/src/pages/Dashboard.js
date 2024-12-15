import React, { useEffect, useState } from 'react';
import '../styles/Dashboard.css';
import '../App.css';
import { IoIosRefresh } from "react-icons/io";
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Authcontext';
import Chatbot from '../components/Chatbot';
import WeatherWidget from '../components/WeatherWidget';
import FieldDisplay from '../components/FieldDisplay';
import PhenologyData from '../components/PhenologyData';
import FieldInfo from '../components/FieldInfo';
import Legend from '../components/Legend';
import ReadOnlyMap from '../components/ReadOnlyMap';

const Dashboard = () => {
    const { isAuthenticated, token } = useAuth();
    const [isToggled, setIsToggled] = useState(false);
    const [userFieldData, setUserFieldData] = useState(null);
    const [fieldImg, setFeildImg] = useState('./media/field.jpg');
    const [selectedField, setSelectedField] = useState('Field 1');
    const [userName, setUserName] = useState("Faizyab Ali Shah");
    const [address, setAddress] = useState("Gujar Garhi, Mardan")
    const navigate = useNavigate();

    const legend = [
        {color:'red', text:"Pre-germination" },
        {color:'orange', text:"Germination" },
        {color:'yellow', text:"Tillering" },
        {color:'green', text:"Jointing" },
        {color:'blue', text:"Booting" },
        {color:'purple', text:"Heading" },
        {color:'cyan', text:"Anthesis" },
        {color:'magenta', text:"Grain Filling" },
    ];

    useEffect (() => {
        setUserFieldData(
            ['Field 1', 'Field 2']
            // []
        );
    }, []);

    const getPredictions = (flag) => {
        flag == 0 ? setFeildImg('./media/field_masked.jpg') : setFeildImg('./media/field.jpg')
    }


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
            <div className="dashboards pt-5" id="Dashboard">

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
                        <p className='profile-para p-4'>A wheat farm manager, from the area of {address}.</p>

                    </div>
                    <div className="col-md-3">
                        <WeatherWidget />
                    </div>
                    {
                        userFieldData == null?
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
                            <div className="box-cont">
                                <PhenologyData selectedField={selectedField}/>
                            </div>
                        </div>

                        <div className="col-md-12 p-3">
                            <div className="box-cont">
                                <div className="row">
                                    <div className="col-md-9">
                                        <div className="pred-img-container">
                                            <img src={fieldImg} className='img-fluid pred-img'/>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <Legend legend={legend} />
                                    </div>
                                </div>
                                <div className="text-center py-4 my-2">
                                    <button onClick={() => getPredictions(0)} className='primary-btn mx-1'>Get Live Predictions</button>
                                    <button onClick={() => getPredictions(1)} className='primary-btn mx-1'><IoIosRefresh  style={{margin:"-10px"}}/></button>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-12 p-3">
                            <div className="box-cont row">
                                <div className="col-md-4">
                                    <button className='gradient g1'><span>Get AI Recommendations</span></button>
                                </div>
                                <div className="col-md-4">
                                    <button className='gradient g2'><span>Add New Field</span></button>
                                </div>
                                <div className="col-md-4">
                                    <button className='gradient g3'><span>Generate Report</span></button>
                                </div>
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
