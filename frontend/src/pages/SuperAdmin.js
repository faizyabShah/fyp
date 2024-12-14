import React from 'react';
import '../styles/SuperAdmin.css';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const SuperAdmin = () => {
    // Hardcoded values for now
    const scheduledFlights = 10;
    const normalFlights = 25;
    const requestsAccepted = 15;
    const requestsInline = 5;

    let navigate = useNavigate();

    const viewRequests = () => {
        navigate('/requests');
    };

    return (
        <div>
            {/* Navbar */}
            <Navbar />

            <div className="container superadmin">
                {/* Welcome Message */}
                <div className="text-center mb-4">
                    <h1 className="display-4">Welcome, Superadmin!</h1>
                </div>

                <div className="row myrow">
                    {/* Left Card */}
                    <div className="col-md-6 mb-4   left-card">
                        {/* <div className="card shadow p-4"> */}
                        <div>
                            <h4 className="card-title mb-3">Request Statistics</h4>
                            <p className="mb-2">No. of scheduled flights: <strong>{scheduledFlights}</strong></p>
                            <p className="mb-2">No. of Normal flights: <strong>{normalFlights}</strong></p>
                            <p className="mb-2">Requests Accepted: <strong>{requestsAccepted}</strong></p>
                            <p className="mb-2">Requests Inline: <strong>{requestsInline}</strong></p>
                        {/* </div> */}
                        </div>
                    </div>

                    {/* Right Card */}
                    <div className="col-md-4 mb-4 right-card">
                        {/* <div className="card shadow p-4"> */}
                            <h4 className="card-title">View All Requests</h4>
                            <p className="mt-3">Click below to view all user requests.</p>
                            <button className="btn btn-primary mt-2 request-button" onClick={viewRequests}>View Requests</button>
                        {/* </div> */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdmin;
