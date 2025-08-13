import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl, getAssetUrl, API_ENDPOINTS } from '../config/api';
import PageHeader from './PageHeader';
import Alert from './Alert';
import ConfirmDialog from './ConfirmDialog';
import ShareMeditationDialog from './ShareMeditationDialog';
import VoiceSlider from './VoiceSlider';
import MeditationTypeSlider from './MeditationTypeSlider';
import BackgroundSlider from './BackgroundSlider';
import WizardContainer from './WizardContainer';
import ReviewStep from './ReviewStep';

const UnifiedDashboard = ({ user, userCredits, onCreditsUpdate, onProfileClick, unreadCount, onInboxClick, onCreateClick }) => {
  const { t, i18n } = useTranslation();
  
  // Tab state management
  const [activeTab, setActiveTab] = useState('mine'); // 'mine', 'community', 'create'
  
  // Shared states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [alertState, setAlertState] = useState({ show: false, message: '', type: 'success' });
  const [confirmState, setConfirmState] = useState({ show: false, message: '', onConfirm: null, confirmText: '', cancelText: '' });
  
  // Mine tab states (from MyAudio)
  const [myMeditations, setMyMeditations] = useState([]);
  const [playingMeditationId, setPlayingMeditationId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(null);
  const [downloadingAudio, setDownloadingAudio] = useState(null);
  const [showShareDialog, setShowShareDialog] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  // Additional refs for camera functionality
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Community tab states (from CommunityHub)
  const [communityMeditations, setCommunityMeditations] = useState([]);
  // Use dynamic filter options that update with language changes
  const filterOptions = useMemo(() => [
    { id: 'all', label: t('all', 'All'), icon: '🌟' },
    { id: 'sleep', label: t('sleep', 'Sleep'), icon: '🌙' },
    { id: 'stress', label: t('stress', 'Stress'), icon: '😌' },
    { id: 'focus', label: t('focus', 'Focus'), icon: '🎯' },
    { id: 'anxiety', label: t('anxiety', 'Anxiety'), icon: '🌿' },
    { id: 'energy', label: t('energy', 'Energy'), icon: '⚡' }
  ], [t]);
  
  const meditationTypeLabels = useMemo(() => {
    const labels = {};
    filterOptions.forEach(option => {
      if (option.id !== 'all') {
        labels[option.id] = option.label;
      }
    });
    return labels;
  }, [filterOptions]);
  
  const [communityFilter, setCommunityFilter] = useState('all');
  const [likingMeditation, setLikingMeditation] = useState(null);
  const [playedMeditations, setPlayedMeditations] = useState(new Set());
  
  // Full wizard states (restored from App.jsx)
  const [currentStep, setCurrentStep] = useState(1); // Full 5-step wizard
  const [wizardData, setWizardData] = useState({
    meditationType: 'sleep',
    text: '',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    background: 'ocean',
    useBackgroundMusic: true,
    speechTempo: 1.00,
    genderFilter: 'all'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [voices, setVoices] = useState([]);
  const [customBackgroundFile, setCustomBackgroundFile] = useState(null);
  const [savedCustomBackgrounds, setSavedCustomBackgrounds] = useState([]);
  const [backgroundsLoading, setBackgroundsLoading] = useState(true);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [showTextPreview, setShowTextPreview] = useState(false);
  
  // Background audio cleanup ref
  const backgroundSliderRef = useRef(null);

  // Helper functions
  const showAlert = (message, type = 'success') => {
    setAlertState({ show: true, message, type });
  };

  const showConfirm = (message, onConfirm, confirmText = t('confirm', 'Confirm'), cancelText = t('cancel', 'Cancel')) => {
    setConfirmState({ show: true, message, onConfirm, confirmText, cancelText });
  };

  // Load data based on active tab
  useEffect(() => {
    loadTabData();
  }, [activeTab, user]);

  // Load voices and custom backgrounds on component mount
  useEffect(() => {
    fetchVoices();
    if (user) {
      fetchSavedCustomBackgrounds();
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSavedCustomBackgrounds();
    }
  }, [user]);

  // Load voices
  const fetchVoices = async () => {
    try {
      const res = await axios.get(getFullUrl(API_ENDPOINTS.GET_VOICES));
      setVoices(res.data);
    } catch (error) {
      console.error("Error fetching voices:", error);
    }
  };

  // Load custom backgrounds
  const fetchSavedCustomBackgrounds = async () => {
    if (!user?.id) {
      setBackgroundsLoading(false);
      return;
    }
    
    setBackgroundsLoading(true);
    
    try {
      const url = getFullUrl(`/api/meditation/custom-backgrounds/${user.id}`);
      const response = await axios.get(url);
      setSavedCustomBackgrounds(response.data.backgrounds || []);
    } catch (error) {
      console.error('Error fetching saved custom backgrounds:', error);
      setSavedCustomBackgrounds([]);
    } finally {
      setBackgroundsLoading(false);
    }
  };

  const loadTabData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      if (activeTab === 'mine') {
        await loadMyMeditations();
      } else if (activeTab === 'community') {
        await loadCommunityMeditations();
      }
    } catch (error) {
      console.error('Error loading tab data:', error);
      setError(t('loadError', 'Failed to load data'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyMeditations = async () => {
    try {
      const response = await axios.get(getFullUrl(API_ENDPOINTS.USER_MEDITATIONS(user.id)));
      console.log('My meditations response:', response.data);
      setMyMeditations(response.data.meditations || []);
    } catch (error) {
      console.error('Error loading my meditations:', error);
      throw error;
    }
  };

  const loadCommunityMeditations = async () => {
    try {
      const params = user?.id ? { userId: user.id } : {};
      const response = await axios.get(getFullUrl('/api/community/shared-meditations'), { params });
      console.log('Community meditations loaded with like functionality:', response.data);
      setCommunityMeditations(response.data.meditations || []);
    } catch (error) {
      console.error('Error loading community meditations:', error);
      throw error;
    }
  };

  // Audio playback functions
  const handlePlayMeditation = (meditation, source = 'mine') => {
    const meditationId = meditation._id || meditation.id;
    const audioId = source === 'mine' ? `audio-${meditationId}` : `community-audio-${meditationId}`;
    const audio = document.getElementById(audioId);
    
    if (audio) {
      if (audio.paused) {
        // Stop all other audio
        document.querySelectorAll('audio').forEach(a => {
          if (a.playTimeout) {
            clearTimeout(a.playTimeout);
            a.playTimeout = null;
          }
          a.pause();
        });
        
        // Set up 20-second timeout for previews
        const playTimeout = setTimeout(() => {
          audio.pause();
          setPlayingMeditationId(null);
        }, 20000);
        
        audio.playTimeout = playTimeout;
        
        audio.play()
          .then(() => {
            setPlayingMeditationId(meditationId);
            
            // Track play count for community meditations
            if (source === 'community') {
              trackPlayCount(meditationId);
            }
          })
          .catch(err => {
            console.error('Error playing audio:', err);
            clearTimeout(playTimeout);
          });
      } else {
        audio.pause();
        if (audio.playTimeout) {
          clearTimeout(audio.playTimeout);
          audio.playTimeout = null;
        }
        setPlayingMeditationId(null);
      }
    }
  };

  // Track play count for community meditations (only once per user per meditation)
  const trackPlayCount = async (meditationId) => {
    // Check if user already played this meditation in this session
    if (playedMeditations.has(meditationId)) {
      return; // Don't track again
    }

    try {
      const response = await axios.post(getFullUrl(`/api/community/meditations/${meditationId}/play`), {
        userId: user?.id
      });
      
      // Only update if play was actually counted (backend returns success)
      if (response.data.success) {
        // Mark as played in this session
        setPlayedMeditations(prev => new Set([...prev, meditationId]));
        
        // Update local state
        setCommunityMeditations(prevMeditations =>
          prevMeditations.map(m =>
            m._id === meditationId 
              ? { ...m, playCount: response.data.playCount }
              : m
          )
        );
      }
    } catch (error) {
      console.error('Error tracking play count:', error);
    }
  };

  // Like meditation functionality
  const likeMeditation = async (meditationId) => {
    if (!user) {
      showAlert(t('loginRequired', 'Please log in to like meditations'), 'error');
      return;
    }

    setLikingMeditation(meditationId);
    
    try {
      const response = await axios.post(getFullUrl(`/api/community/meditations/${meditationId}/like`), {
        userId: user.id
      });

      // Update local state
      setCommunityMeditations(prevMeditations =>
        prevMeditations.map(m =>
          m._id === meditationId 
            ? { 
                ...m, 
                likes: response.data.likes,
                userLiked: response.data.userLiked
              }
            : m
        )
      );

      showAlert(
        response.data.userLiked 
          ? t('meditationLiked', 'Meditation liked!') 
          : t('meditationUnliked', 'Like removed'),
        'success'
      );
    } catch (error) {
      console.error('Error liking meditation:', error);
      showAlert(t('likeError', 'Failed to like meditation. Please try again.'), 'error');
    } finally {
      setLikingMeditation(null);
    }
  };

  // Image upload functions from MyAudio
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
      await loadMyMeditations();
      setShowImageOptions(null);
      showAlert(t('imageUploaded', 'Image uploaded successfully!'), 'success');
      
    } catch (error) {
      console.error('Error uploading image:', error);
      showAlert(t('failedUploadImage', 'Failed to upload image. Please try again.'), 'error');
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
        showAlert(t('cameraNotSupported', 'Camera is not supported in this browser. Please use Chrome, Firefox, or Safari.'), 'error');
        return;
      }

      // Mobile-optimized camera constraints
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Important for iOS
        videoRef.current.setAttribute('webkit-playsinline', 'true'); // iOS Safari
        await videoRef.current.play();
        setShowImageOptions(meditationId + '_camera');
      }
    } catch (error) {
      console.error('Camera error:', error);
      let errorMessage = '';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = t('cameraPermissionDenied', 'Camera permission denied. Please allow camera access in your browser.');
      } else if (error.name === 'NotFoundError') {
        errorMessage = t('noCameraFound', 'No camera found. Please ensure your device has a camera connected.');
      } else if (error.name === 'NotReadableError') {
        errorMessage = t('cameraInUse', 'Camera is being used by another application. Please close other apps using the camera.');
      } else if (error.name === 'OverconstrainedError') {
        // Fallback for mobile devices that don't support the constraints
        try {
          const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = simpleStream;
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.setAttribute('webkit-playsinline', 'true');
            await videoRef.current.play();
            setShowImageOptions(meditationId + '_camera');
            return;
          }
        } catch (fallbackError) {
          errorMessage = t('cameraConstraintError', 'Camera settings not supported. Please try a different device or browser.');
        }
      } else {
        errorMessage = `Camera error: ${error.message}`;
      }
      
      showAlert(errorMessage, 'error');
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
      await loadMyMeditations();
      setShowImageOptions(null);
      showAlert(t('imageDeleted', 'Image deleted successfully!'), 'success');
    } catch (error) {
      console.error('Error deleting custom image:', error);
      showAlert(t('failedDeleteImage', 'Failed to delete image. Please try again.'), 'error');
    }
  };

  const shareMeditation = async (meditationId, shareData) => {
    // Check credits before sharing
    if (userCredits && userCredits.credits < 1) {
      showAlert(t('insufficientTokensShare', 'Insufficient tokens. You need 1 token to share a meditation.'), 'error');
      return;
    }
    
    setIsSharing(true);
    try {
      const meditation = myMeditations.find(m => (m._id || m.id) === meditationId);
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
          const audioUrl = getFullUrl(API_ENDPOINTS.MEDITATION_AUDIO(audioFile.filename));
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
        await loadMyMeditations();
        if (onCreditsUpdate) {
          onCreditsUpdate();
        }
        setShowShareDialog(null);
        
        // Show success message
        showAlert(t('meditationSharedSuccess', 'Meditation shared successfully! It will appear in the community after admin approval.'), 'success');
      }
    } catch (error) {
      console.error('Error sharing meditation:', error);
      showAlert(t('failedShareMeditation', 'Failed to share meditation. Please try again.'), 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const deleteMeditation = async (meditationId) => {
    showConfirm(
      t('confirmDeleteMeditation', 'Are you sure you want to delete this meditation? This action cannot be undone.'),
      async () => {
        try {
          await axios.delete(getFullUrl(`/api/user-meditations/${user.id}/${meditationId}`));
          await loadMyMeditations();
          showAlert(t('meditationDeleted', 'Meditation deleted successfully!'), 'success');
        } catch (error) {
          console.error('Error deleting meditation:', error);
          showAlert(t('failedDeleteMeditation', 'Failed to delete meditation. Please try again.'), 'error');
        }
      },
      t('delete', 'Delete'),
      t('cancel', 'Cancel')
    );
  };

  // Get meditation image URL
  const getImageUrl = (meditation) => {
    if (meditation.customImage && meditation.customImage.filename) {
      return getAssetUrl(API_ENDPOINTS.CUSTOM_IMAGE(meditation.customImage.filename));
    }
    
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
    
    return meditationTypeImages[meditation.meditationType] || meditationTypeImages.sleep;
  };

  // Tab switching function
  const switchTab = (tabName) => {
    if (tabName === activeTab) return;
    
    // Stop any playing audio when switching tabs
    document.querySelectorAll('audio').forEach(audio => {
      if (audio.playTimeout) {
        clearTimeout(audio.playTimeout);
        audio.playTimeout = null;
      }
      audio.pause();
    });
    setPlayingMeditationId(null);
    
    setActiveTab(tabName);
  };

  // Wizard navigation functions (from App.jsx)
  const nextStep = () => {
    stopAllBackgroundAudio();
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    stopAllBackgroundAudio();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step) => {
    stopAllBackgroundAudio();
    if (step >= 1 && step <= 5) {
      setCurrentStep(step);
    }
  };

  const updateWizardData = (key, value) => {
    setWizardData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const isStepValid = (step) => {
    switch (step) {
      case 1:
        return wizardData.meditationType !== '';
      case 2:
        return wizardData.text.trim() !== '' && validateTextLength(wizardData.text).valid;
      case 3:
        return wizardData.voiceId !== '';
      case 4:
        return !wizardData.useBackgroundMusic || wizardData.background !== '';
      case 5:
        return true; // Review step is always valid
      default:
        return false;
    }
  };

  // Text generation functions
  const generateAIMeditationText = async (type, currentLanguage) => {
    try {
      const response = await axios.post(getFullUrl(API_ENDPOINTS.GENERATE_TEXT), {
        type,
        language: currentLanguage
      });
      
      return response.data.text;
    } catch (error) {
      console.error('Error calling meditation text API:', error);
      return t('fallbackMeditationText', 'Take a deep breath and relax. Focus on your breathing and let go of any tension. You are at peace and in control.');
    }
  };

  const generateTextPreview = async () => {
    setIsGeneratingText(true);
    setError('');
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const generated = await generateAIMeditationText(wizardData.meditationType, i18n.language);
      setGeneratedText(generated);
      updateWizardData('text', generated);
      setError('');
    } catch (error) {
      console.error('Error generating text preview:', error);
      setError(error.response?.data?.error || t('claudeApiError', 'Failed to generate meditation text.'));
    } finally {
      setIsGeneratingText(false);
    }
  };

  const clearText = () => {
    updateWizardData('text', '');
    setGeneratedText('');
  };

  // Word count and validation
  const countWords = (text) => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };

  const validateTextLength = (text) => {
    const wordCount = countWords(text);
    if (wordCount < 50) return { valid: false, message: t('textTooShort', 'Text too short (minimum 50 words)') };
    if (wordCount > 10000) return { valid: false, message: t('textTooLong', 'Text too long (maximum 10,000 words)') };
    return { valid: true, wordCount };
  };

  // Global function to stop all background audio
  const stopAllBackgroundAudio = () => {
    // Method 1: Try using the ref if available
    if (backgroundSliderRef.current && backgroundSliderRef.current.stopBackgroundSound) {
      backgroundSliderRef.current.stopBackgroundSound();
    }
    
    // Method 2: Force stop all audio elements (backup method)
    try {
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        if (!audio.paused) {
          audio.pause();
        }
      });
    } catch (error) {
      console.error('Error stopping audio elements:', error);
    }
  };

  // Audio generation function
  const generateAudio = async () => {
    stopAllBackgroundAudio();
    setIsGenerating(true);
    setError("");
    
    // Switch to Mine tab immediately to show progress bar
    switchTab('mine');
    
    try {
      // Prepare form data for file upload
      const formData = new FormData();
      formData.append('text', wizardData.text);
      formData.append('background', wizardData.background);
      formData.append('language', i18n.language);
      formData.append('audioLanguage', i18n.language);
      formData.append('voiceId', wizardData.voiceId);
      formData.append('meditationType', wizardData.meditationType);
      formData.append('userId', user?.id);
      formData.append('useBackgroundMusic', wizardData.useBackgroundMusic);
      formData.append('speechTempo', wizardData.speechTempo);
      
      // Add custom background file if selected
      if (customBackgroundFile) {
        if (customBackgroundFile.savedBackground) {
          const savedBg = customBackgroundFile.savedBackground;
          formData.append('savedBackgroundId', savedBg.id);
          formData.append('savedBackgroundUserId', savedBg.userId);
          formData.append('savedBackgroundFilename', savedBg.filename);
        } else {
          formData.append('customBackground', customBackgroundFile);
        }
      }

      const res = await axios.post(getFullUrl(API_ENDPOINTS.GENERATE_MEDITATION), formData, { 
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Refresh meditations and credits after successful generation
      await loadMyMeditations();
      if (onCreditsUpdate) {
        onCreditsUpdate();
      }
      
      // Reset wizard to step 1 and clear data
      setCurrentStep(1);
      setWizardData({
        meditationType: 'sleep',
        text: '',
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        background: 'ocean',
        useBackgroundMusic: true,
        speechTempo: 1.00,
        genderFilter: 'all'
      });
      setGeneratedText('');
      setShowTextPreview(false);
      setCustomBackgroundFile(null);
      
      showAlert(t('meditationCreated', 'Meditation created successfully!'), 'success');
      
    } catch (error) {
      console.error("Error generating meditation:", error);
      
      if (error.response && error.response.status === 400 && error.response.data) {
        if (error.response.data.error && error.response.data.error.includes('Insufficient credits')) {
          showAlert(t('insufficientTokensAudio', 'Insufficient tokens. You need 1 token to generate audio.'), 'error');
        } else {
          showAlert(error.response.data.error || t('errorGenerating', 'Failed to generate meditation.'), 'error');
        }
      } else {
        showAlert(t('errorGenerating', 'Failed to generate meditation.'), 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Render functions for each tab
  const renderMineTab = () => {
    const filteredMeditations = filterType === 'all' 
      ? myMeditations 
      : myMeditations.filter(m => m.meditationType === filterType);

    return (
      <div className="community-hub-spotify">
        {/* Audio generation spinner */}
        {isGenerating && (
          <div className="audio-generation-progress">
            <div className="progress-content">
              <div className="progress-spinner"></div>
            </div>
          </div>
        )}
        
        {/* Filter slider */}
        <div className="filter-slider">
          {(() => {
            // Calculate counts for each type
            const typeCounts = {};
            const allTypes = ['all', 'sleep', 'stress', 'focus', 'anxiety', 'energy', 'mindfulness', 'compassion', 'walking', 'breathing', 'morning'];
            
            allTypes.forEach(type => {
              if (type === 'all') {
                typeCounts[type] = myMeditations.length;
              } else {
                typeCounts[type] = myMeditations.filter(m => m.meditationType === type).length;
              }
            });

            // Sort types by count (highest first), but keep 'all' first
            const sortedTypes = allTypes.sort((a, b) => {
              if (a === 'all') return -1;
              if (b === 'all') return 1;
              return typeCounts[b] - typeCounts[a];
            });

            // Define multi-color flowing gradients for each type
            const typeColors = {
              all: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%, #f1f5f9 100%)',
              sleep: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 25%, #bfdbfe 50%, #93c5fd 75%, #dbeafe 100%)', 
              stress: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 25%, #a7f3d0 50%, #6ee7b7 75%, #d1fae5 100%)',
              focus: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 25%, #fde68a 50%, #facc15 75%, #fef3c7 100%)',
              anxiety: 'linear-gradient(135deg, #faf5ff 0%, #e9d5ff 25%, #d8b4fe 50%, #c084fc 75%, #e9d5ff 100%)',
              energy: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 25%, #fca5a5 50%, #f87171 75%, #fed7d7 100%)',
              mindfulness: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 25%, #99f6e4 50%, #5eead4 75%, #cffafe 100%)',
              compassion: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 25%, #fbcfe8 50%, #f9a8d4 75%, #fce7f3 100%)',
              walking: 'linear-gradient(135deg, #f7fee7 0%, #ecfccb 25%, #d9f99d 50%, #bef264 75%, #ecfccb 100%)',
              breathing: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 25%, #99f6e4 50%, #5eead4 75%, #a7f3d0 100%)',
              morning: 'linear-gradient(135deg, #fef7ed 0%, #fed7aa 25%, #fdba74 50%, #fb923c 75%, #fed7aa 100%)'
            };

            return sortedTypes.map(type => (
              <button
                key={type}
                className={`filter-slide-card ${filterType === type ? 'active' : ''}`}
                onClick={() => setFilterType(type)}
                style={{
                  '--card-color': typeColors[type],
                  '--card-count': typeCounts[type] || 0
                }}
              >
                <div className="filter-slide-content">
                  <span className="filter-slide-label">
                    {type === 'all' ? t('all', 'All') : t(type, type)}
                  </span>
                  <span className="filter-slide-count">
                    ({typeCounts[type] || 0})
                  </span>
                </div>
              </button>
            ));
          })()}
        </div>

        {/* Meditations grid */}
        <div className="community-meditations-list">
          {filteredMeditations.length > 0 ? (
            filteredMeditations.map((meditation) => (
              <div 
                key={meditation._id || meditation.id} 
                className={`meditation-card-with-player ${playingMeditationId === (meditation._id || meditation.id) ? 'playing' : ''}`}
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
                      width: '70px',
                      height: '70px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <img 
                      src={getImageUrl(meditation)}
                      alt={`${meditationTypeLabels[meditation.meditationType] || meditation.meditationType} meditation`}
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px'
                    }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: 'white',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                        marginRight: '8px'
                      }}>
                        {meditationTypeLabels[meditation.meditationType] || meditation.meditationType}
                      </div>
                      
                      {/* Action Buttons - Right Upper Corner */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowShareDialog(meditation);
                          }}
                          disabled={meditation.isShared}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: meditation.isShared ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)',
                            fontSize: '20px',
                            cursor: meditation.isShared ? 'default' : 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseOver={(e) => {
                            if (!meditation.isShared) {
                              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                              e.target.style.color = 'white';
                            }
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'none';
                            e.target.style.color = meditation.isShared ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)';
                          }}
                          title={meditation.isShared ? t('alreadyShared', 'Already shared') : t('shareMeditation', 'Share with community')}
                        >
                          {meditation.isShared ? '✅' : '🔗'}
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMeditation(meditation._id || meditation.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontSize: '18px',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'rgba(255, 107, 107, 0.2)';
                            e.target.style.color = '#ff6b6b';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'none';
                            e.target.style.color = 'rgba(255, 255, 255, 0.6)';
                          }}
                          title={t('deleteMeditation', 'Delete meditation')}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '4px'
                    }}>
                      {meditation.language === 'nl' ? 'Nederlands' : 
                       meditation.language === 'en' ? 'English' :
                       meditation.language === 'de' ? 'Deutsch' :
                       meditation.language === 'fr' ? 'Français' :
                       meditation.language?.toUpperCase() || 'EN'} • {(() => {
                        const date = new Date(meditation.createdAt);
                        const now = new Date();
                        const diffTime = Math.abs(now - date);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays === 1) return 'Vandaag';
                        if (diffDays === 2) return 'Gisteren';
                        if (diffDays <= 7) return `${diffDays - 1} dagen geleden`;
                        return date.toLocaleDateString();
                      })()}
                    </div>
                  </div>
                </div>

                {/* Full Width Audio Player */}
                {meditation.audioFiles?.length > 0 && (
                  <audio 
                    id={`audio-${meditation._id || meditation.id}`}
                    controls
                    controlsList="nodownload"
                    preload="metadata"
                    style={{
                      width: '100%',
                      height: '40px',
                      borderRadius: '6px',
                      outline: 'none'
                    }}
                    onPlay={() => {
                      // Pause all other audios first
                      document.querySelectorAll('audio').forEach(a => {
                        if (a.id !== `audio-${meditation._id || meditation.id}`) {
                          a.pause();
                        }
                      });
                      setPlayingMeditationId(meditation._id || meditation.id);
                    }}
                    onPause={() => {
                      setPlayingMeditationId(null);
                    }}
                    onEnded={() => {
                      setPlayingMeditationId(null);
                    }}
                  >
                    <source 
                      src={getAssetUrl(`/assets/meditations/${meditation.audioFiles[0].filename}`)} 
                      type="audio/mpeg" 
                    />
                    {t('audioNotSupported', 'Your browser does not support the audio element.')}
                  </audio>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🧘</div>
              <h3>{t('noMeditations', 'No meditations yet')}</h3>
              <p>{t('createFirstMeditation', 'Create your first meditation to get started')}</p>
              <button 
                className="create-first-button"
                onClick={() => switchTab('create')}
              >
                {t('createNow', 'Create Now')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCommunityTab = () => {
    const filteredCommunityMeditations = communityFilter === 'all'
      ? communityMeditations
      : communityMeditations.filter(m => m.meditationType === communityFilter);

    return (
      <div className="community-tab">
        {/* Filter slider */}
        <div className="filter-slider">
          {(() => {
            // Calculate counts for each type in community meditations
            const typeCounts = {};
            const allTypes = ['all', 'sleep', 'stress', 'focus', 'anxiety', 'energy', 'mindfulness', 'compassion', 'walking', 'breathing', 'morning'];
            
            allTypes.forEach(type => {
              if (type === 'all') {
                typeCounts[type] = communityMeditations.length;
              } else {
                typeCounts[type] = communityMeditations.filter(m => m.meditationType === type).length;
              }
            });

            // Sort types by count (highest first), but keep 'all' first
            const sortedTypes = allTypes.sort((a, b) => {
              if (a === 'all') return -1;
              if (b === 'all') return 1;
              return typeCounts[b] - typeCounts[a];
            });

            // Define multi-color flowing gradients for each type
            const typeColors = {
              all: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%, #f1f5f9 100%)',
              sleep: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 25%, #bfdbfe 50%, #93c5fd 75%, #dbeafe 100%)', 
              stress: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 25%, #a7f3d0 50%, #6ee7b7 75%, #d1fae5 100%)',
              focus: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 25%, #fde68a 50%, #facc15 75%, #fef3c7 100%)',
              anxiety: 'linear-gradient(135deg, #faf5ff 0%, #e9d5ff 25%, #d8b4fe 50%, #c084fc 75%, #e9d5ff 100%)',
              energy: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 25%, #fca5a5 50%, #f87171 75%, #fed7d7 100%)',
              mindfulness: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 25%, #99f6e4 50%, #5eead4 75%, #cffafe 100%)',
              compassion: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 25%, #fbcfe8 50%, #f9a8d4 75%, #fce7f3 100%)',
              walking: 'linear-gradient(135deg, #f7fee7 0%, #ecfccb 25%, #d9f99d 50%, #bef264 75%, #ecfccb 100%)',
              breathing: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 25%, #99f6e4 50%, #5eead4 75%, #a7f3d0 100%)',
              morning: 'linear-gradient(135deg, #fef7ed 0%, #fed7aa 25%, #fdba74 50%, #fb923c 75%, #fed7aa 100%)'
            };

            return sortedTypes.map(type => (
              <button
                key={type}
                className={`filter-slide-card ${communityFilter === type ? 'active' : ''}`}
                onClick={() => setCommunityFilter(type)}
                style={{
                  '--card-color': typeColors[type],
                  '--card-count': typeCounts[type] || 0
                }}
              >
                <div className="filter-slide-content">
                  <span className="filter-slide-label">
                    {type === 'all' ? t('all', 'All') : t(type, type)}
                  </span>
                  <span className="filter-slide-count">
                    ({typeCounts[type] || 0})
                  </span>
                </div>
              </button>
            ));
          })()}
        </div>

        {/* Community meditations grid */}
        <div className="meditations-grid">
          {filteredCommunityMeditations.length > 0 ? (
            filteredCommunityMeditations.map((meditation) => (
              <div key={meditation._id} className="meditation-card expanded">
                {/* Meditation Image */}
                <div className="meditation-image-container">
                  <img 
                    src={getImageUrl(meditation)} 
                    alt={`${meditation.meditationType} meditation`}
                    className="meditation-image"
                  />
                </div>

                {/* Meditation Content */}
                <div className="meditation-content">
                  <div className="meditation-header">
                    <h3 className="meditation-title">
                      {meditation.title || `${t(meditation.meditationType, meditation.meditationType)} ${t('meditation', 'Meditation')}`}
                    </h3>
                    <span className="meditation-type-label">
                      {t(meditation.meditationType, meditation.meditationType)}
                    </span>
                    <span className="community-author">@{meditation.sharedBy?.username || 'anonymous'}</span>
                  </div>
                  
                  <div className="meditation-meta">
                    <span className="meditation-date">
                      {new Date(meditation.createdAt).toLocaleDateString()}
                    </span>
                    <span className="meditation-language">
                      🌍 {meditation.language?.toUpperCase() || 'EN'}
                    </span>
                    {meditation.audioFile?.duration && (
                      <span className="meditation-duration">
                        ⏱️ {Math.round(meditation.audioFile.duration / 60)}m
                      </span>
                    )}
                  </div>
                  
                  <p className="meditation-text-preview">
                    {meditation.description || meditation.text?.substring(0, 150) + '...' || t('noDescription', 'No description')}
                  </p>
                </div>

                {/* Audio Player */}
                {meditation.audioFile && (
                  <div className="audio-player-section">
                    <audio
                      id={`community-audio-${meditation._id}`}
                      controls
                      controlsList="nodownload"
                      preload="none"
                      onPlay={() => {
                        setPlayingMeditationId(meditation._id);
                        trackPlayCount(meditation._id);
                      }}
                      onPause={() => setPlayingMeditationId(null)}
                      onEnded={() => setPlayingMeditationId(null)}
                    >
                      <source 
                        src={getAssetUrl(`/assets/audio/shared/${meditation.audioFile.filename}`)} 
                        type="audio/mpeg" 
                      />
                      {t('audioNotSupported', 'Your browser does not support the audio element.')}
                    </audio>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="meditation-actions">
                  <button 
                    className={`action-btn ${meditation.userLiked ? 'liked' : 'share-btn'}`}
                    onClick={() => likeMeditation(meditation._id)}
                    disabled={likingMeditation === meditation._id}
                    title={meditation.userLiked ? t('unlikeMeditation', 'Unlike') : t('likeMeditation', 'Like')}
                  >
                    {likingMeditation === meditation._id ? (
                      <>⏳ {t('loading', 'Loading...')}</>
                    ) : (
                      <>
                        {meditation.userLiked ? '❤️' : '🤍'} {t('like', 'Like')} ({meditation.likes || 0})
                      </>
                    )}
                  </button>
                  <button className="action-btn" disabled>
                    ▶️ {meditation.playCount || 0} plays
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🌍</div>
              <h3>{t('noCommunityMeditations', 'No community meditations found')}</h3>
              <p>{t('tryDifferentFilter', 'Try a different filter or check back later')}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCreateTab = () => {
    // Render wizard step content - full 5 steps from App.jsx
    const renderWizardStep = () => {
      switch (currentStep) {
        case 1:
          return (
            <MeditationTypeSlider 
              selectedType={wizardData.meditationType}
              onTypeSelect={(type) => updateWizardData('meditationType', type)}
            />
          );
        
        case 2:
          return (
            <div className="text-step">
              <div className="text-actions">
                <button
                  onClick={async () => {
                    setIsGeneratingText(true);
                    setError('');
                    try {
                      await new Promise(resolve => setTimeout(resolve, 500));
                      const generated = await generateAIMeditationText(wizardData.meditationType, i18n.language);
                      updateWizardData('text', generated);
                      setError('');
                    } catch (error) {
                      console.error('Error generating wizard text:', error);
                      setError(error.response?.data?.error || t('claudeApiError', 'Failed to generate meditation text.'));
                    } finally {
                      setIsGeneratingText(false);
                    }
                  }}
                  className="generate-text-btn"
                  disabled={isGeneratingText}
                >
                  {isGeneratingText ? t('generating', 'Generating...') : `🔄 ${t('regenerate', 'Generate Text')}`}
                </button>
                <button
                  onClick={clearText}
                  className="clear-text-btn"
                  disabled={isGeneratingText || !wizardData.text.trim()}
                >
                  🗑️ {t('clearText', 'Clear Text')}
                </button>
              </div>
              
              <div className="text-input-section">
                <textarea
                  value={wizardData.text}
                  onChange={(e) => updateWizardData('text', e.target.value)}
                  placeholder={t('textPlaceholder', 'Type your meditation text here to create an audio version')}
                  className="meditation-text-input"
                  rows={10}
                />
                <div className="text-validation">
                  {(() => {
                    const validation = validateTextLength(wizardData.text);
                    const wordCount = countWords(wizardData.text);
                    
                    if (wordCount === 0) {
                      return (
                        <div className="word-count-info">
                          <span className="word-count-hint">
                            {t('wordCountMin', 'Minimum 50 words required')}
                          </span>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="word-count-info">
                        <span className={`word-count ${validation.valid ? 'valid' : 'invalid'}`}>
                          {wordCount} words
                        </span>
                        {!validation.valid && (
                          <span className="validation-error">
                            - {validation.message}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        
        case 3:
          return (
            <VoiceSlider
              voices={voices}
              selectedVoiceId={wizardData.voiceId}
              onVoiceSelect={(voiceId) => updateWizardData('voiceId', voiceId)}
              voiceProvider="elevenlabs"
              currentMeditationType={wizardData.meditationType}
              isGeneratingAudio={isGenerating}
              genderFilter={wizardData.genderFilter}
              onGenderFilterChange={(filter) => updateWizardData('genderFilter', filter)}
            />
          );
        
        case 4:
          return (
            <div className="background-step">
              <BackgroundSlider
                ref={backgroundSliderRef}
                selectedBackground={wizardData.background}
                onBackgroundSelect={(bg) => {
                  if (bg === 'none') {
                    updateWizardData('useBackgroundMusic', false);
                    updateWizardData('background', '');
                  } else {
                    updateWizardData('useBackgroundMusic', true);
                    updateWizardData('background', bg);
                  }
                }}
                meditationType={wizardData.meditationType}
                customBackground={customBackgroundFile}
                customBackgroundFile={customBackgroundFile}
                savedCustomBackgrounds={savedCustomBackgrounds}
                backgroundsLoading={backgroundsLoading}
                onStopAllAudio={stopAllBackgroundAudio}
              />
            </div>
          );
        
        case 5:
          return (
            <ReviewStep
              key={`review-${JSON.stringify(wizardData)}`}
              wizardData={wizardData}
              voices={voices}
              savedCustomBackgrounds={savedCustomBackgrounds}
            />
          );
        
        default:
          return null;
      }
    };

    return (
      <div className="create-tab">
        <WizardContainer
          currentStep={currentStep}
          totalSteps={5}
          onNext={nextStep}
          onPrev={prevStep}
          onGoToStep={goToStep}
          isStepValid={isStepValid}
          onGenerate={generateAudio}
          isGenerating={isGenerating}
        >
          {renderWizardStep()}
        </WizardContainer>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="unified-dashboard">
      <PageHeader 
        user={user}
        unreadCount={unreadCount}
        onProfileClick={onProfileClick}
        onInboxClick={onInboxClick}
        onCreateClick={onCreateClick}
      />

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'mine' ? 'active' : ''}`}
          onClick={() => switchTab('mine')}
        >
          <span className="tab-icon">📚</span>
          {t('mine', 'Mijn')}
        </button>
        
        <button
          className={`tab-button ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => switchTab('community')}
        >
          <span className="tab-icon">🌍</span>
          {t('community', 'Community')}
        </button>
        
        <button
          className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => switchTab('create')}
        >
          <span className="tab-icon">✨</span>
          {t('create', 'Create')}
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>{t('loading', 'Loading...')}</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p className="error-message">{error}</p>
            <button onClick={loadTabData}>{t('retry', 'Retry')}</button>
          </div>
        ) : (
          <>
            {activeTab === 'mine' && renderMineTab()}
            {activeTab === 'community' && renderCommunityTab()}
            {activeTab === 'create' && renderCreateTab()}
          </>
        )}
      </div>


      {/* Modals and Alerts */}
      {alertState.show && (
        <Alert
          message={alertState.message}
          type={alertState.type}
          onClose={() => setAlertState({ show: false, message: '', type: 'success' })}
        />
      )}

      {confirmState.show && (
        <ConfirmDialog
          message={confirmState.message}
          onConfirm={() => {
            confirmState.onConfirm();
            setConfirmState({ show: false, message: '', onConfirm: null, confirmText: '', cancelText: '' });
          }}
          onCancel={() => setConfirmState({ show: false, message: '', onConfirm: null, confirmText: '', cancelText: '' })}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
        />
      )}

      {showShareDialog && (
        <ShareMeditationDialog
          meditation={showShareDialog}
          user={user}
          t={t}
          onClose={() => setShowShareDialog(null)}
          onShare={(shareData) => {
            shareMeditation(showShareDialog._id || showShareDialog.id, shareData);
          }}
          isSharing={isSharing}
        />
      )}
    </div>
  );
};

export default UnifiedDashboard;// Test change Tue Aug 12 11:46:54 UTC 2025
