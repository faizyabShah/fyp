import React, { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Polygon, useMap, Pane, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import proj4 from 'proj4';

// Register UTM projection for the area of interest
proj4.defs('EPSG:32643', '+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs');
const wgs84ToUTM = proj4('EPSG:4326', 'EPSG:32643');

function parseLatLngString(str) {
  if (!str) return [];
  
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
  const fitRef = useRef(false);

  useEffect(() => {
    if (coordinates.length > 0 && !fitRef.current) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [20, 20] });
      fitRef.current = true;
    }
  }, [coordinates, map]);

  return null;
};

// This component enables/disables scroll wheel zoom on hover
const HoverScrollEnable = () => {
  const map = useMap();

  useEffect(() => {
    const handleMouseEnter = () => map.scrollWheelZoom.enable();
    const handleMouseLeave = () => map.scrollWheelZoom.disable();

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
  if (coords.length > 0 && (coords[0][0] !== coords[coords.length - 1][0] || 
      coords[0][1] !== coords[coords.length - 1][1])) {
    closedCoords.push(coords[0]);
  }
  
  // Create GeoJSON polygon with [lng, lat] ordering
  return {
    type: "Polygon",
    coordinates: [closedCoords.map(point => [point[1], point[0]])]
  };
};

// Helper function to get a value from a GeoRaster at a specific lat/lng
function getValueFromRaster(raster, lat, lng) {
  if (!raster) return null;

  try {
    // Convert lat/lng (WGS84) to UTM (EPSG:32643)
    const [x, y] = proj4('EPSG:4326', 'EPSG:32643', [lng, lat]);

    // Calculate pixel indices in the UTM coordinate system
    const xIndex = Math.floor((x - raster.xmin) / raster.pixelWidth);
    const yIndex = Math.floor((raster.ymax - y) / raster.pixelHeight);

    // Ensure valid pixel indices are within the raster bounds
    if (xIndex >= 0 && xIndex < raster.width && yIndex >= 0 && yIndex < raster.height) {
      // Retrieve the pixel value (assuming single-band raster)
      const value = raster.values[0][yIndex][xIndex];
      return value;
    }
  } catch (error) {
    console.warn("Error calculating raster value:", error);
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

// Helper function to get yield color based on value
function getYieldColor(value, min, max) {
  if (value === null || value === undefined) return 'transparent';
  
  // Normalize the value between 0 and 1
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  // Use a blue to red gradient where blue is low yield and red is high yield
  // This is a commonly used visualization scheme for yield maps
  
  // Use a custom colormap: deep blue → light blue → green → yellow → orange → red
  if (normalized < 0.2) {
    // Deep blue to light blue (0.0 - 0.2)
    const t = normalized / 0.2;
    return `rgb(0, ${Math.round(100 + 155 * t)}, 255)`;
  } else if (normalized < 0.4) {
    // Light blue to green (0.2 - 0.4)
    const t = (normalized - 0.2) / 0.2;
    return `rgb(0, 255, ${Math.round(255 - 155 * t)})`;
  } else if (normalized < 0.6) {
    // Green to yellow (0.4 - 0.6)
    const t = (normalized - 0.4) / 0.2;
    return `rgb(${Math.round(255 * t)}, 255, ${Math.round(100 - 100 * t)})`;
  } else if (normalized < 0.8) {
    // Yellow to orange (0.6 - 0.8)
    const t = (normalized - 0.6) / 0.2;
    return `rgb(255, ${Math.round(255 - 155 * t)}, 0)`;
  } else {
    // Orange to red (0.8 - 1.0)
    const t = (normalized - 0.8) / 0.2;
    return `rgb(255, ${Math.round(100 - 100 * t)}, 0)`;
  }
}

// Find min/max values in a raster, with optional percentile clipping to avoid outliers
function findRasterMinMax(raster, lowClip = 0.02, highClip = 0.98) {
  if (!raster || !raster.values || !raster.values[0]) return { min: 0, max: 1 };
  
  try {
    // Collect all non-noData values
    const values = [];
    const noDataValue = raster.noDataValue;
    
    for (let y = 0; y < raster.height; y++) {
      for (let x = 0; x < raster.width; x++) {
        const value = raster.values[0][y][x];
        if (value !== noDataValue && value !== undefined && value !== null) {
          values.push(value);
        }
      }
    }
    
    if (values.length === 0) return { min: 0, max: 1 };
    
    // Sort values for percentile calculation
    values.sort((a, b) => a - b);
    
    // Apply percentile clipping to avoid outliers
    const lowIndex = Math.floor(values.length * lowClip);
    const highIndex = Math.floor(values.length * highClip);
    
    const min = values[lowIndex];
    const max = values[highIndex];
    
    return { min, max };
  } catch (error) {
    console.error("Error finding raster min/max:", error);
    return { min: 0, max: 1 };
  }
}

// Component to display hover information
const HoverInfo = ({ map, ndviData, phenologyData, yieldData, polygonCoords, activeView }) => {
  const [ndviRaster, setNdviRaster] = useState(null);
  const [phenologyRaster, setPhenologyRaster] = useState(null);
  const [yieldRaster, setYieldRaster] = useState(null);
  const [yieldMinMax, setYieldMinMax] = useState({ min: 0, max: 10 });
  const [tooltipDiv, setTooltipDiv] = useState(null);
  const loadingRef = useRef(false);
  
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
    div.style.transform = 'translate3d(10px, 10px, 0)';
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
    if (!ndviData && !phenologyData && !yieldData) {
      setNdviRaster(null);
      setPhenologyRaster(null);
      setYieldRaster(null);
      return;
    }

    if (loadingRef.current) return;
    loadingRef.current = true;
    
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
          
          try {
            // Parse the georaster
            const ndviGeoRaster = await parseGeoraster(ndviArrayBuffer);
            setNdviRaster(ndviGeoRaster);
          } catch (error) {
            console.error("Error parsing NDVI raster:", error);
            setNdviRaster(null);
          }
        } else {
          setNdviRaster(null);
        }
        
        // Process phenology data
        if (phenologyData) {
          const binaryString = atob(phenologyData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const phenologyArrayBuffer = bytes.buffer.slice(0, bytes.length);
          
          try {
            // Parse the georaster
            const phenologyGeoRaster = await parseGeoraster(phenologyArrayBuffer);
            setPhenologyRaster(phenologyGeoRaster);
          } catch (error) {
            console.error("Error parsing phenology raster:", error);
            setPhenologyRaster(null);
          }
        } else {
          setPhenologyRaster(null);
        }
        
        // Process yield data
        if (yieldData) {
          const binaryString = atob(yieldData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const yieldArrayBuffer = bytes.buffer.slice(0, bytes.length);
          
          try {
            // Parse the georaster
            const yieldGeoRaster = await parseGeoraster(yieldArrayBuffer);
            setYieldRaster(yieldGeoRaster);
            
            // Calculate min/max values for yield coloring, with percentile clipping
            // to avoid outliers affecting the color range
            const minMax = findRasterMinMax(yieldGeoRaster, 0.02, 0.98);
            setYieldMinMax(minMax);
          } catch (error) {
            console.error("Error parsing yield raster:", error);
            setYieldRaster(null);
          }
        } else {
          setYieldRaster(null);
        }
      } catch (error) {
        console.error("Error loading raster data:", error);
      } finally {
        loadingRef.current = false;
      }
    };
    
    loadRasterData();
  }, [ndviData, phenologyData, yieldData]);
  
  // Set up mousemove event to display values
  useEffect(() => {
    if (!map || !tooltipDiv || !polygonCoords || polygonCoords.length === 0) return;
    
    // Only show tooltip if we have data to display and not in map_only mode
    if (activeView === 'map_only') {
      tooltipDiv.style.display = 'none';
      return;
    }
    
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
        let yieldValue = "N/A";
        let ndviColor = "transparent";
        let yieldColor = "transparent";
        
        // Get raster values directly from the raster data
        const updateDisplay = () => {
          tooltipDiv.style.display = 'block';
          
          const ndviColorStyle = ndviValue !== "N/A" 
            ? `<div style="display: inline-block; width: 12px; height: 12px; border-radius: 3px; background-color: ${ndviColor}; margin-right: 5px; vertical-align: middle;"></div>` 
            : '';
            
          const yieldColorStyle = yieldValue !== "N/A" 
            ? `<div style="display: inline-block; width: 12px; height: 12px; border-radius: 3px; background-color: ${yieldColor}; margin-right: 5px; vertical-align: middle;"></div>` 
            : '';
          
          let tooltipContent = `
            <div style="margin-bottom: 8px; font-weight: bold; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px;">Field Data</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: rgba(255,255,255,0.8);">Position:</span>
              <span>${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
            </div>`;
            
          // Only show NDVI if we have data
          if (ndviRaster) {
            tooltipContent += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: rgba(255,255,255,0.8);">NDVI:</span>
              <span>${ndviColorStyle}${ndviValue}</span>
            </div>`;
          }
          
          // Only show phenology if we have data
          if (phenologyRaster) {
            tooltipContent += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: rgba(255,255,255,0.8);">Phenology:</span>
              <span>${phenologyValue} (${phenologyStage})</span>
            </div>`;
          }
          
          // Only show yield if we have data
          if (yieldRaster) {
            tooltipContent += `
            <div style="display: flex; justify-content: space-between;">
              <span style="color: rgba(255,255,255,0.8);">Yield:</span>
              <span>${yieldColorStyle}${yieldValue} t/ha</span>
            </div>`;
          }
          
          tooltipDiv.innerHTML = tooltipContent;
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
        
        // Get yield value if raster is available
        if (yieldRaster) {
          try {
            // Find the pixel value at the current lat/lng
            const valueAtPoint = getValueFromRaster(yieldRaster, lat, lng);
            
            if (valueAtPoint !== null && valueAtPoint !== yieldRaster.noDataValue) {
              yieldValue = valueAtPoint.toFixed(2);
              yieldColor = getYieldColor(valueAtPoint, yieldMinMax.min, yieldMinMax.max);
              updateDisplay();
            }
          } catch (error) {
            console.warn("Error getting yield value:", error);
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
  }, [map, tooltipDiv, polygonCoords, ndviRaster, phenologyRaster, yieldRaster, yieldMinMax, activeView]);
  
  return null;
};

// GeoTIFFLayer component with improved layer management
const GeoTIFFLayer = ({ base64Data, activeView, polygonCoords, viewChanging, layerOpacity = 1.0 }) => {
  const map = useMap();
  const layerRef = useRef(null);
  const loadingRef = useRef(false);
  const currentLayerKey = useRef(null);
  
  // Generate a unique key based on the view and data
  const layerKey = useMemo(() => {
    return `${activeView}-${base64Data ? base64Data.slice(0, 20) : 'nodata'}-${Date.now()}`;
  }, [activeView, base64Data]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (layerRef.current) {
        try {
          map.removeLayer(layerRef.current);
        } catch (e) {
          console.warn("Error removing layer on unmount:", e);
        }
        layerRef.current = null;
      }
    };
  }, [map]);
  
  // Update layer opacity when it changes
  useEffect(() => {
    if (layerRef.current && !viewChanging) {
      try {
        layerRef.current.setOpacity(layerOpacity);
      } catch (e) {
        console.warn("Error updating layer opacity:", e);
      }
    }
  }, [layerOpacity, viewChanging]);
  
  // When component updates, clear previous layer
  useEffect(() => {
    // If view is changing, clear any existing layer immediately
    if (viewChanging && layerRef.current) {
      try {
        map.removeLayer(layerRef.current);
      } catch (e) {
        console.warn("Error removing layer during view change:", e);
      }
      layerRef.current = null;
      currentLayerKey.current = null;
    }
  }, [map, viewChanging]);
  
  // Only show GeoTIFF when not in map_only mode
  useEffect(() => {
    if (activeView === 'map_only') {
      if (layerRef.current) {
        try {
          map.removeLayer(layerRef.current);
        } catch (e) {
          console.warn("Error removing layer when switching to map_only:", e);
        }
        layerRef.current = null;
        currentLayerKey.current = null;
      }
      return;
    }
    
    if (!base64Data || !polygonCoords || polygonCoords.length === 0 || viewChanging) {
      return;
    }
    
    // Prevent multiple concurrent loading operations
    if (loadingRef.current) return;
    if (currentLayerKey.current === layerKey) return;
    
    loadingRef.current = true;
    
    const loadGeoTIFF = async () => {
      try {
        // Remove previous layer if it exists
        if (layerRef.current) {
          try {
            map.removeLayer(layerRef.current);
          } catch (e) {
            console.warn("Error removing previous layer:", e);
          }
          layerRef.current = null;
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
        } else if (activeView === 'yield') {
          // Find min/max values for yield data with percentile clipping
          const minMax = findRasterMinMax(georaster, 0.02, 0.98);
          
          pixelValuesToColorFn = values => {
            if (values[0] === georaster.noDataValue) return null;
            return getYieldColor(values[0], minMax.min, minMax.max);
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
          opacity: layerOpacity, // Apply the layer opacity
          resolution: 512, // Increased resolution for better display
          pixelValuesToColorFn: pixelValuesToColorFn,
          resampleMethod: 'bilinear', // Smoother interpolation
          mask: geoJsonPolygon,
          mask_strategy: 'outside',
          debugLevel: 0,
          renderer: 'webgl', // Use WebGL renderer for better performance when available
          // Canvas rendering options
          canvas: {
            enableSmoothing: true, // Enable image smoothing
            cacheable: true // Enable caching for better performance
          }
        };
        
        // Create new layer with current key to track layer identity
        const newLayer = new GeoRasterLayer(options);
        currentLayerKey.current = layerKey;
        
        // Add the layer to the map and store reference
        newLayer.addTo(map);
        layerRef.current = newLayer;
      } catch (error) {
        console.error('Error loading GeoTIFF from base64:', error);
      } finally {
        loadingRef.current = false;
      }
    };
    
    loadGeoTIFF();
  }, [map, base64Data, activeView, polygonCoords, viewChanging, layerKey, layerOpacity]);
  
  return null;
};

// MapControls component to get access to the map object for HoverInfo
const MapControls = ({ ndviData, phenologyData, yieldData, polygonCoords, activeView }) => {
  const map = useMap();
  
  // Listen for zoom events to ensure smooth rendering
  useMapEvents({
    zoomend: () => {
      // Force a re-render by triggering a pane update
      const panes = document.querySelectorAll('.leaflet-pane');
      panes.forEach(pane => {
        pane.style.zIndex = pane.style.zIndex;
      });
    }
  });
  
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
        yieldData={yieldData}
        polygonCoords={polygonCoords}
        activeView={activeView}
      />
    </>
  );
};

// Draw field boundary polygon
const FieldBoundary = ({ coordinates, color = '#3388ff' }) => {
  if (!coordinates || coordinates.length === 0) return null;

  return (
    <Polygon 
      positions={coordinates} 
      pathOptions={{ 
        color, 
        weight: 3, 
        opacity: 0.8, 
        fillOpacity: 0.05
      }} 
    />
  );
};

const ReadOnlyDisplayMap = ({ selectedField, satelliteData, activeView, viewChanging, layerOpacity = 1.0 }) => {
  const [polygonCoords, setPolygonCoords] = useState([]);
  const [geoTiffData, setGeoTiffData] = useState(null);
  const [ndviData, setNdviData] = useState(null);
  const [phenologyData, setPhenologyData] = useState(null);
  const [yieldData, setYieldData] = useState(null);

  // Parse field coordinates
  useEffect(() => {
    if (selectedField?.coordinates) {
      setPolygonCoords(parseLatLngString(selectedField.coordinates));
    } else {
      setPolygonCoords([]);
    }
  }, [selectedField]);

  // Set up appropriate GeoTIFF data based on active view
  useEffect(() => {
    // Clear data if view is changing to prevent flicker
    if (viewChanging) {
      setGeoTiffData(null);
      return;
    }
    
    // For Map Only view, don't load any imagery
    if (activeView === 'map_only') {
      setGeoTiffData(null);
      return;
    }
    
    if (!satelliteData || !satelliteData.files) {
      setGeoTiffData(null);
      setNdviData(null);
      setPhenologyData(null);
      setYieldData(null);
      return;
    }
    
    // Always load NDVI, phenology and yield data for hover info, regardless of current view
    setNdviData(satelliteData.files.ndvi || null);
    setPhenologyData(satelliteData.files.phenology || null);
    setYieldData(satelliteData.files.yield || null);
    
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
      case 'yield':
        fileType = 'yield';
        break;
      default:
        fileType = null;
    }

    // Get the base64 data for this file type
    setGeoTiffData(fileType ? satelliteData.files[fileType] || null : null);
  }, [satelliteData, activeView, viewChanging]);

  return (
    <MapContainer
      center={[0, 0]}
      zoom={2}
      style={{ height: "600px", width: "100%" }}
      scrollWheelZoom={false} // disabled by default
      preferCanvas={true} // Better performance for vector layers
    >
      {/* Base satellite imagery layer */}
      <Pane name="satellite-pane" style={{ zIndex: 20 }}>
        <TileLayer 
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Esri, Maxar, Earthstar Geographics, and the GIS User Community"
        />
      </Pane>
      
      {/* GeoTIFF layer pane */}
      <Pane name="geotiff-pane" style={{ zIndex: 35 }}>
        {geoTiffData && !viewChanging && activeView !== 'map_only' && (
          <GeoTIFFLayer 
            base64Data={geoTiffData} 
            activeView={activeView} 
            polygonCoords={polygonCoords}
            viewChanging={viewChanging}
            layerOpacity={layerOpacity}
          />
        )}
      </Pane>
      
      {/* Labels layer */}
      <Pane name="labels-pane" style={{ zIndex: 40 }}>
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
        yieldData={yieldData}
        polygonCoords={polygonCoords}
        activeView={activeView}
      />
    </MapContainer>
  );
};

export default ReadOnlyDisplayMap;