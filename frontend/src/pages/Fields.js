import React, { useState, useEffect } from 'react';
import { FaEdit, FaCheck, FaLeaf, FaMapMarkerAlt, FaCalendarAlt, FaRuler, FaTrash } from 'react-icons/fa';
import { RiPlantFill } from 'react-icons/ri';
import Modal from '../components/Modal';
import AddFieldForm from '../components/AddFieldForm';
import LeafletMap from '../components/LeafletMap';
import '../styles/Fields.css';
import { useNavigate } from 'react-router-dom';
import MessageDialog from '../components/MessageDialog';


// Field Edit Form component - shared by both ActiveFields and HarvestedFields
const FieldEditForm = ({ field, token, onClose, updateFieldsList }) => {
  const [fieldData, setFieldData] = useState({
    name: field.name || '',
    crop: field.crop || '',
    area: field.area || '',
    location: field.location || '',
    plantation_date: field.plantation_date || '',
    coordinates: field.coordinates || null
  });
  const [coordinates, setCoordinates] = useState(field.coordinates || null);
  const [area, setArea] = useState(field.area || null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFieldData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Include the updated coordinates and area in the field data
    const updatedFieldData = {
      ...fieldData,
      coordinates: coordinates ? String(coordinates) : fieldData.coordinates,
      area: area ? parseFloat(area.toFixed(2)) : fieldData.area
    };

    try {
      const response = await fetch(`http://localhost:5000/fields/${field.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedFieldData)
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
      
      <div className="form-content">
        <div className="map-column">
          <div className="form-group">
            <label>Coordinates (Polygon):</label>
            <div className="map-container">
              <LeafletMap 
                setCoordinates={setCoordinates} 
                setArea={setArea} 
                initialCoordinates={fieldData.coordinates}
              />
            </div>
            {area && (
              <div className="area-display">
                <p>Field Area: {area.toFixed(2)} hectares</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="inputs-column">
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
        </div>
      </div>
      
      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
        <button type="submit" className="primary-btn">Save Changes</button>
      </div>
    </form>
  );
};

// FieldCard Component - shared by both ActiveFields and HarvestedFields
const FieldCard = ({ field, onEdit, onDelete, onToggleHarvest }) => {
  return (
    <div className={`field-card ${field.harvest ? 'harvested' : ''}`}>
      <div className="field-image">
        <img 
          src={'https://th-i.thgim.com/public/incoming/3h45oz/article69225994.ece/alternates/LANDSCAPE_1200/2025-02-12T112913Z_1564877728_RC2DU9AAFCNS_RTRMADP_3_CANADA-AGRICULTURE.JPG'} 
          alt={field.name} 
          className="img-fluid" 
        />
        {field.harvest && (
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
          onClick={() => onEdit(field)}
        >
          <FaEdit /> Edit
        </button>
        
        <button 
          className="delete-btn" 
          onClick={() => onDelete(field)}
        >
          <FaTrash /> Delete
        </button>
        
        <button 
          className={`${field.harvest ? 'active-btn' : 'harvest-btn'}`}
          onClick={() => onToggleHarvest(field)}
        >
          <FaCheck /> {field.harvest ? 'Mark as Active' : 'Mark as Harvested'}
        </button>
      </div>
    </div>
  );
};

// Delete Confirmation Modal - shared component
const DeleteConfirmModal = ({ showModal, onClose, fieldName, onConfirm }) => (
  <Modal showModal={showModal} onClose={onClose}>
    <div className="delete-confirm-modal">
      <h3>Delete Field</h3>
      <p>Are you sure you want to delete the field "{fieldName}"? This action cannot be undone.</p>
      <div className="modal-actions">
        <button className="secondary-btn" onClick={onClose}>Cancel</button>
        <button className="delete-btn" onClick={onConfirm}>Delete Field</button>
      </div>
    </div>
  </Modal>
);

// Harvest Toggle Confirmation Modal - shared component
const HarvestConfirmModal = ({ showModal, onClose, field, onConfirm }) => (
  <Modal showModal={showModal} onClose={onClose}>
    <div className="harvest-confirm-modal">
      <h3>{field?.harvest ? 'Mark as Active' : 'Mark as Harvested'}</h3>
      <p>
        {field?.harvest 
          ? `Are you sure you want to mark "${field?.name}" as active again?` 
          : `Are you sure you want to mark "${field?.name}" as harvested?`}
      </p>
      <div className="modal-actions">
        <button className="secondary-btn" onClick={onClose}>Cancel</button>
        <button className="harvest-btn" onClick={onConfirm}>
          {field?.harvest ? 'Mark as Active' : 'Mark as Harvested'}
        </button>
      </div>
    </div>
  </Modal>
);

// ActiveFields Component - completely separated
const ActiveFields = ({ token, fetchFields }) => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentField, setCurrentField] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState(null);
  const [showHarvestConfirm, setShowHarvestConfirm] = useState(false);
  const [fieldToHarvest, setFieldToHarvest] = useState(null);
  const [userFieldData, setUserFieldData] = useState([]);
  
  const navigate = useNavigate();

  const toggleAddFieldForm = () => setShowAddFieldForm(true);
  const closeAddFieldForm = () => setShowAddFieldForm(false);
  
  const handleEditClick = (field) => {
    setCurrentField(field);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentField(null);
  };

  const handleDeleteClick = (field) => {
    setFieldToDelete(field);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setFieldToDelete(null);
  };

  const confirmDelete = async () => {
    if (!fieldToDelete) return;
    
    try {
      const response = await fetch(`http://localhost:5000/fields/${fieldToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchActiveFields(); // Refresh fields after deletion
        closeDeleteConfirm();
      } else {
        console.error('Failed to delete field');
      }
    } catch (error) {
      console.error('Error deleting field:', error);
    }
  };

  const handleHarvestClick = (field) => {
    setFieldToHarvest(field);
    setShowHarvestConfirm(true);
  };

  const closeHarvestConfirm = () => {
    setShowHarvestConfirm(false);
    setFieldToHarvest(null);
  };

  const confirmHarvest = async () => {
    if (!fieldToHarvest) return;
    
    try {
      const response = await fetch(`http://localhost:5000/fields/${fieldToHarvest.id}/harvest`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ harvest: !fieldToHarvest.harvest })
      });

      if (response.ok) {
        fetchActiveFields(); // Refresh fields after update
        closeHarvestConfirm();
      } else {
        console.error('Failed to update harvest status');
      }
    } catch (error) {
      console.error('Error updating harvest status:', error);
    }
  };

  const fetchActiveFields = async () => {
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
        // Filter only active fields
        setFields(data.filter(field => !field.harvest));
      } else {
        console.error('Failed to fetch fields');
      }
    } catch (error) {
      console.error('Error fetching fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const showAddMessage = () => {
    const message = 'Field added successfully!';
    const type = 'success';
    const duration = 3000; // 3 seconds
    const messageDialog = (
      <MessageDialog
        message={message}
        type={type}
        onClose={() => setUserFieldData([])} // Clear the message after closing
      />
    );
    setUserFieldData(messageDialog);
  };

  useEffect(() => {
    fetchActiveFields();
  }, [token]);

  return (
    <div className="active-fields-container">
      <div className="row pad-5">
        <div className="col-md-12 px-5 pt-5 border-bottom border-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="section-heading">Active Fields</h2>
              <p className="section-subheading">Manage your currently growing crops</p>
            </div>
          </div>
          {fields.length > 0 && (
            <div className="field-counts text-muted mb-3">
              <span>Showing: {fields.length} active fields</span>
            </div>
          )}
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
              <h3 className="text-grey">You don't have any active fields yet</h3>
              <button className="primary-btn" onClick={toggleAddFieldForm}>Add New Field</button>
            </div>
          </div>
        ) : (
          <>
          <div className="fields-list py-4">
            {fields.map((field) => (
              <FieldCard 
                key={field._id} 
                field={field}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onToggleHarvest={handleHarvestClick}
              />
            ))}
          </div>
          <div className="col-md-12 p-5">
          <div className="box-cont d-flex flex-column align-items-center gap-4">
            <button className="primary-btn" onClick={toggleAddFieldForm}>Add Another Field</button>
          </div>
        </div>
        </>
        )}
      </div>
      
      
    
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
      
      {showDeleteConfirm && fieldToDelete && (
        <DeleteConfirmModal 
          showModal={showDeleteConfirm} 
          onClose={closeDeleteConfirm} 
          fieldName={fieldToDelete.name}
          onConfirm={confirmDelete}
        />
      )}
      
      {showHarvestConfirm && fieldToHarvest && (
        <HarvestConfirmModal 
          showModal={showHarvestConfirm} 
          onClose={closeHarvestConfirm}
          field={fieldToHarvest}
          onConfirm={confirmHarvest}
        />
      )}
      
      {showAddFieldForm && (
        <Modal showModal={showAddFieldForm} onClose={closeAddFieldForm}>
          <AddFieldForm 
            token={token} 
            setUserFieldData={setUserFieldData}
            navigate={navigate}
            onSuccess={() => {
              fetchActiveFields();
              closeAddFieldForm();
              showAddMessage();
            }}
          />
        </Modal>
      )}
    </div>
  );
};

// HarvestedFields Component - completely separated
const HarvestedFields = ({ token, fetchFields }) => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentField, setCurrentField] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState(null);
  const [showHarvestConfirm, setShowHarvestConfirm] = useState(false);
  const [fieldToHarvest, setFieldToHarvest] = useState(null);
  const [userFieldData, setUserFieldData] = useState([]);
  
  const navigate = useNavigate();

  const toggleAddFieldForm = () => setShowAddFieldForm(true);
  const closeAddFieldForm = () => setShowAddFieldForm(false);
  
  const handleEditClick = (field) => {
    setCurrentField(field);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentField(null);
  };

  const handleDeleteClick = (field) => {
    setFieldToDelete(field);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setFieldToDelete(null);
  };

  const confirmDelete = async () => {
    if (!fieldToDelete) return;
    
    try {
      const response = await fetch(`http://localhost:5000/fields/${fieldToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchFields(); // Refresh fields after deletion
        closeDeleteConfirm();
      } else {
        console.error('Failed to delete field');
      }
    } catch (error) {
      console.error('Error deleting field:', error);
    }
  };

  const handleHarvestClick = (field) => {
    setFieldToHarvest(field);
    setShowHarvestConfirm(true);
  };

  const closeHarvestConfirm = () => {
    setShowHarvestConfirm(false);
    setFieldToHarvest(null);
  };

  const confirmHarvest = async () => {
    if (!fieldToHarvest) return;
    
    try {
      const response = await fetch(`http://localhost:5000/fields/${fieldToHarvest.id}/harvest`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ harvest: !fieldToHarvest.harvest })
      });

      if (response.ok) {
        fetchFields(); // Refresh fields after update
        closeHarvestConfirm();
      } else {
        console.error('Failed to update harvest status');
      }
    } catch (error) {
      console.error('Error updating harvest status:', error);
    }
  };

  const fetchHarvestedFields = async () => {
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
        // Filter only harvested fields
        setFields(data.filter(field => field.harvest));
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
    fetchHarvestedFields();
  }, [token]);

  return (
    <div className="harvested-fields-container">
      <div className="row pad-5">
        <div className="col-md-12 px-5 pt-5 border-bottom border-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="section-heading">Harvested Fields</h2>
              <p className="section-subheading">View your previously harvested crops</p>
            </div>
          </div>
          {fields.length > 0 && (
            <div className="field-counts text-muted mb-3">
              <span>Showing: {fields.length} harvested fields</span>
            </div>
          )}
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
              <h3 className="text-grey">You don't have any harvested fields yet</h3>
              <button className="primary-btn" onClick={toggleAddFieldForm}>Add New Field</button>
            </div>
          </div>
        ) : (
          <div className="fields-list py-4">
            {fields.map((field) => (
              <FieldCard 
                key={field._id} 
                field={field}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onToggleHarvest={handleHarvestClick}
              />
            ))}
          </div>
        )}
      </div>
      
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
      
      {showDeleteConfirm && fieldToDelete && (
        <DeleteConfirmModal 
          showModal={showDeleteConfirm} 
          onClose={closeDeleteConfirm} 
          fieldName={fieldToDelete.name}
          onConfirm={confirmDelete}
        />
      )}
      
      {showHarvestConfirm && fieldToHarvest && (
        <HarvestConfirmModal 
          showModal={showHarvestConfirm} 
          onClose={closeHarvestConfirm}
          field={fieldToHarvest}
          onConfirm={confirmHarvest}
        />
      )}
      
      {showAddFieldForm && (
        <Modal showModal={showAddFieldForm} onClose={closeAddFieldForm}>
          <AddFieldForm 
            token={token} 
            setUserFieldData={setUserFieldData}
            navigate={navigate}
            onSuccess={() => {
              fetchHarvestedFields();
              closeAddFieldForm();
            }}
          />
        </Modal>
      )}
    </div>
  );
};

// Main Fields component that decides which view to show
const Fields = ({ token, viewType = 'active' }) => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="fields-container pt-5" id="Fields">
      {viewType === 'active' ? (
        <ActiveFields token={token} fetchFields={fetchFields} />
      ) : (
        <HarvestedFields token={token} fetchFields={fetchFields} />
      )}
    </div>
  );
};

export default Fields;