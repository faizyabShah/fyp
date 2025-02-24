import React from "react";
import "../styles/FieldDisplay.css";
import ReadOnlyMap from "./ReadOnlyMap";

const FieldDisplay = ({ fieldInfo, selectedField, setSelectedField }) => {
  const handleFieldChange = (e) => {
    const fieldName = e.target.value;
    // Find the full field object using the selected name
    const newSelectedField = fieldInfo.find((field) => field.name === fieldName);
    setSelectedField(newSelectedField);
  };

  return (
    <div className="no-field box-cont d-flex flex-column">
      <div className="d-flex justify-content-between">
        {/* Safely display the field name if `selectedField` is not null */}
        <h4 className="mx-3">{selectedField?.name || "No field selected"}</h4>
        
        <select
          onChange={handleFieldChange}
          className="dropdown w-50 form-select"
          // The select's value is the current field's name, or an empty string if none selected
          value={selectedField?.name || ""}
        >
          <option disabled value="">
            Select Another Field
          </option>
          {fieldInfo.map((field) => (
            // The `value` is now the field's name (string)
            <option key={field.name} value={field.name}>
              {field.name}
            </option>
          ))}
        </select>
      </div>
      <div className="map-container-ro">
        {/* Pass the entire field object to the ReadOnlyMap */}
        <ReadOnlyMap selectedField={selectedField} />
      </div>
    </div>
  );
};

export default FieldDisplay;
