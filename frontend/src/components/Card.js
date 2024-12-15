import React from 'react';
import '../styles/Card.css';
import { AiFillStar } from "react-icons/ai";


const Card = ({title, description, imgSrc}) => {
    return (
        <div className="cardd">
            <img className='img-fluid' src={imgSrc}/>
            <div className="inner">
                <div className="d-flex justify-content-center">
                    <div className="nob my-3"></div>
                </div>
                <h1>{title}</h1>
                <p>{description}</p>
                <div className="d-flex justify-content-center">
                    <AiFillStar className='icon'/>
                    <AiFillStar className='icon'/>
                    <AiFillStar className='icon'/>
                </div>
            </div>
        </div>
    );
}

export default Card;