import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Scatter
} from 'recharts';

import '../styles/VegetationTrends.css'; // Import your CSS styles here

// Enhanced custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-date">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className={`tooltip-item ${entry.dataKey}`}>
            <span className="label">{entry.name}:</span>
            <span className="value" style={{ color: entry.color }}>
              {entry.value !== null ? entry.value.toFixed(3) : 'N/A'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Chart type selector component
const ChartTypeSelector = ({ selectedType, onTypeChange }) => {
  const chartTypes = [
    { id: 'line', label: 'Line', icon: 'chart-line' },
    { id: 'area', label: 'Area', icon: 'chart-area' },
    { id: 'bar', label: 'Bar', icon: 'chart-bar' },
    { id: 'composed', label: 'Composed', icon: 'chart-pie' }
  ];

  return (
    <div className="chart-type-selector">
      {chartTypes.map(type => (
        <button
          key={type.id}
          className={`chart-type-btn ${selectedType === type.id ? 'active' : ''}`}
          onClick={() => onTypeChange(type.id)}
        >
          <i className={`fas fa-${type.icon}`}></i>
          <span>{type.label}</span>
        </button>
      ))}
    </div>
  );
};

// Date range selector component
const DateRangeSelector = ({ onRangeChange, selectedRange }) => {
  const ranges = [
    { id: 'all', label: 'All Data' },
    { id: '6m', label: '6 Months' },
    { id: '3m', label: '3 Months' },
    { id: '1m', label: '1 Month' }
  ];

  return (
    <div className="date-range-selector">
      {ranges.map(range => (
        <button
          key={range.id}
          className={`date-range-btn ${selectedRange === range.id ? 'active' : ''}`}
          onClick={() => onRangeChange(range.id)}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};

// Index selector component
const IndexSelector = ({ indices, selectedIndices, onIndexChange }) => {
  return (
    <div className="index-selector">
      {indices.map(index => (
        <label key={index.id} className="index-checkbox">
          <input
            type="checkbox"
            checked={selectedIndices.includes(index.id)}
            onChange={() => onIndexChange(index.id)}
          />
          <span className="checkbox-label" style={{ color: index.color }}>
            <i className={`fas fa-${index.icon}`}></i>
            {index.label}
          </span>
        </label>
      ))}
    </div>
  );
};

// Compact Info Card Component
const CompactInfoCard = ({ title, value, icon, color, trend }) => {
  return (
    <div className="compact-info-card" style={{ borderLeftColor: color }}>
      <div className="info-card-icon" style={{ backgroundColor: `${color}20`, color }}>
        <i className={`fas fa-${icon}`}></i>
      </div>
      <div className="compact-info-content">
        <div className="compact-info-title">{title}</div>
        <div className="compact-info-value" style={{ color }}>{value}</div>
      </div>
      <div className="compact-info-trend">
        {trend > 0 ? (
          <span className="trend up">
            <i className="fas fa-arrow-up"></i> {Math.abs(trend).toFixed(1)}%
          </span>
        ) : trend < 0 ? (
          <span className="trend down">
            <i className="fas fa-arrow-down"></i> {Math.abs(trend).toFixed(1)}%
          </span>
        ) : (
          <span className="trend neutral">
            <i className="fas fa-minus"></i> 0%
          </span>
        )}
      </div>
    </div>
  );
};

// This component is an enhanced version with more options
const EnhancedVegetationTrends = ({ selectedField, token }) => {
  const [timeseriesData, setTimeseriesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('line');
  const [dateRange, setDateRange] = useState('all');
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState(['ndvi', 'savi']);
  
  // Available vegetation indices
  const availableIndices = [
    { id: 'ndvi', label: 'NDVI', color: '#4CAF50', icon: 'leaf' },
    { id: 'savi', label: 'SAVI', color: '#2196F3', icon: 'seedling' }
  ];

  useEffect(() => {
    if (!selectedField || !selectedField.id) {
      setIsLoading(false);
      return;
    }
    
    const fetchTimeseriesData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`http://localhost:5000/satellite/${selectedField.id}/timeseries`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch timeseries data');
        }

        const data = await response.json();
        
        // Format the data for charts
        const formattedData = (data.timeseries || []).map(item => ({
          date: formatDate(item.date),
          ndvi: item.ndvi !== null ? parseFloat(item.ndvi) : null,
          savi: item.savi !== null ? parseFloat(item.savi) : null,
          // Keep the original date for sorting and filtering
          originalDate: new Date(item.date)
        }));
        
        // Sort by date
        formattedData.sort((a, b) => a.originalDate - b.originalDate);
        
        setTimeseriesData(formattedData);
        setFilteredData(formattedData); // Initialize with all data
      } catch (err) {
        console.error('Error fetching timeseries data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeseriesData();
  }, [selectedField, token]);

  // Apply date range filter
  useEffect(() => {
    if (!timeseriesData || timeseriesData.length === 0) return;
    
    let filtered = [...timeseriesData];
    
    if (dateRange !== 'all') {
      // Use most recent date in data as reference point instead of current date
      const mostRecentDateInData = new Date(Math.max(
        ...timeseriesData
          .filter(item => item.originalDate instanceof Date)
          .map(item => item.originalDate.getTime())
      ));
      
      let monthsBack = 1;
      if (dateRange === '3m') monthsBack = 3;
      if (dateRange === '6m') monthsBack = 6;
      
      const cutoffDate = new Date(mostRecentDateInData);
      cutoffDate.setMonth(mostRecentDateInData.getMonth() - monthsBack);
      
      // Filter to only include dates after the cutoff
      filtered = filtered.filter(item => {
        // Ensure we have a valid date to compare
        if (!item.originalDate || !(item.originalDate instanceof Date)) return false;
        return item.originalDate >= cutoffDate;
      });
      
      console.log(`Filtering data for ${dateRange} range:`, {
        totalData: timeseriesData.length,
        filteredData: filtered.length,
        mostRecentDate: mostRecentDateInData,
        cutoffDate,
        firstAvailableDate: timeseriesData.length > 0 ? timeseriesData[0].originalDate : 'none',
        lastAvailableDate: timeseriesData.length > 0 ? 
          timeseriesData[timeseriesData.length - 1].originalDate : 'none'
      });
      
      // If no data in the selected range, fallback to showing all data
      if (filtered.length === 0) {
        console.log("No data in selected range, showing all data instead");
        filtered = [...timeseriesData];
        // Set the date range to 'all' to reflect the actual data being shown
        setTimeout(() => setDateRange('all'), 0);
      }
    }
    
    setFilteredData(filtered);
  }, [dateRange, timeseriesData]);

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString;
    }
  };

  // Calculate averages and trends
  const calculateStats = () => {
    if (!filteredData || !filteredData.length) {
      return {
        ndvi: { avg: '0.000', trend: 0 },
        savi: { avg: '0.000', trend: 0 }
      };
    }
    
    // Calculate averages
    let ndviSum = 0;
    let saviSum = 0;
    let ndviCount = 0;
    let saviCount = 0;
    
    filteredData.forEach(item => {
      if (item.ndvi !== null && !isNaN(item.ndvi)) {
        ndviSum += item.ndvi;
        ndviCount++;
      }
      if (item.savi !== null && !isNaN(item.savi)) {
        saviSum += item.savi;
        saviCount++;
      }
    });
    
    const avgNdvi = ndviCount ? (ndviSum / ndviCount) : 0;
    const avgSavi = saviCount ? (saviSum / saviCount) : 0;
    
    // Calculate trends (percentage change from first to last)
    let ndviTrend = 0;
    let saviTrend = 0;
    
    if (filteredData.length >= 2) {
      const firstValidNdvi = filteredData.find(item => item.ndvi !== null);
      const lastValidNdvi = [...filteredData].reverse().find(item => item.ndvi !== null);
      
      const firstValidSavi = filteredData.find(item => item.savi !== null);
      const lastValidSavi = [...filteredData].reverse().find(item => item.savi !== null);
      
      if (firstValidNdvi && lastValidNdvi && firstValidNdvi.ndvi !== 0) {
        ndviTrend = ((lastValidNdvi.ndvi - firstValidNdvi.ndvi) / Math.abs(firstValidNdvi.ndvi)) * 100;
      }
      
      if (firstValidSavi && lastValidSavi && firstValidSavi.savi !== 0) {
        saviTrend = ((lastValidSavi.savi - firstValidSavi.savi) / Math.abs(firstValidSavi.savi)) * 100;
      }
    }
    
    return {
      ndvi: { avg: avgNdvi.toFixed(3), trend: ndviTrend },
      savi: { avg: avgSavi.toFixed(3), trend: saviTrend }
    };
  };

  // Calculate min and max values for chart scaling
  const getMinMaxValues = () => {
    if (!filteredData || !filteredData.length) return { min: 0, max: 1 };
    
    const allValues = [];
    filteredData.forEach(item => {
      if (selectedIndices.includes('ndvi') && item.ndvi !== null && !isNaN(item.ndvi)) {
        allValues.push(item.ndvi);
      }
      if (selectedIndices.includes('savi') && item.savi !== null && !isNaN(item.savi)) {
        allValues.push(item.savi);
      }
    });
    
    if (!allValues.length) return { min: 0, max: 1 };
    
    // Add some padding to the min/max
    let min = Math.min(...allValues) - 0.05;
    let max = Math.max(...allValues) + 0.05;
    
    // Ensure min doesn't go below -0.1 (typical lower bound for these indices)
    min = Math.max(min, -0.1);
    // Ensure max doesn't exceed 1 (typical upper bound for these indices)
    max = Math.min(max, 1);
    
    return { min, max };
  };

  const handleToggleIndex = (indexId) => {
    setSelectedIndices(prev => {
      // Don't allow deselecting all indices
      if (prev.length === 1 && prev.includes(indexId)) {
        return prev;
      }
      
      if (prev.includes(indexId)) {
        return prev.filter(id => id !== indexId);
      } else {
        return [...prev, indexId];
      }
    });
  };

  const stats = calculateStats();
  const { min, max } = getMinMaxValues();
  
  // Render appropriate chart based on chartType
  const renderChart = () => {
    if (!filteredData || !filteredData.length) return null;
    
    const commonProps = {
      data: filteredData,
      margin: { top: 10, right: 30, left: 0, bottom: 40 }
    };
    
    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              {selectedIndices.includes('ndvi') && (
                <linearGradient id="colorNdvi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.1}/>
                </linearGradient>
              )}
              {selectedIndices.includes('savi') && (
                <linearGradient id="colorSavi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#2196F3" stopOpacity={0.1}/>
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              domain={[min, max]}
              tick={{ fontSize: 12 }}
              tickFormatter={value => value.toFixed(2)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedIndices.includes('ndvi') && (
              <Area
                type="monotone"
                dataKey="ndvi"
                name="NDVI"
                stroke="#4CAF50"
                fillOpacity={1}
                fill="url(#colorNdvi)"
                animationDuration={1500}
                connectNulls
              />
            )}
            {selectedIndices.includes('savi') && (
              <Area
                type="monotone"
                dataKey="savi"
                name="SAVI"
                stroke="#2196F3"
                fillOpacity={1}
                fill="url(#colorSavi)"
                animationDuration={1500}
                connectNulls
              />
            )}
          </AreaChart>
        );
        
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              domain={[min, max]}
              tick={{ fontSize: 12 }}
              tickFormatter={value => value.toFixed(2)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedIndices.includes('ndvi') && (
              <Bar
                dataKey="ndvi"
                name="NDVI"
                fill="#4CAF50"
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
              />
            )}
            {selectedIndices.includes('savi') && (
              <Bar
                dataKey="savi"
                name="SAVI"
                fill="#2196F3"
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
              />
            )}
          </BarChart>
        );
        
      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              domain={[min, max]}
              tick={{ fontSize: 12 }}
              tickFormatter={value => value.toFixed(2)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedIndices.includes('ndvi') && (
              <>
                <Line
                  type="monotone"
                  dataKey="ndvi"
                  name="NDVI"
                  stroke="#4CAF50"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#4CAF50", strokeWidth: 1 }}
                  activeDot={{ r: 6, fill: "#4CAF50", stroke: "#fff", strokeWidth: 2 }}
                  animationDuration={1500}
                  connectNulls
                />
                <Scatter
                  dataKey="ndvi"
                  fill="#4CAF50"
                  name="NDVI Points"
                  legendType="none"
                />
              </>
            )}
            {selectedIndices.includes('savi') && (
              <>
                <Bar
                  dataKey="savi"
                  name="SAVI"
                  fill="#2196F380"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                />
              </>
            )}
          </ComposedChart>
        );
        
      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              domain={[min, max]}
              tick={{ fontSize: 12 }}
              tickFormatter={value => value.toFixed(2)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedIndices.includes('ndvi') && (
              <Line
                type="monotone"
                dataKey="ndvi"
                name="NDVI"
                stroke="#4CAF50"
                strokeWidth={3}
                dot={{ r: 4, fill: "#4CAF50", strokeWidth: 1 }}
                activeDot={{ r: 6, fill: "#4CAF50", stroke: "#fff", strokeWidth: 2 }}
                animationDuration={1500}
                connectNulls
              />
            )}
            {selectedIndices.includes('savi') && (
              <Line
                type="monotone"
                dataKey="savi"
                name="SAVI"
                stroke="#2196F3"
                strokeWidth={3}
                dot={{ r: 4, fill: "#2196F3", strokeWidth: 1 }}
                activeDot={{ r: 6, fill: "#2196F3", stroke: "#fff", strokeWidth: 2 }}
                animationDuration={1500}
                connectNulls
              />
            )}
          </LineChart>
        );
    }
  };

  // Simple rendering states
  if (isLoading) {
    return (
      <div className="vegetation-trends">
        <h3 className="trends-title">Vegetation Health Trends</h3>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading vegetation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vegetation-trends">
        <h3 className="trends-title">Vegetation Health Trends</h3>
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          <p>Unable to load vegetation data: {error}</p>
          <button className="retry-button">
            <i className="fas fa-sync-alt"></i> Retry
          </button>
        </div>
      </div>
    );
  }

  // Check if we have any timeseries data at all
  if (!timeseriesData || timeseriesData.length === 0) {
    return (
      <div className="vegetation-trends">
        <h3 className="trends-title">Vegetation Health Trends</h3>
        <div className="no-data-message">
          <div className="no-data-icon">
            <i className="fas fa-leaf"></i>
          </div>
          <p>No vegetation data available for this field yet.</p>
          <p className="no-data-help">Data will appear here after satellite imagery is processed.</p>
        </div>
      </div>
    );
  }

  // If we have overall data but no data in the selected timeframe
  if (timeseriesData.length > 0 && filteredData.length === 0) {
    // Simplified version that matches the screenshot
    return (
      <div className="vegetation-trends" style={{ textAlign: 'center' }}>
        <div style={{ 
          backgroundColor: '#e8f5e9', 
          borderRadius: '50%', 
          width: '80px', 
          height: '80px', 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '40px auto 20px' 
        }}>
          <i className="fas fa-calendar-times" style={{ 
            color: '#4CAF50', 
            fontSize: '32px' 
          }}></i>
        </div>
        
        <h3 style={{ 
          margin: '20px 0', 
          fontWeight: '400', 
          color: '#444' 
        }}>
          No vegetation data available for the selected time period.
        </h3>
        
        <p style={{ 
          color: '#777',
          margin: '10px 0 30px',
          fontSize: '16px' 
        }}>
          Try selecting a different time range or check back later.
        </p>
        
        <button 
          onClick={() => setDateRange('all')}
          style={{ 
            backgroundColor: '#FF5722',
            color: 'white',
            border: 'none',
            borderRadius: '30px',
            padding: '12px 30px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'inline-block',
            margin: '0 auto'
          }}
        >
          Show All Available Data
        </button>
      </div>
    );
  }

  return (
    <div className="vegetation-trends">
      <div className="trends-header">
        <h3 className="trends-title">
          <i className="fas fa-chart-line"></i>
          Vegetation Health Trends
        </h3>
        <div className="trends-actions">
          <button 
            className="trends-action-btn" 
            onClick={() => setShowExplanation(!showExplanation)}
          >
            <i className={`fas fa-${showExplanation ? 'minus' : 'info'}-circle`}></i>
            {showExplanation ? 'Hide Info' : 'About Indices'}
          </button>
          <button className="trends-action-btn">
            <i className="fas fa-download"></i>
            Export Data
          </button>
        </div>
      </div>
      
      {showExplanation && (
        <div className="index-explanation">
          <div className="explanation-item">
            <h4><i className="fas fa-info-circle"></i> Understanding Vegetation Indices</h4>
            <p><strong>NDVI</strong> (Normalized Difference Vegetation Index) measures vegetation health and density. Values range from -1 to 1, with higher values (0.6 to 0.9) indicating dense, healthy vegetation.</p>
            <p><strong>SAVI</strong> (Soil Adjusted Vegetation Index) is similar to NDVI but accounts for soil brightness, making it more accurate in areas with visible soil or low vegetation cover.</p>
            <div className="indices-scale">
              <div className="scale-gradient"></div>
              <div className="scale-labels">
                <span>Poor (-0.1)</span>
                <span>Moderate (0.3)</span>
                <span>Good (0.6)</span>
                <span>Excellent (0.9)</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="all-controls-container">
        <div className="metrics-and-controls-wrapper">
          {/* Compact metrics cards now in same row as other controls */}
          <div className="compact-metrics">
            {selectedIndices.includes('ndvi') && (
              <CompactInfoCard
                title="Avg. NDVI"
                value={stats.ndvi.avg}
                icon="chart-line"
                color="#4CAF50"
                trend={stats.ndvi.trend}
              />
            )}
            
            {selectedIndices.includes('savi') && (
              <CompactInfoCard
                title="Avg. SAVI"
                value={stats.savi.avg}
                icon="seedling"
                color="#2196F3"
                trend={stats.savi.trend}
              />
            )}
          </div>

          <div className="controls-section">
            <div className="control-group">
              <h4>Chart Type</h4>
              <ChartTypeSelector selectedType={chartType} onTypeChange={setChartType} />
            </div>
            
            <div className="control-group">
              <h4>Time Range</h4>
              <DateRangeSelector selectedRange={dateRange} onRangeChange={setDateRange} />
            </div>
            
            <div className="control-group">
              <h4>Indices</h4>
              <IndexSelector
                indices={availableIndices}
                selectedIndices={selectedIndices}
                onIndexChange={handleToggleIndex}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={350}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
      
    </div>
  );
};

export default EnhancedVegetationTrends;