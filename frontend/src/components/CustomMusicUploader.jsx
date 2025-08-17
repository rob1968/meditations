import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';
import ConfirmDialog from './ConfirmDialog';
import Alert from './Alert';
import './CustomMusicUploader.css';

const CustomMusicUploader = ({ 
  selectedMusic, 
  onMusicSelect,
  customBackgrounds,
  onUpload,
  onDelete,
  userId
}) => {
  const { t } = useTranslation();
  const [uploadingFile, setUploadingFile] = useState(null);
  const [musicCatalog, setMusicCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewAudio, setPreviewAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [confirmState, setConfirmState] = useState({ show: false, message: '', onConfirm: null, confirmText: '', cancelText: '' });
  const [alertState, setAlertState] = useState({ show: false, message: '', type: 'success' });
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);

  const showConfirmDialog = (message, onConfirm, confirmText = t('confirm', 'Confirm'), cancelText = t('cancel', 'Cancel')) => {
    setConfirmState({ show: true, message, onConfirm, confirmText, cancelText });
  };

  const showAlert = (message, type = 'success') => {
    setAlertState({ show: true, message, type });
  };

  // Load music catalog on component mount
  useEffect(() => {
    const loadMusicCatalog = async () => {
      try {
        const response = await axios.get(getFullUrl('/api/music/catalog?t=' + Date.now()));
        console.log('=== MUSIC CATALOG DEBUG UPDATED ===');
        console.log('Full response:', response.data);
        console.log('Nature tracks count:', response.data.catalog?.backgroundMusic?.nature?.length || 0);
        console.log('Nature tracks:', response.data.catalog?.backgroundMusic?.nature);
        console.log('Ambient tracks count:', response.data.catalog?.backgroundMusic?.ambient?.length || 0);
        console.log('Ambient tracks:', response.data.catalog?.backgroundMusic?.ambient);
        
        // Force cache bust
        window.MUSIC_CATALOG_TIMESTAMP = Date.now();
        setMusicCatalog(response.data.catalog);
      } catch (error) {
        console.error('Error loading music catalog:', error);
        setMusicCatalog({ backgroundMusic: {}, categories: {} });
      } finally {
        setCatalogLoading(false);
      }
    };

    loadMusicCatalog();
  }, []);

  // Slider navigation functions
  const sliderRef = useRef(null);
  
  const scrollSlider = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = 296; // width of slide + gap
      const currentScroll = sliderRef.current.scrollLeft;
      const newScroll = direction === 'next' 
        ? currentScroll + scrollAmount 
        : currentScroll - scrollAmount;
      
      sliderRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type - Samsung device compatible (matches backend)
    const validTypes = [
      'audio/mpeg',     // MP3
      'audio/mp4',      // M4A
      'audio/m4a',      // M4A
      'audio/x-m4a',    // M4A (alternative)
      'audio/aac',      // AAC
      'audio/amr',      // AMR
      'audio/3gpp',     // 3GA/AMR
      'audio/aiff',     // AIFF (iPhone)
      'audio/x-aiff',   // AIFF (alternative)
      'audio/x-caf'     // CAF (Core Audio Format - iPhone)
    ];
    
    // Also check file extension as fallback for Samsung devices
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.mp3', '.m4a', '.aac', '.amr', '.3ga', '.aiff', '.caf'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!validTypes.includes(file.type) && !hasValidExtension) {
      showAlert(t('invalidAudioFile', 'Please select a valid audio file (MP3, M4A, AAC, AMR, 3GA, AIFF, CAF)'), 'error');
      return;
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      showAlert(t('fileTooLarge', 'File size must be less than 20MB'), 'error');
      return;
    }

    // Check if file already exists (by filename)
    const fileExists = customBackgrounds && customBackgrounds.some(bg => 
      bg.originalName && bg.originalName.toLowerCase() === file.name.toLowerCase()
    );
    
    if (fileExists) {
      showAlert(t('fileAlreadyExists', 'This audio file has already been uploaded. Please choose a different file.'), 'error');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Ask user for custom title
    const defaultTitle = file.name.replace(/\.[^/.]+$/, "").substring(0, 15); // Filename without extension, max 15 chars
    const customTitle = prompt(
      t('enterMusicTitle', 'Enter a title for your music (max 15 characters):'),
      defaultTitle
    );
    
    // If user cancels, don't upload
    if (customTitle === null) {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    // Validate title (not empty after trimming)
    const trimmedTitle = customTitle.trim();
    if (!trimmedTitle) {
      showAlert(t('titleRequired', 'Please enter a title for your music.'), 'error');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Check title length (max 15 characters)
    if (trimmedTitle.length > 15) {
      showAlert(t('titleTooLong', 'Title must be maximum 15 characters. Please shorten it.'), 'error');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Check if title already exists
    const titleExists = customBackgrounds && customBackgrounds.some(bg => 
      bg.customName && bg.customName.toLowerCase() === trimmedTitle.toLowerCase()
    );
    
    if (titleExists) {
      showAlert(t('titleAlreadyExists', 'A music track with this title already exists. Please choose a different title.'), 'error');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Ask for description with character limit info
    const customDescription = prompt(
      t('enterMusicDescription', 'Enter a description for your music (optional, max 50 characters):'),
      ''
    );
    
    // Process description
    let finalDescription;
    if (customDescription === null) {
      // User cancelled, use default
      finalDescription = t('customUploadedMusic', 'Custom uploaded background music');
    } else {
      const trimmedDescription = customDescription.trim();
      if (trimmedDescription.length > 50) {
        // Truncate to 50 characters if too long
        finalDescription = trimmedDescription.substring(0, 50);
        showAlert(t('descriptionTruncated', 'Description was truncated to 50 characters.'), 'warning');
      } else if (trimmedDescription) {
        finalDescription = trimmedDescription;
      } else {
        // Empty description, use default
        finalDescription = t('customUploadedMusic', 'Custom uploaded background music');
      }
    }

    setUploadingFile(file.name);
    setUploadProgress(0);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('customBackground', file);  // Backend expects 'customBackground' field  
      formData.append('userId', userId || 'anonymous-user-' + Date.now()); // Use actual user ID or fallback
      formData.append('customName', trimmedTitle); // Use custom title
      formData.append('customDescription', finalDescription); // Use custom description
      
      // Debug FormData contents
      console.log('=== UPLOAD DEBUG ===');
      console.log('File:', file.name, 'Type:', file.type, 'Size:', file.size);
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }

      console.log('=== STARTING AXIOS POST ===');
      // Upload the file
      const response = await axios.post(
        getFullUrl('/api/meditation/custom-background/upload'),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-user-id': userId
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      );

      console.log('Upload response status:', response.status);
      console.log('Upload response data:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Response data success:', response.data?.success);
      
      if (response.data && response.data.success) {
        // Call parent onUpload callback
        if (onUpload) {
          await onUpload(file, response.data.metadata);
        }
        
        // Select the uploaded music
        onMusicSelect({
          id: response.data.metadata.id,
          name: response.data.metadata.customName,
          type: 'custom',
          file: file,
          filename: response.data.filename,
          customName: response.data.metadata.customName,
          customDescription: response.data.metadata.customDescription
        });
        
        showAlert(t('uploadSuccessful', 'Upload successful!'), 'success');
      } else {
        console.error('Upload response missing success flag or data:', {
          hasData: !!response.data,
          dataSuccess: response.data?.success,
          fullResponse: response.data
        });
        showAlert(t('uploadFailed', 'Upload failed - invalid response from server'), 'error');
      }
    } catch (error) {
      console.error('=== UPLOAD ERROR ===');
      console.error('Upload error details:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error code:', error.code);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      let errorMsg = t('uploadFailed', 'Failed to upload music file. Please try again.');
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      
      showAlert(errorMsg, 'error');
    } finally {
      setUploadingFile(null);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePreview = (music) => {
    console.log('Attempting to preview music:', music);
    
    if (audioRef.current) {
      // Stop current preview if playing
      if (isPlaying && previewAudio?.id === music.id) {
        audioRef.current.pause();
        setIsPlaying(false);
        setPreviewAudio(null);
        return;
      }
      
      // Stop any current audio
      audioRef.current.pause();
      
      // Construct URL if not provided
      let audioUrl = music.url;
      if (!audioUrl) {
        if (music.file) {
          audioUrl = URL.createObjectURL(music.file);
        } else if (music.filename && music.category) {
          // Catalog music
          audioUrl = getFullUrl(`/api/music/stream/${music.category}/${music.filename}`);
        } else if (music.filename && (music.userId || userId)) {
          // Custom music
          const userIdToUse = music.userId || userId;
          audioUrl = getFullUrl(`/api/meditation/custom-background-file/${userIdToUse}/${music.filename}`);
        }
      }
      
      console.log('Audio URL:', audioUrl);
      
      if (audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.volume = 0.5;
        audioRef.current.currentTime = 0; // Reset to beginning
        
        audioRef.current.play()
          .then(() => {
            console.log('Audio playing successfully');
            setIsPlaying(true);
            setPreviewAudio(music);
          })
          .catch(err => {
            console.error('Error playing audio:', err);
            console.error('Failed URL:', audioUrl);
          });
      } else {
        console.error('No valid audio URL found for:', music);
      }
    }
  };

  const handleDelete = (music) => {
    showConfirmDialog(
      t('confirmDeleteMusic', 'Are you sure you want to delete this music track?'),
      async () => {
        try {
          // Call the delete API directly
          const response = await axios.delete(
            getFullUrl(`/api/meditation/custom-background/${music.userId || userId}/${music.id}`),
            {
              headers: {
                'x-user-id': userId
              }
            }
          );
          
          if (response.status === 200) {
            // If this was the selected music, deselect it
            if (selectedMusic?.id === music.id) {
              onMusicSelect(null);
            }
            
            // Call parent onDelete handler to refresh the list
            if (onDelete) {
              await onDelete(music.id);
            }
            
            // Show success message
            showAlert(t('deleteSuccessful', 'Music deleted successfully!'), 'success');
          }
        } catch (error) {
          console.error('Delete error:', error);
          showAlert(t('deleteFailed', 'Failed to delete music. Please try again.'), 'error');
        }
      }
    );
  };

  return (
    <div className="custom-music-uploader">
      {/* Hidden audio element for preview */}
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.aac,.amr,.3ga,.aiff,.caf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Music Slider */}
      <div className="music-slider-container">
        <div className="music-slider-header">
          <h3>{t('backgroundMusic', 'Background Music')}</h3>
          <div className="slider-controls">
            <button 
              className="slider-btn"
              onClick={() => scrollSlider('prev')}
            >
              ‹
            </button>
            <button 
              className="slider-btn"
              onClick={() => scrollSlider('next')}
            >
              ›
            </button>
          </div>
        </div>
        
        <div className="music-slider" ref={sliderRef}>
          <div className="music-slider-track">
            {/* No Music Slide */}
            <div 
              className={`music-slide ${selectedMusic === null ? 'selected' : ''}`}
              onClick={() => onMusicSelect(null)}
            >
              <div className="slide-content">
                <div className="slide-header">
                  <div className="slide-icon">🔇</div>
                  <div className="slide-info">
                    <h4>{t('noMusic', 'No Music')}</h4>
                    <p>{t('noMusicDesc', 'Pure meditation without background music')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Music Slide */}
            <div 
              className="music-slide upload-slide"
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                borderStyle: 'dashed',
                cursor: uploadingFile ? 'wait' : 'pointer'
              }}
            >
              <div className="slide-content">
                <div className="slide-header">
                  <div className="slide-icon">
                    {uploadingFile ? '⏳' : '📁'}
                  </div>
                  <div className="slide-info">
                    <h4>{uploadingFile ? t('uploading', 'Uploading...') : t('uploadMusic', 'Upload Music')}</h4>
                    <p>
                      {uploadingFile 
                        ? `${uploadProgress}%` 
                        : t('clickToUpload', 'Click to add your own music')}
                    </p>
                  </div>
                </div>
                {!uploadingFile && (
                  <div style={{ marginTop: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                    {t('audioFormatsSupported', 'MP3, M4A, AAC, AMR, 3GA, AIFF • Max 20MB')}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Uploaded Music Slides */}
            {customBackgrounds && (() => {
              console.log('=== CUSTOM BACKGROUNDS DEBUG ===');
              console.log('Custom backgrounds count:', customBackgrounds.length);
              console.log('Custom backgrounds raw data:', JSON.stringify(customBackgrounds, null, 2));
              
              // Remove duplicates based on multiple criteria
              const uniqueBackgrounds = customBackgrounds.reduce((unique, current) => {
                // Check if already exists by ID, filename, or customName
                const exists = unique.find(bg => 
                  bg.id === current.id || 
                  (bg.filename === current.filename && bg.userId === current.userId) ||
                  (bg.customName === current.customName && bg.userId === current.userId)
                );
                
                if (!exists) {
                  unique.push(current);
                }
                
                return unique;
              }, []);
              
              console.log('Unique backgrounds count after filter:', uniqueBackgrounds.length);
              console.log('Unique backgrounds filtered:', JSON.stringify(uniqueBackgrounds, null, 2));
              
              return uniqueBackgrounds;
            })().map((customMusic) => {
              const isSelected = selectedMusic?.id === customMusic.id;
              const isPreviewing = previewAudio?.id === customMusic.id && isPlaying;
              
              return (
                <div 
                  key={customMusic.id}
                  className={`music-slide custom-slide ${isSelected ? 'selected' : ''}`}
                  onClick={() => onMusicSelect({
                    ...customMusic,
                    type: 'custom',
                    url: getFullUrl(`/api/meditation/custom-background-file/${customMusic.userId || userId}/${customMusic.filename}`)
                  })}
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(76, 175, 80, 0.1) 100%)'
                  }}
                >
                  <div className="slide-content">
                    <div className="slide-header">
                      <div className="slide-icon">🎵</div>
                      <div className="slide-info">
                        <h4>{customMusic.customName}</h4>
                        <p>{customMusic.customDescription || t('customMusic', 'Custom uploaded music')}</p>
                      </div>
                    </div>
                    <div className="slide-actions">
                      <button 
                        className="preview-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview({
                            ...customMusic,
                            url: getFullUrl(`/api/meditation/custom-background-file/${customMusic.userId || userId}/${customMusic.filename}`)
                          });
                        }}
                      >
                        {isPreviewing ? '⏸️' : '▶️'}
                      </button>
                      {onDelete && (
                        <button 
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(customMusic);
                          }}
                          style={{
                            background: 'rgba(255, 82, 82, 0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: '8px'
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ 
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(139, 92, 246, 0.3)',
                    padding: '4px',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px'
                  }}>
                    ✓
                  </div>
                </div>
              );
            })}


            {/* Catalog section removed - only custom music above */}
          </div>
        </div>
      </div>

      {/* Upload progress bar */}
      {uploadingFile && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p>{uploadingFile}</p>
        </div>
      )}

      {/* Selected display */}
      {selectedMusic && (
        <div className="selected-display">
          <div className="selected-label">{t('selected', 'Selected')}:</div>
          <div className="selected-info">
            <span className="music-icon">🎵</span>
            <span className="music-name">{selectedMusic.name}</span>
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
    </div>
  );
};

export default CustomMusicUploader;