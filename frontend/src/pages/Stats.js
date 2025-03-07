import React from 'react';
import FieldDisplay from '../components/FieldDisplay';
import PhenologyData from '../components/PhenologyData';
import WeatherWidget from '../components/WeatherWidget';
import Legend from '../components/Legend';
import AddFieldForm from '../components/AddFieldForm';
import Modal from '../components/Modal';
import { IoIosRefresh } from 'react-icons/io';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Stats = ({
  userName,
  address,
  selectedField,
  setSelectedField,
  fieldImg,
  setFieldImg,
  legend,
  getPredictions,
  token,
}) => {

  const [userFieldData, setUserFieldData] = useState([]);
  const [activeTab, setActiveTab] = useState('satellite'); // Default tab is 'stats'
  const navigate = useNavigate();

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

    useEffect(() => {
        fetchUserFields();
        }, [token]);


  return (
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

          {userFieldData.length === 0 ? (
                <div className="col-md-12 p-3">
                <div className="no-field box-cont d-flex justify-content-center flex-column align-items-center gap-4">
                    <h3 className='text-grey'>You don't have any fields yet,<br></br> proceed to the Fields Section from sidebar to add fields.</h3>
                </div>
                </div>
            ) : (
                <>
                <div className="col-md-12 px-5 pt-5 border-bottom border-3">
                    <h2 className="section-heading">Your crops</h2>
                </div>
                <div className="col-md-7 p-3">
                    <FieldDisplay fieldInfo={userFieldData} selectedField={selectedField} setSelectedField={setSelectedField} />
                </div>
                <div className="col-md-5 p-3">
                    <div className="box-cont">
                    <PhenologyData selectedField={selectedField} />
                    </div>
                </div>

                <div className="tabs-container">
            <button 
                className={`tab-btn ${activeTab === 'satellite' ? 'active' : ''}`}
                onClick={() => setActiveTab('satellite')}>
                Satellite
            </button>
            <button 
                className={`tab-btn ${activeTab === 'uav' ? 'active' : ''}`}
                onClick={() => setActiveTab('uav')}>
                UAV
            </button>
            <button 
                className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
                onClick={() => setActiveTab('recommendations')}>
                Recommendations
            </button>
            </div>

            {activeTab === 'satellite' && (
            <></>
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
            </>
            
          )}

        {/* Tab Navigation */}
        
      </div>
    </div>
  );
};

export default Stats;
