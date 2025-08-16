import React from 'react';
import { useTranslation } from 'react-i18next';

const ReviewStep = ({ wizardData, voices, savedCustomBackgrounds }) => {
  const { t, i18n } = useTranslation();

  const getVoiceName = (voiceId) => {
    const voice = voices.find(v => v.voice_id === voiceId);
    return voice ? voice.name : voiceId;
  };

  const getBackgroundInfo = () => {
    // First check if background music is disabled
    if (!wizardData.useBackgroundMusic) {
      return {
        icon: '🔇',
        name: t('noBackground', 'Geen muziek')
      };
    }
    
    // Check for new selectedMusic property first
    // Important: Check if selectedMusic is explicitly null (No Music selected)
    if (wizardData.hasOwnProperty('selectedMusic')) {
      if (wizardData.selectedMusic === null) {
        return {
          icon: '🔇',
          name: t('noBackground', 'Geen muziek')
        };
      } else if (wizardData.selectedMusic) {
        if (wizardData.selectedMusic.type === 'catalog') {
          return {
            icon: wizardData.selectedMusic.categoryIcon || '🎵',
            name: wizardData.selectedMusic.name
          };
        } else if (wizardData.selectedMusic.type === 'custom') {
          return {
            icon: '🎵',
            name: wizardData.selectedMusic.name || wizardData.selectedMusic.customName || t('customMusic', 'Custom Music')
          };
        }
      }
    }
    
    // Fallback to old background property (only if background music is enabled)
    if (wizardData.background) {
      const savedBg = savedCustomBackgrounds?.find(bg => {
        return bg.filename.replace('.mp3', '') === wizardData.background || 
               `saved-${bg.id}` === wizardData.background;
      });
      
      if (savedBg) {
        return {
          icon: savedBg.icon || '🎵',
          name: savedBg.isSystemBackground 
            ? t(savedBg.filename.replace('.mp3', ''), savedBg.customName)
            : savedBg.customName
        };
      }
      
      // For system backgrounds without metadata (fallback)
      const backgroundIcons = {
        ocean: '🌊',
        forest: '🌲',
        rain: '🌧️',
        stream: '🏔️',
        wind: '💨',
        birds: '🐦'
      };
      
      return {
        icon: backgroundIcons[wizardData.background] || '🎵',
        name: t(wizardData.background, wizardData.background.charAt(0).toUpperCase() + wizardData.background.slice(1))
      };
    }
    
    // If background music is enabled but no background is selected
    return {
      icon: '🔇',
      name: t('noBackground', 'Geen muziek')
    };
  };

  const meditationTypes = {
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

  const meditationTypeEmojis = {
    sleep: '😴',
    stress: '😤',
    focus: '🎯',
    anxiety: '😰',
    energy: '⚡',
    mindfulness: '🧠',
    compassion: '💝',
    walking: '🚶',
    breathing: '🌬️',
    morning: '🌅'
  };

  const languageFlags = {
    'en': '🇬🇧',
    'nl': '🇳🇱',
    'de': '🇩🇪',
    'es': '🇪🇸',
    'fr': '🇫🇷',
    'it': '🇮🇹',
    'pt': '🇵🇹',
    'ru': '🇷🇺',
    'ja': '🇯🇵',
    'ko': '🇰🇷',
    'zh': '🇨🇳',
    'ar': '🇸🇦',
    'hi': '🇮🇳'
  };

  return (
    <div className="review-step">
      <div className="review-header">
        <p className="review-subtitle">
          {t('reviewDescription', 'Controleer keuzes voor genereren')}
        </p>
      </div>

      {/* Compact summary card */}
      <div className="review-summary-card" style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        maxWidth: '100%',
        width: '100%'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '20px',
          alignItems: 'center'
        }}>
          {/* Meditation Type */}
          <div style={{ textAlign: 'center', padding: '8px' }}>
            <div style={{ fontSize: '2em', marginBottom: '4px' }}>
              {meditationTypeEmojis[wizardData.meditationType] || '🧘'}
            </div>
            <div style={{ fontSize: '0.85em', opacity: '0.9', lineHeight: '1.3', fontWeight: '500' }}>
              {meditationTypes[wizardData.meditationType]}
            </div>
          </div>

          {/* Language */}
          <div style={{ textAlign: 'center', padding: '8px' }}>
            <div style={{ fontSize: '2em', marginBottom: '4px' }}>
              {languageFlags[i18n.language] || '🌍'}
            </div>
            <div style={{ fontSize: '0.85em', opacity: '0.9', lineHeight: '1.3', fontWeight: '500' }}>
              {(() => {
                const languageMap = {
                  'en': 'EN',
                  'nl': 'NL', 
                  'de': 'DE',
                  'es': 'ES',
                  'fr': 'FR',
                  'it': 'IT',
                  'pt': 'PT',
                  'ru': 'RU',
                  'ja': 'JA',
                  'ko': 'KO',
                  'zh': 'ZH',
                  'ar': 'AR',
                  'hi': 'HI'
                };
                return languageMap[i18n.language] || i18n.language.toUpperCase();
              })()}
            </div>
          </div>

          {/* Voice */}
          <div style={{ textAlign: 'center', padding: '8px' }}>
            <div style={{ fontSize: '2em', marginBottom: '4px' }}>🎤</div>
            <div style={{ fontSize: '0.85em', opacity: '0.9', lineHeight: '1.3', fontWeight: '500' }}>
              {getVoiceName(wizardData.voiceId).split(' ')[0]}
            </div>
          </div>

          {/* Background */}
          <div style={{ textAlign: 'center', padding: '8px' }}>
            <div style={{ fontSize: '2em', marginBottom: '4px' }}>
              {getBackgroundInfo().icon}
            </div>
            <div style={{ fontSize: '0.85em', opacity: '0.9', lineHeight: '1.3', fontWeight: '500' }}>
              {getBackgroundInfo().name.length > 12 
                ? getBackgroundInfo().name.substring(0, 12) + '...'
                : getBackgroundInfo().name
              }
            </div>
          </div>
        </div>
      </div>

      {/* Text Preview */}
      <div className="review-section" style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        padding: '10px'
      }}>
        <div className="review-section-header" style={{ 
          marginBottom: '8px' 
        }}>
          <h3 style={{ fontSize: '1em', margin: '0' }}>{t('textLabel', 'Meditatie Tekst')}</h3>
        </div>
        <div className="review-content">
          <div className="text-preview text-preview-scrollable" style={{
            maxHeight: '70px',
            overflow: 'auto',
            padding: '6px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '6px',
            fontSize: '0.8em',
            lineHeight: '1.3',
            marginBottom: '4px'
          }}>
            {wizardData.text}
          </div>
          <div className="text-stats" style={{ 
            fontSize: '0.75em', 
            opacity: '0.6', 
            textAlign: 'center' 
          }}>
            {t('textLength', '{{count}} karakters', { count: wizardData.text.length })}
          </div>
        </div>
      </div>

    </div>
  );
};

export default ReviewStep;