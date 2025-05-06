import React, { useState } from 'react';
import { FaRegListAlt, FaClipboardList, FaChartBar, FaAngleDown, FaAngleUp, FaSatellite, FaLeaf, FaCheck } from 'react-icons/fa';
import { PiDrone } from "react-icons/pi";
import "../styles/Sidebar.css";

const Sidebar = ({ activeTab, setActiveTab }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [fieldsExpanded, setFieldsExpanded] = useState(false);

  const handleMouseEnter = () => setIsCollapsed(false);
  const handleMouseLeave = () => setIsCollapsed(true);

  const toggleStats = (e) => {
    e.stopPropagation();
    setStatsExpanded(!statsExpanded);
    if (!statsExpanded) {
      setActiveTab('satellite-stats');
    }
  };

  const toggleFields = (e) => {
    e.stopPropagation();
    setFieldsExpanded(!fieldsExpanded);
    if (!fieldsExpanded) {
      setActiveTab('active-fields');
    }
  };

  return (
    <div 
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="sidebar-content">
        <div className="sidebar-logo">
          <span className="logo-text">WheatInsight</span>
        </div>
        
        <ul className="sidebar-menu">
          <li className="sidebar-section">
            <div 
              className={`sidebar-item ${activeTab.includes('stats') ? 'active' : ''}`}
              onClick={toggleStats}
            >
              <div className="sidebar-item-content">
                <FaChartBar className="sidebar-icon" />
                <span className="sidebar-text">Statistics</span>
              </div>
              <div className="sidebar-dropdown-icon">
                {statsExpanded ? <FaAngleUp /> : <FaAngleDown />}
              </div>
            </div>
            
            {(statsExpanded || isCollapsed && statsExpanded) && (
              <ul className={`sidebar-submenu ${isCollapsed ? 'collapsed-submenu' : ''}`}>
                <li 
                  className={`sidebar-subitem ${activeTab === 'uav-stats' ? 'active' : ''}`}
                  onClick={() => setActiveTab('uav-stats')}
                >
                  <div className="sidebar-subitem-content">
                    <PiDrone className="sidebar-subicon" />
                    <span className="sidebar-subtext">UAV Analytics</span>
                  </div>
                </li>
                <li 
                  className={`sidebar-subitem ${activeTab === 'satellite-stats' ? 'active' : ''}`}
                  onClick={() => setActiveTab('satellite-stats')}
                >
                  <div className="sidebar-subitem-content">
                    <FaSatellite className="sidebar-subicon" />
                    <span className="sidebar-subtext">Satellite Data</span>
                  </div>
                </li>
              </ul>
            )}
          </li>

          <li className="sidebar-section">
            <div 
              className={`sidebar-item ${activeTab.includes('fields') ? 'active' : ''}`}
              onClick={toggleFields}
            >
              <div className="sidebar-item-content">
                <FaRegListAlt className="sidebar-icon" />
                <span className="sidebar-text">Field Management</span>
              </div>
              <div className="sidebar-dropdown-icon">
                {fieldsExpanded ? <FaAngleUp /> : <FaAngleDown />}
              </div>
            </div>

            {(fieldsExpanded || isCollapsed && fieldsExpanded) && (
              <ul className={`sidebar-submenu ${isCollapsed ? 'collapsed-submenu' : ''}`}>
                <li 
                  className={`sidebar-subitem ${activeTab === 'active-fields' ? 'active' : ''}`}
                  onClick={() => setActiveTab('active-fields')}
                >
                  <div className="sidebar-subitem-content">
                    <FaLeaf className="sidebar-subicon" />
                    <span className="sidebar-subtext">Active Fields</span>
                  </div>
                </li>
                <li 
                  className={`sidebar-subitem ${activeTab === 'harvested-fields' ? 'active' : ''}`}
                  onClick={() => setActiveTab('harvested-fields')}
                >
                  <div className="sidebar-subitem-content">
                    <FaCheck className="sidebar-subicon" />
                    <span className="sidebar-subtext">Harvested Fields</span>
                  </div>
                </li>
              </ul>
            )}
          </li>

          <li className="sidebar-section">
            <div 
              className={`sidebar-item ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              <div className="sidebar-item-content">
                <FaClipboardList className="sidebar-icon" />
                <span className="sidebar-text">Data Requests</span>
              </div>
            </div>
          </li>
        </ul>
      </div>
      
      <div className="sidebar-footer">
        <span className="footer-text">WheatInsight v1.0</span>
      </div>
    </div>
  );
};

export default Sidebar;