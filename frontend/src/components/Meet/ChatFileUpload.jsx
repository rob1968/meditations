import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const ChatFileUpload = ({ onFileSelect, onClose, maxFileSize = 10 * 1024 * 1024 }) => {
  const { t } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Supported file types
  const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const supportedFileTypes = [
    ...supportedImageTypes,
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/webm'
  ];

  const validateFile = (file) => {
    if (!file) {
      return 'Geen bestand geselecteerd';
    }

    if (file.size > maxFileSize) {
      return `Bestand is te groot. Maximaal ${Math.round(maxFileSize / 1024 / 1024)}MB toegestaan`;
    }

    if (!supportedFileTypes.includes(file.type)) {
      return 'Dit bestandstype wordt niet ondersteund';
    }

    return null;
  };

  const handleFileUpload = async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      // Create file preview
      const fileData = {
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        isImage: supportedImageTypes.includes(file.type)
      };

      // For images, create preview URL
      if (fileData.isImage) {
        fileData.previewUrl = URL.createObjectURL(file);
      }

      // Simulate upload progress (in real implementation, this would be actual upload)
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      onFileSelect(fileData);
      onClose();
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Er ging iets mis bij het uploaden van het bestand');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (supportedImageTypes.includes(fileType)) {
      return '🖼️';
    } else if (fileType.includes('pdf')) {
      return '📄';
    } else if (fileType.includes('audio')) {
      return '🎵';
    } else if (fileType.includes('video')) {
      return '🎬';
    } else if (fileType.includes('text')) {
      return '📝';
    }
    return '📎';
  };

  return (
    <div className="chat-file-upload-overlay" onClick={onClose}>
      <div className="chat-file-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-file-upload-header">
          <h3>{t('uploadFile', 'Bestand uploaden')}</h3>
          <button className="close-upload-btn" onClick={onClose}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {error && (
          <div className="upload-error">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.684-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div 
          className={`file-drop-zone ${dragActive ? 'drag-active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="upload-progress">
              <div className="upload-spinner">
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="4"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="none"
                    stroke="#667eea"
                    strokeWidth="4"
                    strokeDasharray={`${uploadProgress * 1.13} 113`}
                    strokeLinecap="round"
                    transform="rotate(-90 20 20)"
                  />
                </svg>
                <span className="progress-text">{uploadProgress}%</span>
              </div>
              <p>{t('uploadingFile', 'Bestand uploaden...')}</p>
            </div>
          ) : (
            <>
              <div className="drop-zone-icon">
                <svg width="48" height="48" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 10l5-5 5 5M7 20h10a2 2 0 002-2V8a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <h4>{t('dropFileHere', 'Sleep je bestand hierheen')}</h4>
              <p>{t('orClickToSelect', 'of klik om een bestand te selecteren')}</p>
              <div className="supported-types">
                <p>{t('supportedTypes', 'Ondersteunde types')}:</p>
                <div className="type-chips">
                  <span className="type-chip">📷 Afbeeldingen</span>
                  <span className="type-chip">📄 PDF</span>
                  <span className="type-chip">🎵 Audio</span>
                  <span className="type-chip">🎬 Video</span>
                  <span className="type-chip">📝 Documenten</span>
                </div>
              </div>
              <p className="size-limit">
                {t('maxFileSize', 'Maximale bestandsgrootte')}: {Math.round(maxFileSize / 1024 / 1024)}MB
              </p>
            </>
          )}
        </div>

        <div className="quick-actions">
          <h4>{t('quickActions', 'Snelle acties')}</h4>
          <div className="quick-action-buttons">
            <button 
              className="quick-action-btn camera-btn"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment';
                input.onchange = (e) => {
                  if (e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                };
                input.click();
              }}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span>{t('takePhoto', 'Foto maken')}</span>
            </button>

            <button 
              className="quick-action-btn gallery-btn"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  if (e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                };
                input.click();
              }}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              <span>{t('fromGallery', 'Uit galerij')}</span>
            </button>

            <button 
              className="quick-action-btn document-btn"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.doc,.docx,.txt';
                input.onchange = (e) => {
                  if (e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                };
                input.click();
              }}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              <span>{t('document', 'Document')}</span>
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={supportedFileTypes.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default ChatFileUpload;