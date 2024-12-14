import React, { useEffect } from "react";
import "../styles/PhenologyData.css";
import { useState } from "react";

const PhenologyData = (selectedField) => {
    
    const [cropName , setCropName] = useState("Wheat 2024");
    const [acres, setAcres] = useState(0);
    const [phenStage, setPhenStage] = useState(null);

    useEffect(() => {
        setCropName('ABC');
        setAcres(100);
        setPhenStage('Seedling');
    }, [selectedField]);

    return (
        <>
            <div className="p-2">
                <h4 className="mb-4">Estimated Crop Phenology Data</h4>
                <div className="d-flex my-5 justify-content-center flex-column align-items-center">
                    <img className="img-fluid phen-stage-img" src='./media/chatbot.png'/>
                    <h2 className="px-3">{phenStage}</h2>
                </div>
                <div className="d-flex justify-content-center">
                    <h5 className="text-end fw-normal w-25"><i>Crop Name</i></h5>
                    <div className="w-25"></div>
                    <h5 className="text-start fw-bold text-success w-25">{cropName}</h5>
                </div>
                <div className="d-flex justify-content-center">
                    <h5 className="text-end fw-normal w-25"><i>No. of Acres</i></h5>
                    <div className="w-25"></div>
                    <h5 className="text-start text-success fw-bold w-25">{acres}</h5>
                </div>
            </div>
        </>
    );
}

export default PhenologyData;