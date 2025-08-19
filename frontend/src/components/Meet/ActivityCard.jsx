import React from 'react';
import { useTranslation } from 'react-i18next';

const ActivityCard = ({ activity, user, onJoin, onSelect }) => {
  const { t } = useTranslation();
  
  // Check if user is already a participant
  const isParticipant = activity.participants?.some(
    p => p.user?._id === user?._id || p.user === user?._id
  );
  
  const isOrganizer = activity.organizer?._id === user?._id || activity.organizer === user?._id;
  const isFull = activity.participants?.filter(p => p.status === 'confirmed').length >= activity.maxParticipants;
  
  // Format date and time
  const activityDate = new Date(activity.date);
  const dateStr = activityDate.toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  
  const timeStr = activity.startTime;
  
  // Calculate time until activity
  const now = new Date();
  const timeDiff = activityDate - now;
  const daysUntil = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hoursUntil = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  let timeUntilStr = '';
  if (daysUntil > 0) {
    timeUntilStr = t('daysUntil', '{{days}} dagen', { days: daysUntil });
  } else if (hoursUntil > 0) {
    timeUntilStr = t('hoursUntil', '{{hours}} uur', { hours: hoursUntil });
  } else if (timeDiff > 0) {
    timeUntilStr = t('soon', 'Binnenkort');
  } else {
    timeUntilStr = t('ongoing', 'Bezig');
  }
  
  // Get category info
  const categoryName = activity.category?.name?.[user?.preferredLanguage || 'nl'] || activity.category?.name?.nl || '';
  const categoryEmoji = activity.category?.emoji || '📅';
  const categoryColor = activity.category?.color || '#6B46C1';
  
  // Get participant info
  const confirmedParticipants = activity.participants?.filter(p => p.status === 'confirmed').length || 0;
  const availableSpots = activity.maxParticipants - confirmedParticipants;
  
  return (
    <div className="activity-card mobile-touch-card" onClick={onSelect}>
      <div className="activity-card-header">
        <div 
          className="activity-category-badge"
          style={{ backgroundColor: categoryColor + '20', color: categoryColor }}
        >
          <span className="category-emoji">{categoryEmoji}</span>
          <span className="category-name">{categoryName}</span>
        </div>
        
        {isFull && !isParticipant && (
          <span className="activity-status-badge full">
            {t('full', 'Vol')}
          </span>
        )}
        
        {isOrganizer && (
          <span className="activity-status-badge organizer">
            {t('organizing', 'Organisator')}
          </span>
        )}
        
        {isParticipant && !isOrganizer && (
          <span className="activity-status-badge joined">
            {t('joined', 'Aangemeld')}
          </span>
        )}
      </div>
      
      {activity.coverPhoto && (
        <div className="activity-card-image">
          <img src={activity.coverPhoto} alt={activity.title} />
          <div className="activity-card-overlay">
            <span className="activity-time-until">{timeUntilStr}</span>
          </div>
        </div>
      )}
      
      <div className="activity-card-body">
        <h3 className="activity-title">{activity.title}</h3>
        
        <p className="activity-description">
          {activity.description.length > 100 
            ? activity.description.substring(0, 100) + '...' 
            : activity.description}
        </p>
        
        <div className="activity-details">
          <div className="activity-detail">
            <span className="detail-icon">📅</span>
            <span className="detail-text">{dateStr}</span>
          </div>
          
          <div className="activity-detail">
            <span className="detail-icon">🕐</span>
            <span className="detail-text">{timeStr}</span>
          </div>
          
          <div className="activity-detail">
            <span className="detail-icon">📍</span>
            <span className="detail-text">{activity.location?.name || activity.location?.city}</span>
          </div>
          
          <div className="activity-detail">
            <span className="detail-icon">👥</span>
            <span className="detail-text">
              {confirmedParticipants}/{activity.maxParticipants} 
              {availableSpots > 0 && !isFull && (
                <span className="spots-available">
                  {' '}({availableSpots} {t('spotsLeft', 'plekken vrij')})
                </span>
              )}
            </span>
          </div>
        </div>
        
        {activity.tags && activity.tags.length > 0 && (
          <div className="activity-tags">
            {activity.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="activity-tag">#{tag}</span>
            ))}
          </div>
        )}
        
        {activity.cost?.amount > 0 && (
          <div className="activity-cost">
            <span className="cost-icon">💰</span>
            <span className="cost-text">
              €{activity.cost.amount} - {activity.cost.description || t('payOwn', 'Ieder betaalt zelf')}
            </span>
          </div>
        )}
      </div>
      
      <div className="activity-card-footer">
        <div className="activity-organizer">
          {activity.organizer?.profileImage && (
            <img 
              src={activity.organizer.profileImage} 
              alt={activity.organizer.username}
              className="organizer-avatar"
            />
          )}
          <div className="organizer-info">
            <span className="organizer-label">{t('organizedBy', 'Georganiseerd door')}</span>
            <span className="organizer-name">
              {activity.organizer?.username}
              {activity.organizer?.isVerified && (
                <span className="verified-badge" title={t('verified', 'Geverifieerd')}>✓</span>
              )}
            </span>
          </div>
        </div>
        
        <div className="activity-actions">
          {!isParticipant && !isFull && (
            <button 
              className="join-button primary-button mobile-touch-target"
              onClick={(e) => {
                e.stopPropagation();
                onJoin();
              }}
            >
              <span className="button-icon">🤝</span>
              <span className="button-text">{t('join', 'Deelnemen')}</span>
            </button>
          )}
          
          {!isParticipant && isFull && (
            <button 
              className="waitlist-button secondary-button mobile-touch-target"
              onClick={(e) => {
                e.stopPropagation();
                onJoin();
              }}
            >
              <span className="button-icon">⏳</span>
              <span className="button-text">{t('joinWaitlist', 'Wachtlijst')}</span>
            </button>
          )}
          
          {isParticipant && (
            <button 
              className="view-button secondary-button mobile-touch-target"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              <span className="button-icon">👁️</span>
              <span className="button-text">{t('viewDetails', 'Bekijken')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;