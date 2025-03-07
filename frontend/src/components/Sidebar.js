import React, { useState } from 'react';
import { FaRegListAlt, FaClipboardList, FaChartBar } from 'react-icons/fa'; // Icons for the sidebar
import "../styles/Sidebar.css";

const Sidebar = ({ activeTab, setActiveTab }) => {
    const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed by default

    // Toggle the collapse state on hover
    const handleMouseEnter = () => setIsCollapsed(false); // Expand on hover
    const handleMouseLeave = () => setIsCollapsed(true);  // Collapse when mouse leaves

    return (
        <div 
            className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}

        >
            <ul>
            <li 
                    className={`sidebar-item ${activeTab === 'stats' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stats')}
                >
                    <FaChartBar className="sidebar-icon" />
                    <span className="sidebar-text">Stats</span>
                </li>
                <li 
                    className={`sidebar-item ${activeTab === 'fields' ? 'active' : ''}`}
                    onClick={() => setActiveTab('fields')}
                >
                    <FaRegListAlt className="sidebar-icon" />
                    <span className="sidebar-text">Fields</span>
                </li>
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