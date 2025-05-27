import React, { useState } from 'react';
import LeafletMap from './LeafletMap';
import ErrorPopup from './ErrorPopup';
import '../styles/AddFieldForm.css';

const AddFieldForm = ({ token, setUserFieldData, navigate, onSuccess }) => {
    const [coordinates, setCoordinates] = useState(null);
    const [area, setArea] = useState(null);
    const [crop, setCrop] = useState('');
    const [plantationDate, setPlantationDate] = useState('');
    const [location, setLocation] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState(null);

    const closeError = () => setError(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!coordinates) {
            setError('Please select Field coordinates on the map.');
            return;
        }

        const fieldData = { 
            coordinates: String(coordinates),
            name,
            crop, 
            plantation_date: plantationDate,
            area: area ? parseFloat(area.toFixed(2)) : null,
            location
        };

        try {
            const response = await fetch('/fields', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(fieldData),
            });

            if (response.ok) {
                const newField = await response.json();
                setUserFieldData(prevFields => [...prevFields, newField]);
                onSuccess(); // Call the onSuccess function passed as a prop
            } else {
                console.error('Failed to add field');
                alert('Error adding field!');
            }
        } catch (error) {
            console.error('Error adding field:', error);
            alert('Error adding field!');
        }
    };

    return (
        <div className="add-field-container">
            {error && (
                <ErrorPopup message={error} onClose={closeError} />
            )}
            
            <form onSubmit={handleSubmit} className="add-field-form">
                <h2>Add Crop</h2>

                <div className="form-content">
                    <div className="map-column">
                        <div className="form-group">
                            <label>Coordinates (Polygon):</label>
                            <div className="map-container">
                                <LeafletMap setCoordinates={setCoordinates} setArea={setArea} />
                            </div>
                            {area && (
                                <div className="area-display">
                                    <p>Field Area: {area.toFixed(2)} hectares</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="inputs-column">
                        <div className="form-group">
                            <label htmlFor="name">Name:</label>
                            <input 
                                type="text" 
                                id="name" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="crop">Crop:</label>
                            <input 
                                type="text" 
                                id="crop" 
                                value={crop} 
                                onChange={(e) => setCrop(e.target.value)} 
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="plantationDate">Plantation Date:</label>
                            <input 
                                type="date" 
                                id="plantationDate" 
                                value={plantationDate} 
                                onChange={(e) => setPlantationDate(e.target.value)} 
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="location">Location:</label>
                            <input 
                                type="text" 
                                id="location" 
                                value={location} 
                                onChange={(e) => setLocation(e.target.value)} 
                                required 
                            />
                        </div>
                        
                        
                        <button type="submit" className="primary-btn">Add Field</button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddFieldForm;