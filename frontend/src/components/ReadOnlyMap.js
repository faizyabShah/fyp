import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Custom hook to update map center and zoom
const ResetMapView = ({ bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds.length > 0) {
      const latLngBounds = bounds.map(bound => [
        [bound[0][0], bound[0][1]],
        [bound[1][0], bound[1][1]],
      ]);
      map.fitBounds(latLngBounds.flat());
    }
  }, [bounds, map]);

  return null;
};

const ReadOnlyMap = ({ fieldName }) => {
  const [bounds, setBounds] = useState([]);

  const coordinatesArray = {
    'Field 1': [
      { lat1: 33.67413061298404,  lon1: 73.12554562029183, lat2: 33.67160350659859, lon2: 73.13318814660003 },
      // { lat1: 33.67065690515361, lon1: 73.12911446922986, lat2: 33.67116200117063, lon2: 73.13117797898958 },
    ],
    'Field 2': [
      { lat1: -51.49, lon1: 0.08, lat2: -51.5, lon2: 0.06 },
      { lat1: -51.51, lon1: 0.1, lat2: -51.52, lon2: 0.09 },
    ],
  };

  useEffect(() => {
    const finalCoords = coordinatesArray[fieldName] || [];
    const calculatedBounds = finalCoords.map(coord => [
      [coord.lat1, coord.lon1],
      [coord.lat2, coord.lon2],
    ]);
    setBounds(calculatedBounds);
  }, [fieldName]);

  return (
    <MapContainer
      center={[0, 0]} // Initial placeholder center
      zoom={13} // Default zoom level
      scrollWheelZoom={false}
      style={{ height: '400px', width: '100%' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {/* Dynamically adjust view when bounds change */}
      <ResetMapView bounds={bounds} />
      {/* Render bounding boxes */}
      {bounds.map((bound, index) => (
        <Rectangle key={index} bounds={bound} pathOptions={{ color: 'blue' }} />
      ))}
    </MapContainer>
  );
};

export default ReadOnlyMap;
