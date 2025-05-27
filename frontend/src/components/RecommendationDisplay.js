import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/RecommendationDisplay.css';

const RecommendationDisplay = ({ reportContent }) => {
  if (!reportContent) {
    return (
      <div className="card border-light p-4 text-center">
        <p className="text-muted">No content to display.</p>
      </div>
    );
  }

  // 1. Extract content between <DetailResponse> tags
  const detailedResponseRegex = /<DetailedResponse>([\s\S]*?)<\/DetailedResponse>/;
  const detailedResponseMatch = reportContent.match(detailedResponseRegex);
  
  if (!detailedResponseMatch) {
    return (
      <div className="card border-light p-4 text-center">
        <p className="text-muted">No detailed response content found.</p>
      </div>
    );
  }
  
  // Get the content from between the tags
  const detailedContent = detailedResponseMatch[1].trim();

  // 2. Remove any <think>...</think> block if present
  const thinkRegex = /<think>[\s\S]*?<\/think>/;
  const contentWithoutThink = detailedContent.replace(thinkRegex, '').trim();

  // 3. Extract content from each section
  const extractSectionContent = (tag) => {
    const regex = new RegExp(`<${tag}>([\\\s\\\S]*?)<\\/${tag}>`);
    const match = contentWithoutThink.match(regex);
    if (match && match[1]) {
      return match[1].trim()
        .replace(/\\n/g, '\n')
        .replace(/\\u2013/g, '–')
        .replace(/\\u2023/g, '-')
        .replace(/\\u201([0-9])/g, (match, p1) => {
          return String.fromCharCode(parseInt('201' + p1, 16));
        });
    }
    return '';
  };

  const sections = [
    { tag: 'Fertilizer', title: 'Fertilizer', content: extractSectionContent('Fertilizer') },
    { tag: 'Irrigation', title: 'Irrigation', content: extractSectionContent('Irrigation') },
    { tag: 'Protection', title: 'Protection', content: extractSectionContent('Protection') },
    { tag: 'OtherActions', title: 'Other Actions', content: extractSectionContent('Other Actions') }
  ];

  return (
    <div className="card card-recommendation border-0 p-4 mb-4">
      <div className="card-body markdown-content">
        {sections.map((section, index) => (
          section.content ? (
            <div key={index} className="mb-4">
              <h3 className="h3 mb-3 mt-4 heading-marker">{section.title}</h3>
              <div className="section-content">
                <p className="p lead mb-3">{section.content}</p>
              </div>
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
};

export default RecommendationDisplay;