import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserId, isActivityOrganizer, isActivityParticipant } from '../../utils/userUtils';

const ActivityCard = ({ activity, user, onJoin, onLeave, onSelect, showDirectActions = false }) => {
  const { t } = useTranslation();
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [message, setMessage] = useState(null); // { text: string, type: 'success'|'error'|'info'|'warning', icon: string }
  const [actionProgress, setActionProgress] = useState(null); // For detailed progress feedback
  
  // Check user status using standardized utility functions
  const isParticipant = isActivityParticipant(activity, user);
  const isOrganizer = isActivityOrganizer(activity, user);
  const isFull = (activity.participants?.filter(p => p.status === 'confirmed')?.length || 0) >= activity.maxParticipants;
  const isOnWaitlist = activity.waitlist?.some(w => w.user === user?.id || w.user?._id === user?.id || w.user?.toString() === user?.id);
  const waitlistPosition = isOnWaitlist ? activity.waitlist?.findIndex(w => w.user === user?.id || w.user?._id === user?.id || w.user?.toString() === user?.id) + 1 : null;
  
  // Debug logging for button visibility
  console.log('🔍 ActivityCard Debug:', {
    activityTitle: activity.title,
    isParticipant,
    isOrganizer,
    isFull,
    isOnWaitlist,
    waitlistPosition,
    participantCount: activity.participants?.length || 0,
    waitlistCount: activity.waitlist?.length || 0,
    userId: user?.id,
    organizerId: activity.organizer?.id || activity.organizer?._id,
    activityOrganizer: activity.organizer,
    userObject: user,
    shouldShowJoinButton: !isParticipant && !isFull && !isOnWaitlist && !isOrganizer,
    joinButtonConditions: {
      notParticipant: !isParticipant,
      notOnWaitlist: !isOnWaitlist,
      notFull: !isFull,
      notOrganizer: !isOrganizer
    },
    // PARTICIPANT DEBUG INFO
    participants: activity.participants,
    participantUserIds: activity.participants?.map(p => ({
      participantUser: p.user,
      participantUserId: p.user?._id || p.user?.id || p.user,
      matchesCurrentUser: (p.user?._id || p.user?.id || p.user) === user?.id
    }))
  });
  
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
  
  // Check if user can leave activity (2-hour deadline)
  const canLeaveActivity = () => {
    if (isOrganizer) return false; // Organizers cannot leave
    
    const now = new Date();
    const activityDateTime = new Date(activity.date);
    
    if (activity.startTime) {
      const [hours, minutes] = activity.startTime.split(':');
      activityDateTime.setHours(parseInt(hours), parseInt(minutes));
    }
    
    const hoursUntilActivity = (activityDateTime - now) / (1000 * 60 * 60);
    
    // Can leave if more than 2 hours before start
    return hoursUntilActivity > 2;
  };

  // Show message in card with enhanced feedback
  const showMessage = (text, type = 'success', icon = '✅', duration = 4000) => {
    setMessage({ text, type, icon });
    setTimeout(() => {
      setMessage(null);
    }, duration);
  };
  
  // Show progress feedback
  const showProgressMessage = (text, icon = '⏳') => {
    setActionProgress({ text, icon });
  };
  
  // Clear progress feedback
  const clearProgressMessage = () => {
    setActionProgress(null);
  };

  // Function to get the correct participant status text based on timing
  const getParticipantStatusText = () => {
    const now = new Date();
    const activityDateTime = new Date(activity.date);
    
    // Parse start time and set it on activity date
    if (activity.startTime) {
      const [hours, minutes] = activity.startTime.split(':');
      activityDateTime.setHours(parseInt(hours), parseInt(minutes));
    }
    
    const endTime = new Date(activityDateTime.getTime() + (activity.duration || 120) * 60000);
    
    // Check activity status based on backend status or time
    if (activity.status === 'completed' || now > endTime) {
      return t('participated', 'Deelgenomen');
    } else if (activity.status === 'ongoing' || (now >= activityDateTime && now <= endTime)) {
      return t('participating', 'Bezig');
    } else if (activity.status === 'cancelled') {
      return t('cancelled', 'Geannuleerd');
    } else {
      // Future activity or upcoming
      return t('joined', 'Aangemeld');
    }
  };
  
  return (
    <div className="activity-card-mobile" onClick={onSelect}>
      {/* Compact Header Row */}
      <div className="card-header-row">
        <div 
          className="category-badge-compact"
          style={{ backgroundColor: categoryColor + '20', color: categoryColor }}
        >
          <span className="category-emoji">{categoryEmoji}</span>
          <span className="category-name">{categoryName}</span>
        </div>
        
        <div className="status-badges-row">
          {isFull && !isParticipant && (
            <span className="status-badge full">
              {t('full', 'Vol')}
            </span>
          )}
          
          {isOrganizer && (
            <span className="status-badge organizer">
              {t('organizing', 'Organisator')}
            </span>
          )}
          
          {isParticipant && !isOrganizer && (
            <span className="status-badge joined">
              {getParticipantStatusText()}
            </span>
          )}
          
          {isOnWaitlist && (
            <span className="status-badge waitlist">
              {t('waitlistPosition', 'Wachtlijst #{{position}}', { position: waitlistPosition })}
            </span>
          )}
          
          {isParticipant && activity.conversationId && (
            <span className="chat-indicator" title={t('chatAvailable', 'Groepschat beschikbaar')}>
              💬
            </span>
          )}
        </div>
      </div>
      
      {activity.coverPhoto && (
        <div className="activity-card-image">
          <img src={activity.coverPhoto} alt={activity.title} />
          <div className="activity-card-overlay">
            <span className="activity-time-until">{timeUntilStr}</span>
          </div>
        </div>
      )}
      
      {/* Main Content - Mobile Optimized */}
      <div className="card-main-content">
        <div className="content-left">
          <h3 className="activity-title-mobile">{activity.title}</h3>
          
          {/* Quick Info Row */}
          <div className="quick-info-row">
            <span className="quick-info-item">
              <span className="info-icon">📅</span>
              <span className="info-text">{dateStr}</span>
            </span>
            <span className="quick-info-item">
              <span className="info-icon">🕐</span>
              <span className="info-text">{timeStr}</span>
            </span>
            <span className="quick-info-item">
              <span className="info-icon">👥</span>
              <span className="info-text">{confirmedParticipants}/{activity.maxParticipants}</span>
            </span>
          </div>
          
          <div className="location-row">
            <span className="location-icon">📍</span>
            <span className="location-text">{activity.location?.name || activity.location?.city}</span>
            {availableSpots > 0 && !isFull && (
              <span className="spots-badge">
                {availableSpots} {t('spotsLeft', 'vrij')}
              </span>
            )}
          </div>
        </div>
        
        <div className="content-right">
          {/* Organizer mini info */}
          <div className="organizer-mini">
            {activity.organizer?.profileImage && (
              <img 
                src={activity.organizer.profileImage} 
                alt={activity.organizer?.username || 'Organisator'}
                className="organizer-mini-avatar"
              />
            )}
            <span className="organizer-mini-name">{activity.organizer?.username}</span>
          </div>
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
      
      {/* Smart Action Buttons Row - Mobile First */}
      <div className="card-actions-row">
        {/* Primary Join Button - Only show if can join directly and not organizer */}
        {!isParticipant && !isOnWaitlist && !isFull && !isOrganizer && (
          <button 
            className="action-btn primary-action"
            disabled={isJoining || isLeaving || actionProgress}
            onClick={async (e) => {
              e.stopPropagation();
              
              // Prevent multiple simultaneous actions
              if (isJoining || isLeaving || actionProgress) {
                return;
              }
              setIsJoining(true);
              showProgressMessage(t('joiningActivity', 'Aanmelden bij activiteit...'), '🔄');
              
              try {
                const result = await onJoin();
                clearProgressMessage();
                
                if (result?.waitlist) {
                  showMessage(
                    t('addedToWaitlistWithDetails', 'Je staat op de wachtlijst! Je krijgt bericht als er plek vrijkomt.'), 
                    'info', 
                    '⏳', 
                    5000
                  );
                } else {
                  showMessage(
                    t('joinedActivityWithDetails', 'Super! Je hebt je succesvol aangemeld voor deze activiteit.'), 
                    'success', 
                    '🎉', 
                    5000
                  );
                }
              } catch (error) {
                clearProgressMessage();
                const errorMessage = error.message || t('joinError', 'Er ging iets mis bij het aanmelden');
                showMessage(errorMessage, 'error', '❌', 6000);
              } finally {
                setIsJoining(false);
              }
            }}
          >
            {isJoining ? (
              <>
                <span className="btn-icon">⏳</span>
                <span className="btn-text">{t('joining', 'Aanmelden...')}</span>
              </>
            ) : (
              <>
                <span className="btn-icon">✅</span>
                <span className="btn-text">{t('join', 'Deelnemen')}</span>
              </>
            )}
          </button>
        )}
        
        {/* Waitlist Button - Only show if activity is full and not on waitlist and not organizer */}
        {!isParticipant && !isOnWaitlist && isFull && !isOrganizer && (
          <button 
            className="action-btn waitlist-action"
            disabled={isJoining || isLeaving || actionProgress}
            onClick={async (e) => {
              e.stopPropagation();
              
              // Prevent multiple simultaneous actions
              if (isJoining || isLeaving || actionProgress) {
                return;
              }
              setIsJoining(true);
              showProgressMessage(t('joiningActivity', 'Aanmelden bij activiteit...'), '🔄');
              
              try {
                const result = await onJoin();
                clearProgressMessage();
                
                if (result?.waitlist) {
                  showMessage(
                    t('addedToWaitlistWithDetails', 'Je staat op de wachtlijst! Je krijgt bericht als er plek vrijkomt.'), 
                    'info', 
                    '⏳', 
                    5000
                  );
                } else {
                  showMessage(
                    t('joinedActivityWithDetails', 'Super! Je hebt je succesvol aangemeld voor deze activiteit.'), 
                    'success', 
                    '🎉', 
                    5000
                  );
                }
              } catch (error) {
                clearProgressMessage();
                const errorMessage = error.message || t('joinError', 'Er ging iets mis bij het aanmelden');
                showMessage(errorMessage, 'error', '❌', 6000);
              } finally {
                setIsJoining(false);
              }
            }}
          >
            {isJoining ? (
              <>
                <span className="btn-icon">⏳</span>
                <span className="btn-text">{t('joiningWaitlist', 'Toevoegen...')}</span>
              </>
            ) : (
              <>
                <span className="btn-icon">⏳</span>
                <span className="btn-text">{t('joinWaitlist', 'Wachtlijst')}</span>
              </>
            )}
          </button>
        )}
        
        {/* Waitlist Status Button - Show current position */}
        {isOnWaitlist && (
          <div className="waitlist-status-info">
            <span className="waitlist-icon">⏳</span>
            <span className="waitlist-text">
              {t('waitlistStatus', 'Wachtlijst positie #{{position}}', { position: waitlistPosition })}
            </span>
          </div>
        )}
        
        {/* Secondary Actions */}
        <div className="secondary-actions">
          {isParticipant && activity.conversationId && (
            <button 
              className="action-btn chat-action"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(); // This should navigate to chat
              }}
            >
              <span className="btn-icon">💬</span>
              <span className="btn-text">{t('chat', 'Chat')}</span>
            </button>
          )}
          
          <button 
            className="action-btn view-action"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            <span className="btn-icon">👁️</span>
            <span className="btn-text">{t('view', 'Bekijk')}</span>
          </button>
          
          {/* Leave Activity Button */}
          {(isParticipant || isOnWaitlist) && showDirectActions && canLeaveActivity() && onLeave && (
            <button 
              className="action-btn leave-action"
              disabled={isLeaving || isJoining || actionProgress}
              onClick={async (e) => {
                e.stopPropagation();
                setIsLeaving(true);
                showProgressMessage(
                  isOnWaitlist 
                    ? t('leavingWaitlist', 'Wachtlijst verlaten...') 
                    : t('leavingActivity', 'Afmelden bij activiteit...'), 
                  '🔄'
                );
                
                try {
                  const result = await onLeave();
                  clearProgressMessage();
                  
                  if (result?.waitlist || isOnWaitlist) {
                    showMessage(
                      t('leftWaitlistWithDetails', 'Je staat niet meer op de wachtlijst.'), 
                      'success', 
                      '👋', 
                      4000
                    );
                  } else {
                    showMessage(
                      t('leftActivityWithDetails', 'Je hebt je succesvol afgemeld voor deze activiteit.'), 
                      'success', 
                      '👋', 
                      4000
                    );
                  }
                } catch (error) {
                  clearProgressMessage();
                  const errorMessage = error.message || t('leaveError', 'Er ging iets mis bij het afmelden');
                  showMessage(errorMessage, 'error', '❌', 6000);
                } finally {
                  setIsLeaving(false);
                }
              }}
            >
              {isLeaving ? (
                <>
                  <span className="btn-icon">⏳</span>
                  <span className="btn-text">{t('leaving', 'Afmelden...')}</span>
                </>
              ) : (
                <>
                  <span className="btn-icon">👋</span>
                  <span className="btn-text">{isOnWaitlist ? t('leaveWaitlist', 'Verlaat wachtlijst') : t('leave', 'Afmelden')}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      
      {(isParticipant || isOnWaitlist) && showDirectActions && !canLeaveActivity() && !isOrganizer && (
        <div className="deadline-warning">
          <span className="warning-icon">⏰</span>
          <span className="warning-text">
            {isOnWaitlist 
              ? t('waitlistLeaveDeadlinePassed', 'Wachtlijst verlaten niet meer mogelijk (binnen 2 uur)')
              : t('leaveDeadlinePassed', 'Afmelden niet meer mogelijk (binnen 2 uur)')
            }
          </span>
        </div>
      )}
      
      {/* Progress message display */}
      {actionProgress && (
        <div className="activity-card-progress">
          <span className="progress-icon">{actionProgress.icon}</span>
          <span className="progress-text">{actionProgress.text}</span>
        </div>
      )}
      
      {/* In-card message display */}
      {message && (
        <div className={`activity-card-message ${message.type}`}>
          <span className="message-icon">{message.icon}</span>
          <span className="message-text">{message.text}</span>
        </div>
      )}
    </div>
  );
};

export default ActivityCard;