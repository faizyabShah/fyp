import React, { useEffect } from "react";
import "../styles/PhenologyData.css";
import { useState } from "react";

const PhenologyData = (selectedField) => {
    
    const [cropName , setCropName] = useState("Wheat 2024");
    const [acres, setAcres] = useState(0);
    const [scheduled, setScheduled] = useState(0);
    const [phenStage, setPhenStage] = useState(null);

    useEffect(() => {
        setCropName('Wheat');
        setAcres(100);
        setPhenStage('Grain Filling');
        setScheduled(0);
    }, [selectedField]);

    return (
        <>
            <div className="p-2">
                <h4 className="mb-4">Estimated Crop Phenology Stage</h4>
                <div className="d-flex my-5 justify-content-center flex-column align-items-center">
                    <img className="img-fluid phen-stage-img" src='./media/chatbot.png'/>
                    <h2 className="px-3">{phenStage}</h2>
                </div>
                <div className="d-flex justify-content-center">
                    <h5 className="text-end fw-normal w-50"><i>Crop Name</i></h5>
                    <h5 className="text-start fw-bold text-success px-4 w-50">{cropName}</h5>
                </div>
                <div className="d-flex justify-content-center">
                    <h5 className="text-end fw-normal w-50"><i>No. of Acres</i></h5>
                    <h5 className="text-start text-success px-4 fw-bold w-50">{acres}</h5>
                </div>
                <div className="d-flex justify-content-center">
                    <h5 className="text-end fw-normal w-50"><i>Flight Status</i></h5>
                    <h5 className="text-start  px-4 w-50"><span className="status-btn">{scheduled ? 'Scheduled' : 'On Request'}</span></h5>
                </div>
            </div>
        </>
    );
}

export default PhenologyData;