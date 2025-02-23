import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const LeafletMap = ({ setCoordinates }) => {
    const [position, setPosition] = useState([51.505, -0.09]);  // Default position for map center

    const MapEvents = () => {
        useMapEvents({
            click(e) {
                const { lat, lng } = e.latlng;  // Get the latitude and longitude of the click
                setPosition([lat, lng]);         // Update the marker position
                setCoordinates({ lat, lng });    // Pass coordinates to the parent component
            },
        });

        return null;
    };

    return (
        <MapContainer center={position} zoom={13} style={{ width: '100%', height: '300px' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapEvents />
            <Marker position={position}>
                <Popup>Selected Coordinates: {position[0]}, {position[1]}</Popup>
            </Marker>
        </MapContainer>
    );
};

export default LeafletMap;
