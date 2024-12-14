import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Requests.css';
import Navbar from '../components/Navbar';

const Requests = () => {
    // Hardcoded requests data
    const requests = [
        {
            id: 1,
            name: 'Request 1',
            location: 'Field 1',
            date: '2021-10-10',
            status: 'Pending',
            coordinates: 'Placeholder Map View'
        },
        {
            id: 2,
            name: 'Request 2',
            location: 'Field 2',
            date: '2021-10-11',
            status: 'Approved',
            coordinates: 'Placeholder Map View'
        },
        {
            id: 3,
            name: 'Request 3',
            location: 'Field 3',
            date: '2021-10-12',
            status: 'Rejected',
            coordinates: 'Placeholder Map View'
        }
    ];

    const navigate = useNavigate();

    const handleViewDetails = (id) => {
        navigate(`/requests/${id}`);
    };

    return (
        <div>
            <Navbar />
            <div className="container mt-4 requests">
                <h1 className="text-center mb-4">Requests</h1>
                <div className="row">
                    {requests.map((request) => (
                        <div key={request.id} className="col-md-6 mb-4">
                            <div className="card shadow h-100">
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <h5 className="card-title mb-2">{request.name}</h5>
                                        <span className={`badge bg-${request.status === 'Pending' ? 'warning' : request.status === 'Approved' ? 'success' : 'danger'}`}>{request.status}</span>
                                    </div>
                                    <p className="text-muted mb-1">Requested on: {request.date}</p>
                                    <p className="text-muted mb-1">Location: {request.location}</p>
                                    <div className="mt-3">
                                        <div className="map-placeholder text-center border rounded" style={{ height: '150px' }}>
                                            <p className="mt-5">{request.coordinates}</p>
                                        </div>
                                    </div>
                                    <div className="text-center mt-3">
                                        <button className="btn btn-primary" onClick={() => handleViewDetails(request.id)}>
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Requests;