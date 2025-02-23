import React, { useState } from 'react';
import LeafletMap from './LeafletMap';  // Import LeafletMap component

const AddFieldForm = ({ token, setUserFieldData, navigate }) => {
    const [coordinates, setCoordinates] = useState(null);  // Store coordinates
    const [crop, setCrop] = useState('');
    const [plantationDate, setPlantationDate] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!coordinates) {
            alert("Please select coordinates on the map.");
            return;
        }

        const fieldData = { 
            coordinates: `${coordinates.lat},${coordinates.lng}`,
            crop, 
            plantation_date: plantationDate 
        };

        try {
            const response = await fetch('http://localhost:5000/fields', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(fieldData),
            });

            if (response.ok) {
                const newField = await response.json();
                setUserFieldData(prevFields => [...prevFields, newField]);  // Assuming the API returns the new field data
                alert('Field added successfully!');
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
        <form onSubmit={handleSubmit}>
            <div>
                <label htmlFor="coordinates">Coordinates:</label>
                {/* Embed the LeafletMap component here */}
                <LeafletMap setCoordinates={setCoordinates} />
            </div>
            <div>
                <label htmlFor="crop">Crop:</label>
                <input 
                    type="text" 
                    id="crop" 
                    value={crop} 
                    onChange={(e) => setCrop(e.target.value)} 
                    required 
                />
            </div>
            <div>
                <label htmlFor="plantation_date">Plantation Date:</label>
                <input 
                    type="date" 
                    id="plantation_date" 
                    value={plantationDate} 
                    onChange={(e) => setPlantationDate(e.target.value)} 
                    required 
                />
            </div>
            <button type="submit">Add Field</button>
        </form>
    );
};

export default AddFieldForm;
