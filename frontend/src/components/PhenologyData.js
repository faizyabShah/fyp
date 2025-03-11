import React, { useEffect, useState } from "react";
import { FaLeaf, FaMapMarkerAlt, FaCalendarAlt, FaRuler } from 'react-icons/fa';
import { PiFarmFill } from "react-icons/pi";
import { FaCalendarDay } from "react-icons/fa6";
import { RiPlantFill } from 'react-icons/ri';
import { GiWeight } from 'react-icons/gi'; // Added for yield icon
import "../styles/PhenologyData.css";

// Function to parse coordinates and calculate area using Turf.js
function parseLatLngString(str) {
  return str
    .replace(/LatLng\(/g, "")
    .split("),")
    .map((chunk) => {
      const cleaned = chunk.replace(/\)/g, "").trim();
      const [latStr, lngStr] = cleaned.split(",").map((s) => s.trim());
      return [parseFloat(latStr), parseFloat(lngStr)];
    });
}

function getDayOfYear(dateString) {
  const givenDate = new Date(dateString);
  const currentDate = new Date();

  // Optional: normalize both dates to midnight for a day-accurate difference
  givenDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);

  const oneDay = 1000 * 60 * 60 * 24;
  const diff = currentDate - givenDate;
  
  return Math.floor(diff / oneDay);
}

const PhenologyData = ({ selectedField, phenStage, yeeeld }) => {
  const [cropData, setCropData] = useState({
    cropType: "",
    cropName: "",
    coordinates: "",
    plantationDate: "",
    latestPhenologyStage: "",
    latestObservationDate: "",
    area: "",
  });

  const [dayOfYear, setDayOfYear] = useState(0);
  const [scheduled, setScheduled] = useState(0);
  const [totalProduction, setTotalProduction] = useState(0);

  useEffect(() => {
    if (!selectedField) return;
    const updatedData = {
      cropName: selectedField.name || "",
      plantationDate: selectedField.plantation_date || "",
      coordinates: selectedField.coordinates || "",
      cropType: selectedField.crop || "",
      latestPhenologyStage: selectedField.latest_phenology_stage || "",
      latestObservationDate: selectedField.latest_observation_date || "",
      area: selectedField.area || "",
    };
  
    setCropData(updatedData);
    const doy = getDayOfYear(updatedData.plantationDate);
    setDayOfYear(doy);
    setScheduled(0);
    
    // Calculate total production (yield * area)
    const yieldValue = yeeeld || 0;
    const areaValue = parseFloat(updatedData.area) || 0;
    setTotalProduction(yieldValue * areaValue);
  }, [selectedField, yeeeld]);
  
  // Function to get appropriate growth stage color and icon
  const getGrowthStageInfo = (stage) => {
    if (!stage) return { color: "#f0f0f0", icon: "🌱" };
    
    const stageMap = {
      "Germination": { color: "#a8e6cf", icon: "🌱" },
      "Tillering": { color: "#b8e0d2", icon: "🌿" },
      "Jointing": { color: "#d8e2dc", icon: "🥬" },
      "Booting/Heading": { color: "#eac4d5", icon: "🌾" },
      "Anthesis": { color: "#ffd3b6", icon: "🌼" },
      "Grain Filling": { color: "#fdffb6", icon: "🌽" },
      "Maturity": { color: "#caffbf", icon: "🌾" },
    };
    
    return stageMap[stage] || { color: "#f0f0f0", icon: "🌱" };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const stageInfo = getGrowthStageInfo(phenStage || cropData.latestPhenologyStage);
  const hasPhenStage = !!(phenStage || cropData.latestPhenologyStage);
  const hasYield = !!(yeeeld > 0);

  return (
    <div className="phenology-container">
      <div className="phenology-header">
        <h3>Crop Information</h3>
      </div>
      
      {/* Field Name */}
      <div className="field-name-container">
        <PiFarmFill className="field-icon" />
        <h2>{cropData.cropName || 'Unnamed Field'}</h2>
      </div>
      
      {/* Badges Container - will contain both phenology and yield badges side by side */}
      <div className={`badges-container ${(hasPhenStage && hasYield) ? 'two-badges' : ''}`}>
        {/* Phenology Stage Badge */}
        {hasPhenStage && (
          <div className="stage-badge-container">
            <div 
              className="stage-badge"
              style={{ backgroundColor: stageInfo.color }}
            >
              <span className="stage-icon">{stageInfo.icon}</span>
              <div className="stage-label">Current Growth Stage</div>
              <div className="stage-value">{phenStage || cropData.latestPhenologyStage}</div>
            </div>
          </div>
        )}

        {/* Yield Badge */}
        {hasYield && (
          <div className="yield-badge-container">
            <div className="yield-badge">
              <GiWeight className="yield-icon" />
              <div className="yield-details">
                <div className="yield-metric">
                  <span className="yield-label">Yield</span>
                  <span className="yield-value">{yeeeld ? `${yeeeld.toFixed(2)} t/ha` : "N/A"}</span>
                </div>
                <div className="yield-metric">
                  <span className="yield-label">Est. Total Production</span>
                  <span className="yield-value">{totalProduction ? `${totalProduction.toFixed(2)} tonnes` : "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details Cards */}
      <div className="info-grid">
        <div className="info-card">
          <RiPlantFill className="card-icon crop-icon" />
          <div>
            <div className="card-label">Crop Type</div>
            <div className="card-value">{cropData.cropType || 'Not specified'}</div>
          </div>
        </div>
        
        <div className="info-card">
          <FaRuler className="card-icon area-icon" />
          <div>
            <div className="card-label">Field Area</div>
            <div className="card-value">{cropData.area ? `${cropData.area} hectares` : '0 hectares'}</div>
          </div>
        </div>

        <div className="info-card">
          <FaCalendarAlt className="card-icon date-icon" />
          <div>
            <div className="card-label">Planted On</div>
            <div className="card-value">{formatDate(cropData.plantationDate)}</div>
          </div>
        </div>
        
        <div className="info-card">
          <FaCalendarDay className="card-icon day-icon" />
          <div>
            <div className="card-label">Growth Day</div>
            <div className="card-value">Day {dayOfYear}</div>
          </div>
        </div>
      </div>
      
      {/* Growth Progress Bar */}
      {dayOfYear > 0 && (
        <div className="growth-progress-container">
          <div className="progress-label-container">
            <span>Planted</span>
            <span>Harvest Ready</span>
          </div>
          <div className="progress-bar-background">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${Math.min(dayOfYear / 120 * 100, 100)}%` }}
            ></div>
          </div>
          <div className="progress-percentage">
            Estimated growth: {Math.min(Math.round(dayOfYear / 120 * 100), 100)}%
          </div>
        </div>
      )}
      
      {/* Last Observation */}
      {cropData.latestObservationDate && (
        <div className="last-observation">
          Last observation: {formatDate(cropData.latestObservationDate)}
        </div>
      )}
    </div>
  );
};

export default PhenologyData;