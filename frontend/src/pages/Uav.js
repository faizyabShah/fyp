import React from 'react';
import FieldDisplay from '../components/FieldDisplay';
import PhenologyData from '../components/PhenologyData';
import WeatherWidget from '../components/WeatherWidget';
import Legend from '../components/Legend';
import AddFieldForm from '../components/AddFieldForm';
import Modal from '../components/Modal';
import { IoIosRefresh } from 'react-icons/io';
import { MdFullscreen } from 'react-icons/md';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RecommendationDisplay from '../components/RecommendationDisplay';
import '../styles/Uav.css'

const UAV = ({
  userName,
  address,
  fieldImg,
  setFieldImg,
  getPredictions,
  token,
}) => {

  const [userFieldData, setUserFieldData] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [recommendation, setRecommendation] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const navigate = useNavigate();
  
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

  const fetchRecommendation = async () => {
    if (!selectedField) return;
    
    try {
      const response = await fetch(`http://localhost:5000/reports/${selectedField.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendation(data.content);
      } else {
        console.error('Failed to fetch recommendation');
        setRecommendation(null);
      }
    } catch (error) {
      console.error('Error fetching recommendation:', error);
    }
  };

  useEffect(() => {
    if (selectedField) {
      fetchRecommendation();
    }
  }, [selectedField]);

  const handleGetPredictions = () => {
    setImageLoading(true);
    setFieldImg('./media/field_masked.jpg');
    setTimeout(() => setImageLoading(false), 800); // Simulate loading
  };

  const handleRefresh = () => {
    setImageLoading(true);
    getPredictions(1);
    setTimeout(() => setImageLoading(false), 800); // Simulate loading
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

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
                  <h2 className="section-heading">Select a Field</h2>
              </div>
              <div className="col-md-7 p-3">
                  <FieldDisplay fieldInfo={userFieldData} selectedField={selectedField} setSelectedField={setSelectedField} />
              </div>
              <div className="col-md-5 p-3">
                  <div className="box-cont">
                    <PhenologyData selectedField={selectedField} phenStage={"Grain Filling"} />
                  </div>
              </div>

              <div className="col-md-12 px-5 pt-5 border-bottom border-3">
                <h2 className="section-heading">UAV view</h2>
              </div>
              
              <div className="col-md-12 p-3">
                <div className="box-cont uav-container shadow-sm">
                  {isFullscreen && (
                    <div className="fullscreen-overlay" onClick={toggleFullscreen}>
                      <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
                        <div className="fullscreen-header">
                          <h3>UAV Field View - {selectedField?.name || 'Field'}</h3>
                          <button className="close-btn" onClick={toggleFullscreen}>×</button>
                        </div>
                        <img src={fieldImg} className='img-fluid fullscreen-img' alt="Field" />
                        <div className="fullscreen-legend">
                          <Legend legend={legend} />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="uav-header d-flex justify-content-between align-items-center mb-3">
                    <h3 className="uav-title m-0">UAV Analysis - {selectedField?.name || 'Field'}</h3>
                    <div className="uav-controls">
                      <span className="uav-last-update text-muted">Last updated: {new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-9 position-relative">
                      <div className={`pred-img-container ${imageLoading ? 'img-loading' : ''}`}>
                        {imageLoading && (
                          <div className="loading-overlay">
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                          </div>
                        )}
                        <img 
                          src={fieldImg} 
                          className='img-fluid pred-img rounded shadow-sm' 
                          alt="Field" 
                        />
                        <button 
                          className="fullscreen-btn" 
                          onClick={toggleFullscreen}
                          title="View fullscreen"
                        >
                          <MdFullscreen size={24} />
                        </button>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="legend-container p-3 rounded shadow-sm">
                        <h4 className="legend-title mb-3">Phenology Legend</h4>
                        <Legend legend={legend} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center py-4 my-2">
                    <button 
                      onClick={handleGetPredictions} 
                      className='primary-btn mx-2 px-4 py-2 rounded-pill shadow-sm'
                      disabled={imageLoading}
                    >
                      Get Live Predictions
                    </button>
                    <button 
                      onClick={handleRefresh} 
                      className='primary-btn-outline mx-2 px-3 py-2 rounded-pill shadow-sm'
                      disabled={imageLoading}
                      title="Refresh predictions"
                    >
                      <IoIosRefresh size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-md-12 px-5 pt-5 border-bottom border-3">
                <h2 className="section-heading">Recommendations</h2>
              </div>
              
              <div className="col-md-12 p-3">
                {recommendation ? (
                  <RecommendationDisplay reportContent={recommendation} />
                ) : (
                  <div className="box-cont d-flex justify-content-center align-items-center p-5">
                    <p className="text-grey">No recommendations available for this field yet.</p>
                  </div>
                )}
              </div>
            </>
          )}
      </div>
    </div>
  );
};

export default UAV;