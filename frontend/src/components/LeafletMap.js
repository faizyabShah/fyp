import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import 'leaflet-control-geocoder';

const GeocoderControl = () => {
  const map = useMap();

  useEffect(() => {
    if (!L.Control.Geocoder) {
      console.error('Leaflet Control Geocoder not found.');
      return;
    }

    // Create the geocoder control with desired options
    const geocoder = L.Control.geocoder({
      defaultMarkGeocode: false,  // We'll handle the marker manually
    })
      .on('markgeocode', function (e) {
        const center = e.geocode.center;
        const targetZoom = 8; // Desired zoom level if current zoom is less than this
        const currentZoom = map.getZoom();

        if (currentZoom < targetZoom) {
          map.setView(center, targetZoom);
        } else {
          map.panTo(center);
        }

        // Optionally, add a marker at the found location
        L.marker(center).addTo(map);
      })
      .addTo(map);

    return () => {
      map.removeControl(geocoder);
    };
  }, [map]);

  return null;
};

const LeafletMap = ({ setCoordinates }) => {
  const [polygon, setPolygon] = useState(null);

  // Custom hook to add drawing functionality
  const MapInteraction = () => {
    const map = useMap();

    useEffect(() => {
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      const drawControl = new L.Control.Draw({
        edit: {
          featureGroup: drawnItems,
        },
        draw: {
          polygon: true,
          polyline: false,
          rectangle: false,
          circle: false,
          marker: false,
        },
      });
      map.addControl(drawControl);

      map.on('draw:created', (e) => {
        const layer = e.layer;
        drawnItems.addLayer(layer);
        const latlngs = layer.getLatLngs();
        console.log(latlngs);
        setPolygon(latlngs);
        setCoordinates(latlngs);
      });

      return () => {
        map.removeControl(drawControl);
      };
    }, [map]);

    return null;
  };

  return (
    <MapContainer
      center={[51.505, -0.09]}
      zoom={13}
      style={{ width: '100%', height: '300px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
      />
      {/* Geocoder control with conditional zoom */}
      <GeocoderControl />
      {/* Drawing functionality */}
      <MapInteraction />
    </MapContainer>
  );
};

export default LeafletMap;
