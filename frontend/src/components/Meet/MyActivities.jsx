import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ActivityCard from './ActivityCard';

const MyActivities = ({ user, onSelectActivity }) => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState({
    organizing: [],
    participating: [],
    past: []
  });
  const [activeTab, setActiveTab] = useState('participating');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMyActivities();
  }, [user]);

  const loadMyActivities = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/activities/user/my-activities', {
        headers: {
          'x-user-id': user?._id || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Error loading my activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveActivity = async (activityId) => {
    if (!window.confirm(t('confirmLeaveActivity', 'Weet je zeker dat je je wilt afmelden voor deze activiteit?'))) {
      return;
    }

    try {
      const response = await fetch(`/api/activities/${activityId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?._id || ''
        }
      });

      if (response.ok) {
        // Remove from participating activities
        setActivities(prev => ({
          ...prev,
          participating: prev.participating.filter(a => a._id !== activityId)
        }));
        
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

  const handleCancelActivity = async (activityId) => {
    const reason = prompt(t('cancelReason', 'Reden voor annulering (optioneel):'));
    if (reason === null) return; // User clicked cancel
    
    try {
      const response = await fetch(`/api/activities/${activityId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?._id || ''
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        // Update activity status
        setActivities(prev => ({
          ...prev,
          organizing: prev.organizing.map(a => 
            a._id === activityId 
              ? { ...a, status: 'cancelled', cancellationReason: reason }
              : a
          )
        }));
        
        alert(t('activityCancelled', 'Activiteit is geannuleerd'));
      } else {
        const error = await response.json();
        alert(error.error || t('cancelFailed', 'Kon activiteit niet annuleren'));
      }
    } catch (error) {
      console.error('Error cancelling activity:', error);
      alert(t('cancelError', 'Er ging iets mis bij het annuleren'));
    }
  };

  const tabs = [
    { 
      id: 'participating', 
      label: t('participating', 'Deelnemend'), 
      count: activities.participating.length,
      icon: '🤝'
    },
    { 
      id: 'organizing', 
      label: t('organizing', 'Organiserend'), 
      count: activities.organizing.length,
      icon: '👑'
    },
    { 
      id: 'past', 
      label: t('pastActivities', 'Vorige'), 
      count: activities.past.length,
      icon: '📜'
    }
  ];

  const renderActivityActions = (activity, isOrganizing) => {
    if (activity.status === 'cancelled') {
      return (
        <div className="activity-status-cancelled">
          <span className="status-icon">❌</span>
          <span className="status-text">{t('cancelled', 'Geannuleerd')}</span>
          {activity.cancellationReason && (
            <span className="cancellation-reason">: {activity.cancellationReason}</span>
          )}
        </div>
      );
    }

    if (isOrganizing) {
      return (
        <div className="activity-organizer-actions">
          <button 
            className="edit-activity-button secondary-button"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement edit functionality
              alert(t('editFeatureComingSoon', 'Bewerken komt binnenkort beschikbaar'));
            }}
          >
            <span className="button-icon">✏️</span>
            <span className="button-text">{t('edit', 'Bewerken')}</span>
          </button>
          
          <button 
            className="cancel-activity-button danger-button"
            onClick={(e) => {
              e.stopPropagation();
              handleCancelActivity(activity._id);
            }}
          >
            <span className="button-icon">❌</span>
            <span className="button-text">{t('cancel', 'Annuleren')}</span>
          </button>
        </div>
      );
    } else {
      return (
        <div className="activity-participant-actions">
          <button 
            className="leave-activity-button secondary-button"
            onClick={(e) => {
              e.stopPropagation();
              handleLeaveActivity(activity._id);
            }}
          >
            <span className="button-icon">👋</span>
            <span className="button-text">{t('leave', 'Afmelden')}</span>
          </button>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="my-activities-loading">
        <div className="loading-animation"></div>
        <p className="loading-text">{t('loadingMyActivities', 'Mijn activiteiten laden...')}</p>
      </div>
    );
  }

  const currentActivities = activities[activeTab] || [];

  return (
    <div className="my-activities">
      <div className="my-activities-header">
        <h2 className="my-activities-title">{t('myActivities', 'Mijn Activiteiten')}</h2>
      </div>

      <div className="my-activities-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`my-activities-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            <span className="tab-count">({tab.count})</span>
          </button>
        ))}
      </div>

      <div className="my-activities-content">
        {currentActivities.length === 0 ? (
          <div className="no-activities">
            <div className="no-activities-icon">
              {activeTab === 'organizing' && '👑'}
              {activeTab === 'participating' && '🤝'}
              {activeTab === 'past' && '📜'}
            </div>
            <h3 className="no-activities-title">
              {activeTab === 'organizing' && t('noOrganizing', 'Geen activiteiten georganiseerd')}
              {activeTab === 'participating' && t('noParticipating', 'Geen activiteiten waaraan je deelneemt')}
              {activeTab === 'past' && t('noPastActivities', 'Geen vorige activiteiten')}
            </h3>
            <p className="no-activities-description">
              {activeTab === 'organizing' && t('noOrganizingDesc', 'Maak je eerste activiteit aan!')}
              {activeTab === 'participating' && t('noParticipatingDesc', 'Zoek naar interessante activiteiten om aan deel te nemen')}
              {activeTab === 'past' && t('noPastActivitiesDesc', 'Je activiteitengeschiedenis verschijnt hier')}
            </p>
          </div>
        ) : (
          <div className="activities-grid">
            {currentActivities.map(activity => (
              <div key={activity._id} className="my-activity-wrapper">
                <ActivityCard
                  activity={activity}
                  user={user}
                  onSelect={() => onSelectActivity(activity)}
                  onJoin={() => {}} // No join action for my activities
                />
                
                {activeTab !== 'past' && (
                  <div className="my-activity-actions">
                    {renderActivityActions(activity, activeTab === 'organizing')}
                  </div>
                )}
                
                {activeTab === 'organizing' && (
                  <div className="organizer-stats">
                    <div className="stat">
                      <span className="stat-icon">👥</span>
                      <span className="stat-value">
                        {activity.participants?.filter(p => p.status === 'confirmed').length || 0}
                      </span>
                      <span className="stat-label">{t('participants', 'deelnemers')}</span>
                    </div>
                    
                    {activity.waitlist?.length > 0 && (
                      <div className="stat">
                        <span className="stat-icon">⏳</span>
                        <span className="stat-value">{activity.waitlist.length}</span>
                        <span className="stat-label">{t('waitlist', 'wachtlijst')}</span>
                      </div>
                    )}
                    
                    <div className="stat">
                      <span className="stat-icon">👁️</span>
                      <span className="stat-value">{activity.viewCount || 0}</span>
                      <span className="stat-label">{t('views', 'weergaven')}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyActivities;