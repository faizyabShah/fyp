import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';  // Add this for styles

const LeafletMap = ({ setCoordinates }) => {
    const [polygon, setPolygon] = useState(null);  // Store the drawn polygon coordinates

    // This custom hook sets up the drawing controls on the map
    const MapInteraction = () => {
        const map = useMap();  // This hook gives us the map instance

        useEffect(() => {
            // Enable Leaflet Draw on the map
            const drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);

            const drawControl = new L.Control.Draw({
                edit: {
                    featureGroup: drawnItems,  // Allow editing of drawn shapes
                },
                draw: {
                    polygon: true,    // Enable drawing polygons
                    polyline: false,  // Disable polyline drawing
                    rectangle: false, // Disable rectangle drawing
                    circle: false,    // Disable circle drawing
                    marker: false,    // Disable marker drawing
                },
            });
            map.addControl(drawControl);  // Add drawing controls to the map

            // Event listener for when a polygon is drawn
            map.on('draw:created', (e) => {
                const layer = e.layer;
                drawnItems.addLayer(layer);  // Add the drawn polygon to the map
                const latlngs = layer.getLatLngs();  // Get the coordinates of the drawn polygon
                console.log(latlngs)
                setPolygon(latlngs);  // Save the polygon's coordinates in the state
                setCoordinates(latlngs);  // Pass the polygon's coordinates to the parent component
            });

            // Cleanup on component unmount
            return () => {
                map.removeControl(drawControl);  // Remove the drawing controls
            };
        }, [map]);

        return null;  // This component doesn't render anything, it just interacts with the map
    };

    return (
        <MapContainer
            center={[51.505, -0.09]}  // Set the initial position of the map
            zoom={13}                  // Set the initial zoom level
            style={{ width: '100%', height: '300px' }}  // Ensure the map has a height and width
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
            />
            <MapInteraction />  {/* This component will add drawing functionality */}
        </MapContainer>
    );
};

export default LeafletMap;
