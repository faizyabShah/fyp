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
import Modal from '../components/Modal';
import AddFieldForm from '../components/AddFieldForm';
import Legend from '../components/Legend';
import ErrorPopup from '../components/ErrorPopup'; // Import the new ErrorPopup component

const Dashboard = () => {
    const { isAuthenticated, token } = useAuth();
    const [isToggled, setIsToggled] = useState(false);
    const [userFieldData, setUserFieldData] = useState([]);
    const [fieldImg, setFeildImg] = useState('./media/field.jpg');
    const [selectedField, setSelectedField] = useState(null);
    const [userName, setUserName] = useState("Faizyab Ali Shah");
    const [address, setAddress] = useState("Gujar Garhi, Mardan");
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const [activeTab, setActiveTab] = useState('crops'); // State for active tab
    const navigate = useNavigate();

    const toggleAddFieldForm = () => setShowModal(true);
    const closeModal = () => setShowModal(false);
    const closeError = () => setErrorMessage(null);

    const legend = [
        { color: 'red', text: "Pre-germination" },
        { color: 'orange', text: "Germination" },
        { color: 'yellow', text: "Tillering" },
        { color: 'green', text: "Jointing" },
        { color: 'blue', text: "Booting" },
        { color: 'purple', text: "Heading" },
        { color: 'cyan', text: "Anthesis" },
        { color: 'magenta', text: "Grain Filling" },
    ];

    useEffect(() => {
        // Check if user is authenticated
        if (!isAuthenticated || !token) {
            setErrorMessage("Please login first to access the dashboard");
            setLoading(false);
            return;
        }

        const fetchUserInfo = async () => {
            try {
                const response = await fetch('http://localhost:5000/user', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    setErrorMessage("Login failed. Redirecting...");
                } else {
                    const data = await response.json();
                    setUserName(data.user.name);
                    setAddress(data.user.address);
                    fetchUserFields(data.user.email);
                }
            } catch (error) {
                setErrorMessage("Error verifying token. Redirecting...");
            } finally {
                setLoading(false);
            }
        };

        fetchUserInfo();
    }, [token, isAuthenticated, navigate]);

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
                if (fieldsData.length > 0) {
                    setSelectedField(fieldsData[0]);
                }
            } else {
                console.error('Failed to fetch fields');
            }
        } catch (error) {
            console.error('Error fetching user fields:', error);
        }
    };

    const getPredictions = (flag) => {
        flag === 0 ? setFeildImg('./media/field_masked.jpg') : setFeildImg('./media/field.jpg');
    };

    if (loading) {
        return (
            <div className="loading-screen" style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#f8f9fa",
                zIndex: 9999
            }}>
                <div className="spinner" style={{
                    width: "50px",
                    height: "50px",
                    border: "5px solid rgba(0, 0, 0, 0.1)",
                    borderLeft: "5px solid #4CAF50",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginBottom: "20px"
                }}></div>
                <h2>Loading...</h2>
                <style>
                    {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    `}
                </style>
            </div>
        );
    }

    return (
        <>
            <Chatbot />
            <Navbar fixed={false} dashboard={true} />
            
            {errorMessage && (
                <ErrorPopup 
                    message={errorMessage}
                    redirectPath="/"
                    redirectDelay={2500}
                    onClose={closeError}
                    block={true}
                />
            )}
            
            {!errorMessage && (
                <div className="dashboards pt-5" id="Dashboard">
                    <div className="row pad-5">
                        <div className="col-md-6">
                            <div className="d-flex m-4 justify-content-start align-items-center">
                                <div className="profile">
                                    <img className='profile-img' src='./media/profile.jpg' alt="Profile" />
                                </div>
                                <div className="px-2">
                                    <h2 className='welcome-heading'>{userName}</h2>
                                    <div className='text-grey'>Manager - Farmer</div>
                                </div>
                            </div>
                            <p className='profile-para px-5'>{address}.</p>
                        </div>
                        <div className="col-md-6">
                            <WeatherWidget />
                        </div>
                        
                        {/* Tab Navigation */}
                        <div className="tabs-container">
                            <button 
                                className={`tab-btn ${activeTab === 'crops' ? 'active' : ''}`}
                                onClick={() => setActiveTab('crops')}>
                                Your Crops
                            </button>
                            <button 
                                className={`tab-btn ${activeTab === 'uav' ? 'active' : ''}`}
                                onClick={() => setActiveTab('uav')}>
                                UAV Requests
                            </button>
                        </div>

                        {activeTab === 'crops' && (
                            <>
                                {userFieldData.length === 0 ? (
                                    <div className="col-md-12 p-3">
                                        <div className="no-field box-cont d-flex justify-content-center flex-column align-items-center gap-4">
                                            <h3 className='text-grey'>You don't have any fields yet</h3>
                                            <button className='primary-btn' onClick={toggleAddFieldForm}>Add New Field</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="col-md-7 p-3">
                                            <FieldDisplay fieldInfo={userFieldData} selectedField={selectedField} setSelectedField={setSelectedField} />
                                        </div>
                                        <div className="col-md-5 p-3">
                                            <div className="box-cont">
                                                <PhenologyData selectedField={selectedField} />
                                            </div>
                                        </div>
                                        <div className="text-center py-3">
                                            <button className='primary-btn' onClick={toggleAddFieldForm}>Add Another Field</button>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                        {activeTab === 'uav' && (
                            <>
                                <div className="col-md-12 px-5 pt-5 border-bottom border-3">
                                    <h2 className="section-heading">UAV Requests</h2>
                                </div>
                                <div className="col-md-12 p-3">
                                    <div className="box-cont">
                                        <div className="row">
                                            <div className="col-md-9">
                                                <div className="pred-img-container">
                                                    <img src={fieldImg} className='img-fluid pred-img' alt="Field" />
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <Legend legend={legend} />
                                            </div>
                                        </div>
                                        <div className="text-center py-4 my-2">
                                            <button onClick={() => getPredictions(0)} className='primary-btn mx-1'>Get Live Predictions</button>
                                            <button onClick={() => getPredictions(1)} className='primary-btn mx-1'><IoIosRefresh style={{ margin: "-10px" }} /></button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            <Modal showModal={showModal} onClose={closeModal}>
                <AddFieldForm token={token} setUserFieldData={setUserFieldData} navigate={navigate} />
            </Modal>
        </>
    );
};

export default Dashboard;
