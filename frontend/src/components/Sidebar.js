import React, { useState } from 'react';
import { FaRegListAlt, FaClipboardList, FaChartBar, FaAngleDown, FaAngleUp, FaSatellite, FaLeaf, FaCheck } from 'react-icons/fa'; // Added icons for dropdown and subfields
import { PiDrone } from "react-icons/pi";
import "../styles/Sidebar.css";

const Sidebar = ({ activeTab, setActiveTab }) => {
    const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed by default
    const [statsExpanded, setStatsExpanded] = useState(false); // State to track if Stats is expanded
    const [fieldsExpanded, setFieldsExpanded] = useState(false); // New state to track if Fields is expanded

    // Toggle the collapse state on hover
    const handleMouseEnter = () => setIsCollapsed(false); // Expand on hover
    const handleMouseLeave = () => setIsCollapsed(true);  // Collapse when mouse leaves

    // Toggle stats expansion
    const toggleStats = () => {
        setStatsExpanded(!statsExpanded);
        // If expanding stats, also set activeTab to 'stats'
        if (!statsExpanded) {
            setActiveTab('satellite-stats');
        }
    };

    // Toggle fields expansion
    const toggleFields = () => {
        setFieldsExpanded(!fieldsExpanded);
        // If expanding fields, also set activeTab to 'active-fields'
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
            <ul>
                <li 
                    className={`sidebar-item ${activeTab === 'stats' || activeTab === 'uav-stats' || activeTab === 'satellite-stats' ? 'active' : ''}`}
                    onClick={toggleStats}
                >
                    <FaChartBar className="sidebar-icon" />
                    <span className="sidebar-text">Stats</span>
                    {statsExpanded ? 
                        <FaAngleUp className="dropdown-icon" /> : 
                        <FaAngleDown className="dropdown-icon" />
                    }
                </li>
                
                {/* Subfields for Stats - only shown when statsExpanded is true */}
                {statsExpanded && (
                    <>
                        <li 
                            className={`sidebar-subitem ${activeTab === 'uav-stats' ? 'active' : ''}`}
                            onClick={() => setActiveTab('uav-stats')}
                        >
                            <PiDrone className="sidebar-icon subicon" />
                            <span className="sidebar-text">UAV Stats</span>
                        </li>
                        <li 
                            className={`sidebar-subitem ${activeTab === 'satellite-stats' ? 'active' : ''}`}
                            onClick={() => setActiveTab('satellite-stats')}
                        >
                            <FaSatellite className="sidebar-icon subicon" />
                            <span className="sidebar-text">Satellite Stats</span>
                        </li>
                    </>
                )}

                <li 
                    className={`sidebar-item ${activeTab === 'fields' || activeTab === 'active-fields' || activeTab === 'harvested-fields' ? 'active' : ''}`}
                    onClick={toggleFields}
                >
                    <FaRegListAlt className="sidebar-icon" />
                    <span className="sidebar-text">Fields</span>
                    {fieldsExpanded ? 
                        <FaAngleUp className="dropdown-icon" /> : 
                        <FaAngleDown className="dropdown-icon" />
                    }
                </li>

                {/* Subfields for Fields - only shown when fieldsExpanded is true */}
                {fieldsExpanded && (
                    <>
                        <li 
                            className={`sidebar-subitem ${activeTab === 'active-fields' ? 'active' : ''}`}
                            onClick={() => setActiveTab('active-fields')}
                        >
                            <FaLeaf className="sidebar-icon subicon" />
                            <span className="sidebar-text">Active Fields</span>
                        </li>
                        <li 
                            className={`sidebar-subitem ${activeTab === 'harvested-fields' ? 'active' : ''}`}
                            onClick={() => setActiveTab('harvested-fields')}
                        >
                            <FaCheck className="sidebar-icon subicon" />
                            <span className="sidebar-text">Harvested Fields</span>
                        </li>
                    </>
                )}

                <li 
                    className={`sidebar-item ${activeTab === 'requests' ? 'active' : ''}`}
                    onClick={() => setActiveTab('requests')}
                >
                    <FaClipboardList className="sidebar-icon" />
                    <span className="sidebar-text">Requests</span>
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;