import React, { useEffect, useRef } from 'react';
import '../styles/RecommendationModal.css';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const RecommendationModal = ({ show, handleClose, reportContent }) => {
  const modalRef = useRef(null);
  const backdropRef = useRef(null);

  useEffect(() => {
    // Handle showing/hiding the modal with improved animations
    if (show) {
      document.body.classList.add('modal-open');
      if (backdropRef.current) {
        backdropRef.current.style.display = 'block';
        setTimeout(() => {
          if (backdropRef.current) backdropRef.current.classList.add('show');
        }, 10);
      }
      if (modalRef.current) {
        modalRef.current.style.display = 'block';
        setTimeout(() => {
          if (modalRef.current) modalRef.current.classList.add('show');
        }, 10);
      }
    } else {
      if (modalRef.current) modalRef.current.classList.remove('show');
      if (backdropRef.current) backdropRef.current.classList.remove('show');
      
      setTimeout(() => {
        if (modalRef.current) modalRef.current.style.display = 'none';
        if (backdropRef.current) backdropRef.current.style.display = 'none';
        document.body.classList.remove('modal-open');
      }, 300); // Match the transition duration in CSS
    }
  }, [show]);

  // Function to extract section content
  const extractContent = (content, sectionTag) => {
    if (!content) return '';
    
    // First extract the detailed response
    const detailedMatch = content.match(/<DetailedResponse>([\s\S]*?)<\/DetailedResponse>/);
    if (!detailedMatch || !detailedMatch[1]) return '';
    
    const detailedContent = detailedMatch[1].trim();
    
    // Remove any think blocks
    const contentWithoutThink = detailedContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // Extract the specific section
    const sectionMatch = contentWithoutThink.match(new RegExp(`<${sectionTag}>([\\\s\\\S]*?)<\\/${sectionTag}>`, 'i'));
    if (!sectionMatch || !sectionMatch[1]) return '';
    
    return sectionMatch[1].trim()
      .replace(/\\n/g, '\n')
      .replace(/\\u2013/g, '–')
      .replace(/\\u2023/g, '-');
  };

  // Function to download as PDF
  const downloadPDF = () => {
    const content = document.getElementById('recommendation-content');
    if (!content) return;
    
    // First show loading indicator
    const loadingText = document.createElement('div');
    loadingText.className = 'pdf-loading';
    loadingText.innerHTML = '<div class="spinner-border text-success" role="status"><span class="visually-hidden">Loading...</span></div><span class="ms-2">Generating PDF...</span>';
    content.parentNode.appendChild(loadingText);
    
    html2canvas(content, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    }).then(canvas => {
      // Remove loading indicator
      content.parentNode.removeChild(loadingText);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm (slightly less for margins)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(40, 167, 69); // Green color
      pdf.text('Field Recommendations', 105, 15, { align: 'center' });
      
      // Add first page image (starting a bit lower to account for title)
      pdf.addImage(imgData, 'PNG', 0, 20, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20);
      
      // Add more pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Generate timestamp for filename
      const date = new Date();
      const timestamp = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
      
      // Save the PDF
      pdf.save(`field_recommendations_${timestamp}.pdf`);
    });
  };

  // Sections to display
  const sections = [
    { title: 'Fertilizer', content: extractContent(reportContent, 'Fertilizer') },
    { title: 'Irrigation', content: extractContent(reportContent, 'Irrigation') },
    { title: 'Protection', content: extractContent(reportContent, 'Protection') },
    { title: 'Other Actions', content: extractContent(reportContent, 'Other Actions') }
  ].filter(section => section.content); // Only keep sections with content

  return (
    <>
      {/* Modal backdrop */}
      <div 
        ref={backdropRef}
        className="modal-backdrop fade" 
        style={{ display: 'none' }}
      ></div>

      {/* Modal */}
      <div 
        ref={modalRef}
        className="modal fade recommendation-modal modaal" 
        tabIndex="-1" 
        role="dialog" 
        aria-hidden="true"
        style={{ display: 'none' }}
      >
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable modaal">
          <div className="modal-content">
            {/* Modal Header with icon */}
            <div className="modal-header modal-header-custom">
              <div className="modal-header-content">
                <i className="fas fa-leaf modal-icon"></i>
                <h5 className="modal-title">Detailed Recommendations</h5>
              </div>
              <button 
                type="button" 
                className="btn-close" 
                aria-label="Close"
                onClick={handleClose}
              ></button>
            </div>
            
            {/* Modal Body */}
            <div className="modal-body px-4 py-4">
              {sections.length === 0 ? (
                <div className="text-center text-muted">
                  <p>No detailed recommendations available.</p>
                </div>
              ) : (
                <div id="recommendation-content" className="markdown-content">
                  <div className="section-grid">
                    {sections.map((section, index) => (
                      <div key={index} className="recommendation-card">
                        <div className="recommendation-card-header">
                          <i className={`fas ${getSectionIcon(section.title)} card-icon`}></i>
                          <h3 className="card-title">{section.title}</h3>
                        </div>
                        <div className="recommendation-card-body">
                          <p className="card-content">{section.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-outline-secondary" 
                onClick={handleClose}
              >
                <i className="fas fa-times me-2"></i>Close
              </button>
              <button 
                type="button" 
                className="btn btn-success" 
                onClick={downloadPDF}
                disabled={sections.length === 0}
              >
                <i className="fas fa-download me-2"></i>Download as PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Helper function to get appropriate icon for each section
function getSectionIcon(sectionTitle) {
  switch(sectionTitle.toLowerCase()) {
    case 'fertilizer':
      return 'fa-seedling';
    case 'irrigation':
      return 'fa-tint';
    case 'protection':
      return 'fa-shield-alt';
    case 'other actions':
      return 'fa-tasks';
    default:
      return 'fa-clipboard-list';
  }
}

export default RecommendationModal;