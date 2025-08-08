import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { getFullUrl, getAssetUrl, API_ENDPOINTS } from '../config/api';
import ShareMeditationDialog from './ShareMeditationDialog';
import PageHeader from './PageHeader';
import Alert from './Alert';
import ConfirmDialog from './ConfirmDialog';

const MyAudio = ({ user, userCredits, isGenerating, onCreditsUpdate, onProfileClick, unreadCount, onInboxClick, onCreateClick }) => {
  const [meditations, setMeditations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [playingMeditationId, setPlayingMeditationId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(null);
  const [showShareDialog, setShowShareDialog] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [alertState, setAlertState] = useState({ show: false, message: '', type: 'success' });
  const [confirmState, setConfirmState] = useState({ show: false, message: '', onConfirm: null, confirmText: '', cancelText: '' });
  const { t } = useTranslation();
  
  // Helper function to show alerts
  const showAlert = (message, type = 'success') => {
    setAlertState({ show: true, message, type });
  };

  // Helper function to show confirmation dialogs
  const showConfirmDialog = (message, onConfirm, confirmText = t('confirm', 'Bevestigen'), cancelText = t('cancel', 'Annuleren')) => {
    setConfirmState({
      show: true,
      message,
      onConfirm,
      confirmText,
      cancelText
    });
  };
  const prevIsGenerating = useRef(isGenerating);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchUserMeditations();
    }
  }, [user]);

  // Reset slider when filter changes
  useEffect(() => {
    setCurrentSlideIndex(0);
  }, [filterType]);

  // Refresh only when generation completes (goes from true to false)
  useEffect(() => {
    if (prevIsGenerating.current === true && isGenerating === false && user) {
      // Generation just completed, refresh the list
      const timer = setTimeout(() => {
        fetchUserMeditations();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    // Update the ref for next render
    prevIsGenerating.current = isGenerating;
  }, [isGenerating, user]);

  const fetchUserMeditations = async () => {
    try {
      // Only show loading on initial load, not on refresh
      if (meditations.length === 0) {
        setIsLoading(true);
      }
      const response = await axios.get(getFullUrl(API_ENDPOINTS.USER_MEDITATIONS(user.id)));
      setMeditations(response.data.meditations);
    } catch (error) {
      console.error('Error fetching meditations:', error);
      setError(t('failedToLoadMeditations', 'Failed to load your meditations'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (minutes) => {
    return `${minutes} ${t('minutes', 'minutes')}`;
  };

  const formatAudioDuration = (seconds) => {
    if (!seconds) return t('unknown', 'Unknown');
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    } else if (remainingSeconds === 0) {
      return `${minutes}m`;
    } else {
      return `${minutes}m ${remainingSeconds}s`;
    }
  };

  // Get unique meditation types from user's meditations
  const availableTypes = [...new Set(meditations.map(m => m.meditationType))];

  // Filter meditations based on type filter only
  const filteredMeditations = meditations.filter(meditation => {
    return filterType === 'all' || meditation.meditationType === filterType;
  });

  const handleImageUpload = async (meditationId, file) => {
    setUploadingImage(meditationId);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('userId', user.id);
      
      const response = await axios.post(
        getFullUrl(API_ENDPOINTS.UPLOAD_IMAGE(meditationId)),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      // Refresh meditations to show the new image
      await fetchUserMeditations();
      setShowImageOptions(null);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(t('failedUploadImage', 'Failed to upload image. Please try again.'));
    } finally {
      setUploadingImage(null);
    }
  };

  const handleFileSelect = (meditationId, event) => {
    const file = event.target.files[0];
    if (file) {
      handleImageUpload(meditationId, file);
    }
  };

  const startCamera = async (meditationId) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(t('cameraNotSupported', 'Camera is not supported in this browser. Please use Chrome, Firefox, or Safari.'));
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setShowImageOptions(meditationId + '_camera');
        setError('');
      }
    } catch (error) {
      let errorMessage = '';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = t('cameraPermissionDenied', 'Camera permission denied. Please allow camera access in your browser.');
      } else if (error.name === 'NotFoundError') {
        errorMessage = t('noCameraFound', 'No camera found. Please ensure your device has a camera connected.');
      } else if (error.name === 'NotReadableError') {
        errorMessage = t('cameraInUse', 'Camera is being used by another application. Please close other apps using the camera.');
      } else {
        errorMessage = `Camera error: ${error.message}`;
      }
      
      setError(errorMessage);
    }
  };

  const capturePhoto = async (meditationId) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
      await handleImageUpload(meditationId, file);
      
      // Stop camera stream
      const stream = video.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      
      setShowImageOptions(null);
    }, 'image/jpeg', 0.8);
  };

  const deleteCustomImage = async (meditationId) => {
    try {
      await axios.delete(getFullUrl(API_ENDPOINTS.DELETE_IMAGE(meditationId)), {
        params: { userId: user.id }
      });
      await fetchUserMeditations();
      setShowImageOptions(null);
    } catch (error) {
      console.error('Error deleting custom image:', error);
      setError(t('failedDeleteImage', 'Failed to delete image. Please try again.'));
    }
  };

  const shareMeditation = async (meditationId, shareData) => {
    // Check credits before sharing
    if (userCredits && userCredits.credits < 1) {
      setError(t('insufficientTokensShare', 'Insufficient tokens. You need 1 token to share a meditation.'));
      return;
    }
    
    setIsSharing(true);
    try {
      const meditation = meditations.find(m => m.id === meditationId);
      if (!meditation) {
        throw new Error('Meditation not found');
      }

      // Create FormData for sharing
      const formData = new FormData();
      formData.append('title', shareData.title);
      formData.append('description', shareData.description);
      formData.append('text', meditation.text);
      formData.append('meditationType', meditation.meditationType);
      formData.append('language', meditation.language);
      formData.append('duration', meditation.audioFiles[0]?.duration || 300);
      formData.append('userId', user.id);
      formData.append('originalMeditationId', meditationId);

      // Copy audio file to shared location
      const audioFile = meditation.audioFiles[0];
      if (audioFile) {
        try {
          // First try to fetch the audio file
          const audioUrl = getFullUrl(API_ENDPOINTS.MEDITATION_AUDIO(audioFile.filename));
          console.log('Fetching audio from:', audioUrl);
          
          const audioResponse = await fetch(audioUrl);
          if (!audioResponse.ok) {
            throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
          }
          
          const audioBlob = await audioResponse.blob();
          const audioFileToUpload = new File([audioBlob], audioFile.filename, { type: 'audio/mpeg' });
          formData.append('audio', audioFileToUpload);
        } catch (audioError) {
          console.error('Error fetching audio file:', audioError);
          // Try alternative path
          const altAudioUrl = `${window.location.origin}/assets/meditations/${audioFile.filename}`;
          console.log('Trying alternative audio URL:', altAudioUrl);
          const audioResponse = await fetch(altAudioUrl);
          const audioBlob = await audioResponse.blob();
          const audioFileToUpload = new File([audioBlob], audioFile.filename, { type: 'audio/mpeg' });
          formData.append('audio', audioFileToUpload);
        }
      }

      // Copy custom image if exists
      if (meditation.customImage && meditation.customImage.filename) {
        const imageResponse = await fetch(getFullUrl(API_ENDPOINTS.CUSTOM_IMAGE(meditation.customImage.filename)));
        const imageBlob = await imageResponse.blob();
        formData.append('image', imageBlob, meditation.customImage.filename);
      }

      const response = await axios.post(getFullUrl('/api/community/share'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Update meditation to mark as shared
        await axios.patch(getFullUrl(`/api/user-meditations/${user.id}/${meditationId}/share`), {
          sharedMeditationId: response.data.meditation._id,
          isShared: true
        });
        
        // Refresh meditations and credits
        await fetchUserMeditations();
        if (onCreditsUpdate) {
          onCreditsUpdate();
        }
        setShowShareDialog(null);
        setError('');
        
        // Show success message
        showAlert(t('meditationSharedSuccess', 'Meditation shared successfully! It will appear in the community after admin approval.'), 'success');
      }
    } catch (error) {
      console.error('Error sharing meditation:', error);
      setError(t('failedShareMeditation', 'Failed to share meditation. Please try again.'));
    } finally {
      setIsSharing(false);
    }
  };

  const getImageUrl = (meditation) => {
    if (meditation.customImage && meditation.customImage.filename) {
      return getAssetUrl(API_ENDPOINTS.CUSTOM_IMAGE(meditation.customImage.filename));
    }
    return meditationTypeImages[meditation.meditationType] || meditationTypeImages.sleep;
  };

  const meditationTypeLabels = {
    sleep: t('sleepMeditation', 'Sleep'),
    stress: t('stressMeditation', 'Stress'),
    focus: t('focusMeditation', 'Focus'),
    anxiety: t('anxietyMeditation', 'Anxiety'),
    energy: t('energyMeditation', 'Energy'),
    mindfulness: t('mindfulnessMeditation', 'Mindfulness'),
    compassion: t('compassionMeditation', 'Compassion'),
    walking: t('walkingMeditation', 'Walking'),
    breathing: t('breathingMeditation', 'Breathing'),
    morning: t('morningMeditation', 'Morning')
  };

  const meditationTypeImages = {
    sleep: getAssetUrl(API_ENDPOINTS.DEFAULT_IMAGE('sleep')),
    stress: getAssetUrl(API_ENDPOINTS.DEFAULT_IMAGE('stress')),
    focus: getAssetUrl(API_ENDPOINTS.DEFAULT_IMAGE('focus')),
    anxiety: getAssetUrl(API_ENDPOINTS.DEFAULT_IMAGE('anxiety')),
    energy: getAssetUrl(API_ENDPOINTS.DEFAULT_IMAGE('energy')),
    mindfulness: getAssetUrl(API_ENDPOINTS.DEFAULT_IMAGE('mindfulness')),
    compassion: getAssetUrl(API_ENDPOINTS.DEFAULT_IMAGE('compassion')),
    walking: getAssetUrl(API_ENDPOINTS.DEFAULT_IMAGE('walking')),
    breathing: getAssetUrl(API_ENDPOINTS.DEFAULT_IMAGE('breathing')),
    morning: getAssetUrl(API_ENDPOINTS.DEFAULT_IMAGE('morning'))
  };

  if (isLoading) {
    return (
      <div className="my-audio-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          {t('loading', 'Loading...')}
        </div>
      </div>
    );
  }

  // Don't replace entire component with error, just show it alongside content

  return (
    <div className="my-audio-container">
      <PageHeader 
        user={user}
        onProfileClick={onProfileClick}
        unreadCount={unreadCount}
        onInboxClick={onInboxClick}
        onCreateClick={onCreateClick}
      />
        
      {availableTypes.length > 0 && (
        <div className="filter-section" style={{ marginBottom: '24px' }}>
          <div className="filter-pills">
            <button 
              className={`filter-pill ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              {t('allTypes', 'All')} ({meditations.length})
            </button>
            {availableTypes.map(type => {
              const count = meditations.filter(m => m.meditationType === type).length;
              return (
                <button 
                  key={type}
                  className={`filter-pill ${filterType === type ? 'active' : ''}`}
                  onClick={() => setFilterType(type)}
                >
                  {meditationTypeLabels[type] || type} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}
        

      {error && (
        <div className="error-banner" style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          margin: '16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button 
            onClick={() => setError('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {isGenerating && (
        <div className="generation-status">
          <div className="loading-spinner">
            <div className="spinner"></div>
            {t('generating', 'Generating your meditation...')}
          </div>
        </div>
      )}

      {filteredMeditations.length === 0 && !isGenerating ? (
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
          <h3>{t('noMeditations', 'No meditations yet')}</h3>
          <p>{t('createFirst', 'Create your first meditation to see it here')}</p>
        </div>
      ) : filteredMeditations.length > 0 && (
        <div className="meditations-list">
          {filteredMeditations.map((meditation) => (
            <div 
              key={meditation.id} 
              className={`meditation-card-with-player ${playingMeditationId === meditation.id ? 'playing' : ''}`}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                transition: 'all 0.3s ease',
                marginBottom: '12px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Top Row - Image and Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                {/* Album Art */}
                <div 
                  className="meditation-thumbnail"
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <img 
                    src={getImageUrl(meditation)}
                    alt={meditationTypeLabels[meditation.meditationType] || meditation.meditationType}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>

                {/* Track Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'white',
                    marginBottom: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {meditationTypeLabels[meditation.meditationType] || meditation.meditationType}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginBottom: '4px'
                  }}>
                    🗣️ {(() => {
                      const fullLanguageNames = {
                        'en': 'English',
                        'nl': 'Nederlands', 
                        'de': 'Deutsch',
                        'es': 'Español',
                        'fr': 'Français',
                        'it': 'Italiano',
                        'pt': 'Português',
                        'ru': 'Русский',
                        'ja': '日本語',
                        'ko': '한국어',
                        'zh': '中文',
                        'ar': 'العربية',
                        'hi': 'हिन्दी'
                      };
                      return fullLanguageNames[meditation.language] || meditation.language;
                    })()}
                  </div>
                </div>

                {/* Share Button */}
                {meditation.audioFiles && meditation.audioFiles.length > 0 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (userCredits && userCredits.credits < 1) {
                        setError(t('insufficientTokensShare', 'Insufficient tokens. You need 1 token to share a meditation.'));
                        return;
                      }
                      setShowShareDialog(meditation.id);
                    }}
                    disabled={userCredits && userCredits.credits < 1}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: meditation.isShared ? '#1DB954' : 'rgba(255, 255, 255, 0.6)',
                      fontSize: '18px',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '50%',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'none';
                      e.target.style.transform = 'scale(1)';
                    }}
                    title={t('shareMeditation', 'Share Meditation')}
                  >
                    {meditation.isShared ? '🌟' : '📤'}
                  </button>
                )}
              </div>

              {/* Full Width Audio Player */}
              {meditation.audioFiles && meditation.audioFiles.length > 0 && (
                <audio 
                  id={`audio-${meditation.id}`}
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                  onLoadedMetadata={(e) => {
                    console.log('Audio loaded for meditation:', meditation.id, 'URL:', e.target.src);
                  }}
                  onPlay={(e) => {
                    console.log('Audio started playing:', meditation.id);
                    // Pause all other my-audio audios first
                    document.querySelectorAll('audio[id^="audio-"]').forEach(a => {
                      if (a.id !== `audio-${meditation.id}`) {
                        a.pause();
                      }
                    });
                    setPlayingMeditationId(meditation.id);
                  }}
                  onPause={(e) => {
                    console.log('Audio paused:', meditation.id);
                    setPlayingMeditationId(null);
                  }}
                  onEnded={(e) => {
                    console.log('Audio ended:', meditation.id);
                    setPlayingMeditationId(null);
                  }}
                  onError={(e) => {
                    console.error('Audio error for meditation:', meditation.id, 'Error:', e.target.error, 'URL:', e.target.src);
                    console.error('Audio files:', meditation.audioFiles);
                  }}
                  onCanPlay={(e) => {
                    console.log('Audio can play:', meditation.id);
                  }}
                >
                  <source 
                    src={getAssetUrl(API_ENDPOINTS.MEDITATION_AUDIO(meditation.audioFiles[0].filename))} 
                    type="audio/mpeg" 
                  />
                  {t('audioNotSupported', 'Your browser does not support the audio element.')}
                </audio>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Options Modal */}
      {showImageOptions && !showImageOptions.includes('_camera') && (
        <div className="image-options-modal">
          <div className="image-options-content">
            <h3>{t('changeImage', 'Change Image')}</h3>
            <div className="image-options-buttons">
              <button 
                className="image-option-btn"
                onClick={() => fileInputRef.current.click()}
              >
                📁 {t('uploadImage', 'Upload Image')}
              </button>
              <button 
                className="image-option-btn"
                onClick={() => startCamera(showImageOptions)}
              >
                📷 {t('takePhoto', 'Take Photo')}
              </button>
              {meditations.find(m => m.id === showImageOptions)?.customImage && (
                <button 
                  className="image-option-btn delete-btn"
                  onClick={() => showConfirmDialog(
                    t('confirmDeleteImage', 'Are you sure you want to delete this image?'),
                    () => deleteCustomImage(showImageOptions)
                  )}
                >
                  🗑️ {t('deleteImage', 'Delete Image')}
                </button>
              )}
            </div>
            <button 
              className="close-modal-btn"
              onClick={() => setShowImageOptions(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showImageOptions && showImageOptions.includes('_camera') && (
        <div className="camera-modal">
          <div className="camera-content">
            <h3>{t('takePhoto', 'Take Photo')}</h3>
            <video ref={videoRef} className="camera-video" autoPlay muted />
            <div className="camera-controls">
              <button 
                className="camera-btn capture-btn"
                onClick={() => capturePhoto(showImageOptions.replace('_camera', ''))}
              >
                📸 {t('capture', 'Capture')}
              </button>
              <button 
                className="camera-btn cancel-btn"
                onClick={() => {
                  const video = videoRef.current;
                  const stream = video.srcObject;
                  if (stream) {
                    const tracks = stream.getTracks();
                    tracks.forEach(track => track.stop());
                  }
                  setShowImageOptions(null);
                }}
              >
                ✕ {t('cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(showImageOptions, e)}
      />

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Share Dialog */}
      {showShareDialog && (
        <ShareMeditationDialog
          meditation={meditations.find(m => m.id === showShareDialog)}
          onShare={shareMeditation}
          onClose={() => setShowShareDialog(null)}
          isSharing={isSharing}
          t={t}
        />
      )}
      
      {/* Alert Component */}
      <Alert 
        message={alertState.message}
        type={alertState.type}
        visible={alertState.show}
        onClose={() => setAlertState({ show: false, message: '', type: 'success' })}
        position="fixed"
      />

      {/* Confirm Dialog Component */}
      <ConfirmDialog
        message={confirmState.message}
        visible={confirmState.show}
        onConfirm={() => {
          if (confirmState.onConfirm) confirmState.onConfirm();
          setConfirmState({ show: false, message: '', onConfirm: null, confirmText: '', cancelText: '' });
        }}
        onCancel={() => setConfirmState({ show: false, message: '', onConfirm: null, confirmText: '', cancelText: '' })}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
      />
    </div>
  );
};

export default MyAudio;