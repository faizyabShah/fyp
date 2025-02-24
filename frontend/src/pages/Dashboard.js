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
import AddFieldForm from '../components/AddFieldForm';
import Modal from '../components/Modal'; // Import the Modal component
import ReadOnlyMap from '../components/ReadOnlyMap';

const Dashboard = () => {
    const { isAuthenticated, token } = useAuth();
    const [isToggled, setIsToggled] = useState(false);
    const [userFieldData, setUserFieldData] = useState([]);
    const [fieldImg, setFeildImg] = useState('./media/field.jpg');
    const [selectedField, setSelectedField] = useState(null);
    const [userName, setUserName] = useState("Faizyab Ali Shah");
    const [address, setAddress] = useState("Gujar Garhi, Mardan");
    const [userRequests, setUserRequests] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    const toggleAddFieldForm = () => {
        setShowModal(true);  // Open modal
    };

    const closeModal = () => {
        setShowModal(false);  // Close modal
    };


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



    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const response = await fetch('http://localhost:5000/user', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
    
                if (!response.ok) {
                    // Token is invalid or expired, redirect to login
                    navigate('/');
                } else {
                    const data = await response.json();
                    setUserName(data.user.name);
                    setAddress(data.user.address);
                    // Fetch the user's fields after user info is fetched
                    fetchUserFields(data.user.email);
                }
            } catch (error) {
                console.error('Error fetching user info:', error);
                navigate('/');  // Redirect to login if any error occurs
            }
        };
        

        if (token) {
            fetchUserInfo();
        }
        // }
    }, [token]);

    const fetchUserFields = async (userEmail) => {
        try {
            const response = await fetch(`http://localhost:5000/fields`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const fieldsData = await response.json();
                setUserFieldData(fieldsData);
                setSelectedField(fieldsData[0]);
                fetchUserRequests(userEmail);
            } else {
                console.error('Failed to fetch fields');
            }
        } catch (error) {
            console.error('Error fetching user fields:', error);
        }
    };

    const fetchUserRequests = async (userEmail) => {
        try {
            const response = await fetch(`http://localhost:5000/requests`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const requestsData = await response.json();
                setUserRequests(requestsData);
            } else {
                console.error('Failed to fetch requests');
            }
        } catch (error) {
            console.error('Error fetching user requests:', error);
        }
    };
    

    const getPredictions = (flag) => {
        flag == 0 ? setFeildImg('./media/field_masked.jpg') : setFeildImg('./media/field.jpg')
    }


    return (
        <>
            <Chatbot />
            <Navbar fixed={false} dashboard={true} />
            <div className="dashboards pt-5" id="Dashboard">

                <div className="row pad-5">
                    <div className="col-md-6">

                        <div className=" d-flex m-4 justify-content-start align-items-center">
                            <div className="profile">
                                <img className='profile-img' src='./media/profile.jpg' />
                            </div>
                            <div className="px-2">
                                <h2 className='welcome-heading' >{userName}</h2>
                                <div className='text-grey'>Manager - Farmer</div>
                            </div>
                        </div>
                        <p className='profile-para px-5'>{address}.</p>

                    </div>
                    <div className="col-md-6">
                        <WeatherWidget />
                    </div>
                    <div className="col-md-12 px-5 pt-5 border-bottom border-3">
                        <h2 className="section-heading">Your Crops</h2>
                    </div>
                    {
                        userFieldData == null || userFieldData.length == 0?
                        <div className="col-md-12 p-3">
                            <div className="no-field box-cont d-flex justify-content-center flex-column align-items-center gap-4">
                                <h3 className='text-grey'>You don't have any fields yet</h3>
                                <button className='primary-btn' onClick={toggleAddFieldForm}>Add New Field</button>

                                <Modal showModal={showModal} onClose={closeModal}>
                                    <AddFieldForm 
                                        token={token} 
                                        setUserFieldData={setUserFieldData} 
                                        navigate={navigate}
                                    />
                                </Modal>
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
