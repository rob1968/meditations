import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ActivityCard from './ActivityCard';
import ChatList from './ChatList';
import { getAuthHeaders } from '../../utils/userUtils';

const ParticipatingActivities = ({ user, onSelectActivity }) => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('activities'); // 'activities' or 'chats'
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    loadParticipatingActivities();
  }, [user]);

  const loadParticipatingActivities = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/activities/user/participating', {
        headers: getAuthHeaders(user)
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      } else {
        console.error('Failed to load participating activities:', response.status);
        setActivities([]);
      }
    } catch (error) {
      console.error('Error loading participating activities:', error);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Group activities by date
  const groupActivitiesByDate = (activities) => {
    if (!activities || !Array.isArray(activities)) return {};
    
    const grouped = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() + 7);

    activities.forEach(activity => {
      const activityDate = new Date(activity.date);
      activityDate.setHours(0, 0, 0, 0);
      
      let groupKey;
      if (activityDate.getTime() === today.getTime()) {
        groupKey = t('today', 'Vandaag');
      } else if (activityDate.getTime() === tomorrow.getTime()) {
        groupKey = t('tomorrow', 'Morgen');
      } else if (activityDate < thisWeek) {
        groupKey = t('thisWeek', 'Deze Week');
      } else {
        groupKey = activityDate.toLocaleDateString('nl-NL', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        });
      }
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(activity);
    });
    
    return grouped;
  };

  if (isLoading) {
    return (
      <div className="participating-activities-loading">
        <div className="loading-animation"></div>
        <p className="loading-text">{t('loadingActivities', 'Activiteiten laden...')}</p>
      </div>
    );
  }

  return (
    <div className="participating-activities">
      <div className="participating-header">
        <h2 className="participating-title">{t('participatingActivities', 'Mijn Deelnemingen')}</h2>
        <p className="participating-subtitle">
          {t('participatingSubtitle', 'Activiteiten waar je aan deelneemt en bijbehorende groepschats')}
        </p>
      </div>

      <div className="participating-sections">
        <div className="section-tabs">
          <button
            className={`section-tab mobile-touch-target ${activeSection === 'activities' ? 'active' : ''}`}
            onClick={() => setActiveSection('activities')}
          >
            <span className="tab-icon">🤝</span>
            <span className="tab-label">{t('myParticipations', 'Activiteiten')}</span>
            <span className="tab-count">({activities.length})</span>
          </button>
          
          <button
            className={`section-tab mobile-touch-target ${activeSection === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveSection('chats')}
          >
            <span className="tab-icon">💬</span>
            <span className="tab-label">{t('activityChats', 'Groepschats')}</span>
            {unreadMessages > 0 && (
              <span className="tab-badge">{unreadMessages}</span>
            )}
          </button>
        </div>

        <div className="section-content">
          {activeSection === 'activities' ? (
            <div className="activities-section">
              {activities.length === 0 ? (
                <div className="no-activities">
                  <div className="no-activities-icon">🤝</div>
                  <h3 className="no-activities-title">
                    {t('noParticipatingActivities', 'Nog geen deelnemingen')}
                  </h3>
                  <p className="no-activities-description">
                    {t('noParticipatingDesc', 'Meld je aan voor activiteiten om ze hier te zien verschijnen!')}
                  </p>
                </div>
              ) : (
                <div className="activities-grouped">
                  {Object.entries(groupActivitiesByDate(activities)).map(([dateGroup, activitiesInGroup]) => (
                    <div key={dateGroup} className="activity-date-group">
                      <h3 className="date-group-title">{dateGroup}</h3>
                      <div className="activities-grid">
                        {activitiesInGroup.map(activity => (
                          <ActivityCard
                            key={activity._id}
                            activity={activity}
                            user={user}
                            onSelect={() => onSelectActivity(activity)}
                            showDirectActions={false} // No join/leave actions in this view
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="chats-section">
              <div className="chats-header">
                <h3 className="chats-title">{t('activityChats', 'Groepschats')}</h3>
                <p className="chats-subtitle">
                  {t('chatsSubtitle', 'Chat met andere deelnemers van jouw activiteiten')}
                </p>
              </div>
              <ChatList 
                user={user} 
                onUnreadCountChange={setUnreadMessages}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipatingActivities;