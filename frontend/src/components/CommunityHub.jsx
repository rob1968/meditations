import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl, getAssetUrl, API_ENDPOINTS, API_BASE_URL } from '../config/api';
import JournalHub from './JournalHub';
import PageHeader from './PageHeader';

const CommunityHub = ({ user, onProfileClick, unreadCount, onInboxClick, onCreateClick }) => {
  // CSS for custom scrollbar - added as style tag
  const customScrollbarCSS = `
    .meditation-slider-container::-webkit-scrollbar {
      height: 6px;
    }
    .meditation-slider-container::-webkit-scrollbar-track {
      background: transparent;
    }
    .meditation-slider-container::-webkit-scrollbar-thumb {
      background: #CBD5E0;
      border-radius: 3px;
    }
    .meditation-slider-container::-webkit-scrollbar-thumb:hover {
      background: #A0AEC0;
    }
    .meditation-filter-button {
      flex-shrink: 0;
      white-space: nowrap;
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
  const [filterType, setFilterType] = useState('all');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const { t } = useTranslation();

  const meditationTypes = [
    { value: 'sleep', emoji: '😴', label: t('sleepMeditation', 'Sleep'), color: '#1E293B' }, // Dark Slate
    { value: 'stress', emoji: '😤', label: t('stressMeditation', 'Stress'), color: '#991B1B' }, // Dark Red
    { value: 'focus', emoji: '🎯', label: t('focusMeditation', 'Focus'), color: '#065F46' }, // Dark Green
    { value: 'anxiety', emoji: '😰', label: t('anxietyMeditation', 'Anxiety'), color: '#5B21B6' }, // Dark Purple
    { value: 'energy', emoji: '⚡', label: t('energyMeditation', 'Energy'), color: '#C2410C' }, // Dark Orange
    { value: 'mindfulness', emoji: '🧘', label: t('mindfulnessMeditation', 'Mindfulness'), color: '#047857' }, // Dark Emerald
    { value: 'compassion', emoji: '💗', label: t('compassionMeditation', 'Compassion'), color: '#BE185D' }, // Dark Pink
    { value: 'walking', emoji: '🚶', label: t('walkingMeditation', 'Walking'), color: '#6B21A8' }, // Dark Violet
    { value: 'breathing', emoji: '🌬️', label: t('breathingMeditation', 'Breathing'), color: '#0E7490' }, // Dark Cyan
    { value: 'morning', emoji: '🌅', label: t('morningMeditation', 'Morning'), color: '#EA580C' } // Dark Orange
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

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
      <div className="community-subtabs">
        <button 
          className={`subtab-btn ${activeSubTab === 'meditations' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('meditations')}
        >
          🧘 {t('meditations', 'Meditaties')}
        </button>
        <button 
          className={`subtab-btn ${activeSubTab === 'journals' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('journals')}
        >
          📔 {t('voiceJournals', 'Dagboeken')}
        </button>
      </div>

      {/* Render content based on active sub-tab */}
      {activeSubTab === 'meditations' ? (
        <>
          {/* Meditation Type Slider */}
          <div className="meditation-filter-section" style={{ marginTop: '16px', marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
              {t('meditationType', 'Meditatie Type')}:
            </label>
            <div 
              className="meditation-slider-container"
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                gap: '8px',
                padding: '8px 0',
                width: '100%',
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollbarWidth: 'thin',
                scrollbarColor: '#CBD5E0 transparent',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {/* All Types Button */}
              <button
                className={`meditation-filter-button ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
                style={{
                  background: filterType === 'all' ? 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)' : 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  margin: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '15px',
                  fontWeight: '600',
                  minWidth: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(15px)',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}
                onMouseOver={(e) => {
                  if (filterType !== 'all') {
                    e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseOut={(e) => {
                  if (filterType !== 'all') {
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.transform = 'none';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
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
                      background: filterType === type.value ? `linear-gradient(135deg, ${type.color}, ${type.color}DD)` : 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '12px 20px',
                      margin: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      fontSize: '15px',
                      fontWeight: '600',
                      minWidth: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      backdropFilter: 'blur(15px)',
                      flexShrink: 0,
                      whiteSpace: 'nowrap'
                    }}
                    onMouseOver={(e) => {
                      if (filterType !== type.value) {
                        e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (filterType !== type.value) {
                        e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.target.style.transform = 'none';
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                    title={`${type.label} - ${count} ${t('meditations', 'meditaties')}`}
                  >
                    <span style={{ fontSize: '18px' }}>{type.emoji}</span>
                    <span style={{ fontSize: '13px', fontWeight: 'inherit' }}>
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
            <div className="community-meditations-list">
                {filteredMeditations.map((meditation, index) => (
                  <div 
                    key={meditation._id} 
                    className={`meditation-card-with-player ${playingMeditationId === meditation._id ? 'playing' : ''}`}
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
                          
                          {/* Like Button - Next to title */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px'
                          }}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikeMeditation(meditation._id);
                              }}
                              disabled={!user}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: likedMeditations.has(meditation._id) ? '#ff6b6b' : 'rgba(255, 255, 255, 0.6)',
                                fontSize: '24px',
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
                                e.target.style.transform = 'scale(1.2)';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.background = 'none';
                                e.target.style.transform = 'scale(1)';
                              }}
                              title={`${t('likeMeditation', 'Like Meditation')} (${meditation.likeCount || 0})`}
                            >
                              {likedMeditations.has(meditation._id) ? '♥' : '♡'}
                            </button>
                            <span style={{
                              fontSize: '12px',
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontWeight: '500'
                            }}>
                              {meditation.likeCount || 0}
                            </span>
                          </div>
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: 'rgba(255, 255, 255, 0.7)',
                          marginBottom: '4px'
                        }}>
                          {meditation.author.username || meditation.author} • {languageLabels[meditation.language] || meditation.language}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ▶ {meditation.playCount || 0} {t('played', 'Played')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Full Width Audio Player */}
                    {meditation.audioFile && (
                      <audio 
                        id={`shared-audio-${meditation._id}`}
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