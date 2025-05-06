import React, { useEffect, useState } from 'react';
import { FaSeedling, FaWater, FaShieldAlt, FaCogs } from 'react-icons/fa';
import '../styles/RecommendationSummary.css';

const RecommendationSummary = ({ reportContent }) => {
  const [summaryData, setSummaryData] = useState({
    fertilizer: '',
    irrigation: '',
    protection: '',
    other: ''
  });

  useEffect(() => {
    if (reportContent) {
      extractSummaryContent(reportContent);
    }
  }, [reportContent]);

  const extractSummaryContent = (content) => {
    // Extract content between <SummaryResponse> tags
    const summaryRegex = /<SummarizedResponse>([\s\S]*?)<\/SummarizedResponse>/;
    const summaryMatch = content.match(summaryRegex);
    
    if (!summaryMatch) return;
    
    const summaryContent = summaryMatch[1].trim();
    
    // Extract sections based on tags
    const fertilizerRegex = /<Fertilizer>([\s\S]*?)<\/Fertilizer>/;
    const irrigationRegex = /<Irrigation>([\s\S]*?)<\/Irrigation>/;
    const protectionRegex = /<Protection>([\s\S]*?)<\/Protection>/;
    const otherRegex = /<Other Actions>([\s\S]*?)<\/Other Actions>/;
    
    const extractSection = (regex) => {
      const match = summaryContent.match(regex);
      if (!match) return '';
      
      // Keep the original content structure but clean up escapes
      let processedContent = match[1].trim();
      
      // Replace escape sequences but preserve the dash characters
      processedContent = processedContent
        .replace(/\\n/g, ' ') // Replace \n with space
        .replace(/\n/g, ' ')  // Replace actual new lines with space
        .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
        .replace(/\\u2013/g, '–') // Replace \u2013 with en dash
        .replace(/\\u2023/g, '-'); // Replace \u2023 with hyphen
      
      return processedContent;
    };
    
    setSummaryData({
      fertilizer: extractSection(fertilizerRegex),
      irrigation: extractSection(irrigationRegex),
      protection: extractSection(protectionRegex),
      other: extractSection(otherRegex)
    });
  };

  // Better function to parse and present list items
  const formatContentList = (content) => {
    if (!content) return <p className="empty-message">No recommendations available.</p>;
    
    // For debugging
    //console.log("Content received:", content);
    
    // If content doesn't have any dash prefixes, return as regular text
    if (!content.includes('-')) {
      return <p className="recommendation-text">{content}</p>;
    }
    
    // Manually construct list items
    const listItems = [];
    let currentText = content.trim();
    
    // Force add a space after any dash that doesn't have one (for consistent parsing)
    currentText = currentText.replace(/(\-\S)/g, '- $1'.slice(2));
    
    // Break the content at each dash
    const parts = currentText.split('- ');
    
    // Process each part (skipping the first if it's empty which is common)
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (i === 0 && !part) continue; // Skip empty first part
      if (!part) continue; // Skip any empty parts
      
      // Process item text (handle bold, italic)
      const processedItem = part
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic
      
      listItems.push(
        <li 
          key={i} 
          className="recommendation-item"
          dangerouslySetInnerHTML={{ __html: processedItem }}
        />
      );
    }
    
    if (listItems.length === 0) {
      // If no list items were found, return as regular text
      return <p className="recommendation-text">{content}</p>;
    }
    
    return <ul className="recommendation-list">{listItems}</ul>;
  };

  const recommendationCards = [
    {
      id: 'fertilizer',
      title: 'Fertilizer',
      icon: <FaSeedling className="card-icon-rec fertilizer-icon" />,
      content: summaryData.fertilizer,
      color: '#27ae60',
      gradientClass: 'fertilizer-gradient'
    },
    {
      id: 'irrigation',
      title: 'Irrigation',
      icon: <FaWater className="card-icon-rec irrigation-icon" />,
      content: summaryData.irrigation,
      color: '#3498db',
      gradientClass: 'irrigation-gradient'
    },
    {
      id: 'protection',
      title: 'Protection',
      icon: <FaShieldAlt className="card-icon-rec protection-icon" />,
      content: summaryData.protection,
      color: '#e74c3c',
      gradientClass: 'protection-gradient'
    },
    {
      id: 'other',
      title: 'Other Recommendations',
      icon: <FaCogs className="card-icon-rec other-icon" />,
      content: summaryData.other,
      color: '#9b59b6',
      gradientClass: 'other-gradient'
    }
  ];

  if (!reportContent) {
    return (
      <div className="recommendation-summary-container">
        <div className="recommendation-empty-state">
          <h3>Recommendations</h3>
          <p>Recommendations for this field are being prepared.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendation-summary-container">
      <div className="recommendation-header">
        <h3>Recommendations</h3>
        <div className="header-accent"></div>
        <p className="recommendation-subtitle">Key actions for optimal crop management</p>
      </div>

      <div className="recommendation-cards-grid">
        {recommendationCards.map((card, index) => (
          <div 
            key={card.id} 
            className={`recommendation-card ${card.gradientClass}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="recommendation-card-header">
              {card.icon}
              <h4>{card.title}</h4>
            </div>
            <div className="recommendation-card-content">
              {formatContentList(card.content)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendationSummary;