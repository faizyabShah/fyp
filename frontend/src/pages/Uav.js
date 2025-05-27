import React, { useState, useEffect } from 'react';
import FieldDisplay from '../components/FieldDisplay';
import PhenologyData from '../components/PhenologyData';
import WeatherWidget from '../components/WeatherWidget';
import { MdFullscreen } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import UAVImageryMap from '../components/UAVImageryMap';
import RecommendationDisplay from '../components/RecommendationDisplay';
import RecommendationSummary from '../components/RecommendationSummary';
import '../styles/Uav.css';

const UAV = ({
  userName,
  address,
  token,
}) => {
  const [userFieldData, setUserFieldData] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [recommendation, setRecommendation] = useState('');
  const [phenStage, setPhenStage] = useState(null);
  const [yeeeld, setYield] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();

  // Fetch user's fields
  const fetchUserFields = async () => {
    try {
      const response = await fetch(`/fields`, {
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

  // Fetch recommendation for selected field
  const fetchRecommendation = async () => {
    if (!selectedField) return;
    
    try {
      const response = await fetch(`/reports/27`, {
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

  const fetchPhenologyStage = async () => {
      if (!selectedField) return;
  
      try {
        const response = await fetch(`/fields/${selectedField.id}/phenology_stage`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
  
        if (response.ok) {
          const data = await response.json();
          setPhenStage(data.phenology_stage);
          setYield(data.yield);
        } else {
          console.error('Failed to fetch phenology stage');
          setPhenStage(null);
          setYield(null);
        }
      } catch (error) {
        console.error('Error fetching phenology stage:', error);
      }
    };
  
    useEffect(() => {
      fetchPhenologyStage();
    }, [selectedField]);

  // Initialize on load
  useEffect(() => {
    fetchUserFields();
  }, [token]);

  const handleFieldChange = (e) => {
    const fieldId = e.target.value;
    const field = userFieldData.find(f => f.id === parseInt(fieldId));
    if (field) {
      setSelectedField(field);
    }
  };

  // When selected field changes, update recommendation
  useEffect(() => {
    if (selectedField) {
      fetchRecommendation();
    }
  }, [selectedField]);

  // Toggle fullscreen
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

        {userFieldData.length > 0 && (
                  <div className="field-selector-container">
                    <label htmlFor="field-selector" className="field-label">Select Field:</label>
                    <select 
                      id="field-selector"
                      className="field-selector-dropdown" 
                      value={selectedField ? selectedField.id : ''} 
                      onChange={handleFieldChange}
                    >
                      {userFieldData.map(field => (
                        <option key={field.id} value={field.id}>
                          {field.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

        {userFieldData.length === 0 ? (
          <div className="col-md-12 p-3">
            <div className="no-field box-cont d-flex justify-content-center flex-column align-items-center gap-4">
              <h3 className='text-grey'>You don't have any fields yet,<br></br> proceed to the Fields Section from sidebar to add fields.</h3>
            </div>
          </div>
        ) : selectedField && selectedField.id !== 27 ? (
          <div className="col-md-12 p-3">
            <div className="no-field box-cont d-flex justify-content-center flex-column align-items-center gap-4">
              <h3 className='text-grey'>No UAV Imagery Available for this field.</h3>
            </div>
          </div>
        ) : (
          <>
            <div className="col-md-12 px-5 pt-5 border-bottom border-3">
              <div className="field-header-container">
                <h2 className="section-heading">Field Overview</h2>
                
              </div>
            </div>
            <div className="col-md-7 p-3">
              <RecommendationSummary reportContent={recommendation} />
            </div>
            <div className="col-md-5 p-3">
              <PhenologyData selectedField={selectedField} phenStage={phenStage} yeeeld={yeeeld}/>
            </div>

            <div className="col-md-12 px-5 pt-5 border-bottom border-3">
              <h2 className="section-heading">UAV Imagery Analysis</h2>
            </div>
            
            <div className="col-md-12 p-3">
              <div className="box-cont uav-container shadow-sm">
                {/* {isFullscreen && (
                  <div className="fullscreen-overlay" onClick={toggleFullscreen}>
                    <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
                      <div className="fullscreen-header">
                        <h3>UAV Field View - {selectedField?.name || 'Field'}</h3>
                        <button className="close-btn" onClick={toggleFullscreen}>×</button>
                      </div>
                      <div className="fullscreen-map">
                        <UAVImageryMap 
                          token={token} 
                          fieldId={selectedField?._id} 
                        />
                      </div>
                    </div>
                  </div>
                )} */}
                
                <div className="uav-header d-flex justify-content-between align-items-center mb-3">
                  <h3 className="uav-title m-0">UAV Analysis - {selectedField?.name || 'Field'}</h3>
                </div>
                
                <div className="position-relative">
                  <UAVImageryMap 
                    token={token} 
                    fieldId={selectedField?._id} 
                  />
                  
                  {/* <button 
                    className="fullscreen-btn" 
                    onClick={toggleFullscreen}
                    title="View fullscreen"
                  >
                    <MdFullscreen size={24} />
                  </button> */}
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