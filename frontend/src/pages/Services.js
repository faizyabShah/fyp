// create a page that uses cards to show our services offered, that includes a title and a description, the services are phenological stage estimation, yeild estimation, and actionable recommendations

import React from 'react';
import './Services.css';
import Card from '../components/Card';


const Services = () => {
    return (
        <div className="services" id="Services">
            <h1>Our Services</h1>
            <div className="card-container">
                <Card title="Phenological Stage Estimation" description="Estimate the phenological stage of your crops" />
                <Card title="Yield Estimation" description="Estimate the yield of your crops" />
                <Card title="Actionable Recommendations" description="Recommendations to improve crop yeild and health" />
            </div>
        </div>
    );
}

export default Services;