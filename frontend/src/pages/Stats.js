import React, { useState, useEffect } from 'react';
import PhenologyData from '../components/PhenologyData';
import WeatherWidget from '../components/WeatherWidget';
import SatelliteViewer from '../components/SatelliteViewer';
import VegetationTrends from '../components/VegetationTrends';
import RecommendationSummary from '../components/RecommendationSummary';
import RecommendationModal from '../components/RecommendationModal';
import { useNavigate } from 'react-router-dom';
import '../styles/Stats.css';

const Stats = ({
  userName,
  address,
  token,
}) => {

  const [userFieldData, setUserFieldData] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [recommendation, setRecommendation] = useState('');
  const [phenStage, setPhenStage] = useState(null);
  const [yeeeld, setYield] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const fetchUserFields = async () => {
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

  const fetchPhenologyStage = async () => {
    if (!selectedField) return;

    try {
      const response = await fetch(`http://localhost:5000/fields/${selectedField.id}/phenology_stage`, {
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

  // Function to fetch recommendation
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
    fetchUserFields();
  }, [token]);

  useEffect(() => {
    if (selectedField) {
      fetchRecommendation();
    }
  }, [selectedField]);

  // Function to handle field selection from a dropdown
  const handleFieldChange = (e) => {
    const fieldId = e.target.value;
    const field = userFieldData.find(f => f.id === parseInt(fieldId));
    if (field) {
      setSelectedField(field);
    }
  };

  // Modal control functions
  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

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
            <div className="col-md-12 px-5 pt-5">
              <div className="field-header-container">
                <h2 className="section-heading">Field Overview</h2>
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
              </div>
              <div className="header-divider"></div>
            </div>
            
            <div className="col-md-7 p-3">
              <RecommendationSummary reportContent={recommendation} />
              
              {/* Detailed recommendations button */}
              {recommendation && (
                <div className="detailed-rec-link-container p-3 text-center">
                  <button 
                    className="btn btn-outline-success detailed-rec-btn"
                    onClick={handleShowModal}
                  >
                    <i className="fas fa-list-ul me-2"></i>
                    View Detailed Recommendations
                  </button>
                </div>
              )}
            </div>
            
            <div className="col-md-5 p-3">
              <PhenologyData selectedField={selectedField} phenStage={phenStage} yeeeld={yeeeld}/>
            </div>

            {/* New Vegetation Trends Section */}
            

            <div className="col-md-12 px-5 pt-5">
              <h2 className="section-heading">Satellite View</h2>
              <div className="header-divider"></div>
            </div>
            <div className="col-md-12 p-3">
              <SatelliteViewer selectedField={selectedField} token={token} />
            </div>
            <div className="col-md-12 px-5 pt-5">
              <h2 className="section-heading">Vegetation Health Trends</h2>
              <div className="header-divider"></div>
            </div>
            <div className="col-md-12 p-3">
              <VegetationTrends selectedField={selectedField} token={token} />
            </div>
          </>
        )}
      </div>

      {/* Recommendation Modal Component */}
      <RecommendationModal 
        show={showModal}
        handleClose={handleCloseModal}
        reportContent={recommendation}
      />
    </div>
  );
};

export default Stats;