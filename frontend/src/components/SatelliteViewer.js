import React, { useState, useEffect } from 'react';
import { IoIosRefresh } from 'react-icons/io';
import "../styles/SatelliteViewer.css";

const SatelliteViewer = ({ selectedField, token }) => {
  const [satelliteData, setSatelliteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('preview'); // Default view
  const [error, setError] = useState(null);

  const viewOptions = [
    { id: 'preview', label: 'Enhanced Preview', legendTitle: 'True Color Enhanced' },
    { id: 'false_color', label: 'False Color', legendTitle: 'False Color Composite' },
    { id: 'NDVI', label: 'NDVI', legendTitle: 'Normalized Difference Vegetation Index' },
    { id: 'phenolog', label: 'Phenology', legendTitle: 'Crop Growth Stage' }
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

  const getImagePath = () => {
    if (!satelliteData) return null;
    
    const { data_dir, date } = satelliteData;
    
    switch (activeView) {
      case 'preview':
        return `./media/${data_dir}/${date}_preview_enhanced.png`;
      case 'false_color':
        return `./media/${data_dir}/${date}_false_color.png`;
      case 'NDVI':
        return `./media/${data_dir}/${date}_NDVI.png`;
      case 'phenolog':
        return `./media/${data_dir}/phenology_visualization_${date}.png`;
      default:
        return `./media/${data_dir}/${date}_preview_enhanced.png`;
    }
  };

  const renderSideLegend = () => {
    if (!activeView || !satelliteData) return null;
    
    const currentView = viewOptions.find(option => option.id === activeView);
    
    if (activeView === 'phenolog') {
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
        <div className="side-legend-container">
          <h5 className="mb-3">{currentView.legendTitle}</h5>
          <div className="d-flex flex-column">
            {phenologyStages.map((stage, index) => (
              <div key={index} className="d-flex align-items-center mb-3">
                <div className="legend-color" style={{ backgroundColor: stage.color }}></div>
                <span className="ms-2">{stage.name}</span>
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
        <div className="side-legend-container">
          <h5 className="mb-2">{currentView.legendTitle}</h5>
          <p className="text-muted mb-3">Near-infrared reflectance highlights plant health and moisture</p>
          <div className="false-color-legend">
            {falseColorElements.map((element, index) => (
              <div key={index} className="d-flex align-items-center mb-3">
                <div className="legend-color" style={{ backgroundColor: element.color }}></div>
                <div className="ms-2">
                  <strong>{element.name}</strong>
                  <div className="small text-muted">{element.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (activeView === 'NDVI') {
      return (
        <div className="side-legend-container">
          <h5 className="mb-3">{currentView.legendTitle}</h5>
          <div className="ndvi-container">
            <div className="ndvi-vertical-gradient"></div>
            <div className="ndvi-labels">
              <span>High Vigor</span>
              <span className="mt-auto">Low Vigor</span>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="side-legend-container">
          <h5 className="mb-2">{currentView.legendTitle}</h5>
          <p className="text-muted mb-0">
            Natural color image with enhanced contrast and clarity
          </p>
        </div>
      );
    }
  };

  return (
    <div className="box-cont p-3">
      <div className="satellite-header d-flex justify-content-between align-items-center mb-3">
        <button 
          className="btn btn-sm btn-outline-secondary"
          onClick={fetchSatelliteData}
          disabled={loading}
        >
          <IoIosRefresh className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="satellite-toggle-container mb-3">
        <div className="button-groupp btn-group">
          {viewOptions.map(option => (
            <button
              key={option.id}
              className={`btn ${activeView === option.id ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveView(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!loading && satelliteData ? (
        <div className="satellite-content-wrapper">
          <div className="satellite-content-main">
            <div className="satellite-image-container">
              <img 
                src={getImagePath()} 
                alt={`Satellite ${activeView} view`} 
                className="img-fluid satellite-image"
              />
            </div>
          </div>
          <div className="satellite-content-side">
            {renderSideLegend()}
            <div className="text-end mt-2">
              <small className="text-muted">
                Last updated: {satelliteData.date}
              </small>
            </div>
          </div>
        </div>
      ) : (
        <div className="satellite-content">
          {loading ? (
            <div className="d-flex justify-content-center align-items-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="text-center p-5">
              <p className="text-grey mb-0">
                {error || "Satellite imagery is not yet available for this field."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SatelliteViewer;