import React, { useEffect, useState } from "react";
import "../styles/PhenologyData.css";
import * as turf from "@turf/turf";

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

// Function to calculate area from polygon coordinates using Turf.js
function calculateAreaFromLatLng(coords) {
  if (coords.length < 3) return 0;

  // Ensure the polygon is closed by adding the first point to the end
  const closedCoords = [...coords, coords[0]]; // Close the polygon

  // Convert the coordinates to a polygon object using Turf.js
  const polygon = turf.polygon([closedCoords]);

  // Calculate the area in square meters using Turf.js (returns area in square meters)
  const areaInSquareMeters = turf.area(polygon);

  // Convert square meters to acres (1 acre = 4046.86 square meters)
  return areaInSquareMeters / 4046.86;
}

// Function to calculate Day of Year (DOY)
function getDayOfYear(dateString) {
  const date = new Date(dateString);
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
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
  });

  const [acres, setAcres] = useState(0);
  const [dayOfYear, setDayOfYear] = useState(0);
  const [scheduled, setScheduled] = useState(0);
  const [phenStage, setPhenStage] = useState(null);

  useEffect(() => {
    // Simulating fetching data based on selectedField (or use actual API)
    setCropData((prevData) => ({
      ...prevData,
      cropName: selectedField?.name || prevData.cropName,
      plantationDate: selectedField?.plantation_date || prevData.plantationDate,
      coordinates: selectedField?.coordinates || prevData.coordinates,
      latestPhenologyStage: selectedField?.latest_phenology_stage || prevData.latestPhenologyStage,
      latestObservationDate: selectedField?.latest_observation_date || prevData.latestObservationDate,
      cropType: selectedField?.crop || prevData.cropType,
    }));

    const coords = parseLatLngString(cropData.coordinates);
    const area = calculateAreaFromLatLng(coords);
    setAcres(area);

    const doy = getDayOfYear(cropData.plantationDate);
    setDayOfYear(doy);

    setPhenStage("Grain Filling");  // For demonstration, can be dynamic
    setScheduled(0);  // Can be toggled as per the status
  }, [selectedField, cropData]);

  return (
    <div className="p-2">
      <h4 className="mb-4">Crop Information</h4>
      <div className="d-flex my-2 justify-content-center flex-column align-items-center">
        {/* <img className="img-fluid phen-stage-img" src="./media/chatbot.png" alt="Phenology stage" /> */}
        <h2 className="px-3">{cropData.latest_phenology_stage}</h2>
      </div>

      <div className="d-flex justify-content-center mb-3">
        <div className="w-50 text-center">
          <h5 className="fw-normal"><i>Crop Type</i></h5>
          <h5 className="fw-bold text-success">{cropData.cropType}</h5>
        </div>
        <div className="w-50 text-center">
          <h5 className="fw-normal"><i>Crop Name</i></h5>
          <h5 className="fw-bold text-success">{cropData.cropName}</h5>
        </div>
      </div>

      <div className="d-flex justify-content-center mb-3">
        <div className="w-50 text-center">
          <h5 className="fw-normal"><i>Day of Year</i></h5>
          <h5 className="fw-bold text-success">{dayOfYear}</h5>
        </div>
        <div className="w-50 text-center">
          <h5 className="fw-normal"><i>No. of Acres</i></h5>
          <h5 className="fw-bold text-success">{acres.toFixed(2)}</h5>
        </div>
      </div>

      <div className="d-flex justify-content-center mb-3">
        <div className="w-50 text-center">
          <h5 className="fw-normal"><i>Flight Status</i></h5>
          <h5 className="fw-bold text-success">{scheduled ? 'Scheduled' : 'On Request'}</h5>
        </div>
        <div className="w-50 text-center">
          <h5 className="fw-normal"><i>Latest Phenology Date</i></h5>
          <h5 className="fw-bold text-success">{cropData.latestPhenologyDate}</h5>
        </div>
      </div>

      <div className="d-flex justify-content-center mb-3">
        <div className="w-50 text-center">
          <h5 className="fw-normal"><i>Latest Observation Date</i></h5>
          <h5 className="fw-bold text-success">{cropData.latestObservationDate}</h5>
        </div>
      </div>
    </div>
  );
};

export default PhenologyData;
