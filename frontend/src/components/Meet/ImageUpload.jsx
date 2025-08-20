import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const ImageUpload = ({ value, onChange, className = '' }) => {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Suggested stock images for activities
  const suggestedImages = [
    {
      url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      category: 'wandelen',
      description: 'Wandeling in de natuur'
    },
    {
      url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      category: 'yoga',
      description: 'Yoga sessie'
    },
    {
      url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      category: 'koffie',
      description: 'Koffie drinken'
    },
    {
      url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      category: 'sport',
      description: 'Sport activiteit'
    },
    {
      url: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      category: 'kunst',
      description: 'Creatieve workshop'
    },
    {
      url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      category: 'eten',
      description: 'Samen koken'
    },
    {
      url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      category: 'muziek',
      description: 'Muziek maken'
    },
    {
      url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      category: 'leren',
      description: 'Workshop leren'
    }
  ];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(t('onlyImagesAllowed', 'Alleen afbeeldingen zijn toegestaan'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('fileTooLarge', 'Bestand is te groot. Maximum 5MB.'));
      return;
    }

    setIsUploading(true);
    
    try {
      // For now, we'll use a simple file reader to create a data URL
      // In production, you'd upload to a service like Cloudinary or AWS S3
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange(e.target.result);
        setIsUploading(false);
      };
      reader.onerror = () => {
        alert(t('uploadError', 'Er ging iets mis bij het uploaden'));
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      alert(t('uploadError', 'Er ging iets mis bij het uploaden'));
      setIsUploading(false);
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

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const selectSuggestedImage = (imageUrl) => {
    onChange(imageUrl);
  };

  const removeImage = () => {
    onChange('');
  };

  return (
    <div className={`image-upload-component ${className}`}>
      {!value ? (
        <>
          {/* Upload Area */}
          <div
            className={`image-upload-area ${dragActive ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            {isUploading ? (
              <div className="upload-loading">
                <div className="upload-spinner">📤</div>
                <span className="upload-text">{t('uploading', 'Uploaden...')}</span>
              </div>
            ) : (
              <div className="upload-content">
                <div className="upload-icon">📷</div>
                <div className="upload-text-area">
                  <span className="upload-title">{t('uploadImage', 'Afbeelding uploaden')}</span>
                  <span className="upload-subtitle">{t('dragOrClick', 'Sleep hier een bestand of klik om te selecteren')}</span>
                  <span className="upload-formats">{t('supportedFormats', 'JPG, PNG, GIF - Max 5MB')}</span>
                </div>
              </div>
            )}
          </div>

          {/* URL Input */}
          <div className="url-input-section">
            <div className="url-divider">
              <span className="divider-text">{t('orUseUrl', 'Of gebruik een URL')}</span>
            </div>
            <input
              type="url"
              placeholder={t('imageUrlPlaceholder', 'Plak hier een afbeelding URL...')}
              className="url-input"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  onChange(e.target.value.trim());
                }
              }}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  onChange(e.target.value.trim());
                }
              }}
            />
          </div>

          {/* Suggested Images */}
          <div className="suggested-images">
            <h4 className="suggested-title">
              <span className="suggested-icon">✨</span>
              {t('suggestedImages', 'Voorgestelde afbeeldingen')}
            </h4>
            <div className="suggested-grid">
              {suggestedImages.slice(0, 6).map((image, index) => (
                <div
                  key={index}
                  className="suggested-image"
                  onClick={() => selectSuggestedImage(image.url)}
                  title={image.description}
                >
                  <img src={image.url} alt={image.description} />
                  <div className="suggested-overlay">
                    <span className="suggested-use-text">{t('use', 'Gebruiken')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Image Preview */
        <div className="image-preview-container">
          <div className="image-preview">
            <img src={value} alt="Cover preview" />
            <div className="image-overlay">
              <button
                type="button"
                className="remove-image-btn"
                onClick={removeImage}
                title={t('removeImage', 'Afbeelding verwijderen')}
              >
                ❌
              </button>
              <button
                type="button"
                className="change-image-btn"
                onClick={() => fileInputRef.current?.click()}
                title={t('changeImage', 'Andere afbeelding kiezen')}
              >
                🔄
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div className="image-info">
            <span className="image-status">✅ {t('imageSelected', 'Afbeelding geselecteerd')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;