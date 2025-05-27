import React, { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, useMap, Pane, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import proj4 from 'proj4';
import { IoIosRefresh } from 'react-icons/io';
import { FaLayerGroup, FaCalendarAlt } from 'react-icons/fa';
import "../styles/UAVImageryMap.css";

// Register UTM projection for the area of interest
proj4.defs('EPSG:32643', '+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs');
const wgs84ToUTM = proj4('EPSG:4326', 'EPSG:32643');
const utmToWGS84 = proj4('EPSG:32643', 'EPSG:4326');

// Convert the bounding box from UTM to WGS84
const convertBoundingBox = (bbox) => {
  const { left, bottom, right, top } = bbox;
  
  // Convert bottom-left corner
  const [lngMin, latMin] = proj4('EPSG:32643', 'EPSG:4326', [left, bottom]);
  
  // Convert top-right corner
  const [lngMax, latMax] = proj4('EPSG:32643', 'EPSG:4326', [right, top]);
  
  return {
    latMin,
    lngMin,
    latMax,
    lngMax
  };
};

// Helper function to normalize raster values
const normalizeRasterValues = (raster, isSpecialType = false) => {
  if (!raster || !raster.values || !raster.values.length) return raster;
  
  // Skip normalization for NDVI and phenology
  if (isSpecialType) return raster;
  
  try {
    // Find min/max values across all bands
    let min = Infinity;
    let max = -Infinity;
    
    // Collect all values to find min/max
    for (let bandIndex = 0; bandIndex < raster.values.length; bandIndex++) {
      const band = raster.values[bandIndex];
      for (let y = 0; y < raster.height; y++) {
        for (let x = 0; x < raster.width; x++) {
          const value = band[y][x];
          if (value !== raster.noDataValue && value !== undefined && value !== null) {
            min = Math.min(min, value);
            max = Math.max(max, value);
          }
        }
      }
    }
    
    // Create a new normalized raster
    const normalizedRaster = { ...raster };
    normalizedRaster.values = [];
    
    // Normalize each band to 0-1 range
    for (let bandIndex = 0; bandIndex < raster.values.length; bandIndex++) {
      const band = raster.values[bandIndex];
      const normalizedBand = [];
      
      for (let y = 0; y < raster.height; y++) {
        const row = [];
        for (let x = 0; x < raster.width; x++) {
          const value = band[y][x];
          if (value === raster.noDataValue || value === undefined || value === null) {
            row.push(raster.noDataValue);
          } else {
            // Normalize to 0-1 range
            const normalizedValue = (value - min) / (max - min);
            row.push(normalizedValue);
          }
        }
        normalizedBand.push(row);
      }
      
      normalizedRaster.values.push(normalizedBand);
    }
    
    return normalizedRaster;
  } catch (error) {
    console.error("Error normalizing raster values:", error);
    return raster;
  }
};

// Component to enable/disable scroll wheel zoom on hover
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

// Component to fit bounds to specified coordinates
const FitBounds = ({ bounds }) => {
  const map = useMap();
  const hasZoomed = useRef(false);

  useEffect(() => {
    if (bounds && !hasZoomed.current) {
      try {
        const { latMin, lngMin, latMax, lngMax } = bounds;
        
        const leafletBounds = L.latLngBounds(
          [latMin, lngMin],
          [latMax, lngMax]
        );
        
        // Check if bounds are valid
        if (leafletBounds.isValid()) {
          map.fitBounds(leafletBounds, { padding: [20, 20] });
          hasZoomed.current = true;
        }
      } catch (error) {
        console.warn("Error fitting to bounds:", error);
      }
    }
  }, [bounds, map]);

  return null;
};

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
        if (value !== noDataValue && value !== undefined && value !== null && value !== -1) {
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

// Component to display hover information for UAV data
const HoverInfo = ({ map, rgbData, ndviData, phenologyData, falseColorData, activeView }) => {
  const [rasterData, setRasterData] = useState({
    rgb: null,
    ndvi: null,
    phenology: null,
    falseColor: null
  });
  const [tooltipDiv, setTooltipDiv] = useState(null);
  const loadingRef = useRef(false);
  
  // Create tooltip element that follows cursor
  useEffect(() => {
    if (!map) return;
    
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
    div.style.pointerEvents = 'none';
    div.style.display = 'none';
    div.style.transition = 'transform 0.1s ease-out';
    div.style.transform = 'translate3d(10px, 10px, 0)';
    div.style.minWidth = '200px';
    div.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.2)';
    
    map.getContainer().appendChild(div);
    setTooltipDiv(div);
    
    return () => {
      if (div && div.parentNode) {
        div.parentNode.removeChild(div);
      }
    };
  }, [map]);
  
  // Load and process raster data
  useEffect(() => {
    if (loadingRef.current) return;
    
    // Skip processing if no data
    if (!rgbData && !ndviData && !phenologyData && !falseColorData) {
      setRasterData({
        rgb: null,
        ndvi: null,
        phenology: null,
        falseColor: null
      });
      return;
    }

    loadingRef.current = true;
    
    const loadRasterData = async () => {
      const newData = { ...rasterData };
      
      try {
        // Process each raster type
        const processRaster = async (data, key) => {
          if (!data) {
            newData[key] = null;
            return;
          }
          
          try {
            const binaryString = atob(data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const arrayBuffer = bytes.buffer.slice(0, bytes.length);
            
            const georaster = await parseGeoraster(arrayBuffer);
            
            // Normalize raster values for RGB and false color, but not for NDVI or phenology
            const isSpecialType = (key === 'ndvi' || key === 'phenology');
            newData[key] = isSpecialType ? georaster : normalizeRasterValues(georaster);
          } catch (error) {
            console.error(`Error parsing ${key} raster:`, error);
            newData[key] = null;
          }
        };
        
        // Process all rasters in parallel
        await Promise.all([
          processRaster(rgbData, 'rgb'),
          processRaster(ndviData, 'ndvi'),
          processRaster(phenologyData, 'phenology'),
          processRaster(falseColorData, 'falseColor')
        ]);
        
        setRasterData(newData);
      } catch (error) {
        console.error("Error loading raster data:", error);
      } finally {
        loadingRef.current = false;
      }
    };
    
    loadRasterData();
  }, [rgbData, ndviData, phenologyData, falseColorData]);

  // Helper function to determine crop health status based on NDVI value
  const getCropHealthStatus = (ndviValue) => {
    if (ndviValue < 0.1) return { status: "Poor", color: "#dc1414" };
    if (ndviValue < 0.2) return { status: "Very Low", color: "#ff6b6b" };
    if (ndviValue < 0.4) return { status: "Low to Moderate", color: "#ffb432" };
    if (ndviValue < 0.6) return { status: "Healthy", color: "#96f032" };
    if (ndviValue < 0.8) return { status: "Very Healthy", color: "#00b400" };
    return { status: "Exceptional", color: "#008000" };
  };
  
  // Helper function to get phenology stage name based on value
  const getPhenologyStage = (value) => {
    if (value === -1) return "Outside Plot";
    
    const stages = [
      "Germination",
      "Tillering",
      "Jointing",
      "Booting and Heading",
      "Anthesis",
      "Grain Filling",
      "Maturity"
    ];
    
    const index = Math.max(0, Math.min(6, Math.floor(value)));
    return stages[index];
  };
  
  // Set up mousemove event to display values
  useEffect(() => {
    if (!map || !tooltipDiv) return;
    
    const handleMouseMove = (e) => {
      const { lat, lng } = e.latlng;
      
      // Position tooltip at mouse location
      const containerPoint = e.containerPoint;
      tooltipDiv.style.left = `${containerPoint.x + 15}px`;
      tooltipDiv.style.top = `${containerPoint.y - 10}px`;
      
      let ndviValue = "N/A";
      let phenologyValue = "N/A";
      let ndviColor = "transparent";
      let healthStatus = { status: "N/A", color: "transparent" };
      
      // Initial display
      tooltipDiv.style.display = 'block';
      
      // Get NDVI value if raster is available
      if (rasterData.ndvi) {
        try {
          const valueAtPoint = getValueFromRaster(rasterData.ndvi, lat, lng);
          
          if (valueAtPoint !== null && valueAtPoint !== rasterData.ndvi.noDataValue) {
            ndviValue = valueAtPoint.toFixed(2);
            
            // Determine color based on NDVI value
            if (valueAtPoint < -0.2) ndviColor = '#960000';
            else if (valueAtPoint < 0) ndviColor = '#dc1414';
            else if (valueAtPoint < 0.2) ndviColor = '#ffb432';
            else if (valueAtPoint < 0.4) ndviColor = '#f0f032';
            else if (valueAtPoint < 0.6) ndviColor = '#96f032';
            else ndviColor = '#00b400';
            
            // Get health status
            healthStatus = getCropHealthStatus(valueAtPoint);
          }
        } catch (error) {
          console.warn("Error getting NDVI value:", error);
        }
      }
      
      // Get phenology value if raster is available
      if (rasterData.phenology) {
        try {
          const valueAtPoint = getValueFromRaster(rasterData.phenology, lat, lng);
          
          if (valueAtPoint !== null && valueAtPoint !== rasterData.phenology.noDataValue) {
            phenologyValue = valueAtPoint === -1 ? "Outside Plot" : valueAtPoint.toFixed(0);
            if (phenologyValue !== "Outside Plot") {
              phenologyValue += ` (${getPhenologyStage(valueAtPoint)})`;
            }
          }
        } catch (error) {
          console.warn("Error getting phenology value:", error);
        }
      }
      
      // Format tooltip content
      const ndviColorStyle = ndviValue !== "N/A" 
        ? `<div style="display: inline-block; width: 12px; height: 12px; border-radius: 3px; background-color: ${ndviColor}; margin-right: 5px; vertical-align: middle;"></div>` 
        : '';
        
      const healthColorStyle = healthStatus.status !== "N/A" 
        ? `<div style="display: inline-block; width: 12px; height: 12px; border-radius: 3px; background-color: ${healthStatus.color}; margin-right: 5px; vertical-align: middle;"></div>` 
        : '';
      
      let tooltipContent = `
        <div style="margin-bottom: 8px; font-weight: bold; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px;">UAV Data</div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: rgba(255,255,255,0.8);">Position:</span>
          <span>${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
        </div>`;
        
      // Only show NDVI if we have data
      if (rasterData.ndvi) {
        tooltipContent += `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: rgba(255,255,255,0.8);">NDVI:</span>
          <span>${ndviColorStyle}${ndviValue}</span>
        </div>`;
      }
      
      // Only show phenology if we have data
      if (rasterData.phenology) {
        tooltipContent += `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: rgba(255,255,255,0.8);">Phenology:</span>
          <span>${phenologyValue}</span>
        </div>`;
      }
      
      // Add crop health status if available
      if (healthStatus.status !== "N/A") {
        tooltipContent += `
        <div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 5px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: rgba(255,255,255,0.8);">Crop Health:</span>
            <span>${healthColorStyle}${healthStatus.status}</span>
          </div>
        </div>`;
      }
      
      tooltipDiv.innerHTML = tooltipContent;
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
  }, [map, tooltipDiv, rasterData]);
  
  return <FitBounds bounds={wgs84BoundingBox} />;
};

// GeoTIFF overlay component with improved error handling
const GeoTIFFOverlay = ({ base64Data, activeView, layerOpacity = 0.7 }) => {
  const map = useMap();
  const layerRef = useRef(null);
  const loadingRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  
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
  
  // Update layer when data or view changes
  useEffect(() => {
    if (!base64Data || loadingRef.current) return;
    loadingRef.current = true;
    
    const loadGeoTIFF = async () => {
      try {
        // Remove previous layer if it exists
        if (layerRef.current) {
          map.removeLayer(layerRef.current);
          layerRef.current = null;
        }
        
        // Check if map container is valid
        const mapContainer = map.getContainer();
        if (!mapContainer || mapContainer.clientHeight === 0 || mapContainer.clientWidth === 0) {
          console.warn('Map container has zero dimensions, retrying...');
          
          // If we've already retried too many times, give up
          if (retryCountRef.current >= maxRetries) {
            console.error('Max retries reached, giving up on rendering layer');
            loadingRef.current = false;
            return;
          }
          
          // Increment retry counter and try again after a short delay
          retryCountRef.current++;
          setTimeout(loadGeoTIFF, 500);
          return;
        }
        
        // Force map to acknowledge its size
        map.invalidateSize();
        
        // Convert base64 to array buffer
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer.slice(0, bytes.length);
        
        // Parse the georaster
        const georaster = await parseGeoraster(arrayBuffer);
        
        // Verify georaster dimensions before creating layer
        if (!georaster || georaster.height <= 0 || georaster.width <= 0) {
          console.warn('Invalid georaster dimensions:', georaster);
          loadingRef.current = false;
          return;
        }
        
        // Normalize raster values for RGB and false_color but not for NDVI or phenology
        const isSpecialType = (activeView === 'ndvi' || activeView === 'phenology');
        const processedGeoRaster = isSpecialType ? georaster : normalizeRasterValues(georaster);
        
        // Set up color functions based on view type
        let pixelValuesToColorFn;
        
        if (activeView === 'ndvi') {
          pixelValuesToColorFn = values => {
            if (!values || values.length === 0 || values[0] === processedGeoRaster.noDataValue) return null;
            if (values[0] < -0.2) return 'rgba(150, 0, 0, 0.8)';
            if (values[0] < 0) return 'rgba(220, 20, 20, 0.8)';
            if (values[0] < 0.2) return 'rgba(255, 180, 50, 0.8)';
            if (values[0] < 0.4) return 'rgba(240, 240, 50, 0.8)';
            if (values[0] < 0.6) return 'rgba(150, 240, 50, 0.8)';
            return 'rgba(0, 180, 0, 0.8)';
          };
        } else if (activeView === 'false_color') {
          pixelValuesToColorFn = values => {
            if (!values || values.length < 3 || values[0] === processedGeoRaster.noDataValue) return null;
            // Values are already normalized to 0-1, so scale to 0-255
            const r = Math.round(values[0] * 255);
            const g = Math.round(values[1] * 255);
            const b = Math.round(values[2] * 255);
            return `rgba(${r}, ${g}, ${b}, ${layerOpacity})`;
          };
        } else if (activeView === 'phenology') {
          // Special handling for phenology with -1 values
          const phenologyColors = [
            'rgba(255, 0, 0, 0.8)',    // Germination
            'rgba(255, 128, 51, 0.8)',  // Tillering
            'rgba(255, 255, 0, 0.8)',   // Jointing
            'rgba(102, 255, 77, 0.8)',  // Booting and Heading
            'rgba(0, 0, 255, 0.8)',     // Anthesis
            'rgba(255, 0, 255, 0.8)',   // Grain Filling
            'rgba(0, 255, 255, 0.8)'    // Maturity
          ];
          
          pixelValuesToColorFn = values => {
            if (!values || values.length === 0 || values[0] === processedGeoRaster.noDataValue) return null;
            // Handle -1 values (outside plot) by making them transparent
            if (values[0] === -1) return 'rgba(0, 0, 0, 0)';
            
            // Map value to stage index (assuming values 0-6)
            const index = Math.max(0, Math.min(6, Math.floor(values[0])));
            return phenologyColors[index];
          };
        } else if (activeView === 'rgb') {
          pixelValuesToColorFn = values => {
            if (!values || values.length < 3 || values[0] === processedGeoRaster.noDataValue) return null;
            // Values are already normalized to 0-1, so scale to 0-255
            const r = Math.round(values[0] * 255);
            const g = Math.round(values[1] * 255);
            const b = Math.round(values[2] * 255);
            return `rgb(${r}, ${g}, ${b})`;
          };
        }
        
        // Create GeoRaster layer with error handling
        const options = {
          georaster: processedGeoRaster,
          opacity: layerOpacity,
          resolution: 256,
          pixelValuesToColorFn: pixelValuesToColorFn,
          resampleMethod: 'nearest',
          debugLevel: 0,
          renderer: 'canvas',
          canvas: {
            enableSmoothing: false,
            cacheable: true
          },
          onError: (error) => {
            console.warn('GeoRaster layer error:', error);
            if (error.message && error.message.includes('height is 0')) {
              if (retryCountRef.current < maxRetries) {
                retryCountRef.current++;
                setTimeout(loadGeoTIFF, 500);
              }
            }
          }
        };
        
        try {
          // Create new layer
          const newLayer = new GeoRasterLayer(options);
          
          // Add the layer to the map and store reference
          newLayer.addTo(map);
          layerRef.current = newLayer;
          
          // After successful initial render, improve the visual quality
          setTimeout(() => {
            if (layerRef.current) {
              try {
                layerRef.current.options.resolution = 512;
                layerRef.current.options.resampleMethod = 'bilinear';
                layerRef.current.options.canvas.enableSmoothing = true;
                layerRef.current.redraw();
              } catch (e) {
                console.warn('Error updating layer quality:', e);
              }
            }
          }, 1000);
        } catch (renderError) {
          console.error('Error creating GeoRaster layer:', renderError);
          
          // Try again with simpler settings if we haven't exceeded max retries
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            setTimeout(loadGeoTIFF, 500);
          }
        }
      } catch (error) {
        console.error('Error loading GeoTIFF overlay:', error);
      } finally {
        loadingRef.current = false;
      }
    };
    
    loadGeoTIFF();
  }, [map, base64Data, activeView, layerOpacity]);
  
  return null;
};

// MapControls component
const MapControls = ({ rgbData, ndviData, phenologyData, falseColorData, activeView }) => {
  const map = useMap();
  
  // Listen for zoom events
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
      <HoverInfo 
        map={map} 
        rgbData={rgbData}
        ndviData={ndviData} 
        phenologyData={phenologyData}
        falseColorData={falseColorData}
        activeView={activeView}
      />
    </>
  );
};

// UTM bounding box to zoom to
const utmBoundingBox = {
  left: 326733.84245267994,
  bottom: 3727393.5072297426,
  right: 326876.8820171486,
  top: 3727530.8874642616
};

// Convert to WGS84 for Leaflet
const wgs84BoundingBox = convertBoundingBox(utmBoundingBox);

// Main UAVImageryMap component - redesigned to match SatelliteViewer style
const UAVImageryMap = ({ token, fieldId, initialDate = null }) => {
  // State variables
  const [viewData, setViewData] = useState(null);
  const [rgbData, setRgbData] = useState(null);
  const [ndviData, setNdviData] = useState(null);
  const [falseColorData, setFalseColorData] = useState(null);
  const [phenologyData, setPhenologyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewPickerOpen, setViewPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [viewChanging, setViewChanging] = useState(false);
  const [activeView, setActiveView] = useState('rgb');
  const [layerOpacity, setLayerOpacity] = useState(0.7);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [availableDates, setAvailableDates] = useState([]);
  const [imageData, setImageData] = useState(null);
  
  const viewButtonRef = useRef(null);
  const dateButtonRef = useRef(null);
  
  const viewOptions = [
    { id: 'rgb', label: 'RGB View', legendTitle: 'RGB True Color' },
    { id: 'ndvi', label: 'NDVI', legendTitle: 'Normalized Difference Vegetation Index' },
    { id: 'phenology', label: 'Phenology', legendTitle: 'Crop Growth Stage' },
    { id: 'false_color', label: 'False Color', legendTitle: 'False Color Composite' }
  ];

  // Fetch available dates for the selected field
  useEffect(() => {
    const fetchAvailableDates = async () => {
      setIsLoading(true);
      try {
        // In a real implementation, this would be an API call
        // For now, using hardcoded dates as per the original UAV.js
        const dates = [
          "03-08-2024",
          "03-15-2024",
          "04-04-2024",
          "04-22-2024",
          "04-26-2024"
        ];
        
        setAvailableDates(dates);
        
        // Select the most recent date if none is selected
        if (!selectedDate && dates.length > 0) {
          setSelectedDate(dates[dates.length - 1]);
        }
      } catch (error) {
        console.error('Error fetching available dates:', error);
        setError('Failed to load available dates');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAvailableDates();
  }, [fieldId]);

  // Fetch UAV imagery data for selected date and view
  useEffect(() => {
    const fetchUAVImagery = async () => {
      if (!selectedDate) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/satellite/date/${selectedDate}/view/${activeView}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setImageData(data);
          
          // Set view data based on active view
          switch (activeView) {
            case 'rgb':
              setViewData(data.files.rgb || null);
              break;
            case 'ndvi':
              setViewData(data.files.ndvi || null);
              break;
            case 'false_color':
              setViewData(data.files.false_color || null);
              break;
            case 'phenology':
              setViewData(data.files.phenology || null);
              break;
            default:
              setViewData(data.files.rgb || null);
          }
          
          // Store all different view data
          setRgbData(data.files.rgb || null);
          setNdviData(data.files.ndvi || null);
          setFalseColorData(data.files.false_color || null);
          setPhenologyData(data.files.phenology || null);
          
        } else {
          console.error('Failed to fetch UAV imagery');
          setError('Failed to load UAV imagery');
          setImageData(null);
          setViewData(null);
        }
      } catch (error) {
        console.error('Error fetching UAV imagery:', error);
        setError('Network error while fetching imagery data');
        setImageData(null);
        setViewData(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUAVImagery();
  }, [selectedDate, activeView, token]);

  // Handle view change
  const handleViewChange = (newView) => {
    // Set a flag to indicate view is changing to prevent race conditions
    setViewChanging(true);
    
    // Use timeout to ensure clean transition between views
    setTimeout(() => {
      setActiveView(newView);
      setViewChanging(false);
    }, 50);
    
    setViewPickerOpen(false);
  };

  // Handle date change
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    setDatePickerOpen(false);
  };

  // Update view picker position
  useEffect(() => {
    if (viewPickerOpen) {
      // Update dropdown position
      const updateDropdownPosition = () => {
        if (viewButtonRef.current) {
          const rect = viewButtonRef.current.getBoundingClientRect();
          const dropdownElement = document.querySelector('.view-dropdown');
          if (dropdownElement) {
            dropdownElement.style.top = `${rect.bottom + 5}px`;
            dropdownElement.style.left = `${rect.left}px`;
            dropdownElement.style.width = `${Math.max(rect.width, 280)}px`; 
          }
        }
      };
      
      // Immediate position calculation
      updateDropdownPosition();
      
      // Update on scroll or resize
      window.addEventListener('scroll', updateDropdownPosition);
      window.addEventListener('resize', updateDropdownPosition);
      
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [viewPickerOpen]);

  // Update date picker position
  useEffect(() => {
    if (datePickerOpen) {
      // Update dropdown position
      const updateDropdownPosition = () => {
        if (dateButtonRef.current) {
          const rect = dateButtonRef.current.getBoundingClientRect();
          const dropdownElement = document.querySelector('.date-dropdown');
          if (dropdownElement) {
            dropdownElement.style.top = `${rect.bottom + 5}px`;
            dropdownElement.style.left = `${rect.left}px`;
            dropdownElement.style.width = `${Math.max(rect.width, 280)}px`; 
          }
        }
      };
      
      // Immediate position calculation
      updateDropdownPosition();
      
      // Update on scroll or resize
      window.addEventListener('scroll', updateDropdownPosition);
      window.addEventListener('resize', updateDropdownPosition);
      
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [datePickerOpen]);

  // Handle outside clicks for view picker dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (viewPickerOpen) {
        const viewDropdown = document.querySelector('.view-dropdown');
        if (viewButtonRef.current && 
            !viewButtonRef.current.contains(event.target) && 
            viewDropdown && !viewDropdown.contains(event.target)) {
          setViewPickerOpen(false);
        }
      }
    };
    
    if (viewPickerOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [viewPickerOpen]);

  // Handle outside clicks for date picker dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerOpen) {
        const dateDropdown = document.querySelector('.date-dropdown');
        if (dateButtonRef.current && 
            !dateButtonRef.current.contains(event.target) && 
            dateDropdown && !dateDropdown.contains(event.target)) {
          setDatePickerOpen(false);
        }
      }
    };
    
    if (datePickerOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [datePickerOpen]);

  // Render view picker dropdown
  const renderViewPicker = () => {
    const currentView = viewOptions.find(option => option.id === activeView);
    
    return (
      <div className="selector-container">
        <div 
          className="selector-button" 
          onClick={() => setViewPickerOpen(!viewPickerOpen)}
          ref={viewButtonRef}
        >
          <FaLayerGroup className="icon" />
          <span>{currentView?.label || 'Select View'}</span>
        </div>
        
        {viewPickerOpen && (
          <div 
            className="dropdown-menu view-dropdown" 
            style={{
              position: 'fixed',
              zIndex: 1000,
            }}
          >
            <div className="dropdown-header">
              <h4>Select View Mode</h4>
            </div>
            <div className="dropdown-options-list">
              {viewOptions.map((option) => (
                <div 
                  key={option.id} 
                  className={`dropdown-option ${option.id === activeView ? 'active' : ''}`}
                  onClick={() => handleViewChange(option.id)}
                >
                  <div className="dropdown-option-dot"></div>
                  <span>{option.label}</span>
                  {option.id === activeView && <span className="current-indicator">Current</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render date picker dropdown
  const renderDatePicker = () => {
    return (
      <div className="selector-container">
        <div 
          className="selector-button" 
          onClick={() => setDatePickerOpen(!datePickerOpen)}
          ref={dateButtonRef}
          disabled={availableDates.length === 0}
        >
          <FaCalendarAlt className="icon" />
          <span>{selectedDate || 'Select Date'}</span>
        </div>
        
        {datePickerOpen && availableDates.length > 0 && (
          <div 
            className="dropdown-menu date-dropdown" 
            style={{
              position: 'fixed',
              zIndex: 1000,
            }}
          >
            <div className="dropdown-header">
              <h4>Select Date</h4>
            </div>
            <div className="dropdown-options-list">
              {availableDates.map((date) => (
                <div 
                  key={date} 
                  className={`dropdown-option ${date === selectedDate ? 'active' : ''}`}
                  onClick={() => handleDateChange(date)}
                >
                  <div className="dropdown-option-dot"></div>
                  <span>{date}</span>
                  {date === selectedDate && <span className="current-indicator">Current</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render opacity slider
  const renderOpacityControl = () => {
    return (
      <div className="opacity-control-container">
        <label htmlFor="opacity-slider" className="opacity-label">
          Layer Opacity:
        </label>
        <div className="opacity-slider-container">
          <input
            id="opacity-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={layerOpacity}
            onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
            className="opacity-slider"
          />
          <span className="opacity-value">{Math.round(layerOpacity * 100)}%</span>
        </div>
      </div>
    );
  };

  // Render legend based on active view
  const renderLegend = () => {
    const currentView = viewOptions.find(option => option.id === activeView);
    if (!currentView) return null;
    
    if (activeView === 'phenology') {
      const phenologyStages = [
        { name: 'Germination', color: '#FF0000' },
        { name: 'Tillering', color: '#FF8033' },
        { name: 'Jointing', color: '#FFFF00' },
        { name: 'Booting and Heading', color: '#66FF4D' },
        { name: 'Anthesis', color: '#0000FF' },
        { name: 'Grain Filling', color: '#FF00FF' },
        { name: 'Maturity', color: '#00FFFF' }
      ];
      
      return (
        <div className="legend-overlay">
          <h4 className="legend-header">{currentView.legendTitle}</h4>
          <div className="legend-content">
            {phenologyStages.map((stage, index) => (
              <div key={index} className="legend-item" style={{background: 'transparent'}}>
                <div className="legend-color" style={{ backgroundColor: stage.color }}></div>
                <span className="legend-item-title" style={{background: 'transparent'}}>{stage.name}</span>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (activeView === 'false_color') {
      const falseColorElements = [
        { name: 'Healthy Vegetation', color: '#FF0000', description: 'Appears bright red' },
        { name: 'Urban Areas', color: '#0000FF', description: 'Appear blue-gray' },
        { name: 'Soils/Bare Ground', color: '#8B4513', description: 'Appear brown to light brown' },
        { name: 'Water', color: '#000000', description: 'Appears dark blue to black' }
      ];
      
      return (
        <div className="legend-overlay">
          <h4 className="legend-header">{currentView.legendTitle}</h4>
          <p className="legend-subtitle">Near-infrared reflectance highlights plant health and moisture</p>
          <div className="legend-content">
            {falseColorElements.map((element, index) => (
              <div key={index} className="legend-item" style={{background: 'transparent'}}>
                <div className="legend-color" style={{ backgroundColor: element.color }}></div>
                <div className="legend-item-text" style={{background: 'transparent'}}>
                  <div className="legend-item-title" style={{background: 'transparent'}}>{element.name}</div>
                  <div className="legend-item-desc" style={{background: 'transparent'}}>{element.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (activeView === 'ndvi') {
      return (
        <div className="legend-overlay">
          <h4 className="legend-header">{currentView.legendTitle}</h4>
          <div className="ndvi-container">
            <div className="ndvi-vertical-gradient"></div>
            <div className="ndvi-labels">
              <span style={{background: 'transparent'}}>High Vigor</span>
              <span className="mt-auto" style={{background: 'transparent'}}>Low Vigor</span>
            </div>
          </div>
        </div>
      );
    } else if (activeView === 'rgb') {
      return (
        <div className="legend-overlay">
          <h4 className="legend-header">{currentView.legendTitle}</h4>
          <p className="legend-subtitle">
            High-resolution UAV imagery with enhanced clarity
          </p>
        </div>
      );
    }
    
    return null;
  };

  // Function to refresh data
  const refreshData = () => {
    // Re-fetch the current view and date
    if (selectedDate) {
      // Re-trigger the useEffect by creating a new Date object
      setSelectedDate(selectedDate + ''); // Force state change
    }
  };

  return (
    <div className="uav-viewer-container">
      {/* Top fixed controls */}
      <div className="top-fixed-controls">
        <button 
          className="refresh-button"
          onClick={refreshData}
          disabled={isLoading}
        >
          <IoIosRefresh className={isLoading ? 'spin' : ''} /> Refresh
        </button>
        
        <button 
          className={`controls-toggle ${controlsOpen ? 'active' : ''}`}
          onClick={() => setControlsOpen(!controlsOpen)}
        >
          {controlsOpen ? 'Hide Controls' : 'Show Controls'}
        </button>
      </div>
      
      {/* Controls panel with unified styling */}
      <div className="satellite-controls-area" style={{ display: controlsOpen ? 'block' : 'none' }}>
        <div className="satellite-controls-panel">
          <div className="controls-row">
            <div className="control-third">
              <h4 className="control-label">View Mode</h4>
              {renderViewPicker()}
            </div>
            
            <div className="control-third">
              <h4 className="control-label">Image Date</h4>
              {renderDatePicker()}
            </div>
            
            <div className="control-third">
              <h4 className="control-label">Layer Settings</h4>
              {renderOpacityControl()}
            </div>
          </div>
        </div>
      </div>

      {/* Map container with matching styling */}
      <div className="satellite-map-container">
        {!isLoading && viewData ? (
          <>
            <div className="satellite-map-inner">
              <MapContainer
                center={[0, 0]}
                zoom={2}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={false}
                preferCanvas={true}
              >
                {/* Base satellite imagery layer */}
                <Pane name="satellite-pane" style={{ zIndex: 20 }}>
                  <TileLayer 
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Esri, Maxar, Earthstar Geographics, and the GIS User Community"
                  />
                </Pane>
                
                {/* UAV imagery overlay layer */}
                <Pane name="uav-imagery-pane" style={{ zIndex: 30 }}>
                  <GeoTIFFOverlay 
                    base64Data={viewData}
                    activeView={activeView}
                    layerOpacity={layerOpacity}
                  />
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
                
                {/* Fit to specified bounding box */}
                <FitBounds bounds={wgs84BoundingBox} />
                
                {/* Map controls */}
                <MapControls 
                  rgbData={rgbData}
                  ndviData={ndviData}
                  phenologyData={phenologyData}
                  falseColorData={falseColorData}
                  activeView={activeView}
                />
              </MapContainer>
            </div>
            
            {/* Legend overlay to match SatelliteViewer styling */}
            {renderLegend()}
            
            {/* Date info display in the corner */}
            <div className="last-updated">
              Imagery date: {selectedDate || 'Unknown'}
            </div>
          </>
        ) : isLoading ? (
          <div className="loading-container">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="error-container">
            <div className="error-message">
              {error || "UAV imagery is not yet available for this field."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UAVImageryMap;