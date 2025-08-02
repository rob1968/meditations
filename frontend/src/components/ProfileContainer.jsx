import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';
import ProfileInfo from './ProfileInfo';
import Credits from './Credits';
import Statistics from './Statistics';

const ProfileContainer = ({ user, onLogout, onBackToCreate, selectedSection = 'profile', onUserUpdate }) => {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmUsername !== user.username) {
      alert(t('usernameConfirmationMismatch', 'Username confirmation does not match'));
      return;
    }

    setIsDeleting(true);
    try {
      const response = await axios.delete(getFullUrl(`/api/auth/delete-account/${user.id}`), {
        data: { confirmUsername: deleteConfirmUsername }
      });

      if (response.data.success) {
        alert(t('accountDeletedSuccessfully', 'Account deleted successfully'));
        onLogout();
      }
    } catch (error) {
      console.error('Delete account error:', error);
      alert(t('deleteAccountError', 'Could not delete account. Please try again.'));
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
      default:
        return <ProfileInfo user={user} />;
    }
  };


  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-header-top">
          <button 
            className="back-to-create-btn" 
            onClick={onBackToCreate}
            title={t('backToCreate', 'Back to Create')}
          >
            ← {t('backToCreate', 'Back')}
          </button>
        </div>
        
        <div className="profile-user-info">
          <div className="profile-avatar">👤</div>
          <h2>{user.username}</h2>
          <p>{t('memberSince', 'Member since')} {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
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
            backgroundColor: 'white',
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
                  border: '2px solid #ddd',
                  backgroundColor: 'white',
                  color: '#333',
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
    </div>
  );
};

export default ProfileContainer;