import React, { useState, useEffect } from 'react';
import { FaEdit, FaCheck, FaLeaf, FaMapMarkerAlt, FaCalendarAlt, FaRuler } from 'react-icons/fa';
import { RiPlantFill } from 'react-icons/ri';
import Modal from '../components/Modal';
import AddFieldForm from '../components/AddFieldForm';
import '../styles/Fields.css';
import { useNavigate } from 'react-router-dom';

const FieldEditForm = ({ field, token, onClose, updateFieldsList }) => {
  const [fieldData, setFieldData] = useState({
    name: field.name || '',
    crop: field.crop || '',
    area: field.area || '',
    location: field.location || '',
    plantingDate: field.plantingDate || '',
    description: field.description || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFieldData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/fields`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fieldData)
      });

      if (response.ok) {
        updateFieldsList();
        onClose();
      } else {
        console.error('Failed to update field');
      }
    } catch (error) {
      console.error('Error updating field:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="field-edit-form">
      <h2>Edit Field</h2>
      
      <div className="form-group">
        <label>Field Name</label>
        <input 
          type="text" 
          name="name" 
          value={fieldData.name} 
          onChange={handleChange} 
          className="form-control"
          required
        />
      </div>
      
      <div className="form-group">
        <label>Crop Type</label>
        <input 
          type="text" 
          name="crop" 
          value={fieldData.crop} 
          onChange={handleChange} 
          className="form-control"
          required
        />
      </div>
      
      <div className="form-group">
        <label>Area (hectares)</label>
        <input 
          type="number" 
          name="area" 
          value={fieldData.area} 
          onChange={handleChange} 
          className="form-control"
          required
        />
      </div>
      
      <div className="form-group">
        <label>Location</label>
        <input 
          type="text" 
          name="location" 
          value={fieldData.location} 
          onChange={handleChange} 
          className="form-control"
          required
        />
      </div>
      
      <div className="form-group">
        <label>Planting Date</label>
        <input 
          type="date" 
          name="plantingDate" 
          value={fieldData.plantingDate} 
          onChange={handleChange} 
          className="form-control"
          required
        />
      </div>
      
      <div className="form-group">
        <label>Description</label>
        <textarea 
          name="description" 
          value={fieldData.description} 
          onChange={handleChange} 
          className="form-control"
          rows="3"
        />
      </div>
      
      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
        <button type="submit" className="primary-btn">Save Changes</button>
      </div>
    </form>
  );
};

const Fields = ({ token }) => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentField, setCurrentField] = useState(null);
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);
  const [userFieldData, setUserFieldData] = useState([]);

  const navigate = useNavigate();


  // const closeModal = () => setShowModal(false);
  const toggleAddFieldForm = () => setShowAddFieldForm(true);
  const closeForm = () => setShowAddFieldForm(false);

  const fetchFields = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, [token]);

  const handleEditClick = (field) => {
    setCurrentField(field);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentField(null);
  };

  const toggleHarvested = async (fieldId, isHarvested) => {
    try {
      const response = await fetch(`http://localhost:5000/fields/${fieldId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isHarvested: !isHarvested })
      });

      if (response.ok) {
        fetchFields(); // Refresh fields after update
      } else {
        console.error('Failed to update harvest status');
      }
    } catch (error) {
      console.error('Error updating harvest status:', error);
    }
  };

  return (
    <div className="fields-container pt-5" id="Fields">
      <div className="row pad-5">
        <div className="col-md-12 px-5 pt-5 border-bottom border-3">
          <h2 className="section-heading">Your Fields</h2>
          <p className="section-subheading">Manage and monitor all your agricultural plots</p>
        </div>

        {loading ? (
          <div className="col-md-12 text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : fields.length === 0 ? (
          <div className="col-md-12 p-5">
            <div className="no-field box-cont d-flex justify-content-center flex-column align-items-center gap-4">
              <h3 className="text-grey">You don't have any fields yet</h3>
              <button className="primary-btn" onClick={() => toggleAddFieldForm()}>Add New Field</button>
            </div>
          </div>
        ) : (
          <div className="fields-list py-4">
            {fields.map((field) => (
              <div key={field._id} className={`field-card ${field.isHarvested ? 'harvested' : ''}`}>
                <div className="field-image">
                  <img 
                    src={'https://th-i.thgim.com/public/incoming/3h45oz/article69225994.ece/alternates/LANDSCAPE_1200/2025-02-12T112913Z_1564877728_RC2DU9AAFCNS_RTRMADP_3_CANADA-AGRICULTURE.JPG'} 
                    alt={field.name} 
                    className="img-fluid" 
                  />
                  {field.isHarvested && (
                    <div className="harvested-badge">
                      <FaCheck /> Harvested
                    </div>
                  )}
                </div>
                <div className="field-details">
                  <h3 className="field-name">{field.name}</h3>
                  
                  <div className="field-info">
                    <div className="info-item">
                      <RiPlantFill className="icon" />
                      <span>{field.crop || 'Not specified'}</span>
                    </div>
                    
                    <div className="info-item">
                      <FaRuler className="icon" />
                      <span>{field.area || '0'} hectares</span>
                    </div>
                    
                    <div className="info-item">
                      <FaMapMarkerAlt className="icon" />
                      <span>{field.location || 'Not specified'}</span>
                    </div>
                    
                    <div className="info-item">
                      <FaCalendarAlt className="icon" />
                      <span>{field.plantation_date ? new Date(field.plantation_date).toLocaleDateString() : 'Not specified'}</span>
                    </div>
                    
                    {field.description && (
                      <div className="field-description">
                        <p>{field.description}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="field-health">
                    <div className="health-bar">
                      <div 
                        className="health-level" 
                        style={{ width: `${field.healthPercent || 85}%` }}
                      ></div>
                    </div>
                    <div className="health-label">
                      <FaLeaf className="icon" />
                      <span>Crop Health: {field.healthPercent || 85}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="field-actions">
                  <button 
                    className="edit-btn" 
                    onClick={() => handleEditClick(field)}
                  >
                    <FaEdit /> Edit
                  </button>
                  
                  <label className="harvest-checkbox">
                    <input 
                      type="checkbox" 
                      checked={field.isHarvested || false}
                      onChange={() => toggleHarvested(field._id, field.isHarvested)}
                    />
                    <span className="checkmark"></span>
                    Mark as Harvested
                  </label>
                </div>
              </div>
              
            ))}
          </div>
        )}
      </div>
      <div className="col-md-12 p-5">
            <div className="no-field box-cont d-flex flex-column align-items-center gap-4">
              <button className="primary-btn" onClick={() => toggleAddFieldForm()}>Add Another Field</button>
            </div>
          </div>
    
        {showAddFieldForm && (
            <Modal showModal={showAddFieldForm} onClose={closeForm}>
                <AddFieldForm token={token} setUserFieldData={setUserFieldData} navigate={navigate} />
            </Modal>
        )}

      {showModal && currentField && (
        <Modal showModal={showModal} onClose={closeModal}>
          <FieldEditForm 
            field={currentField}
            token={token}
            onClose={closeModal}
            updateFieldsList={fetchFields}
          />
        </Modal>
      )}
      
    </div>
  );
};

export default Fields;