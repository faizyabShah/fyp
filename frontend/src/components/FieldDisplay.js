import React, { useState } from "react";
import "../styles/FieldDisplay.css";
import ReadOnlyMap from "./ReadOnlyMap";

const FieldDisplay = ({ fieldInfo, selectedField, setSelectedField }) => {
    return (
        <div className="no-field box-cont d-flex flex-column">
            <div className="d-flex justify-content-between">
                <h4 className="mx-3">{selectedField}</h4>
                <select onChange={(e) => setSelectedField(e.target.value)} 
                className="dropdown w-50 form-select" value={selectedField}>
                    <option disabled value="">Select Another Field</option>
                    {fieldInfo.map((data) => (
                        <option key={data} value={data}>{data}</option>
                    ))}
                </select>
            </div>
            <div className="map-container-ro">
                <ReadOnlyMap fieldName={selectedField} />
            </div>
        </div>
    );
};

export default FieldDisplay;
