import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { getFullUrl } from '../config/api';
import { getLocalizedLanguages, getLanguageDisplayName } from '../data/languages';
import LocationPickerModal from './LocationPickerModal';

const ProfileInfo = ({ user, onUserUpdate }) => {
  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedUser, setEditedUser] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  const { t, i18n } = useTranslation();
  
  
  // Get localized language names
  const availableLanguages = getLocalizedLanguages(t);

  // Initialize edit form with current user data
  const startEdit = () => {
    setEditedUser({
      preferredLanguage: user.preferredLanguage || '',
      location: user.location ? {
        city: user.location.city || '',
        country: user.location.country || '',
        countryCode: user.location.countryCode || '',
        fullName: user.location.city && user.location.country ? 
          `${user.location.city}, ${user.location.country}` : ''
      } : null,
      gender: user.gender || '',
      bio: user.bio || ''
    });
    setIsEditMode(true);
    setSaveMessage('');
  };

  // Cancel edit mode
  const cancelEdit = () => {
    setIsEditMode(false);
    setEditedUser({});
    setSaveMessage('');
  };

  // Handle location selection
  const handleLocationChange = (locationData) => {
    setEditedUser(prev => ({
      ...prev,
      location: locationData
    }));
  };

  // Save profile changes
  const saveProfile = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const response = await axios.put(getFullUrl(`/api/auth/user/${user.id}/profile`), {
        preferredLanguage: editedUser.preferredLanguage,
        city: editedUser.location?.city || '',
        country: editedUser.location?.country || '',
        countryCode: editedUser.location?.countryCode || '',
        gender: editedUser.gender,
        bio: editedUser.bio.trim(),
      });

      // Update user data in localStorage
      const updatedUser = { ...user, ...response.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update UI language if language changed
      if (editedUser.preferredLanguage && editedUser.preferredLanguage !== user.preferredLanguage) {
        i18n.changeLanguage(editedUser.preferredLanguage);
        // Also save to localStorage for consistency
        localStorage.setItem('selectedLanguage', editedUser.preferredLanguage);
      }
      
      // Update user state in parent component
      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      }
      
      setIsEditMode(false);
      setSaveMessage(t('profileUpdated', 'Profile updated successfully!'));
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage(t('profileUpdateError', 'Failed to update profile. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-info-section">
      <div className="profile-section-header">
        <h3>👤 {t('profile', 'Profile')}</h3>
        {!isEditMode ? (
          <button className="edit-profile-btn" onClick={startEdit}>
            <span className="edit-icon">✏️</span>
            {t('edit', 'Edit')}
          </button>
        ) : (
          <div className="edit-actions">
            <button className="save-btn" onClick={saveProfile} disabled={isSaving}>
              {isSaving ? (
                <>
                  <span className="spinner-small"></span>
                  {t('saving', 'Saving...')}
                </>
              ) : (
                <>
                  <span className="save-icon">✓</span>
                  {t('save', 'Save')}
                </>
              )}
            </button>
            <button className="cancel-btn" onClick={cancelEdit} disabled={isSaving}>
              <span className="cancel-icon">✕</span>
              {t('cancel', 'Cancel')}
            </button>
          </div>
        )}
      </div>

      {saveMessage && (
        <div className={`save-message ${saveMessage.includes('success') ? 'success' : 'error'}`}>
          {saveMessage}
        </div>
      )}

      <div className="profile-info-card">
        {/* Age (Read-only) */}
        {user.age && (
          <div className="profile-field">
            <div className="field-icon">🎂</div>
            <div className="field-content">
              <label className="field-label">{t('age', 'Age')}</label>
              <div className="field-value">{user.age} {t('yearsOld', 'years old')}</div>
            </div>
          </div>
        )}

        {/* Preferred Language */}
        <div className="profile-field">
          <div className="field-icon">🌍</div>
          <div className="field-content">
            <label className="field-label">{t('preferredLanguage', 'Preferred Language')}</label>
            {isEditMode ? (
              <select
                value={editedUser.preferredLanguage}
                onChange={(e) => setEditedUser(prev => ({ ...prev, preferredLanguage: e.target.value }))}
                className="field-input"
              >
                <option value="">{t('selectLanguage', 'Select your language')}</option>
                {availableLanguages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.localizedName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="field-value">
                {getLanguageDisplayName(user.preferredLanguage, t) || t('notSet', 'Not set')}
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="profile-field">
          <div className="field-icon">📍</div>
          <div className="field-content">
            <label className="field-label">{t('location', 'Location')}</label>
            {isEditMode ? (
              <LocationPickerModal
                value={editedUser.location}
                onChange={handleLocationChange}
                placeholder={t('selectYourLocation', 'Select your location (City, Country)')}
                required={false}
              />
            ) : (
              <div className="field-value">
                {[user.location?.city, user.location?.country].filter(Boolean).join(', ') || t('notSet', 'Not set')}
              </div>
            )}
          </div>
        </div>

        {/* Gender */}
        <div className="profile-field">
          <div className="field-icon">⚡</div>
          <div className="field-content">
            <label className="field-label">{t('gender', 'Gender')}</label>
            {isEditMode ? (
              <select
                value={editedUser.gender}
                onChange={(e) => setEditedUser(prev => ({ ...prev, gender: e.target.value }))}
                className="field-input"
              >
                <option value="">{t('selectGender', 'Select your gender')}</option>
                <option value="male">☀️ {t('male', 'Male')}</option>
                <option value="female">🌙 {t('female', 'Female')}</option>
                <option value="other">{t('other', 'Other')}</option>
                <option value="prefer_not_to_say">{t('preferNotToSay', 'Prefer not to say')}</option>
              </select>
            ) : (
              <div className="field-value">
                {(() => {
                  const genderLabels = {
                    male: `☀️ ${t('male', 'Male')}`,
                    female: `🌙 ${t('female', 'Female')}`,
                    other: t('other', 'Other'),
                    prefer_not_to_say: t('preferNotToSay', 'Prefer not to say')
                  };
                  return genderLabels[user.gender] || t('notSet', 'Not set');
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="profile-field bio-field">
          <div className="field-icon">📝</div>
          <div className="field-content">
            <label className="field-label">{t('bio', 'Bio')}</label>
            {isEditMode ? (
              <div className="bio-input-container">
                <textarea
                  value={editedUser.bio}
                  onChange={(e) => setEditedUser(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder={t('bioPlaceholder', 'Tell us about yourself...')}
                  maxLength={500}
                  rows={3}
                  className="field-input bio-textarea"
                />
                <div className="character-count">
                  {500 - editedUser.bio.length} {t('charactersRemaining', 'characters remaining')}
                </div>
              </div>
            ) : (
              <div className="field-value bio-text">
                {user.bio || t('notSet', 'Not set')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileInfo;