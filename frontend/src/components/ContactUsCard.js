import React from "react";
import "../styles/ContactUsCard.css";

const ContactUsCard = () => {

    return (
        <>
        <div className="row contac-margin">
            <div className="col-md-7 d-flex justify-content-center padding-contact flex-column">
                <h1 className="txt-lg-contact head-highlight">Want to Know more about how it's done?</h1>
                <p className="txt-sm-contact">Let's Get in Touch!</p>
                <button className='primary-btn'>Contact Us</button>
            </div>
            <div className="col-md-5 p-4">
                <img className="img-fluid" src='./media/contactus.jpg'></img>
            </div>
        </div>
        </>
    );
}

export default ContactUsCard;