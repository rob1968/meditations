import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getFullUrl } from '../config/api';
import ConfirmDialog from './ConfirmDialog';

const ProfileImageUpload = ({ user, profileImage, onImageUpdate }) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [confirmState, setConfirmState] = useState({ show: false, message: '', onConfirm: null, confirmText: '', cancelText: '' });
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const showConfirmDialog = (message, onConfirm, confirmText = t('confirm', 'Confirm'), cancelText = t('cancel', 'Cancel')) => {
    setConfirmState({ show: true, message, onConfirm, confirmText, cancelText });
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('fileTooLarge', 'File size must be less than 5MB'));
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError(t('invalidFileType', 'Please select a valid image file'));
      return;
    }

    await uploadImage(file);
  };

  const uploadImage = async (file) => {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('profileImage', file);
    formData.append('userId', user.id);

    try {
      const response = await fetch(getFullUrl('/api/profile/upload-image'), {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onImageUpdate(data.profileImage);
      setShowOptions(false);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || t('uploadFailed', 'Failed to upload image'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = () => {
    showConfirmDialog(
      t('confirmDeleteImage', 'Are you sure you want to delete your profile image?'),
      async () => {
        setUploading(true);
        setError(null);

        try {
          const response = await fetch(getFullUrl(`/api/profile/delete-image/${user.id}`), {
            method: 'DELETE'
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Delete failed');
          }

          onImageUpdate(null);
          setShowOptions(false);
        } catch (error) {
          console.error('Delete error:', error);
          setError(error.message || t('deleteFailed', 'Failed to delete image'));
        } finally {
          setUploading(false);
        }
      }
    );
  };

  const getImageUrl = () => {
    if (profileImage) {
      return getFullUrl(profileImage);
    }
    return null;
  };

  return (
    <div className="profile-image-upload">
      <div className="profile-image-container">
        {profileImage ? (
          <img 
            src={getImageUrl()} 
            alt={t('profileImage', 'Profile')}
            className="profile-image"
            onError={(e) => {
              e.target.src = '';
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="profile-image-placeholder">
            <span className="placeholder-icon">👤</span>
          </div>
        )}
        
        <button
          className="change-image-btn"
          onClick={() => setShowOptions(!showOptions)}
          disabled={uploading}
        >
          {uploading ? '⏳' : '📷'}
        </button>
      </div>

      {showOptions && !uploading && (
        <div className="image-options-menu">
          <button
            className="option-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            📁 {t('uploadFromDevice', 'Upload from Device')}
          </button>
          
          <button
            className="option-btn"
            onClick={() => cameraInputRef.current?.click()}
          >
            📸 {t('takePhoto', 'Take Photo')}
          </button>
          
          {profileImage && (
            <button
              className="option-btn delete-btn"
              onClick={handleDeleteImage}
            >
              🗑️ {t('deleteImage', 'Delete Image')}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        message={confirmState.message}
        visible={confirmState.show}
        onConfirm={() => {
          confirmState.onConfirm();
          setConfirmState({ show: false, message: '', onConfirm: null, confirmText: '', cancelText: '' });
        }}
        onCancel={() => setConfirmState({ show: false, message: '', onConfirm: null, confirmText: '', cancelText: '' })}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
      />

      <style jsx>{`
        .profile-image-upload {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-md);
          margin: var(--space-lg) 0;
        }

        .profile-image-container {
          position: relative;
          width: 120px;
          height: 120px;
        }

        .profile-image {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid var(--glass-medium);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        .profile-image-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid var(--glass-medium);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
        }

        .placeholder-icon {
          font-size: 48px;
          opacity: 0.8;
        }

        .change-image-btn {
          position: absolute;
          bottom: 0;
          right: 0;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          transition: all 0.3s ease;
        }

        .change-image-btn:hover:not(:disabled) {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        .change-image-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .image-options-menu {
          background: var(--glass-dark);
          backdrop-filter: blur(20px);
          border-radius: 12px;
          padding: var(--space-sm);
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
          border: 1px solid rgba(255, 255, 255, 0.1);
          min-width: 200px;
        }

        .option-btn {
          background: var(--glass-light);
          color: var(--text-primary);
          border: none;
          border-radius: 8px;
          padding: var(--space-sm) var(--space-md);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          min-height: 44px;
        }

        .option-btn:hover {
          background: var(--glass-medium);
          transform: translateX(4px);
        }

        .option-btn.delete-btn:hover {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: var(--space-sm) var(--space-md);
          border-radius: 8px;
          font-size: 14px;
          text-align: center;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        @media (max-width: 768px) {
          .profile-image-container {
            width: 100px;
            height: 100px;
          }

          .placeholder-icon {
            font-size: 40px;
          }

          .change-image-btn {
            width: 32px;
            height: 32px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfileImageUpload;