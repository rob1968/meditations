import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';
// CSS styles are now in the global app.css

const EnhancedMusicSelector = ({ 
  selectedMusic, 
  onMusicSelect, 
  meditationType,
  allowMultiple = false 
}) => {
  const { t } = useTranslation();
  const [musicCatalog, setMusicCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('nature');
  const [previewAudio, setPreviewAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Fetch music catalog from API
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await axios.get(getFullUrl('/api/music/catalog'));
        if (response.data.success) {
          setMusicCatalog(response.data.catalog);
        }
      } catch (error) {
        console.error('Error fetching music catalog:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  // Stop audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const handlePreview = (music) => {
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
      
      // Start new preview
      const audioUrl = getFullUrl(`/api/music/stream/${music.category}/${music.filename}`);
      audioRef.current.src = audioUrl;
      audioRef.current.volume = 0.5;
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setPreviewAudio(music);
        })
        .catch(err => console.error('Error playing audio:', err));
    }
  };

  const handleMusicSelect = (music) => {
    if (allowMultiple) {
      // For multiple selection (future feature)
      const current = Array.isArray(selectedMusic) ? selectedMusic : [];
      const isSelected = current.find(m => m.id === music.id);
      
      if (isSelected) {
        onMusicSelect(current.filter(m => m.id !== music.id));
      } else {
        onMusicSelect([...current, music]);
      }
    } else {
      // Single selection
      if (selectedMusic?.id === music.id) {
        onMusicSelect(null); // Deselect
      } else {
        onMusicSelect(music);
      }
    }
  };

  if (loading) {
    return (
      <div className="music-selector-loading">
        <div className="spinner"></div>
        <p>{t('loadingMusic', 'Loading music catalog...')}</p>
      </div>
    );
  }

  if (!musicCatalog) {
    return (
      <div className="music-selector-error">
        <p>{t('musicLoadError', 'Could not load music catalog')}</p>
      </div>
    );
  }

  const categories = musicCatalog.categories || {};
  const currentCategoryMusic = musicCatalog.backgroundMusic?.[selectedCategory] || [];

  return (
    <div className="enhanced-music-selector">
      {/* Hidden audio element for preview */}
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      
      {/* Category Tabs */}
      <div className="music-categories">
        {Object.entries(categories).map(([key, category]) => (
          <button
            key={key}
            className={`category-tab ${selectedCategory === key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(key)}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-name">{category.name}</span>
          </button>
        ))}
      </div>

      {/* Music Grid */}
      <div className="music-grid">
        {/* No Music Option */}
        <div 
          className={`music-card ${selectedMusic === null ? 'selected' : ''}`}
          onClick={() => onMusicSelect(null)}
        >
          <div className="music-icon">🔇</div>
          <div className="music-info">
            <h4>{t('noMusic', 'No Music')}</h4>
            <p>{t('noMusicDesc', 'Meditation without background music')}</p>
          </div>
        </div>

        {/* Music Options */}
        {currentCategoryMusic.map((music) => {
          const isSelected = selectedMusic?.id === music.id;
          const isPreviewing = previewAudio?.id === music.id && isPlaying;
          
          return (
            <div 
              key={music.id}
              className={`music-card ${isSelected ? 'selected' : ''} ${isPreviewing ? 'playing' : ''}`}
            >
              <div className="music-card-content" onClick={() => handleMusicSelect(music)}>
                <div className="music-icon">🎵</div>
                <div className="music-info">
                  <h4>{music.name}</h4>
                  <p>{music.description}</p>
                  <div className="music-tags">
                    {music.tags?.slice(0, 3).map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
              
              <button 
                className={`preview-button ${isPreviewing ? 'playing' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(music);
                }}
                title={isPreviewing ? t('stopPreview', 'Stop preview') : t('preview', 'Preview')}
              >
                {isPreviewing ? '⏸️' : '▶️'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected Music Display */}
      {selectedMusic && (
        <div className="selected-music-display">
          <div className="selected-label">{t('selected', 'Selected')}:</div>
          <div className="selected-music">
            <span className="music-icon">🎵</span>
            <span className="music-name">{selectedMusic.name}</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="music-instructions">
        <p>{t('musicInstructions', 'Select background music for your meditation. Click the play button to preview.')}</p>
      </div>
    </div>
  );
};

export default EnhancedMusicSelector;