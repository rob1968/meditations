import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';
import { getAuthHeaders } from '../utils/userUtils';
import ProfileInfo from './ProfileInfo';
import Credits from './Credits';
import Statistics from './Statistics';
import ProfileImageUpload from './ProfileImageUpload';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import Alert from './Alert';

const ProfileContainer = ({ user, onLogout, onBackToCreate, selectedSection = 'profile', onUserUpdate, onSectionChange }) => {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertState, setAlertState] = useState({ show: false, message: '', type: 'success' });
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  
  // Update profileImage when user prop changes
  React.useEffect(() => {
    setProfileImage(user?.profileImage || null);
  }, [user?.profileImage]);
  
  // Helper function to show alerts
  const showAlert = (message, type = 'success') => {
    setAlertState({ show: true, message, type });
  };

  // Auto-save profile data to database
  const autoSaveProfile = async (updatedUser) => {
    try {
      console.log('Auto-saving profile after image change...');
      const response = await axios.put(getFullUrl(`/api/auth/user/${updatedUser.id}/profile`), {
        preferredLanguage: updatedUser.preferredLanguage || '',
        city: updatedUser.location?.city || '',
        country: updatedUser.location?.country || '',
        countryCode: updatedUser.location?.countryCode || '',
        gender: updatedUser.gender || '',
        bio: updatedUser.bio || ''
      }, {
        headers: getAuthHeaders(updatedUser)
      });
      
      if (response.data.success) {
        console.log('Profile auto-saved successfully');
        showAlert(t('profileAutoSaved', 'Profile saved automatically'), 'success');
      }
    } catch (error) {
      console.error('Auto-save profile error:', error);
      // Don't show error to user for auto-save failures
    }
  };

  const handleImageUpdate = (newImagePath) => {
    setProfileImage(newImagePath);
    // Update user object if we have onUserUpdate
    if (onUserUpdate) {
      const updatedUser = { ...user, profileImage: newImagePath };
      onUserUpdate(updatedUser);
      
      // Auto-save profile to database
      autoSaveProfile(updatedUser);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmUsername !== user.username) {
      showAlert(t('usernameConfirmationMismatch', 'Username confirmation does not match'), 'warning');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await axios.delete(getFullUrl(`/api/auth/delete-account/${user.id}`), {
        data: { confirmUsername: deleteConfirmUsername }
      });

      if (response.data.success) {
        showAlert(t('accountDeletedSuccessfully', 'Account deleted successfully'), 'success');
        setTimeout(() => onLogout(), 2000);
      }
    } catch (error) {
      console.error('Delete account error:', error);
      showAlert(t('deleteAccountError', 'Could not delete account. Please try again.'), 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmUsername('');
    }
  };

  const renderContent = () => {
    switch (selectedSection) {
      case 'profile':
        return <ProfileInfo user={user} onUserUpdate={onUserUpdate} />;
      case 'credits':
        return <Credits user={user} />;
      case 'statistics':
        return <Statistics user={user} />;
      case 'privacy':
        return <PrivacyPolicy user={user} onLogout={onLogout} />;
      case 'terms':
        return <TermsOfService user={user} onLogout={onLogout} />;
      default:
        return <ProfileInfo user={user} />;
    }
  };


  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-header-top">
          <button 
            className="close-window-btn" 
            onClick={onBackToCreate}
            title={t('close', 'Close')}
          >
            ✕
          </button>
        </div>
        
        <div className="profile-user-info">
          <ProfileImageUpload 
            user={user}
            profileImage={profileImage}
            onImageUpdate={handleImageUpdate}
          />
          <h2>{user.username}</h2>
          <p>{t('memberSince', 'Member since')} {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="profile-navigation">
        <button 
          className={`profile-nav-item ${selectedSection === 'profile' ? 'active' : ''}`}
          onClick={() => onSectionChange?.('profile')}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-label">{t('profile', 'Profile')}</span>
        </button>
        <button 
          className={`profile-nav-item ${selectedSection === 'credits' ? 'active' : ''}`}
          onClick={() => onSectionChange?.('credits')}
        >
          <span className="nav-icon">💰</span>
          <span className="nav-label">{t('credits', 'Credits')}</span>
        </button>
        <button 
          className={`profile-nav-item ${selectedSection === 'statistics' ? 'active' : ''}`}
          onClick={() => onSectionChange?.('statistics')}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">{t('statistics', 'Statistics')}</span>
        </button>
        <button 
          className={`profile-nav-item ${selectedSection === 'privacy' ? 'active' : ''}`}
          onClick={() => onSectionChange?.('privacy')}
        >
          <span className="nav-icon">🔒</span>
          <span className="nav-label">{t('privacyPolicy', 'Privacy Policy')}</span>
        </button>
        <button 
          className={`profile-nav-item ${selectedSection === 'terms' ? 'active' : ''}`}
          onClick={() => onSectionChange?.('terms')}
        >
          <span className="nav-icon">📋</span>
          <span className="nav-label">{t('termsOfService', 'Terms of Service')}</span>
        </button>
      </div>

      <div className="profile-content">
        {renderContent()}
      </div>

      <div className="profile-actions">
        <button 
          onClick={onLogout} 
          className="logout-button-full"
        >
          {t('logout', 'Logout')}
        </button>
        
        <button 
          onClick={() => setShowDeleteConfirm(true)}
          className="delete-account-button"
          style={{
            backgroundColor: '#ff4757',
            color: 'white',
            border: '2px solid #ff4757',
            padding: '16px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '20px',
            width: '100%',
            transition: 'background-color 0.2s',
            boxShadow: '0 4px 8px rgba(255, 71, 87, 0.3)'
          }}
        >
          🗑️ {t('deleteAccount', 'Delete Account')}
        </button>
      </div>
      
      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'var(--glass-dark)',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#ff4757', marginBottom: '16px' }}>
              ⚠️ {t('deleteAccountTitle', 'Delete Account')}
            </h3>
            
            <p style={{ marginBottom: '16px', color: '#333' }}>
              {t('deleteAccountWarning', 'This action cannot be undone. All your meditations, credit history, and profile data will be permanently deleted.')}
            </p>
            
            <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
              {t('deleteAccountConfirmText', 'To confirm, please type your username:')} <strong>{user.username}</strong>
            </p>
            
            <input
              type="text"
              value={deleteConfirmUsername}
              onChange={(e) => setDeleteConfirmUsername(e.target.value)}
              placeholder={t('typeUsername', 'Type your username')}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '16px',
                textAlign: 'center'
              }}
            />
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmUsername('');
                }}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '2px solid var(--glass-border)',
                  backgroundColor: 'var(--glass-light)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {t('cancel', 'Cancel')}
              </button>
              
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmUsername !== user.username}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  backgroundColor: deleteConfirmUsername === user.username ? '#ff4757' : '#ccc',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: deleteConfirmUsername === user.username ? 'pointer' : 'not-allowed'
                }}
              >
                {isDeleting ? (
                  <>
                    <span className="spinner-small"></span>
                    {t('deleting', 'Deleting...')}
                  </>
                ) : (
                  t('deleteAccount', 'Delete Account')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Alert Component */}
      <Alert 
        message={alertState.message}
        type={alertState.type}
        visible={alertState.show}
        onClose={() => setAlertState({ show: false, message: '', type: 'success' })}
        position="fixed"
      />
    </div>
  );
};

export default ProfileContainer;