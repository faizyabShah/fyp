import React, { useEffect, useState } from "react";
import "../styles/PhenologyData.css";
import { FaEdit, FaCheck, FaLeaf, FaMapMarkerAlt, FaCalendarAlt, FaRuler } from 'react-icons/fa';
import { PiFarmFill } from "react-icons/pi";
import { FaCalendarDay } from "react-icons/fa6";
import { RiPlantFill } from 'react-icons/ri';

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


const PhenologyData = ({ selectedField }) => {
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
  const [phenStage, setPhenStage] = useState(null);

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
  
    const coords = parseLatLngString(updatedData.coordinates);

  
    const doy = getDayOfYear(updatedData.plantationDate);
    setDayOfYear(doy);
  
    setPhenStage("Grain Filling");
    setScheduled(0);
  }, [selectedField]);
  

  return (
    <div className="p-2">
      <h4 className="mb-4">Crop Information</h4>
      <div className="d-flex my-2 justify-content-center flex-column align-items-center">
        {/* <img className="img-fluid phen-stage-img" src="./media/chatbot.png" alt="Phenology stage" /> */}
        <h2 className="px-3">{cropData.latest_phenology_stage}</h2>
      </div>

      <div className="d-flex justify-content-center mb-3">
        <div className="field-info">
          <div className="info-item">
            <PiFarmFill className="icon-big" />
            <span className="headddd">{cropData.cropName || 'Not specified'}</span>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-center mb-3">
        <div className="field-info">
          <div className="info-item">
            <FaRuler className="icon" />
            <span>{cropData.area || '0'} hectares</span>
          </div>
        </div>
        <div className="field-info">
            <div className="info-item">
            <RiPlantFill className="icon" />
            <span>{cropData.cropType || 'Not specified'}</span>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-center mb-3">
      <div className="field-info">
            <div className="info-item">
            <FaCalendarDay  className="icon" />
            <span>Day of Year {dayOfYear}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhenologyData;
