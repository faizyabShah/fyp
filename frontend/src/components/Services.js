import React from "react";
import "../styles/Services.css";
import Card from "./Card";

const Services = () => {
    return (
        <>
        <div className=" services-sec">
            <div className="d-flex p-4 flex-column ">
                <h1 className="service-head head-highlight">Explore Our Services</h1>
                <p className="w-75"> We offer accurate estimation of the growth stage of your wheat crop, and what it needs. Now you can get all the AI powered suggestions to improve your crop yeild, from the comfort of your bed..</p>
            </div>
            <div className="row">
                <div className="col-md-4"><Card title={'Wheat Phenology Estimation'} description={"Get accurate estimation of the growth stage of your wheat crop."} imgSrc={'./media/card-background.jpg'}/></div>
                <div className="col-md-4"><Card title={'Wheat Production Estimate'} description={"Get an in-season estimate of your crop's approximate yeild production."} imgSrc={'./media/background.png'}/></div>
                <div className="col-md-4"><Card title={'Actionable Recommendations'} description={"Get AI powered recommendations to boost your crop yeild."} imgSrc={'./media/card-background2.jpg'}/></div>
            </div>
        </div>
        </>
    );
}

export default Services;