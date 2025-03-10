import React from 'react';
import FieldDisplay from '../components/FieldDisplay';
import PhenologyData from '../components/PhenologyData';
import WeatherWidget from '../components/WeatherWidget';
import Legend from '../components/Legend';
import AddFieldForm from '../components/AddFieldForm';
import Modal from '../components/Modal';
import RecommendationDisplay from '../components/RecommendationDisplay'; // Import the new component
import { IoIosRefresh } from 'react-icons/io';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Stats = ({
  userName,
  address,
  token,
}) => {

  const [userFieldData, setUserFieldData] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [activeTab, setActiveTab] = useState('satellite'); // Default tab is 'stats'
  const [recommendation, setRecommendation] = useState('');
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

  // New function to fetch recommendation
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
      console.log("CALLED")
      fetchRecommendation();
    }
  }, [selectedField]);

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
                <PhenologyData selectedField={selectedField} />
              </div>
            </div>

            <div className="col-md-12 px-5 pt-5 border-bottom border-3">
              <h2 className="section-heading">Satellite View</h2>
            </div>

            <div className="col-md-12 px-5 pt-5 border-bottom border-3">
              <h2 className="section-heading">Recommendations</h2>
            </div>
            
            <div className="col-md-12 p-3">
              {recommendation ? (
                <RecommendationDisplay reportContent={recommendation} />
              ) : (
                <div className="box-cont d-flex justify-content-center align-items-center p-5">
                  <p className="text-grey">Recommendations for the field will be available soon.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Stats;