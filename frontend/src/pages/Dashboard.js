// create a dashboard that has a navbar with attribute fixed set to be true, it should display a field image in the center, on the right should be the number of plots, and below should be a button to get analytics
import React from 'react';
import './Dashboard.css';
import Navbar from '../components/Navbar';
import field from '../media/field.png';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Authcontext';
import { useState } from 'react';
import masked from '../media/field_masked.png'
import TextDisplay from '../components/TextDisplay';

const Dashboard = () => {
    const { isAuthenticated, logout, token } = useAuth();
    const [suggestion, setSuggestion] = useState('');
    const [isToggled, setIsToggled] = useState(false);
    const navigate = useNavigate();

    if (!isAuthenticated || token == null) {
        navigate('/signup'); // Redirect to signup if not authenticated
        return null;
    }

    // decode current token
    const payload = token.split('.')[1];
    const data = JSON.parse(atob(payload));
    console.log(data);
    // convert data.coordinates into an array



    const handleToggle = () => {
        setIsToggled(!isToggled); // Toggle the state
    };

    const handleAI = async () => {
        // send request to backend for ai suggestions
        try {
            const response = await fetch('http://localhost:5000/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text: "My wheat crop is currently in germination and tillering stage. Tell me what should be done in these stages for spring wheat for better crop health and more yeild. Also tell me what are some of the dangers (IF THERE ARE ANY) in this stage of the crop and what I should do about it? Give a very brief and precise answer that a farmer should understand." }),
            });

            if (response.ok) {
                const data = await response.json();
                setSuggestion(data.response);
            } else {
                const errorData = await response.json();
                console.error('AI failed:', errorData);
            }
        } catch (error) {
            console.error('Error:', error);
        }


    }

    return (
        <>
        <Navbar fixed={false} dashboard={true} token = {data}/>        
        <div className="dashboard" id="Dashboard">
            <h1>Your Field</h1>
            <div className='remaining'>
                <img src={ isToggled ? masked : field} alt="field" className="field"></img>
                <div className="metadata">
                <div className="legend">
                        <div className="legend-item">
                            <div className="stage pre-germination"></div>
                            <span>Pre-germination</span>
                        </div>
                        <div className="legend-item">
                            <div className="stage germination"></div>
                            <span>Germination</span>
                        </div>
                        <div className="legend-item">
                            <div className="stage tillering"></div>
                            <span>Tillering</span>
                        </div>
                        <div className="legend-item">
                            <div className="stage stem-elongation"></div>
                            <span>Stem Elongation</span>
                        </div>
                        <div className="legend-item">
                            <div className="stage heading"></div>
                            <span>Heading</span>
                        </div>
                        <div className="legend-item">
                            <div className="stage flowering"></div>
                            <span>Flowering</span>
                        </div>
                        <div className="legend-item">
                            <div className="stage filling"></div>
                            <span>Filling</span>
                        </div>
                        <div className="legend-item">
                            <div className="stage maturity"></div>
                            <span>Maturity</span>
                        </div>
                    </div>
                <div className="toggle">
                        {/* Toggle Switch */}
                        <label>Mask</label>
                        <label className="switch">
                            <input 
                                type="checkbox" 
                                checked={isToggled} 
                                onChange={handleToggle}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                    <div className="plots">
                        <h2>Number of Plots</h2>
                        <p>{ data.plots }</p>
                    </div>
            <button className="analytics" onClick={handleAI}>Get AI Suggestions</button>
            <div className="suggestion">
                    <TextDisplay text={suggestion} />
                    </div>

                </div>
                
            </div>
        </div>
        </>
    );
}

export default Dashboard;
