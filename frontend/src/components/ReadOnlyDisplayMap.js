import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Polygon, useMap, Pane } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import proj4 from 'proj4';

const wgs84ToUTM = proj4('EPSG:4326', 'EPSG:32643');


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

// This component automatically fits the view to the polygon coords
const FitPolygonBounds = ({ coordinates }) => {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds);
    }
  }, [coordinates, map]);

  return null;
};

// This component enables/disables scroll wheel zoom on hover
const HoverScrollEnable = () => {
  const map = useMap();

  useEffect(() => {
    function handleMouseEnter() {
      map.scrollWheelZoom.enable();
    }
    function handleMouseLeave() {
      map.scrollWheelZoom.disable();
    }

    const container = map.getContainer();
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [map]);

  return null;
};

// Helper function to convert Leaflet coordinates to GeoJSON format
const createGeoJSONPolygon = (coords) => {
  if (!coords || coords.length === 0) return null;
  
  // Make sure polygon is closed
  const closedCoords = [...coords];
  if (coords[0][0] !== coords[coords.length - 1][0] || 
      coords[0][1] !== coords[coords.length - 1][1]) {
    closedCoords.push(coords[0]);
  }
  
  // Create GeoJSON polygon with [lng, lat] ordering
  return {
    type: "Polygon",
    coordinates: [closedCoords.map(point => [point[1], point[0]])]
  };
};

// Component to display hover information
// Modified HoverInfo component to properly display NDVI and phenology values
const HoverInfo = ({ map, ndviData, phenologyData, polygonCoords }) => {
  const [infoControl, setInfoControl] = useState(null);
  const [ndviRaster, setNdviRaster] = useState(null);
  const [phenologyRaster, setPhenologyRaster] = useState(null);
  
  // Create info control
  useEffect(() => {
    if (!infoControl && map) {
      const control = L.control({ position: 'bottomright' });
      
      control.onAdd = () => {
        const div = L.DomUtil.create('div', 'hover-info');
        div.style.background = 'rgba(255, 255, 255, 0.9)';
        div.style.padding = '6px 8px';
        div.style.border = '1px solid #ccc';
        div.style.borderRadius = '4px';
        div.style.fontFamily = 'Arial, sans-serif';
        div.style.fontSize = '12px';
        div.style.display = 'none'; // Initially hidden
        div.innerHTML = 'Hover over a point';
        return div;
      };
      
      control.addTo(map);
      setInfoControl(control);
    }
    
    return () => {
      if (infoControl) {
        infoControl.remove();
      }
    };
  }, [map, infoControl]);
  
  // Load and process raster data separately from display layers
  useEffect(() => {
    const loadRasterData = async () => {
      try {
        // Process NDVI data
        if (ndviData) {
          const binaryString = atob(ndviData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const ndviArrayBuffer = bytes.buffer.slice(0, bytes.length);
          
          // Parse the georaster
          const ndviGeoRaster = await parseGeoraster(ndviArrayBuffer);
          console.log("YAYYYYYYY")
          console.log(ndviGeoRaster.projection);  // Log the projection info to check

          setNdviRaster(ndviGeoRaster);
        }
        
        // Process phenology data
        if (phenologyData) {
          const binaryString = atob(phenologyData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const phenologyArrayBuffer = bytes.buffer.slice(0, bytes.length);
          
          // Parse the georaster
          const phenologyGeoRaster = await parseGeoraster(phenologyArrayBuffer);
          setPhenologyRaster(phenologyGeoRaster);
        }
      } catch (error) {
        console.error("Error loading raster data:", error);
      }
    };
    
    loadRasterData();
  }, [ndviData, phenologyData]);
  
  // Set up mousemove event to display values
  useEffect(() => {
    if (!map || !infoControl || !polygonCoords || polygonCoords.length === 0) return;
    
    // Convert polygon coordinates to Leaflet polygon for point-in-polygon check
    const polygon = L.polygon(polygonCoords);
    
    const handleMouseMove = (e) => {
      const { lat, lng } = e.latlng;
      
      // Check if point is inside polygon
      if (polygon.getBounds().contains(e.latlng) && pointInPolygon([lat, lng], polygonCoords)) {
        const infoDiv = infoControl.getContainer();
        
        let ndviValue = "N/A";
        let phenologyValue = "N/A";
        let phenologyStage = "N/A";
        
        // Get raster values directly from the raster data
        const updateDisplay = () => {
          infoDiv.style.display = 'block';
          infoDiv.innerHTML = `
            <strong>Position:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}<br>
            <strong>NDVI:</strong> ${ndviValue}<br>
            <strong>Phenology:</strong> ${phenologyValue} (${phenologyStage})
          `;
        };
        
        // Initial display
        updateDisplay();
        
        // Get NDVI value if raster is available
        if (ndviRaster) {
          try {
            // Find the pixel value at the current lat/lng
            const valueAtPoint = getValueFromRaster(ndviRaster, lat, lng);
            
            if (valueAtPoint !== null && valueAtPoint !== ndviRaster.noDataValue) {
              ndviValue = valueAtPoint.toFixed(2);
              updateDisplay();
            }
          } catch (error) {
            console.warn("Error getting NDVI value:", error);
          }
        }
        
        // Get phenology value if raster is available
        if (phenologyRaster) {
          try {
            // Find the pixel value at the current lat/lng
            const valueAtPoint = getValueFromRaster(phenologyRaster, lat, lng);
            
            if (valueAtPoint !== null && valueAtPoint !== phenologyRaster.noDataValue) {
              phenologyValue = valueAtPoint.toFixed(1);
              
              // Map phenology value to stage name
              const stages = [
                "Germination",
                "Tillering",
                "Jointing",
                "Booting and Heading",
                "Anthesis",
                "Grain Filling",
                "Maturity"
              ];
              
              const index = Math.max(0, Math.min(6, Math.floor(valueAtPoint)));
              phenologyStage = stages[index];
              
              updateDisplay();
            }
          } catch (error) {
            console.warn("Error getting phenology value:", error);
          }
        }
      } else {
        // Hide info when outside polygon
        infoControl.getContainer().style.display = 'none';
      }
    };
    
    // Add event listener to map
    map.on('mousemove', handleMouseMove);
    
    return () => {
      map.off('mousemove', handleMouseMove);
    };
  }, [map, infoControl, polygonCoords, ndviRaster, phenologyRaster]);
  
  return null;
};

// Helper function to get a value from a GeoRaster at a specific lat/lng
// Modified getValueFromRaster function with proper coordinate transformation
function getValueFromRaster(raster, lat, lng) {
  if (!raster) return null;

  // Convert lat/lng (WGS84) to UTM (EPSG:32643)
  const [x, y] = proj4('EPSG:4326', 'EPSG:32643', [lng, lat]);

  // Now, calculate pixel indices in the UTM coordinate system
  const xIndex = Math.floor((x - raster.xmin) / raster.pixelWidth);
  const yIndex = Math.floor((raster.ymax - y) / raster.pixelHeight);

  // Ensure valid pixel indices are within the raster bounds
  if (xIndex >= 0 && xIndex < raster.width && yIndex >= 0 && yIndex < raster.height) {
    // Retrieve the pixel value (assuming single-band raster)
    const value = raster.values[0][yIndex][xIndex];
    return value;
  }

  return null;
}

// Helper function to check if a point is inside a polygon
function pointInPolygon(point, polygon) {
  // Ray casting algorithm
  let inside = false;
  const x = point[0], y = point[1];
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

// Modified GeoTIFFLayer component to use built-in mask functionality
const GeoTIFFLayer = ({ base64Data, activeView, polygonCoords }) => {
  const map = useMap();
  const [layer, setLayer] = useState(null);
  
  useEffect(() => {
    // Cleanup function to remove layer when component unmounts or data changes
    return () => {
      if (layer) {
        map.removeLayer(layer);
      }
    };
  }, [map, layer, base64Data, activeView, polygonCoords]);
  
  useEffect(() => {
    if (!base64Data || !polygonCoords || polygonCoords.length === 0) {
      return;
    }
    
    const loadGeoTIFF = async () => {
      try {
        // Remove previous layer if it exists
        if (layer) {
          map.removeLayer(layer);
        }
        
        // Convert base64 to array buffer
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer.slice(0, bytes.length);
        
        // Parse the georaster
        const georaster = await parseGeoraster(arrayBuffer);
        
        // Create GeoJSON polygon for masking
        const geoJsonPolygon = createGeoJSONPolygon(polygonCoords);
        
        // Set up color functions based on view type
        let pixelValuesToColorFn;
        
        if (activeView === 'NDVI') {
          pixelValuesToColorFn = values => {
            if (values[0] === georaster.noDataValue) return null;
            if (values[0] < -0.2) return '#960000';
            if (values[0] < 0) return '#dc1414';
            if (values[0] < 0.2) return '#ffb432';
            if (values[0] < 0.4) return '#f0f032';
            if (values[0] < 0.6) return '#96f032';
            return '#00b400';
          };
        } else if (activeView === 'phenology') {
          pixelValuesToColorFn = values => {
            if (values[0] === georaster.noDataValue) return null;
            
            const stages = [
              '#ff0000',   // Germination
              '#ff8033',   // Tillering
              '#ffff00',   // Jointing
              '#66ff4d',   // Booting and Heading
              '#0000ff',   // Anthesis
              '#ff00ff',   // Grain Filling
              '#00ffff'    // Maturity
            ];
            
            // Map value to stage index (assuming values 0-6)
            const index = Math.max(0, Math.min(6, Math.floor(values[0])));
            return stages[index];
          };
        } else { // preview or false_color
          pixelValuesToColorFn = values => {
            // Handle single-band data
            if (values.length === 1) {
              if (values[0] === georaster.noDataValue) return null;
              const pixelValue = Math.max(0, Math.min(1, values[0]));
              const rgbValue = Math.round(pixelValue * 255);
              return `rgb(${rgbValue}, ${rgbValue}, ${rgbValue})`;
            } 
            // Handle RGB data (3 bands)
            else if (values.length >= 3) {
              if (values[0] === georaster.noDataValue) return null;
              const r = Math.round(Math.max(0, Math.min(1, values[0])) * 255);
              const g = Math.round(Math.max(0, Math.min(1, values[1])) * 255);
              const b = Math.round(Math.max(0, Math.min(1, values[2])) * 255);
              return `rgb(${r}, ${g}, ${b})`;
            }
            return 'rgb(128, 128, 128)';
          };
        }
        
        // Create GeoRaster layer with options
        const options = {
          georaster: georaster,
          opacity: 1,
          resolution: 256,
          pixelValuesToColorFn: pixelValuesToColorFn,
          resampleMethod: 'nearest',
          mask: geoJsonPolygon,
          mask_strategy: 'outside',
          debugLevel: 0
        };
        
        const newLayer = new GeoRasterLayer(options);
        newLayer.addTo(map);
        setLayer(newLayer);
        
      } catch (error) {
        console.error('Error loading GeoTIFF from base64:', error);
      }
    };
    
    loadGeoTIFF();
  }, [map, base64Data, activeView, polygonCoords, layer]);
  
  return null;
};

// MapControls component to get access to the map object for HoverInfo
const MapControls = ({ ndviData, phenologyData, polygonCoords }) => {
  const map = useMap();
  
  return (
    <>
      <HoverScrollEnable />
      {polygonCoords.length > 0 && (
        <FitPolygonBounds coordinates={polygonCoords} />
      )}
      <HoverInfo 
        map={map} 
        ndviData={ndviData} 
        phenologyData={phenologyData} 
        polygonCoords={polygonCoords} 
      />
    </>
  );
};

const ReadOnlyDisplayMap = ({ selectedField, satelliteData, activeView }) => {
  const [polygonCoords, setPolygonCoords] = useState([]);
  const [geoTiffData, setGeoTiffData] = useState(null);
  const [ndviData, setNdviData] = useState(null);
  const [phenologyData, setPhenologyData] = useState(null);

  useEffect(() => {
    if (selectedField?.coordinates) {
      setPolygonCoords(parseLatLngString(selectedField.coordinates));
    } else {
      setPolygonCoords([]);
    }
  }, [selectedField]);

  useEffect(() => {
    if (!satelliteData || !satelliteData.files) {
      setGeoTiffData(null);
      setNdviData(null);
      setPhenologyData(null);
      return;
    }
    
    // Always load NDVI and phenology data for hover info, regardless of current view
    if (satelliteData.files.ndvi) {
      console.log("NDVI data available for hover info");
      setNdviData(satelliteData.files.ndvi);
    } else {
      console.log("No NDVI data available");
    }
    
    if (satelliteData.files.phenology) {
      console.log("Phenology data available for hover info");
      setPhenologyData(satelliteData.files.phenology);
    } else {
      console.log("No phenology data available");
    }
    
    // Map activeView to the corresponding file type in the backend response
    let fileType;
    switch (activeView) {
      case 'preview':
        fileType = 'preview';
        break;
      case 'false_color':
        fileType = 'false_color';
        break;
      case 'NDVI':
        fileType = 'ndvi';
        break;
      case 'phenology':
        fileType = 'phenology';
        break;
      default:
        fileType = 'preview';
    }

    // Get the base64 data for this file type
    setGeoTiffData(satelliteData.files[fileType]);
  }, [satelliteData, activeView]);

  return (
    <MapContainer
      center={[0, 0]}
      zoom={2}
      style={{ height: "400px", width: "100%" }}
      scrollWheelZoom={false} // disabled by default
    >
      {/* Base satellite imagery layer */}
      <Pane name="satellite-pane" style={{ zIndex: 20 }}>
        <TileLayer 
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Esri, Maxar, Earthstar Geographics, and the GIS User Community"
        />
      </Pane>
      
      {/* GeoTIFF layer pane */}
      <Pane name="geotiff-pane" style={{ zIndex: 225 }}>
        {geoTiffData && (
          <GeoTIFFLayer 
            base64Data={geoTiffData} 
            activeView={activeView} 
            polygonCoords={polygonCoords} 
          />
        )}
      </Pane>
      
      {/* Labels layer */}
      <Pane name="labels-pane" style={{ zIndex: 250 }}>
        <TileLayer 
          url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png"
          attribution="Map tiles by Stamen Design, CC BY 3.0 — Map data © OpenStreetMap"
          subdomains="abcd"
          minZoom={0}
          maxZoom={20}
          opacity={0.7}
        />
      </Pane>

      {/* Display polygon boundary */}
      {polygonCoords.length > 0 && (
        <Polygon 
          pathOptions={{ 
            color: "blue", 
            weight: 2, 
            fillOpacity: 0 // Transparent fill
          }} 
          positions={polygonCoords} 
        />
      )}

      {/* Map controls including hover info */}
      <MapControls 
        ndviData={ndviData} 
        phenologyData={phenologyData} 
        polygonCoords={polygonCoords} 
      />
    </MapContainer>
  );
};

export default ReadOnlyDisplayMap;