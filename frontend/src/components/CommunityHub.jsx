import React, { useState, useEffect } from 'react';
// FORCE BUILD TIMESTAMP: 20250815073900
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl, getAssetUrl, API_ENDPOINTS, API_BASE_URL } from '../config/api';
import JournalHub from './JournalHub';
import PageHeader from './PageHeader';

const CommunityHub = ({ user, onProfileClick, unreadCount, onInboxClick, onCreateClick }) => {
  // CACHE BUSTER: Forcing new build hash - Aug15-0740
  const CACHE_BUST = 'v2.0.1-cropped-images-mobile-responsive';
  console.log('🎯 Community Hub v2.1.0: NO IMAGES - Emoji only version loaded!', CACHE_BUST, new Date().toISOString());
  // Enhanced CSS for modern slider styling
  const customScrollbarCSS = `
    .meditation-slider-container {
      position: relative;
    }
    .meditation-slider-container::-webkit-scrollbar {
      height: 8px;
    }
    .meditation-slider-container::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      margin: 4px;
    }
    .meditation-slider-container::-webkit-scrollbar-thumb {
      background: linear-gradient(45deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.15));
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .meditation-slider-container::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(45deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.25));
    }
    .meditation-filter-button {
      flex-shrink: 0;
      white-space: nowrap;
      position: relative;
      overflow: hidden;
    }
    .meditation-filter-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.6s ease;
    }
    .meditation-filter-button:hover::before {
      left: 100%;
    }
  `;

  // Add the CSS to the document head if not already present
  React.useEffect(() => {
    const styleId = 'meditation-slider-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = customScrollbarCSS;
      document.head.appendChild(style);
    }
    
    // Cleanup function
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
  const [sharedMeditations, setSharedMeditations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMeditation, setSelectedMeditation] = useState(null);
  const [playingMeditationId, setPlayingMeditationId] = useState(null);
  const [likedMeditations, setLikedMeditations] = useState(new Set());
  const [mutedMeditations, setMutedMeditations] = useState(new Set());
  const [activeSubTab, setActiveSubTab] = useState('meditations'); // 'meditations' or 'journals'
  const [filterType, setFilterType] = useState('all'); // Cache buster v3
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { t } = useTranslation();

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const meditationTypes = [
    { value: 'sleep', emoji: '🌙', label: 'Sleep', color: '#1E293B' }, // Dark Slate
    { value: 'stress', emoji: '😌', label: 'Stress', color: '#991B1B' }, // Dark Red
    { value: 'focus', emoji: '🎯', label: 'Focus', color: '#065F46' }, // Dark Green
    { value: 'anxiety', emoji: '🌿', label: 'Anxiety', color: '#5B21B6' }, // Dark Purple
    { value: 'energy', emoji: '⚡', label: 'Energy', color: '#C2410C' }, // Dark Orange
    { value: 'mindfulness', emoji: '🧘', label: 'Mindfulness', color: '#047857' }, // Dark Emerald
    { value: 'compassion', emoji: '💙', label: 'Compassion', color: '#BE185D' }, // Dark Pink
    { value: 'walking', emoji: '🚶', label: 'Walking', color: '#6B21A8' }, // Dark Violet
    { value: 'breathing', emoji: '🌬️', label: 'Breathing', color: '#0E7490' }, // Dark Cyan
    { value: 'morning', emoji: '🌅', label: 'Morning', color: '#EA580C' } // Dark Orange
  ];
  
  const languages = ['en', 'es', 'fr', 'de', 'nl', 'zh', 'hi', 'ar', 'pt', 'ru', 'ja', 'ko', 'it'];

  const meditationTypeLabels = meditationTypes.reduce((acc, type) => {
    acc[type.value] = type.label;
    return acc;
  }, {});

  const languageLabels = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    nl: 'Nederlands',
    zh: '中文',
    hi: 'हिन्दी',
    ar: 'العربية',
    pt: 'Português',
    ru: 'Русский',
    ja: '日本語',
    ko: '한국어',
    it: 'Italiano'
  };

  useEffect(() => {
    fetchSharedMeditations();
  }, []);

  // Reset slider when filter changes
  useEffect(() => {
    setCurrentSlideIndex(0);
  }, [filterType]);

  // Auto-hide error messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchSharedMeditations = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(getFullUrl('/api/community/shared-meditations'));
      const meditations = response.data.meditations || [];
      setSharedMeditations(meditations);
      
      // Track which meditations are liked by current user
      if (user) {
        const userLikes = new Set();
        meditations.forEach(meditation => {
          if (meditation.likes && meditation.likes.some(like => like.userId === user.id)) {
            userLikes.add(meditation._id);
          }
        });
        setLikedMeditations(userLikes);
      }
    } catch (error) {
      console.error('Error fetching shared meditations:', error);
      setError(t('failedToLoadCommunityMeditations', 'Failed to load community meditations'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMeditations = sharedMeditations.filter(meditation => {
    return filterType === 'all' || meditation.meditationType === filterType;
  });


  const formatDuration = (seconds) => {
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

  const getImageUrl = (meditation) => {
    // Handle different image formats for shared meditations
    if (meditation.customImage) {
      if (typeof meditation.customImage === 'string') {
        return `${API_BASE_URL}/assets/images/shared/${meditation.customImage}`;
      } else if (meditation.customImage.filename) {
        return `${API_BASE_URL}/assets/images/shared/${meditation.customImage.filename}`;
      }
    }
    
    // Default meditation type images
    const defaultImages = {
      sleep: `${API_BASE_URL}/assets/images/sleep.jpg`,
      stress: `${API_BASE_URL}/assets/images/stress.jpg`,
      focus: `${API_BASE_URL}/assets/images/focus.jpg`,
      anxiety: `${API_BASE_URL}/assets/images/anxiety.jpg`,
      energy: `${API_BASE_URL}/assets/images/energy.jpg`,
      mindfulness: `${API_BASE_URL}/assets/images/mindfulness.jpg`,
      compassion: `${API_BASE_URL}/assets/images/compassion.jpg`,
      walking: `${API_BASE_URL}/assets/images/walking.jpg`,
      breathing: `${API_BASE_URL}/assets/images/breathing.jpg`,
      morning: `${API_BASE_URL}/assets/images/morning.jpg`
    };
    
    return defaultImages[meditation.meditationType] || defaultImages.sleep;
  };

  const handlePlayMeditation = (meditation) => {
    if (!meditation.audioFile) {
      console.log('No audio file for meditation:', meditation);
      return;
    }
    
    const audio = document.querySelector(`#shared-audio-${meditation._id}`);
    if (audio) {
      console.log('Playing audio:', meditation.audioFile.filename);
      if (audio.paused) {
        document.querySelectorAll('audio').forEach(a => {
          if (a.playTimeout) {
            clearTimeout(a.playTimeout);
            a.playTimeout = null;
          }
          a.pause();
        });
        
        // Set up 20-second timeout
        const playTimeout = setTimeout(() => {
          audio.pause();
          setPlayingMeditationId(null);
        }, 20000); // 20 seconds
        
        // Store timeout ID on audio element for cleanup
        audio.playTimeout = playTimeout;
        
        audio.play()
          .then(() => {
            setPlayingMeditationId(meditation._id);
          })
          .catch(err => {
            console.error('Error playing audio:', err);
            console.error('Audio source:', audio.src);
            clearTimeout(playTimeout);
          });
      } else {
        audio.pause();
        // Clear timeout if audio is manually paused
        if (audio.playTimeout) {
          clearTimeout(audio.playTimeout);
          audio.playTimeout = null;
        }
        setPlayingMeditationId(null);
      }
    } else {
      console.error('Audio element not found for meditation:', meditation._id);
    }
  };

  const handleLikeMeditation = async (meditationId) => {
    if (!user) return;
    
    try {
      const response = await axios.post(getFullUrl(`/api/community/meditation/${meditationId}/like`), {
        userId: user.id
      });
      
      if (response.data.success) {
        const newLikedMeditations = new Set(likedMeditations);
        if (response.data.isLiked) {
          newLikedMeditations.add(meditationId);
        } else {
          newLikedMeditations.delete(meditationId);
        }
        setLikedMeditations(newLikedMeditations);
        
        // Update meditation like count in local state
        setSharedMeditations(prevMeditations => 
          prevMeditations.map(meditation => 
            meditation._id === meditationId 
              ? { ...meditation, likeCount: response.data.likeCount }
              : meditation
          )
        );
      }
    } catch (error) {
      console.error('Error liking meditation:', error);
      setError(t('failedToLikeMeditation', 'Failed to like meditation'));
    }
  };

  const handlePlayCountUpdate = async (meditationId) => {
    try {
      const response = await axios.post(getFullUrl(`/api/community/meditation/${meditationId}/play`), {
        userId: user?.id
      });
      
      if (response.data.success) {
        // Update meditation play count in local state
        setSharedMeditations(prevMeditations => 
          prevMeditations.map(meditation => 
            meditation._id === meditationId 
              ? { ...meditation, playCount: response.data.playCount }
              : meditation
          )
        );
        
        // Log if this was a new play or not (for debugging)
        if (response.data.wasNewPlay) {
          console.log('New unique play recorded for meditation:', meditationId);
        } else {
          console.log('User has already played this meditation before:', meditationId);
        }
      }
    } catch (error) {
      console.error('Error updating play count:', error);
      // Don't show error to user as this is not critical
    }
  };

  if (isLoading) {
    return (
      <div className="community-hub-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          {t('loading', 'Loading...')}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="community-hub-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="community-hub-spotify">
      <PageHeader 
        user={user}
        onProfileClick={onProfileClick}
        unreadCount={unreadCount}
        onInboxClick={onInboxClick}
        onCreateClick={onCreateClick}
      />

      {/* Sub-tabs for meditations and journals */}
      <div className="community-subtabs" style={{
        display: 'flex',
        gap: isMobile ? '8px' : '12px',
        marginBottom: '16px',
        padding: isMobile ? '0 8px' : '0 16px'
      }}>
        <button 
          className={`subtab-btn ${activeSubTab === 'meditations' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('meditations')}
          style={{
            flex: 1,
            padding: isMobile ? '12px 16px' : '14px 20px',
            fontSize: isMobile ? '14px' : '16px',
            borderRadius: isMobile ? '10px' : '12px',
            minHeight: isMobile ? '48px' : 'auto'
          }}
        >
          🧘 {t('meditations', 'Meditaties')}
        </button>
        <button 
          className={`subtab-btn ${activeSubTab === 'journals' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('journals')}
          style={{
            flex: 1,
            padding: isMobile ? '12px 16px' : '14px 20px',
            fontSize: isMobile ? '14px' : '16px',
            borderRadius: isMobile ? '10px' : '12px',
            minHeight: isMobile ? '48px' : 'auto'
          }}
        >
          📔 {t('voiceJournals', 'Dagboeken')}
        </button>
      </div>

      {/* Render content based on active sub-tab */}
      {activeSubTab === 'meditations' ? (
        <>
          {/* Meditation Type Slider */}
          <div className="meditation-filter-section" style={{ 
            marginTop: '20px', 
            marginBottom: '28px',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: window.innerWidth <= 768 ? '16px' : '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
          }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '16px', 
              fontWeight: '700', 
              color: 'white',
              fontSize: window.innerWidth <= 768 ? '16px' : '18px',
              letterSpacing: '-0.01em',
              textAlign: 'center'
            }}>
              ✨ {t('meditationType', 'Meditatie Type')}
            </label>
            <div 
              className="meditation-slider-container"
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                gap: '12px',
                padding: '12px 8px',
                width: '100%',
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.05)',
                WebkitOverflowScrolling: 'touch',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.02)'
              }}
            >
              {/* All Types Button */}
              <button
                className={`meditation-filter-button ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
                style={{
                  background: filterType === 'all' 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : 'rgba(255, 255, 255, 0.08)',
                  color: 'white',
                  border: filterType === 'all' 
                    ? '2px solid rgba(255, 255, 255, 0.3)' 
                    : '1.5px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: window.innerWidth <= 768 ? '12px' : '16px',
                  padding: window.innerWidth <= 768 ? '12px 16px' : '14px 22px',
                  margin: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontSize: window.innerWidth <= 768 ? '14px' : '15px',
                  fontWeight: '600',
                  minWidth: window.innerWidth <= 768 ? '90px' : '110px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(20px)',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  boxShadow: filterType === 'all' 
                    ? '0 8px 24px rgba(102, 126, 234, 0.4), 0 4px 12px rgba(118, 75, 162, 0.3)' 
                    : '0 4px 12px rgba(0, 0, 0, 0.1)',
                  textShadow: filterType === 'all' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
                  transform: filterType === 'all' ? 'translateY(-2px) scale(1.02)' : 'none'
                }}
                onMouseOver={(e) => {
                  if (filterType !== 'all') {
                    e.target.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)';
                    e.target.style.transform = 'translateY(-3px) scale(1.05)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                    e.target.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.2)';
                  } else {
                    e.target.style.transform = 'translateY(-3px) scale(1.05)';
                    e.target.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.5), 0 6px 16px rgba(118, 75, 162, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (filterType !== 'all') {
                    e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.target.style.transform = 'none';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  } else {
                    e.target.style.transform = 'translateY(-2px) scale(1.02)';
                    e.target.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.4), 0 4px 12px rgba(118, 75, 162, 0.3)';
                  }
                }}
              >
                <span style={{ fontSize: '18px' }}>🌈</span>
                <span style={{ fontSize: '14px' }}>
                  {t('allTypes', 'Alle')} ({sharedMeditations.length})
                </span>
              </button>

              {/* Individual Meditation Type Buttons */}
              {meditationTypes.map(type => {
                const count = sharedMeditations.filter(m => m.meditationType === type.value).length;
                return (
                  <button
                    key={type.value}
                    className={`meditation-filter-button ${filterType === type.value ? 'active' : ''}`}
                    onClick={() => setFilterType(type.value)}
                    style={{
                      background: filterType === type.value 
                        ? `linear-gradient(135deg, ${type.color}, ${type.color}CC)` 
                        : 'rgba(255, 255, 255, 0.08)',
                      color: 'white',
                      border: filterType === type.value 
                        ? '2px solid rgba(255, 255, 255, 0.3)' 
                        : '1.5px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: window.innerWidth <= 768 ? '12px' : '16px',
                      padding: window.innerWidth <= 768 ? '12px 16px' : '14px 22px',
                      margin: '2px',
                      cursor: 'pointer',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontSize: window.innerWidth <= 768 ? '14px' : '15px',
                      fontWeight: '600',
                      minWidth: window.innerWidth <= 768 ? '90px' : '110px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      backdropFilter: 'blur(20px)',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      boxShadow: filterType === type.value 
                        ? `0 8px 24px ${type.color}40, 0 4px 12px ${type.color}30` 
                        : '0 4px 12px rgba(0, 0, 0, 0.1)',
                      textShadow: filterType === type.value ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
                      transform: filterType === type.value ? 'translateY(-2px) scale(1.02)' : 'none'
                    }}
                    onMouseOver={(e) => {
                      if (filterType !== type.value) {
                        e.target.style.background = `linear-gradient(135deg, ${type.color}30, rgba(255, 255, 255, 0.15))`;
                        e.target.style.transform = 'translateY(-3px) scale(1.05)';
                        e.target.style.borderColor = `${type.color}60`;
                        e.target.style.boxShadow = `0 12px 28px ${type.color}20, 0 6px 16px rgba(0, 0, 0, 0.2)`;
                      } else {
                        e.target.style.transform = 'translateY(-3px) scale(1.05)';
                        e.target.style.boxShadow = `0 12px 32px ${type.color}50, 0 6px 16px ${type.color}40`;
                      }
                    }}
                    onMouseOut={(e) => {
                      if (filterType !== type.value) {
                        e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.target.style.transform = 'none';
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                      } else {
                        e.target.style.transform = 'translateY(-2px) scale(1.02)';
                        e.target.style.boxShadow = `0 8px 24px ${type.color}40, 0 4px 12px ${type.color}30`;
                      }
                    }}
                    title={`${type.label} - ${count} ${t('meditations', 'meditaties')}`}
                  >
                    <span style={{ fontSize: window.innerWidth <= 768 ? '16px' : '18px' }}>{type.emoji}</span>
                    <span style={{ fontSize: window.innerWidth <= 768 ? '12px' : '13px', fontWeight: 'inherit' }}>
                      {type.label} ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {filteredMeditations.length === 0 ? (
            <div className="spotify-empty-state">
              <div className="empty-state-content">
                <div className="empty-icon-large">🎧</div>
                <h2 className="empty-title">{t('noSharedMeditations', 'No meditations found')}</h2>
                <p className="empty-description">{t('beFirstToShare', 'Be the first to share your meditation with the community!')}</p>
              </div>
            </div>
          ) : (
            <div className="community-meditations-list" style={{
              padding: isMobile ? '0 8px' : '0 16px'
            }}>
                {filteredMeditations.map((meditation, index) => (
                  <div 
                    key={meditation._id} 
                    className={`meditation-card-with-player ${playingMeditationId === meditation._id ? 'playing' : ''}`}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: isMobile ? '12px' : '16px',
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
                    {/* Top Row - Album Art and Info (Mine page style) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px', marginBottom: '12px' }}>
                      {/* Album Art with Type Badge */}
                      <div 
                        className="meditation-thumbnail"
                        style={{
                          width: isMobile ? '60px' : '70px',
                          height: isMobile ? '60px' : '70px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: `linear-gradient(135deg, ${meditationTypes.find(t => t.value === meditation.meditationType)?.color || '#4F46E5'}40, rgba(255, 255, 255, 0.1))`,
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: isMobile ? '20px' : '24px'
                        }}
                      >
                        {/* Just the emoji - no images */}
                        {meditationTypes.find(t => t.value === meditation.meditationType)?.emoji || '🧘'}
                      </div>

                      {/* Content Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Title and Author Info */}
                        <div style={{ marginBottom: '4px' }}>
                          <h3 style={{
                            fontSize: isMobile ? '15px' : '16px',
                            fontWeight: '600',
                            color: 'white',
                            margin: '0 0 4px 0',
                            lineHeight: '1.3'
                          }}>
                            {meditation.author.username || meditation.author}
                          </h3>
                          <div style={{
                            fontSize: isMobile ? '13px' : '14px',
                            color: 'rgba(255, 255, 255, 0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '6px' : '8px',
                            flexWrap: isMobile ? 'wrap' : 'nowrap'
                          }}>
                            <span style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              padding: isMobile ? '2px 4px' : '2px 6px',
                              borderRadius: '4px',
                              fontSize: isMobile ? '11px' : '12px',
                              fontWeight: '500'
                            }}>
                              {languageLabels[meditation.language] || meditation.language}
                            </span>
                            <span>•</span>
                            <span>{meditation.likeCount || 0} likes</span>
                            <span>•</span>
                            <span>{meditation.playCount || 0} plays</span>
                          </div>
                        </div>
                        
                        {/* Action Buttons Row */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Like Button */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikeMeditation(meditation._id);
                              }}
                              disabled={!user}
                              style={{
                                background: likedMeditations.has(meditation._id) 
                                  ? 'rgba(255, 107, 107, 0.2)' 
                                  : 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: likedMeditations.has(meditation._id) ? '#ff6b6b' : 'rgba(255, 255, 255, 0.8)',
                                fontSize: isMobile ? '13px' : '14px',
                                cursor: 'pointer',
                                padding: isMobile ? '8px 12px' : '6px 12px',
                                borderRadius: '6px',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                minHeight: isMobile ? '44px' : 'auto'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.background = likedMeditations.has(meditation._id)
                                  ? 'rgba(255, 107, 107, 0.3)'
                                  : 'rgba(255, 255, 255, 0.15)';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.background = likedMeditations.has(meditation._id)
                                  ? 'rgba(255, 107, 107, 0.2)'
                                  : 'rgba(255, 255, 255, 0.1)';
                              }}
                            >
                              {likedMeditations.has(meditation._id) ? '♥' : '♡'} Like
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Audio Player */}
                    {meditation.audioFile && (
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: '12px',
                        padding: isMobile ? '8px' : '12px',
                        marginTop: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        <audio 
                          id={`shared-audio-${meditation._id}`}
                          controls
                          controlsList="nodownload"
                          preload="metadata"
                          style={{
                            width: '100%',
                            height: isMobile ? '44px' : '48px',
                            borderRadius: '8px',
                            outline: 'none',
                            filter: 'brightness(1.1) saturate(1.2)'
                          }}
                          onLoadedMetadata={(e) => {
                            console.log('Audio loaded for:', meditation._id, 'URL:', e.target.src);
                          }}
                          onPlay={(e) => {
                            console.log('Audio started playing:', meditation._id);
                            // Pause all other community audios first
                            document.querySelectorAll('audio[id^="shared-audio-"]').forEach(a => {
                              if (a.id !== `shared-audio-${meditation._id}`) {
                                a.pause();
                              }
                            });
                            setPlayingMeditationId(meditation._id);
                          }}
                          onPause={(e) => {
                            console.log('Audio paused:', meditation._id);
                            setPlayingMeditationId(null);
                          }}
                          onEnded={(e) => {
                            console.log('Audio ended:', meditation._id);
                            setPlayingMeditationId(null);
                            // Update play count when audio completes
                            handlePlayCountUpdate(meditation._id);
                          }}
                          onError={(e) => {
                            console.error('Audio error for:', meditation._id, 'Error:', e.target.error, 'URL:', e.target.src);
                            console.error('Meditation audioFile:', meditation.audioFile);
                          }}
                          onCanPlay={(e) => {
                            console.log('Audio can play:', meditation._id);
                          }}
                        >
                          <source 
                            src={getAssetUrl(`/assets/audio/shared/${meditation.audioFile.filename}`)} 
                            type="audio/mpeg" 
                          />
                          {t('audioNotSupported', 'Your browser does not support the audio element.')}
                        </audio>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </>
      ) : (
        <JournalHub user={user} />
      )}
    </div>
  );
};

export default CommunityHub;