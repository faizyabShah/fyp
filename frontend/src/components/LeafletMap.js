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

// Function to calculate the area of a polygon in square meters
const calculatePolygonArea = (latlngs) => {
  return L.GeometryUtil.geodesicArea(latlngs[0]);
};

const LeafletMap = ({ setCoordinates, setArea }) => {
  const [polygon, setPolygon] = useState(null);

  // Custom hook to add drawing functionality
  const MapInteraction = () => {
    const map = useMap();

    useEffect(() => {
      // Make sure GeometryUtil is available
      if (!L.GeometryUtil) {
        // Add Leaflet.GeometryUtil plugin if not already included
        L.GeometryUtil = {
          geodesicArea: function(latLngs) {
            let area = 0;
            let d2r = Math.PI / 180;
            let points = latLngs;
            
            for (let i = 0, len = points.length; i < len; i++) {
              let p1 = points[i];
              let p2 = points[(i + 1) % len];
              
              area += ((p2.lng - p1.lng) * d2r) * 
                     (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r));
            }
            area = area * 6378137.0 * 6378137.0 / 2.0;
            return Math.abs(area);
          }
        };
      }

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
        
        // Calculate area in square meters
        const areaSqMeters = calculatePolygonArea(latlngs);
        
        // Convert to hectares (1 hectare = 10,000 square meters)
        const areaHectares = areaSqMeters / 10000;
        
        
        setPolygon(latlngs);
        setCoordinates(latlngs);
        
        // Pass the area back to the parent component
        if (setArea) {
          setArea(areaHectares);
        }
      });

      // Also handle edit events to recalculate area
      map.on('draw:edited', (e) => {
        const layers = e.layers;
        layers.eachLayer((layer) => {
          const latlngs = layer.getLatLngs();
          
          // Recalculate area
          const areaSqMeters = calculatePolygonArea(latlngs);
          const areaHectares = areaSqMeters / 10000;
          
          
          setPolygon(latlngs);
          setCoordinates(latlngs);
          
          // Pass the updated area back to the parent component
          if (setArea) {
            setArea(areaHectares);
          }
        });
      });

      return () => {
        map.removeControl(drawControl);
      };
    }, [map]);

    return null;
  };

  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ maxHeight: '300px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <GeocoderControl />
      <MapInteraction />
    </MapContainer>
  );
};

export default LeafletMap;