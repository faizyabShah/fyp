import React, { useEffect, useState } from 'react';
import '../styles/Dashboard.css';
import '../App.css';
import { IoIosRefresh } from "react-icons/io";
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Authcontext';
import Chatbot from '../components/Chatbot';
import ErrorPopup from '../components/ErrorPopup';
import LoadingScreen from '../components/LoadingScreen';
import Sidebar from '../components/Sidebar';
import Stats from './Stats'; // Import the new DashboardContent component
import Fields from './Fields';
import Requests from './Requests';

const Dashboard = () => {
  const { isAuthenticated, token } = useAuth();
  const [fieldImg, setFeildImg] = useState('./media/field.jpg');
  const [selectedField, setSelectedField] = useState(null);
  const [userName, setUserName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState('satellite-stats');
  const navigate = useNavigate();

  const closeError = () => setErrorMessage(null);

  useEffect(() => {
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
        }
      } catch (error) {
        setErrorMessage("Error verifying token. Redirecting...");
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [token, isAuthenticated, navigate]);



  const getPredictions = (flag) => {
    flag === 0 ? setFeildImg('./media/field_masked.jpg') : setFeildImg('./media/field.jpg');
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Chatbot />
      <Navbar fixed={false} dashboard={true} />
      <div className="col-md-3">
        <Sidebar activeTab={currentPage} setActiveTab={setCurrentPage} />
      </div>

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
        currentPage === 'satellite-stats' ? (
            <Stats 
            userName={userName}
            address={address}
            selectedField={selectedField}
            setSelectedField={setSelectedField}
            fieldImg={fieldImg}
            setFieldImg={setFeildImg}
            legend={[
                { color: 'red', text: "Pre-germination" },
                { color: 'orange', text: "Germination" },
                { color: 'yellow', text: "Tillering" },
                { color: 'green', text: "Jointing" },
                { color: 'blue', text: "Booting" },
                { color: 'purple', text: "Heading" },
                { color: 'cyan', text: "Anthesis" },
                { color: 'magenta', text: "Grain Filling" },
            ]}
            getPredictions={getPredictions}
            token={token}
            />
        ) : currentPage === 'active-fields' ? (
          <Fields token={token} viewType='active'/>
        ) : currentPage === 'harvested-fields' ? (
          <Fields token={token} viewType='harvested'/>
        ) : currentPage === 'requests' && (
          <Requests token={token}/>
        )
      )}

    </>
  );
};

export default Dashboard;
