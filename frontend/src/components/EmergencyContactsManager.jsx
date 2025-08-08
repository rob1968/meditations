import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';
import ConfirmDialog from './ConfirmDialog';

const EmergencyContactsManager = ({ user, isVisible, onClose }) => {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: '',
    isPrimary: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Confirmation dialog state
  const [confirmState, setConfirmState] = useState({
    show: false,
    message: '',
    onConfirm: null,
    confirmText: '',
    cancelText: ''
  });

  // Helper function to show confirmation dialog
  const showConfirmDialog = (message, onConfirm, confirmText = t('confirm', 'Bevestigen'), cancelText = t('cancel', 'Annuleren')) => {
    setConfirmState({
      show: true,
      message,
      onConfirm,
      confirmText,
      cancelText
    });
  };

  useEffect(() => {
    if (isVisible && user) {
      loadContacts();
    }
  }, [isVisible, user]);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(getFullUrl(`/api/emergency-contacts/${user.id}`));
      
      if (response.data.success) {
        setContacts(response.data.contacts);
      }
    } catch (error) {
      console.error('Error loading emergency contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.relationship) return;

    try {
      setIsSaving(true);
      setError('');

      let response;
      if (editingContact) {
        // Update existing contact
        response = await axios.put(
          getFullUrl(`/api/emergency-contacts/${user.id}/${editingContact.id}`),
          formData
        );
      } else {
        // Add new contact
        response = await axios.post(
          getFullUrl(`/api/emergency-contacts/${user.id}`),
          formData
        );
      }

      if (response.data.success) {
        setContacts(response.data.contacts);
        resetForm();
        // Show success message (optional - could use a toast)
      }
    } catch (error) {
      console.error('Error saving emergency contact:', error);
      setError(editingContact ? t('failedToUpdateContact') : t('failedToAddContact'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (contactId) => {
    showConfirmDialog(
      t('confirmDeleteContact', 'Weet je zeker dat je dit noodcontact wilt verwijderen?'),
      async () => {
        try {
          const response = await axios.delete(
            getFullUrl(`/api/emergency-contacts/${user.id}/${contactId}`)
          );

          if (response.data.success) {
            setContacts(response.data.contacts);
          }
        } catch (error) {
          console.error('Error deleting emergency contact:', error);
          setError(t('failedToDeleteContact'));
        }
      }
    );
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      isPrimary: contact.isPrimary
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      relationship: '',
      isPrimary: false
    });
    setEditingContact(null);
    setShowForm(false);
    setError('');
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)\.]{7,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handlePhoneChange = (value) => {
    setFormData(prev => ({ ...prev, phone: value }));
    if (value && !validatePhone(value)) {
      setError(t('invalidPhoneNumber'));
    } else {
      setError('');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="emergency-contacts-overlay">
      <div className="emergency-contacts-container">
        {/* Header */}
        <div className="emergency-contacts-header">
          <h2>{t('manageEmergencyContacts')}</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="emergency-contacts-content">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>{t('loading')}</p>
            </div>
          ) : (
            <>
              {/* Add Contact Button */}
              {!showForm && (
                <div className="add-contact-section">
                  <button 
                    className="add-contact-btn"
                    onClick={() => setShowForm(true)}
                  >
                    + {t('addEmergencyContact')}
                  </button>
                  <p className="primary-contact-note">
                    💡 {t('primaryContactNote')}
                  </p>
                </div>
              )}

              {/* Contact Form */}
              {showForm && (
                <div className="contact-form-section">
                  <h3>{editingContact ? t('editEmergencyContact') : t('addEmergencyContact')}</h3>
                  
                  <form onSubmit={handleSubmit} className="contact-form">
                    <div className="form-group">
                      <label>{t('emergencyContactName')}</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={t('emergencyContactName')}
                        required
                        maxLength={100}
                      />
                    </div>

                    <div className="form-group">
                      <label>{t('emergencyContactPhone')}</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder={t('phonePlaceholder')}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>{t('emergencyContactRelationship')}</label>
                      <input
                        type="text"
                        value={formData.relationship}
                        onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
                        placeholder={t('relationshipPlaceholder')}
                        required
                        maxLength={50}
                      />
                    </div>

                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.isPrimary}
                          onChange={(e) => setFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
                        />
                        <span className="checkmark"></span>
                        {t('primaryContact')}
                      </label>
                    </div>

                    {error && (
                      <div className="error-message">
                        {error}
                      </div>
                    )}

                    <div className="form-actions">
                      <button 
                        type="button" 
                        className="cancel-btn"
                        onClick={resetForm}
                        disabled={isSaving}
                      >
                        {t('cancel')}
                      </button>
                      <button 
                        type="submit" 
                        className="save-btn"
                        disabled={isSaving || !formData.name || !formData.phone || !formData.relationship || (formData.phone && !validatePhone(formData.phone))}
                      >
                        {isSaving ? t('saving') : t('saveContact')}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Contacts List */}
              <div className="contacts-list-section">
                {contacts.length === 0 ? (
                  <div className="no-contacts">
                    <div className="no-contacts-icon">📞</div>
                    <h3>{t('noEmergencyContacts')}</h3>
                    <p>{t('addFirstEmergencyContact')}</p>
                  </div>
                ) : (
                  <div className="contacts-list">
                    <h3>{t('emergencyContacts')} ({contacts.length})</h3>
                    {contacts.map((contact) => (
                      <div key={contact.id} className={`contact-card ${contact.isPrimary ? 'primary' : ''}`}>
                        <div className="contact-info">
                          <div className="contact-header">
                            <h4>
                              {contact.name}
                              {contact.isPrimary && (
                                <span className="primary-badge">
                                  ⭐ {t('primaryContact')}
                                </span>
                              )}
                            </h4>
                            <span className="contact-relationship">{contact.relationship}</span>
                          </div>
                          <div className="contact-phone">
                            📞 {contact.phone}
                          </div>
                        </div>
                        
                        <div className="contact-actions">
                          <button 
                            className="edit-btn"
                            onClick={() => handleEdit(contact)}
                          >
                            {t('edit')}
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDelete(contact.id)}
                          >
                            {t('delete')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Confirm Dialog */}
      <ConfirmDialog
        message={confirmState.message}
        visible={confirmState.show}
        onConfirm={() => {
          if (confirmState.onConfirm) {
            confirmState.onConfirm();
          }
          setConfirmState({ ...confirmState, show: false });
        }}
        onCancel={() => setConfirmState({ ...confirmState, show: false })}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
      />
    </div>
  );
};

export default EmergencyContactsManager;