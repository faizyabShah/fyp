import React from "react";
import "../styles/Services.css";
import Card from "./Card";

const Services = () => {
    return (
        <>
        <div className=" services-sec">
            <div className="d-flex p-4 flex-column ">
                <h1 className="service-head head-highlight">Explore Our Services</h1>
                <p className="w-75"> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Non illo labore obcaecati magni des
                    erunt molestias laborum ipsa necessitatibus eligendi mollitia nemo nam, velit ea quibusdam! Quidem alias eius t
                    empora accusamus. Lorem ipsum dolor, sit amet consectetur adipisicing elit. Non illo labore obcaecati magni deserunt molestias laborum ipsa necessitatibus eligendi mollitia nemo nam, velit ea quibusdam! Quidem alias eius tempora accusamus.</p>
            </div>
            <div className="row">
                <div className="col-md-4"><Card title={'Titles 12'} description={"HELLO i am the description i should be long enoiugh to fit the content of the page ahahahahhah sounds good faizie you are such baddie"} imgSrc={'./media/card-background.jpg'}/></div>
                <div className="col-md-4"><Card title={'Titles 12'} description={"HELLO i am the description i should be long enoiugh to fit the content of the page ahahahahhah sounds good faizie you are such baddie"} imgSrc={'./media/background.png'}/></div>
                <div className="col-md-4"><Card title={'Titles 12'} description={"HELLO i am the description i should be long enoiugh to fit the content of the page ahahahahhah sounds good faizie you are such baddie"} imgSrc={'./media/card-background2.jpg'}/></div>
            </div>
        </div>
        </>
    );
}

export default Services;