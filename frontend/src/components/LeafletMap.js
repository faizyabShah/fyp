import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';

// This approach uses a direct DOM manipulation strategy rather than 
// relying on React-Leaflet for Leaflet Draw integration

const LeafletMap = ({ setCoordinates, setArea }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawControlRef = useRef(null);
  const drawnItemsRef = useRef(null);
  
  useEffect(() => {
    // Dynamic import of leaflet and plugins
    const loadLeaflet = async () => {
      try {
        // First import Leaflet
        const L = await import('leaflet');
        
        // Then add it to window so plugins can find it
        window.L = L.default || L;
        
        // Then import the plugins
        await import('leaflet-draw');
        await import('leaflet-control-geocoder');
        
        // Check if everything is available
        if (!window.L.Control.Draw) {
          console.error('Leaflet Draw not found after loading');
          
          // Try loading from CDN as fallback
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js';
          script.onload = initializeMap;
          document.head.appendChild(script);
        } else {
          // Initialize map if all plugins are available
          initializeMap();
        }
      } catch (error) {
        console.error('Failed to load Leaflet or plugins:', error);
      }
    };
    
    // Initialize the map and plugins
    const initializeMap = () => {
      const L = window.L;
      
      // Only initialize if container exists and map doesn't
      if (mapContainerRef.current && !mapInstanceRef.current) {
        // Create map instance
        mapInstanceRef.current = L.map(mapContainerRef.current).setView([20, 0], 2);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstanceRef.current);
        
        // Setup GeometryUtil if not available
        if (!L.GeometryUtil) {
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
        
        // Initialize FeatureGroup for drawn items
        drawnItemsRef.current = new L.FeatureGroup();
        mapInstanceRef.current.addLayer(drawnItemsRef.current);
        
        // Add geocoder
        if (L.Control.Geocoder) {
          const geocoder = L.Control.geocoder({
            defaultMarkGeocode: false
          })
            .on('markgeocode', function(e) {
              const center = e.geocode.center;
              const targetZoom = 8;
              const currentZoom = mapInstanceRef.current.getZoom();
              
              if (currentZoom < targetZoom) {
                mapInstanceRef.current.setView(center, targetZoom);
              } else {
                mapInstanceRef.current.panTo(center);
              }
              
              L.marker(center).addTo(mapInstanceRef.current);
            })
            .addTo(mapInstanceRef.current);
        }
        
        // Add draw control
        try {
          if (L.Control.Draw) {
            drawControlRef.current = new L.Control.Draw({
              edit: {
                featureGroup: drawnItemsRef.current
              },
              draw: {
                polygon: true,
                polyline: false,
                rectangle: false,
                circle: false,
                marker: false
              }
            });
            
            mapInstanceRef.current.addControl(drawControlRef.current);
            
            // Add event handlers
            mapInstanceRef.current.on('draw:created', function(e) {
              const layer = e.layer;
              drawnItemsRef.current.addLayer(layer);
              const latlngs = layer.getLatLngs();
              
              // Calculate area
              const areaSqMeters = L.GeometryUtil.geodesicArea(latlngs[0]);
              const areaHectares = areaSqMeters / 10000;
              
              if (setCoordinates) setCoordinates(latlngs);
              if (setArea) setArea(areaHectares);
            });
            
            mapInstanceRef.current.on('draw:edited', function(e) {
              const layers = e.layers;
              layers.eachLayer(function(layer) {
                const latlngs = layer.getLatLngs();
                
                // Recalculate area
                const areaSqMeters = L.GeometryUtil.geodesicArea(latlngs[0]);
                const areaHectares = areaSqMeters / 10000;
                
                if (setCoordinates) setCoordinates(latlngs);
                if (setArea) setArea(areaHectares);
              });
            });
            
            console.log('Draw control initialized successfully');
          } else {
            console.error('L.Control.Draw is not available');
          }
        } catch (error) {
          console.error('Error initializing draw control:', error);
        }
      }
    };
    
    // Start the loading process
    loadLeaflet();
    
    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [setCoordinates, setArea]);
  
  return (
    <div 
      ref={mapContainerRef} 
      style={{ height: '300px', width: '100%', maxHeight: '300px' }}
    />
  );
};

export default LeafletMap;