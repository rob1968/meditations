import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl, API_ENDPOINTS } from '../config/api';
import JournalHub from './JournalHub';
import PageHeader from './PageHeader';

const CommunityHubNew = ({ user, onProfileClick, unreadCount, onInboxClick, onCreateClick }) => {
  console.log('🎯 CommunityHubNew v3.0.0: Clean component with NO IMAGES - Only emojis!');
  
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [activeSubTab, setActiveSubTab] = useState('meditations');
  const [filterType, setFilterType] = useState('all');
  const [communityMeditations, setCommunityMeditations] = useState([]);
  const [likedMeditations, setLikedMeditations] = useState(new Set());
  const [loading, setLoading] = useState(true);
  
  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Meditation types with emojis (NO IMAGES!)
  const meditationTypes = [
    { value: 'sleep', emoji: '😴', color: '#6366f1' },
    { value: 'stress', emoji: '💪', color: '#8b5cf6' },
    { value: 'focus', emoji: '🎯', color: '#06b6d4' },
    { value: 'anxiety', emoji: '😰', color: '#10b981' },
    { value: 'energy', emoji: '⚡', color: '#f59e0b' }
  ];

  // Language labels
  const languageLabels = {
    'en': 'English', 'nl': 'Nederlands', 'de': 'Deutsch', 'fr': 'Français',
    'es': 'Español', 'it': 'Italiano', 'ja': '日本語', 'ko': '한국어',
    'pt': 'Português', 'ru': 'Русский', 'zh': '中文', 'ar': 'العربية', 'hi': 'हिन्दी'
  };

  // Fetch community meditations
  const fetchSharedMeditations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(getFullUrl(API_ENDPOINTS.COMMUNITY_MEDITATIONS), {
        withCredentials: true
      });
      
      if (response.data && response.data.meditations) {
        setCommunityMeditations(response.data.meditations);
        
        // Set liked meditations if user is logged in
        if (user && response.data.likedMeditations) {
          setLikedMeditations(new Set(response.data.likedMeditations));
        }
      }
    } catch (error) {
      console.error('Error fetching community meditations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedMeditations();
  }, []);

  // Handle like functionality
  const handleLikeMeditation = async (meditationId) => {
    if (!user) return;
    
    try {
      const isLiked = likedMeditations.has(meditationId);
      const endpoint = `${API_ENDPOINTS.COMMUNITY_MEDITATIONS}/${meditationId}/like`;
      
      await axios.post(getFullUrl(endpoint), {}, { withCredentials: true });
      
      // Update local state
      const newLikedMeditations = new Set(likedMeditations);
      if (isLiked) {
        newLikedMeditations.delete(meditationId);
      } else {
        newLikedMeditations.add(meditationId);
      }
      setLikedMeditations(newLikedMeditations);
      
      // Update meditation like count
      setCommunityMeditations(prev => prev.map(med => 
        med._id === meditationId 
          ? { ...med, likeCount: (med.likeCount || 0) + (isLiked ? -1 : 1) }
          : med
      ));
    } catch (error) {
      console.error('Error liking meditation:', error);
    }
  };

  // Filter meditations
  const filteredMeditations = communityMeditations.filter(meditation => 
    filterType === 'all' || meditation.meditationType === filterType
  );

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <PageHeader 
        user={user} 
        onProfileClick={onProfileClick}
        unreadCount={unreadCount}
        onInboxClick={onInboxClick}
      />

      <div style={{ padding: isMobile ? '80px 16px 100px' : '100px 32px 120px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Page Title */}
        <h1 style={{
          fontSize: isMobile ? '24px' : '28px',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '8px',
          color: 'white'
        }}>
          🌟 {t('communityHub', 'Community Hub')}
        </h1>

        <p style={{
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.8)',
          marginBottom: '32px',
          fontSize: isMobile ? '14px' : '16px'
        }}>
          {t('communityDescription', 'Discover and share meditations with the community')}
        </p>

        {/* Sub-tabs */}
        <div style={{
          display: 'flex',
          gap: isMobile ? '8px' : '12px',
          marginBottom: '24px',
          padding: isMobile ? '0 8px' : '0 16px'
        }}>
          <button 
            onClick={() => setActiveSubTab('meditations')}
            style={{
              flex: 1,
              padding: isMobile ? '12px 16px' : '14px 20px',
              fontSize: isMobile ? '14px' : '16px',
              borderRadius: isMobile ? '10px' : '12px',
              minHeight: isMobile ? '48px' : 'auto',
              background: activeSubTab === 'meditations' 
                ? 'rgba(255, 255, 255, 0.2)' 
                : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            🧘 {t('meditations', 'Meditations')}
          </button>
          <button 
            onClick={() => setActiveSubTab('journals')}
            style={{
              flex: 1,
              padding: isMobile ? '12px 16px' : '14px 20px',
              fontSize: isMobile ? '14px' : '16px',
              borderRadius: isMobile ? '10px' : '12px',
              minHeight: isMobile ? '48px' : 'auto',
              background: activeSubTab === 'journals' 
                ? 'rgba(255, 255, 255, 0.2)' 
                : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            📔 {t('voiceJournals', 'Journals')}
          </button>
        </div>

        {activeSubTab === 'meditations' ? (
          <>
            {/* Filter Section */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: isMobile ? '16px' : '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '24px'
            }}>
              <label style={{
                display: 'block',
                marginBottom: '16px',
                fontWeight: '700',
                color: 'white',
                fontSize: isMobile ? '16px' : '18px',
                textAlign: 'center'
              }}>
                🎯 {t('filterByType', 'Filter by Type')}
              </label>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => setFilterType('all')}
                  style={{
                    background: filterType === 'all' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      : 'rgba(255, 255, 255, 0.08)',
                    color: 'white',
                    border: filterType === 'all' 
                      ? '2px solid rgba(255, 255, 255, 0.3)' 
                      : '1.5px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: isMobile ? '12px' : '16px',
                    padding: isMobile ? '12px 16px' : '14px 22px',
                    margin: '2px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '14px' : '15px',
                    fontWeight: '600',
                    minWidth: isMobile ? '90px' : '110px'
                  }}
                >
                  🌟 {t('all', 'All')}
                </button>

                {meditationTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFilterType(type.value)}
                    style={{
                      background: filterType === type.value 
                        ? `linear-gradient(135deg, ${type.color}, ${type.color}CC)` 
                        : 'rgba(255, 255, 255, 0.08)',
                      color: 'white',
                      border: filterType === type.value 
                        ? '2px solid rgba(255, 255, 255, 0.3)' 
                        : '1.5px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: isMobile ? '12px' : '16px',
                      padding: isMobile ? '12px 16px' : '14px 22px',
                      margin: '2px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '14px' : '15px',
                      fontWeight: '600',
                      minWidth: isMobile ? '90px' : '110px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: isMobile ? '16px' : '18px' }}>{type.emoji}</span>
                    <span style={{ fontSize: isMobile ? '12px' : '13px', textTransform: 'capitalize' }}>
                      {t(type.value, type.value)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Meditations List */}
            <div style={{ padding: isMobile ? '0 8px' : '0 16px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px' }}>
                  ⏳ {t('loading', 'Loading')}...
                </div>
              ) : filteredMeditations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', fontSize: '16px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  {filterType === 'all' 
                    ? t('noMeditations', 'No meditations found')
                    : t('noMeditationsOfType', `No ${filterType} meditations found`)
                  }
                </div>
              ) : (
                filteredMeditations.map((meditation) => (
                  <div
                    key={meditation._id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: isMobile ? '12px' : '16px',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px', marginBottom: '12px' }}>
                      {/* Emoji Thumbnail - NO IMAGES! */}
                      <div style={{
                        width: isMobile ? '60px' : '70px',
                        height: isMobile ? '60px' : '70px',
                        borderRadius: '8px',
                        flexShrink: 0,
                        background: `linear-gradient(135deg, ${meditationTypes.find(t => t.value === meditation.meditationType)?.color || '#4F46E5'}40, rgba(255, 255, 255, 0.1))`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isMobile ? '20px' : '24px'
                      }}>
                        {meditationTypes.find(t => t.value === meditation.meditationType)?.emoji || '🧘'}
                      </div>

                      {/* Content Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          fontSize: isMobile ? '15px' : '16px',
                          fontWeight: '600',
                          color: 'white',
                          margin: '0 0 4px 0',
                          lineHeight: '1.3'
                        }}>
                          {meditation.author?.username || meditation.author || 'Unknown'}
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
                    </div>

                    {/* Like Button and Audio Player */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {user && (
                        <button
                          onClick={() => handleLikeMeditation(meditation._id)}
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
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            minHeight: isMobile ? '44px' : 'auto'
                          }}
                        >
                          {likedMeditations.has(meditation._id) ? '♥' : '♡'} Like
                        </button>
                      )}

                      {meditation.audioUrl && (
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <audio 
                            controls 
                            preload="none"
                            style={{
                              width: '100%',
                              height: isMobile ? '44px' : '48px',
                              borderRadius: '8px',
                              outline: 'none'
                            }}
                          >
                            <source src={meditation.audioUrl} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <JournalHub user={user} />
        )}
      </div>
    </div>
  );
};

export default CommunityHubNew;