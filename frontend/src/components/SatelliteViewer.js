import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IoIosRefresh } from 'react-icons/io';
import { FaCalendarAlt, FaMapMarkedAlt, FaLayerGroup } from 'react-icons/fa';
import ReadOnlyDisplayMap from './ReadOnlyDisplayMap';
import "../styles/SatelliteViewer.css";

const SatelliteViewer = ({ selectedField, token }) => {
  const [satelliteData, setSatelliteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('map_only'); // Default view is map_only
  const [error, setError] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [viewPickerOpen, setViewPickerOpen] = useState(false);
  const [viewChanging, setViewChanging] = useState(false);
  const [layerOpacity, setLayerOpacity] = useState(1.0);
  const [controlsOpen, setControlsOpen] = useState(true); // Default to open so controls are visible initially
  
  const dateButtonRef = useRef(null); // Reference for the date button element
  const viewButtonRef = useRef(null); // Reference for the view button element

  const viewOptions = [
    { id: 'map_only', label: 'Map Only', legendTitle: 'Satellite Base Map' },
    { id: 'preview', label: 'Enhanced Preview', legendTitle: 'True Color Enhanced' },
    { id: 'false_color', label: 'False Color', legendTitle: 'False Color Composite' },
    { id: 'NDVI', label: 'NDVI', legendTitle: 'Normalized Difference Vegetation Index' },
    { id: 'phenology', label: 'Phenology', legendTitle: 'Crop Growth Stage' },
    { id: 'yield', label: 'Yield Prediction', legendTitle: 'Predicted Yield (tonne/hectare)' }
  ];

  const fetchSatelliteData = useCallback(async (date = null) => {
    if (!selectedField) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let url = `/satellite/${selectedField.id}`;
      if (date) {
        url += `?date=${date}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSatelliteData(data);
        setAvailableDates(data.available_dates || []);
        setSelectedDate(data.date);
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
  }, [selectedField, token]);

  useEffect(() => {
    if (selectedField) {
      fetchSatelliteData();
    }
  }, [selectedField, fetchSatelliteData]);

  const handleViewChange = (newView) => {
    // Set a flag to indicate view is changing to prevent race conditions
    setViewChanging(true);
    
    // Use timeout to ensure clean transition between views
    setTimeout(() => {
      setActiveView(newView);
      setViewChanging(false);
    }, 50);
    
    setViewPickerOpen(false);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    fetchSatelliteData(date);
    setDatePickerOpen(false);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  // Function to update dropdown positions
  const updateDropdownPosition = useCallback((buttonRef, dropdownClass) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownElement = document.querySelector(`.${dropdownClass}`);
      if (dropdownElement) {
        dropdownElement.style.top = `${rect.bottom + 5}px`;
        dropdownElement.style.left = `${rect.left}px`;
        dropdownElement.style.width = `${Math.max(rect.width, 280)}px`; // Ensure minimum width
      }
    }
  }, []);

  // Update date picker position
  useEffect(() => {
    if (datePickerOpen) {
      // Immediate position calculation
      updateDropdownPosition(dateButtonRef, 'date-dropdown');
      
      const handleScrollOrResize = () => updateDropdownPosition(dateButtonRef, 'date-dropdown');
      window.addEventListener('scroll', handleScrollOrResize);
      window.addEventListener('resize', handleScrollOrResize);
      
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [datePickerOpen, updateDropdownPosition]);
  
  // Update view picker position
  useEffect(() => {
    if (viewPickerOpen) {
      // Immediate position calculation
      updateDropdownPosition(viewButtonRef, 'view-dropdown');
      
      const handleScrollOrResize = () => updateDropdownPosition(viewButtonRef, 'view-dropdown');
      window.addEventListener('scroll', handleScrollOrResize);
      window.addEventListener('resize', handleScrollOrResize);
      
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [viewPickerOpen, updateDropdownPosition]);
  
  // Handle outside clicks for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // For date picker
      if (datePickerOpen) {
        const dateDropdown = document.querySelector('.date-dropdown');
        if (dateButtonRef.current && 
            !dateButtonRef.current.contains(event.target) && 
            dateDropdown && !dateDropdown.contains(event.target)) {
          setDatePickerOpen(false);
        }
      }
      
      // For view picker
      if (viewPickerOpen) {
        const viewDropdown = document.querySelector('.view-dropdown');
        if (viewButtonRef.current && 
            !viewButtonRef.current.contains(event.target) && 
            viewDropdown && !viewDropdown.contains(event.target)) {
          setViewPickerOpen(false);
        }
      }
    };
    
    // Add event listener only if one of the dropdowns is open
    if (datePickerOpen || viewPickerOpen) {
      // Small delay to ensure the dropdown is rendered
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [datePickerOpen, viewPickerOpen]);
  
  // Render view picker dropdown
  const renderViewPicker = () => {
    const currentView = viewOptions.find(option => option.id === activeView);
    
    return (
      <div className="selector-container">
        <div 
          className="selector-button" 
          onClick={() => {
            const newState = !viewPickerOpen;
            // Close the other dropdown if open
            if (newState) setDatePickerOpen(false);
            setViewPickerOpen(newState);
          }}
          ref={viewButtonRef}
        >
          <FaLayerGroup className="icon" />
          <span>{currentView?.label || 'Select View'}</span>
        </div>
        
        {viewPickerOpen && (
          <div 
            className="dropdown-menu view-dropdown" 
            style={{
              position: 'fixed',
              zIndex: 1000,
            }}
          >
            <div className="dropdown-header">
              <h4>Select View Mode</h4>
            </div>
            <div className="dropdown-options-list">
              {viewOptions.map((option) => (
                <div 
                  key={option.id} 
                  className={`dropdown-option ${option.id === activeView ? 'active' : ''}`}
                  onClick={() => handleViewChange(option.id)}
                >
                  <div className="dropdown-option-dot"></div>
                  <span>{option.label}</span>
                  {option.id === activeView && <span className="current-indicator">Current</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render date picker dropdown
  const renderDatePicker = () => {
    if (!availableDates || availableDates.length === 0) return (
      <div className="selector-container">
        <div className="selector-button disabled">
          <FaCalendarAlt className="icon" />
          <span>No dates available</span>
        </div>
      </div>
    );
    
    return (
      <div className="selector-container">
        <div 
          className="selector-button" 
          onClick={() => {
            const newState = !datePickerOpen;
            // Close the other dropdown if open
            if (newState) setViewPickerOpen(false);
            setDatePickerOpen(newState);
          }}
          ref={dateButtonRef}
        >
          <FaCalendarAlt className="icon" />
          <span>{formatDate(selectedDate)}</span>
        </div>
        
        {datePickerOpen && (
          <div 
            className="dropdown-menu date-dropdown" 
            style={{
              position: 'fixed',
              zIndex: 1000,
            }}
          >
            <div className="dropdown-header">
              <h4>Available Imagery Dates</h4>
            </div>
            <div className="dropdown-options-list">
              {availableDates.map((date) => (
                <div 
                  key={date} 
                  className={`dropdown-option ${date === selectedDate ? 'active' : ''}`}
                  onClick={() => handleDateSelect(date)}
                >
                  <div className="dropdown-option-dot"></div>
                  <span>{formatDate(date)}</span>
                  {date === selectedDate && <span className="current-indicator">Current</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render opacity slider - now always visible
  const renderOpacityControl = () => {
    return (
      <div className="opacity-control-container">
        <label htmlFor="opacity-slider" className="opacity-label">
          Layer Opacity:
        </label>
        <div className="opacity-slider-container">
          <input
            id="opacity-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={layerOpacity}
            onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
            className="opacity-slider"
          />
          <span className="opacity-value">{Math.round(layerOpacity * 100)}%</span>
        </div>
      </div>
    );
  };

  const renderLegend = () => {
    if (!activeView || activeView === 'map_only') return null;
    
    if (!satelliteData) return null;
    
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
    } else if (activeView === 'preview') {
      return (
        <div className="legend-overlay">
          <h4 className="legend-header">{currentView.legendTitle}</h4>
          <p className="legend-subtitle">
            Natural color image with enhanced contrast and clarity
          </p>
        </div>
      );
    } else if (activeView === 'yield') {
      return (
        <div className="legend-overlay">
          <h4 className="legend-header">{currentView.legendTitle}</h4>
          <div className="yield-container">
            <div className="yield-vertical-gradient"></div>
            <div className="yield-labels">
              <span style={{background: 'transparent', color: 'white'}}>High Yield</span>
              <span className="mt-auto" style={{background: 'transparent', color: 'white'}}>Low Yield</span>
            </div>
          </div>
          <p className="legend-subtitle">
            Predicted crop yield (tonnes/hectare)
          </p>
        </div>
      );
    }
    
    return null;
  };
  
  // Toggle controls panel
  const toggleControls = () => {
    setControlsOpen(!controlsOpen);
  };

  return (
    <div className="satellite-viewer-container">
      {/* These buttons are outside of any collapsible area */}
      <div className="top-fixed-controls">
        <button 
          className="refresh-button"
          onClick={() => fetchSatelliteData(selectedDate)}
          disabled={loading || viewChanging}
        >
          <IoIosRefresh className={loading ? 'spin' : ''} /> Refresh
        </button>
        
        <button 
          className={`controls-toggle ${controlsOpen ? 'active' : ''}`}
          onClick={toggleControls}
        >
          {controlsOpen ? 'Hide Controls' : 'Show Controls'}
        </button>
      </div>
      
      {/* New single-row control panel */}
      <div className="satellite-controls-area" style={{ display: controlsOpen ? 'block' : 'none' }}>
        <div className="satellite-controls-panel">
          <div className="controls-row">
            <div className="control-third">
              <h4 className="control-label">View Mode</h4>
              {renderViewPicker()}
            </div>
            
            <div className="control-third">
              <h4 className="control-label">Image Date</h4>
              {renderDatePicker()}
            </div>
            
            <div className="control-third">
              <h4 className="control-label">Layer Settings</h4>
              {renderOpacityControl()}
            </div>
          </div>
        </div>
      </div>

      <div className="satellite-map-container">
        {!loading && (satelliteData || activeView === 'map_only') ? (
          <>
            <div className="satellite-map-inner">
              <ReadOnlyDisplayMap 
                selectedField={selectedField} 
                satelliteData={satelliteData} 
                activeView={activeView} 
                viewChanging={viewChanging}
                layerOpacity={layerOpacity}
              />
            </div>
            {/* Render legend after map inner to ensure it appears on top */}
            {renderLegend()}
            {satelliteData && activeView !== 'map_only' && (
              <div className="last-updated">
                Imagery date: {formatDate(satelliteData.date)}
              </div>
            )}
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