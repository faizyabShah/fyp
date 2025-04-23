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
const HoverInfo = ({ map, ndviData, phenologyData, polygonCoords }) => {
  const [ndviRaster, setNdviRaster] = useState(null);
  const [phenologyRaster, setPhenologyRaster] = useState(null);
  const [tooltipDiv, setTooltipDiv] = useState(null);
  
  // Create tooltip element that follows cursor
  useEffect(() => {
    if (!map) return;
    
    // Create the tooltip div
    const div = L.DomUtil.create('div', 'map-tooltip');
    div.style.position = 'absolute';
    div.style.padding = '10px 14px';
    div.style.background = 'rgba(0, 0, 0, 0.65)';
    div.style.backdropFilter = 'blur(10px)';
    div.style.webkitBackdropFilter = 'blur(10px)';
    div.style.color = 'white';
    div.style.borderRadius = '8px';
    div.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.15)';
    div.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    div.style.fontFamily = 'Arial, sans-serif';
    div.style.fontSize = '12px';
    div.style.lineHeight = '1.5';
    div.style.zIndex = '1000';
    div.style.pointerEvents = 'none'; // Prevents the tooltip from blocking mouse events
    div.style.display = 'none'; // Initially hidden
    div.style.transition = 'transform 0.1s ease-out';
    div.style.transform = 'translate3d(10px, 10px, 0)'; // Offset from cursor
    div.style.minWidth = '200px';
    div.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.2)';
    
    // Add to map container
    map.getContainer().appendChild(div);
    setTooltipDiv(div);
    
    return () => {
      if (div && div.parentNode) {
        div.parentNode.removeChild(div);
      }
    };
  }, [map]);
  
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
    if (!map || !tooltipDiv || !polygonCoords || polygonCoords.length === 0) return;
    
    // Convert polygon coordinates to Leaflet polygon for point-in-polygon check
    const polygon = L.polygon(polygonCoords);
    
    const handleMouseMove = (e) => {
      const { lat, lng } = e.latlng;
      
      // Position tooltip at mouse location
      const containerPoint = e.containerPoint;
      tooltipDiv.style.left = `${containerPoint.x + 15}px`;
      tooltipDiv.style.top = `${containerPoint.y - 10}px`;
      
      // Check if point is inside polygon
      if (polygon.getBounds().contains(e.latlng) && pointInPolygon([lat, lng], polygonCoords)) {
        let ndviValue = "N/A";
        let phenologyValue = "N/A";
        let phenologyStage = "N/A";
        let ndviColor = "transparent";
        
        // Get raster values directly from the raster data
        const updateDisplay = () => {
          tooltipDiv.style.display = 'block';
          
          const ndviColorStyle = ndviValue !== "N/A" 
            ? `<div style="display: inline-block; width: 12px; height: 12px; border-radius: 3px; background-color: ${ndviColor}; margin-right: 5px; vertical-align: middle;"></div>` 
            : '';
          
          tooltipDiv.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px;">Field Data</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: rgba(255,255,255,0.8);">Position:</span>
              <span>${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: rgba(255,255,255,0.8);">NDVI:</span>
              <span>${ndviColorStyle}${ndviValue}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: rgba(255,255,255,0.8);">Phenology:</span>
              <span>${phenologyValue} (${phenologyStage})</span>
            </div>
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
              
              // Determine color based on NDVI value for the color indicator
              if (valueAtPoint < -0.2) ndviColor = '#960000';
              else if (valueAtPoint < 0) ndviColor = '#dc1414';
              else if (valueAtPoint < 0.2) ndviColor = '#ffb432';
              else if (valueAtPoint < 0.4) ndviColor = '#f0f032';
              else if (valueAtPoint < 0.6) ndviColor = '#96f032';
              else ndviColor = '#00b400';
              
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
        // Hide tooltip when outside polygon
        tooltipDiv.style.display = 'none';
      }
    };
    
    // Add event listener to map for mouse movement
    map.on('mousemove', handleMouseMove);
    
    // Hide tooltip when mouse leaves the map
    const handleMouseLeave = () => {
      if (tooltipDiv) {
        tooltipDiv.style.display = 'none';
      }
    };
    
    map.getContainer().addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      map.off('mousemove', handleMouseMove);
      map.getContainer().removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [map, tooltipDiv, polygonCoords, ndviRaster, phenologyRaster]);
  
  return null;
};

// Helper function to get a value from a GeoRaster at a specific lat/lng
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

// GeoTIFFLayer component 
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
        
        // Create GeoRaster layer with improved options for smooth rendering
        const options = {
          georaster: georaster,
          opacity: 1,
          resolution: 512, // Increased from 256 for better resolution
          pixelValuesToColorFn: pixelValuesToColorFn,
          resampleMethod: 'bicubic', // Changed from 'nearest' to 'bilinear' for smoother interpolation
          mask: geoJsonPolygon,
          mask_strategy: 'outside',
          debugLevel: 0,
          // Add canvas rendering options
          canvas: {
            enableSmoothing: true, // Enable image smoothing on canvas
            cacheable: true // Allow for caching to improve performance
          }
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
      style={{ height: "600px", width: "100%" }}
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