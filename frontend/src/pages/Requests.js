import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaTrash, FaCheckCircle, FaTimesCircle, FaClock, FaPlus } from 'react-icons/fa';
import { RiPlantFill } from 'react-icons/ri';
import Modal from '../components/Modal';
import { useNavigate } from 'react-router-dom';
import '../styles/Requests.css';

const AddRequestForm = ({ token, fields, onClose, updateRequestsList }) => {
  const [requestData, setRequestData] = useState({
    field_id: '',
    date_for_flight: '',
    notes: ''
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setRequestData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:5000/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...requestData,
          requested_date: new Date().toISOString().split('T')[0]
        })
      });
      
      if (response.ok) {
        updateRequestsList();
        onClose();
      } else {
        console.error('Failed to add request');
      }
    } catch (error) {
      console.error('Error adding request:', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="request-form">
      <h2>Request Drone Flight</h2>
      
      <div className="form-group">
        <label>Select Field</label>
        <select 
          name="field_id" 
          value={requestData.field_id} 
          onChange={handleChange} 
          className="form-control"
          required
        >
          <option value="">Select a field</option>
          {fields.map(field => (
            <option key={field.id} value={field.id}>
              {field.name} ({field.location})
            </option>
          ))}
        </select>
      </div>
      
      <div className="form-group">
        <label>Requested Flight Date</label>
        <input 
          type="date" 
          name="date_for_flight" 
          value={requestData.date_for_flight} 
          onChange={handleChange} 
          className="form-control"
          required
          min={new Date().toISOString().split('T')[0]}
        />
      </div>
      
      <div className="form-group">
        <label>Notes (Optional)</label>
        <textarea 
          name="notes" 
          value={requestData.notes} 
          onChange={handleChange} 
          className="form-control"
          rows="4"
          placeholder="Additional information about your request"
        />
      </div>
      
      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
        <button type="submit" className="primary-btn">Submit Request</button>
      </div>
    </form>
  );
};

const Requests = ({ token }) => {
  const [requests, setRequests] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  
  const navigate = useNavigate();
  
  // Fetch requests from the backend
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/requests', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      } else {
        console.error('Failed to fetch requests');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch fields for the dropdown
  const fetchFields = async () => {
    try {
      const response = await fetch('http://localhost:5000/fields', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFields(data);
      } else {
        console.error('Failed to fetch fields');
      }
    } catch (error) {
      console.error('Error fetching fields:', error);
    }
  };
  
  useEffect(() => {
    fetchRequests();
    fetchFields();
  }, [token]);
  
  const toggleAddForm = () => setShowAddForm(true);
  const closeAddForm = () => setShowAddForm(false);
  
  const handleDeleteClick = (request) => {
    setRequestToDelete(request);
    setShowDeleteConfirm(true);
  };
  
  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setRequestToDelete(null);
  };
  
  const confirmDelete = async () => {
    if (!requestToDelete) return;
    
    try {
      const response = await fetch(`http://localhost:5000/requests/${requestToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        fetchRequests(); // Refresh requests after deletion
        closeDeleteConfirm();
      } else {
        console.error('Failed to delete request');
      }
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };
  
  // Helper function to get field name by ID
  const getFieldName = (fieldId) => {
    const field = fields.find(f => f.id === fieldId);
    return field ? field.name : 'Unknown Field';
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // Status badge component
  const StatusBadge = ({ status }) => {
    let icon, className;
    
    switch(status) {
      case 'approved':
        icon = <FaCheckCircle />;
        className = 'status-badge-approved';
        break;
      case 'rejected':
        icon = <FaTimesCircle />;
        className = 'status-badge-rejected';
        break;
      case 'pending':
      default:
        icon = <FaClock />;
        className = 'status-badge-pending';
    }
    
    return (
      <div className={`status-badge ${className}`}>
        {icon} 
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </div>
    );
  };
  
  // Delete confirmation modal component
  const DeleteConfirmModal = () => (
    <Modal showModal={showDeleteConfirm} onClose={closeDeleteConfirm}>
      <div className="delete-confirm-modal">
        <h3>Delete Request</h3>
        <p>Are you sure you want to delete this request for {getFieldName(requestToDelete?.fieldid)}? This action cannot be undone.</p>
        <div className="modal-actions">
          <button className="secondary-btn" onClick={closeDeleteConfirm}>Cancel</button>
          <button className="delete-btn" onClick={confirmDelete}>Delete Request</button>
        </div>
      </div>
    </Modal>
  );
  
  return (
    <div className="requests-container pt-5" id="Requests">
      <div className="row pad-5">
        <div className="col-md-12 px-5 pt-5 border-bottom border-3">
          <h2 className="section-heading">Drone Flight Requests</h2>
          <p className="section-subheading">Schedule and manage your field inspection requests</p>
        </div>
        
        <div className="col-md-12 px-5 pt-4">
          <button className="add-request-btn" onClick={toggleAddForm}>
            <FaPlus /> New Request
          </button>
        </div>
        
        {loading ? (
          <div className="col-md-12 text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="col-md-12 p-5">
            <div className="no-requests box-cont d-flex justify-content-center flex-column align-items-center gap-4">
              <h3 className="text-grey">You don't have any drone flight requests yet</h3>
              <button className="primary-btn" onClick={toggleAddForm}>Request Drone Flight</button>
            </div>
          </div>
        ) : (
          <div className="requests-list py-4">
            {requests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-details">
                  <div className="request-header">
                    <h3 className="field-name">{getFieldName(request.fieldid)}</h3>
                    <StatusBadge status={request.status} />
                  </div>
                  
                  <div className="request-info">
                    <div className="info-item">
                      <RiPlantFill className="icon" />
                      <span>Field ID: {request.fieldid}</span>
                    </div>
                    
                    <div className="info-item">
                      <FaCalendarAlt className="icon" />
                      <span>Requested on: {formatDate(request.requested_date)}</span>
                    </div>
                    
                    <div className="info-item">
                      <FaCalendarAlt className="icon" />
                      <span>Flight Date: {formatDate(request.date_for_flight)}</span>
                    </div>
                  </div>
                  
                  {request.notes && (
                    <div className="request-notes">
                      <h4>Notes:</h4>
                      <p>{request.notes}</p>
                    </div>
                  )}
                </div>
                
                <div className="request-actions">
                  {request.status === 'pending' && (
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDeleteClick(request)}
                    >
                      <FaTrash /> Cancel Request
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {showAddForm && (
        <Modal showModal={showAddForm} onClose={closeAddForm}>
          <AddRequestForm 
            token={token} 
            fields={fields} 
            onClose={closeAddForm} 
            updateRequestsList={fetchRequests} 
          />
        </Modal>
      )}
      
      {showDeleteConfirm && requestToDelete && <DeleteConfirmModal />}
    </div>
  );
};

export default Requests;