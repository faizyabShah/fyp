import React, { useState, useEffect } from 'react';
import { IoIosRefresh } from 'react-icons/io';
import ReadOnlyDisplayMap from './ReadOnlyDisplayMap';
import "../styles/SatelliteViewer.css";

const SatelliteViewer = ({ selectedField, token }) => {
  const [satelliteData, setSatelliteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('NDVI'); // Default view
  const [error, setError] = useState(null);

  const viewOptions = [
    { id: 'preview', label: 'Enhanced Preview', legendTitle: 'True Color Enhanced' },
    { id: 'false_color', label: 'False Color', legendTitle: 'False Color Composite' },
    { id: 'NDVI', label: 'NDVI', legendTitle: 'Normalized Difference Vegetation Index' },
    { id: 'phenology', label: 'Phenology', legendTitle: 'Crop Growth Stage' }
  ];

  const fetchSatelliteData = async () => {
    if (!selectedField) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:5000/satellite/${selectedField.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSatelliteData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch satellite data');
        setSatelliteData(null);
      }
    } catch (error) {
      console.error('Error fetching satellite data:', error);
      setError('An error occurred while fetching satellite data');
      setSatelliteData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedField) {
      fetchSatelliteData();
    }
  }, [selectedField]);

  const renderLegend = () => {
    if (!activeView || !satelliteData) return null;
    
    const currentView = viewOptions.find(option => option.id === activeView);
    
    if (activeView === 'phenology') {
      const phenologyStages = [
        { name: 'Germination', color: '#FF0000' },
        { name: 'Tillering', color: '#FF8033' },
        { name: 'Jointing', color: '#FFFF00' },
        { name: 'Booting and Heading', color: '#66FF4D' },
        { name: 'Anthesis', color: '#0000FF' },
        { name: 'Grain Filling', color: '#FF00FF' },
        { name: 'Maturity', color: '#00FFFF' }
      ];
      
      return (
        <div className="legend-overlay">
          <h4 className="legend-header">{currentView.legendTitle}</h4>
          <div className="legend-content">
            {phenologyStages.map((stage, index) => (
              <div key={index} className="legend-item" style={{background: 'transparent'}}>
                <div className="legend-color" style={{ backgroundColor: stage.color }}></div>
                <span className="legend-item-title" style={{background: 'transparent'}}>{stage.name}</span>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (activeView === 'false_color') {
      const falseColorElements = [
        { name: 'Healthy Vegetation', color: '#FF0000', description: 'Appears bright red' },
        { name: 'Urban Areas', color: '#0000FF', description: 'Appear blue-gray' },
        { name: 'Soils/Bare Ground', color: '#8B4513', description: 'Appear brown to light brown' },
        { name: 'Water', color: '#000000', description: 'Appears dark blue to black' }
      ];
      
      return (
        <div className="legend-overlay">
          <h4 className="legend-header">{currentView.legendTitle}</h4>
          <p className="legend-subtitle">Near-infrared reflectance highlights plant health and moisture</p>
          <div className="legend-content">
            {falseColorElements.map((element, index) => (
              <div key={index} className="legend-item" style={{background: 'transparent'}}>
                <div className="legend-color" style={{ backgroundColor: element.color }}></div>
                <div className="legend-item-text" style={{background: 'transparent'}}>
                  <div className="legend-item-title" style={{background: 'transparent'}}>{element.name}</div>
                  <div className="legend-item-desc" style={{background: 'transparent'}}>{element.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (activeView === 'NDVI') {
      return (
        <div className="legend-overlay">
          <h4 className="legend-header">{currentView.legendTitle}</h4>
          <div className="ndvi-container">
            <div className="ndvi-vertical-gradient"></div>
            <div className="ndvi-labels">
              <span style={{background: 'transparent'}}>High Vigor</span>
              <span className="mt-auto" style={{background: 'transparent'}}>Low Vigor</span>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="legend-overlay">
          <h4 className="legend-header">{currentView.legendTitle}</h4>
          <p className="legend-subtitle">
            Natural color image with enhanced contrast and clarity
          </p>
        </div>
      );
    }
  };

  return (
    <div className="satellite-viewer-container">
      <div className="satellite-header d-flex justify-content-between align-items-center">
        <button 
          className="refresh-button"
          onClick={fetchSatelliteData}
          disabled={loading}
        >
          <IoIosRefresh className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="view-options-container">
        {viewOptions.map(option => (
          <button
            key={option.id}
            className={`view-option ${activeView === option.id ? 'active' : ''}`}
            onClick={() => setActiveView(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="satellite-map-container">
        {!loading && satelliteData ? (
          <>
            {/* Make sure legend is rendered BEFORE the map inner to ensure proper z-index stacking */}
            {renderLegend()}
            <div className="satellite-map-inner">
              <ReadOnlyDisplayMap 
                selectedField={selectedField} 
                satelliteData={satelliteData} 
                activeView={activeView} 
              />
            </div>
            <div className="last-updated">
              Last updated: {satelliteData.date}
            </div>
          </>
        ) : loading ? (
          <div className="loading-container">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="error-container">
            <p className="error-message">
              {error || "Satellite imagery is not yet available for this field."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SatelliteViewer;