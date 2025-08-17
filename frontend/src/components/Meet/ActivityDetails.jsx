import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const ActivityDetails = ({ activityId, user, onClose, onJoin, onLeave, onEdit }) => {
  const { t } = useTranslation();
  const [activity, setActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (activityId) {
      loadActivityDetails();
    }
  }, [activityId]);

  const loadActivityDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading activity details for:', activityId);
      
      const response = await fetch(`/api/activities/${activityId}`, {
        headers: {
          'x-user-id': user?._id || '',
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Activity details status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Activity details loaded:', data.title);
        setActivity(data);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error loading activity details:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinActivity = async () => {
    if (!activity || isJoining) return;

    setIsJoining(true);
    try {
      const response = await fetch(`/api/activities/${activity._id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?._id || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local activity state
        setActivity(prev => ({
          ...prev,
          participants: [...prev.participants, { user: user, status: 'confirmed' }]
        }));

        // Call parent callback
        if (onJoin) onJoin(result);

        if (result.waitlist) {
          alert(t('addedToWaitlist', 'Je staat op de wachtlijst voor deze activiteit'));
        } else {
          alert(t('joinedActivity', 'Je hebt je aangemeld voor deze activiteit!'));
        }
      } else {
        const error = await response.json();
        alert(error.error || t('joinFailed', 'Kon niet aanmelden voor activiteit'));
      }
    } catch (error) {
      console.error('Error joining activity:', error);
      alert(t('joinError', 'Er ging iets mis bij het aanmelden'));
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveActivity = async () => {
    if (!activity || !window.confirm(t('confirmLeaveActivity', 'Weet je zeker dat je je wilt afmelden?'))) {
      return;
    }

    try {
      const response = await fetch(`/api/activities/${activity._id}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?._id || ''
        }
      });

      if (response.ok) {
        // Update local activity state
        setActivity(prev => ({
          ...prev,
          participants: prev.participants.filter(p => p.user._id !== user._id)
        }));

        // Call parent callback
        if (onLeave) onLeave();

        alert(t('leftActivity', 'Je hebt je afgemeld voor de activiteit'));
      } else {
        const error = await response.json();
        alert(error.error || t('leaveFailed', 'Kon niet afmelden voor activiteit'));
      }
    } catch (error) {
      console.error('Error leaving activity:', error);
      alert(t('leaveError', 'Er ging iets mis bij het afmelden'));
    }
  };

  if (isLoading) {
    return (
      <div className="activity-details-modal">
        <div className="activity-details-content">
          <div className="loading-container">
            <div className="loading-animation"></div>
            <p className="loading-text">{t('loadingActivity', 'Activiteit laden...')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="activity-details-modal">
        <div className="activity-details-content">
          <div className="error-container">
            <div className="error-icon">❌</div>
            <h3 className="error-title">{t('loadError', 'Kon activiteit niet laden')}</h3>
            <p className="error-message">{error}</p>
            <button className="close-button" onClick={onClose}>
              {t('close', 'Sluiten')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return null;
  }

  // Check user status
  const isParticipant = activity.participants?.some(p => p.user?._id === user?._id || p.user === user?._id);
  const isOrganizer = activity.organizer?._id === user?._id || activity.organizer === user?._id;
  const isFull = activity.participants?.filter(p => p.status === 'confirmed').length >= activity.maxParticipants;
  const confirmedParticipants = activity.participants?.filter(p => p.status === 'confirmed') || [];

  // Format date and time
  const activityDate = new Date(activity.date);
  const dateStr = activityDate.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeStr = activity.startTime;

  // Category info
  const categoryName = activity.category?.name?.[user?.preferredLanguage || 'nl'] || activity.category?.name?.nl || '';
  const categoryEmoji = activity.category?.emoji || '📅';

  return (
    <div className="activity-details-modal" onClick={onClose}>
      <div className="activity-details-content" onClick={(e) => e.stopPropagation()}>
        <div className="activity-details-header">
          <button className="close-button" onClick={onClose}>
            <span>✕</span>
          </button>
          
          <div className="activity-header-info">
            <div className="activity-category">
              <span className="category-emoji">{categoryEmoji}</span>
              <span className="category-name">{categoryName}</span>
            </div>
            
            <h1 className="activity-title">{activity.title}</h1>
            
            <div className="activity-status-badges">
              {isOrganizer && (
                <span className="status-badge organizer">
                  👑 {t('organizer', 'Organisator')}
                </span>
              )}
              {isParticipant && !isOrganizer && (
                <span className="status-badge participant">
                  ✅ {t('joined', 'Aangemeld')}
                </span>
              )}
              {isFull && !isParticipant && (
                <span className="status-badge full">
                  🔒 {t('full', 'Vol')}
                </span>
              )}
            </div>
          </div>
        </div>

        {activity.coverPhoto && (
          <div className="activity-cover-photo">
            <img src={activity.coverPhoto} alt={activity.title} />
          </div>
        )}

        <div className="activity-details-body">
          <div className="activity-main-info">
            <div className="activity-description">
              <h3 className="section-title">{t('description', 'Beschrijving')}</h3>
              <p className="description-text">{activity.description}</p>
            </div>

            <div className="activity-details-grid">
              <div className="detail-item">
                <div className="detail-icon">📅</div>
                <div className="detail-content">
                  <span className="detail-label">{t('date', 'Datum')}</span>
                  <span className="detail-value">{dateStr}</span>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon">🕐</div>
                <div className="detail-content">
                  <span className="detail-label">{t('time', 'Tijd')}</span>
                  <span className="detail-value">{timeStr}</span>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon">⏱️</div>
                <div className="detail-content">
                  <span className="detail-label">{t('duration', 'Duur')}</span>
                  <span className="detail-value">{activity.duration} {t('minutes', 'minuten')}</span>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon">📍</div>
                <div className="detail-content">
                  <span className="detail-label">{t('location', 'Locatie')}</span>
                  <span className="detail-value">{activity.location?.name}</span>
                  <span className="detail-address">{activity.location?.address}</span>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon">👥</div>
                <div className="detail-content">
                  <span className="detail-label">{t('participants', 'Deelnemers')}</span>
                  <span className="detail-value">
                    {confirmedParticipants.length} / {activity.maxParticipants}
                  </span>
                  {!isFull && (
                    <span className="spots-available">
                      ({activity.maxParticipants - confirmedParticipants.length} {t('spotsLeft', 'plekken vrij')})
                    </span>
                  )}
                </div>
              </div>

              {activity.cost?.amount > 0 && (
                <div className="detail-item">
                  <div className="detail-icon">💰</div>
                  <div className="detail-content">
                    <span className="detail-label">{t('cost', 'Kosten')}</span>
                    <span className="detail-value">€{activity.cost.amount}</span>
                    <span className="cost-description">{activity.cost.description}</span>
                  </div>
                </div>
              )}
            </div>

            {activity.tags && activity.tags.length > 0 && (
              <div className="activity-tags-section">
                <h3 className="section-title">{t('tags', 'Tags')}</h3>
                <div className="activity-tags">
                  {activity.tags.map((tag, index) => (
                    <span key={index} className="activity-tag">#{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="activity-sidebar">
            <div className="organizer-info">
              <h3 className="section-title">{t('organizer', 'Organisator')}</h3>
              <div className="organizer-card">
                {activity.organizer?.profileImage && (
                  <img 
                    src={activity.organizer.profileImage} 
                    alt={activity.organizer.username}
                    className="organizer-avatar"
                  />
                )}
                <div className="organizer-details">
                  <span className="organizer-name">
                    {activity.organizer?.username}
                    {activity.organizer?.isVerified && (
                      <span className="verified-badge" title={t('verified', 'Geverifieerd')}>✓</span>
                    )}
                  </span>
                  {activity.organizer?.trustScore && (
                    <span className="trust-score">
                      ⭐ {activity.organizer.trustScore}/100
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="participants-section">
              <h3 className="section-title">
                {t('participants', 'Deelnemers')} ({confirmedParticipants.length})
              </h3>
              <div className="participants-list">
                {confirmedParticipants.slice(0, 8).map((participant, index) => (
                  <div key={index} className="participant-item">
                    {participant.user?.profileImage && (
                      <img 
                        src={participant.user.profileImage} 
                        alt={participant.user.username}
                        className="participant-avatar"
                      />
                    )}
                    <span className="participant-name">
                      {participant.user?.username || 'Onbekend'}
                    </span>
                  </div>
                ))}
                {confirmedParticipants.length > 8 && (
                  <div className="more-participants">
                    +{confirmedParticipants.length - 8} {t('more', 'meer')}
                  </div>
                )}
              </div>
            </div>

            {activity.waitlist && activity.waitlist.length > 0 && (
              <div className="waitlist-section">
                <h3 className="section-title">
                  {t('waitlist', 'Wachtlijst')} ({activity.waitlist.length})
                </h3>
                <p className="waitlist-info">
                  {t('waitlistInfo', 'Deze personen wachten op een plek als er ruimte komt')}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="activity-details-footer">
          <div className="action-buttons">
            {!isParticipant && !isFull && (
              <button 
                className="join-button primary-button"
                onClick={handleJoinActivity}
                disabled={isJoining}
              >
                {isJoining ? (
                  <>
                    <span className="button-icon">⏳</span>
                    <span className="button-text">{t('joining', 'Aanmelden...')}</span>
                  </>
                ) : (
                  <>
                    <span className="button-icon">🤝</span>
                    <span className="button-text">{t('joinActivity', 'Deelnemen')}</span>
                  </>
                )}
              </button>
            )}

            {!isParticipant && isFull && (
              <button 
                className="waitlist-button secondary-button"
                onClick={handleJoinActivity}
                disabled={isJoining}
              >
                <span className="button-icon">⏳</span>
                <span className="button-text">{t('joinWaitlist', 'Wachtlijst')}</span>
              </button>
            )}

            {isParticipant && !isOrganizer && (
              <button 
                className="leave-button secondary-button"
                onClick={handleLeaveActivity}
              >
                <span className="button-icon">👋</span>
                <span className="button-text">{t('leaveActivity', 'Afmelden')}</span>
              </button>
            )}

            {isOrganizer && onEdit && (
              <button 
                className="edit-button secondary-button"
                onClick={() => onEdit(activity)}
              >
                <span className="button-icon">✏️</span>
                <span className="button-text">{t('editActivity', 'Bewerken')}</span>
              </button>
            )}

            <button 
              className="chat-button primary-button"
              onClick={() => {
                // TODO: Open activity chat
                alert(t('chatComingSoon', 'Chat functie komt binnenkort'));
              }}
            >
              <span className="button-icon">💬</span>
              <span className="button-text">{t('openChat', 'Chat')}</span>
            </button>
          </div>

          <button className="close-footer-button secondary-button" onClick={onClose}>
            {t('close', 'Sluiten')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetails;