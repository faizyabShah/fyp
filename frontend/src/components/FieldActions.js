import './FieldActions.css';

function FieldActions({ fetchAIResponse }) {
  return (
    <div className="field-actions">
        <div className='action-buttons'>
      <button className="action-button">Show Request History</button>
      <button className="action-button">Request Flight</button>
      <button className="action-button">Get Detailed Stats</button>
      </div>
      <button className="ai-suggestions-button" onClick={fetchAIResponse}>
        Get AI Suggestions
      </button>
    </div>
  );
}

export default FieldActions;
