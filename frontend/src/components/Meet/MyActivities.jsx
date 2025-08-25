import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ActivityCard from './ActivityCard';
import ConfirmDialog from '../ConfirmDialog';
import Alert from '../Alert';
import CreateActivity from './CreateActivity';
import { getAuthHeaders } from '../../utils/userUtils';

const MyActivities = ({ user, onSelectActivity }) => {
  const { t } = useTranslation();
  
  // Cache-bust version identifier: v2.1
  console.log('🎯 [CACHE-BUST-v2.1] MyActivities component loaded at:', new Date().toISOString());
  const [activities, setActivities] = useState({
    organizing: [],
    participating: [],
    past: []
  });
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'organizing', 'participating', 'past'
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [editingActivity, setEditingActivity] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadMyActivities();
    loadCategories();
  }, [user]);
  
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/activities/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadMyActivities = async () => {
    console.log('🔄 [CACHE-BUST-v2.1] Loading my activities for user:', user?.id, user?.username);
    console.log('🕐 [CACHE-BUST-v2.1] Timestamp:', new Date().toISOString());
    setIsLoading(true);
    try {
      const headers = getAuthHeaders(user);
      console.log('📡 Auth headers:', headers);
      
      const response = await fetch('/api/activities/user/my-activities', {
        headers
      });

      console.log('📊 My activities response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 My activities data received:', data);
        console.log('📊 Organizing count:', data.organizing?.length || 0);
        console.log('📊 Participating count:', data.participating?.length || 0);
        console.log('📊 Past count:', data.past?.length || 0);
        setActivities(data);
      } else {
        const errorData = await response.json();
        console.error('❌ My activities API error:', errorData);
      }
    } catch (error) {
      console.error('Error loading my activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showAlertMessage = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleJoinActivity = async (activityId) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/join`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Reload activities to reflect changes
        await loadMyActivities();
        
        showAlertMessage(t('joinedActivity', 'Je hebt je aangemeld voor de activiteit'));
      } else {
        const error = await response.json();
        showAlertMessage(error.error || t('joinFailed', 'Kon niet aanmelden voor activiteit'));
      }
    } catch (error) {
      console.error('Error joining activity:', error);
      showAlertMessage(t('joinError', 'Er ging iets mis bij het aanmelden'));
    }
  };

  const handleLeaveActivity = (activityId) => {
    setConfirmMessage(t('confirmLeaveActivity', 'Weet je zeker dat je je wilt afmelden voor deze activiteit?'));
    setConfirmAction(() => () => performLeaveActivity(activityId));
    setShowConfirmDialog(true);
  };

  const performLeaveActivity = async (activityId) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/leave`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      });

      if (response.ok) {
        // Remove from participating activities
        setActivities(prev => ({
          ...prev,
          participating: prev.participating.filter(a => a._id !== activityId)
        }));
        
        showAlertMessage(t('leftActivity', 'Je hebt je afgemeld voor de activiteit'));
      } else {
        const error = await response.json();
        showAlertMessage(error.error || t('leaveFailed', 'Kon niet afmelden voor activiteit'));
      }
    } catch (error) {
      console.error('Error leaving activity:', error);
      showAlertMessage(t('leaveError', 'Er ging iets mis bij het afmelden'));
    }
  };

  const handleCancelActivity = (activityId) => {
    console.log('🎯 [CACHE-BUST-v2.1] handleCancelActivity called with ID:', activityId);
    console.log('🎯 [CACHE-BUST-v2.1] Setting cancel dialog state...');
    setCancelReason('');
    setConfirmAction(() => () => performCancelActivity(activityId));
    setShowCancelDialog(true);
    console.log('🎯 [CACHE-BUST-v2.1] Cancel dialog should now be open, showCancelDialog:', true);
  };

  const performCancelActivity = async (activityId) => {
    console.log('🚀 [CACHE-BUST-v2.1] performCancelActivity called with ID:', activityId, 'Reason:', cancelReason);
    try {
      const response = await fetch(`/api/activities/${activityId}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ reason: cancelReason })
      });
      
      console.log('📡 Cancel response status:', response.status);

      if (response.ok) {
        // Update activity status
        setActivities(prev => ({
          ...prev,
          organizing: prev.organizing.map(a => 
            a._id === activityId 
              ? { ...a, status: 'cancelled', cancellationReason: cancelReason }
              : a
          )
        }));
        
        showAlertMessage(t('activityCancelled', 'Activiteit is geannuleerd'));
      } else {
        const error = await response.json();
        showAlertMessage(error.error || t('cancelFailed', 'Kon activiteit niet annuleren'));
      }
    } catch (error) {
      console.error('Error cancelling activity:', error);
      showAlertMessage(t('cancelError', 'Er ging iets mis bij het annuleren'));
    }
  };

  const handleEditActivity = (activity) => {
    setEditingActivity(activity);
    setShowEditDialog(true);
  };

  const handleActivityUpdated = (updatedActivity) => {
    // Update the activity in the organizing list
    setActivities(prev => ({
      ...prev,
      organizing: prev.organizing.map(a => 
        a._id === updatedActivity._id ? updatedActivity : a
      )
    }));
    
    setShowEditDialog(false);
    setEditingActivity(null);
    showAlertMessage(t('activityUpdated', 'Activiteit is bijgewerkt'));
    
    // Refresh the list to make sure we have the latest data
    loadMyActivities();
  };

  const canLeaveActivity = (activity) => {
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

  const renderActivityActions = (activity, isOrganizing) => {
    console.log('🎬 renderActivityActions called:', { 
      activityId: activity._id, 
      activityTitle: activity.title,
      isOrganizing, 
      status: activity.status,
      role: activity.role 
    });
    
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
            className="edit-activity-button secondary-button mobile-touch-target"
            onClick={(e) => {
              e.stopPropagation();
              handleEditActivity(activity);
            }}
          >
            <span className="button-icon">✏️</span>
            <span className="button-text">{t('edit', 'Bewerken')}</span>
          </button>
          
          <button 
            className="cancel-activity-button danger-button mobile-touch-target"
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
      const canLeave = canLeaveActivity(activity);
      
      return (
        <div className="activity-participant-actions">
          {canLeave ? (
            <button 
              className="leave-activity-button secondary-button mobile-touch-target"
              onClick={(e) => {
                e.stopPropagation();
                handleLeaveActivity(activity._id);
              }}
            >
              <span className="button-icon">👋</span>
              <span className="button-text">{t('leave', 'Afmelden')}</span>
            </button>
          ) : (
            <div className="leave-deadline-passed">
              <span className="deadline-icon">⏰</span>
              <span className="deadline-text">
                {t('leaveDeadlinePassed', 'Afmelden niet meer mogelijk (binnen 2 uur)')}
              </span>
            </div>
          )}
        </div>
      );
    }
  };

  // Get filtered activities
  const getFilteredActivities = () => {
    const allUpcoming = [
      ...activities.organizing.map(a => ({ ...a, role: 'organizer' })),
      ...activities.participating.map(a => ({ ...a, role: 'participant' }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    switch (activeFilter) {
      case 'organizing':
        return activities.organizing.map(a => ({ ...a, role: 'organizer' }));
      case 'participating':
        return activities.participating.map(a => ({ ...a, role: 'participant' }));
      case 'past':
        return activities.past.map(a => ({ ...a, role: 'past' }));
      case 'all':
      default:
        return allUpcoming;
    }
  };

  // Group activities by date
  const groupActivitiesByDate = (activities) => {
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

  const filterButtons = [
    { 
      id: 'all', 
      label: t('all', 'Alle'),
      count: activities.organizing.length + activities.participating.length,
      icon: '📅'
    },
    { 
      id: 'organizing', 
      label: t('organizing', 'Organiserend'),
      count: activities.organizing.length,
      icon: '👑'
    },
    { 
      id: 'participating', 
      label: t('participating', 'Deelnemend'),
      count: activities.participating.length,
      icon: '🤝'
    },
    { 
      id: 'past', 
      label: t('past', 'Vorige'),
      count: activities.past.length,
      icon: '📜'
    }
  ];

  if (isLoading) {
    return (
      <div className="my-activities-loading">
        <div className="loading-animation"></div>
        <p className="loading-text">{t('loadingMyActivities', 'Mijn activiteiten laden...')}</p>
      </div>
    );
  }

  const filteredActivities = getFilteredActivities();

  return (
    <div className="my-activities-redesigned">
      <div className="my-activities-header">
        <h2 className="my-activities-title">{t('myActivities', 'Mijn Activiteiten')}</h2>
        <p className="my-activities-subtitle">
          {t('myActivitiesSubtitle', 'Bekijk al je activiteiten op één plek')}
        </p>
      </div>

      <div className="filter-pills">
        {filterButtons.map(filter => (
          <button
            key={filter.id}
            className={`filter-pill mobile-touch-target ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            <span className="pill-icon">{filter.icon}</span>
            <span className="pill-label">{filter.label}</span>
            {filter.count > 0 && (
              <span className="pill-count">{filter.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="my-activities-content">
        {filteredActivities.length === 0 ? (
          <div className="no-activities">
            <div className="no-activities-icon">
              {activeFilter === 'organizing' && '👑'}
              {activeFilter === 'participating' && '🤝'}
              {activeFilter === 'past' && '📜'}
              {activeFilter === 'all' && '📅'}
            </div>
            <h3 className="no-activities-title">
              {activeFilter === 'organizing' && t('noOrganizing', 'Geen activiteiten georganiseerd')}
              {activeFilter === 'participating' && t('noParticipating', 'Geen activiteiten waaraan je deelneemt')}
              {activeFilter === 'past' && t('noPastActivities', 'Geen vorige activiteiten')}
              {activeFilter === 'all' && t('noActivities', 'Geen activiteiten gepland')}
            </h3>
            <p className="no-activities-description">
              {activeFilter === 'organizing' && t('noOrganizingDesc', 'Maak je eerste activiteit aan!')}
              {activeFilter === 'participating' && t('noParticipatingDesc', 'Zoek naar interessante activiteiten om aan deel te nemen')}
              {activeFilter === 'past' && t('noPastActivitiesDesc', 'Je activiteitengeschiedenis verschijnt hier')}
              {activeFilter === 'all' && t('noActivitiesDesc', 'Begin met het ontdekken van nieuwe activiteiten!')}
            </p>
          </div>
        ) : (
          <div className="activities-grouped">
            {Object.entries(groupActivitiesByDate(filteredActivities)).map(([dateGroup, activitiesInGroup]) => (
              <div key={dateGroup} className="activity-date-group">
                <h3 className="date-group-title">{dateGroup}</h3>
                <div className="activities-list">
                  {activitiesInGroup.map(activity => (
                    <div key={activity._id} className="activity-item">
                      <ActivityCard
                        activity={activity}
                        user={user}
                        onSelect={() => onSelectActivity(activity)}
                        onJoin={() => handleJoinActivity(activity._id)}
                        onLeave={() => handleLeaveActivity(activity._id)}
                        showDirectActions={true}
                      />
                      
                      {/* Role Badge */}
                      <div className={`role-badge ${activity.role}`}>
                        {activity.role === 'organizer' && (
                          <>
                            <span className="role-icon">👑</span>
                            <span className="role-text">{t('organizer', 'Organisator')}</span>
                          </>
                        )}
                        {activity.role === 'participant' && (
                          <>
                            <span className="role-icon">🤝</span>
                            <span className="role-text">{t('participant', 'Deelnemer')}</span>
                          </>
                        )}
                      </div>
                      
                      {/* Actions */}
                      {activeFilter !== 'past' && activity.role !== 'past' && (
                        <div className="activity-actions">
                          {renderActivityActions(activity, activity.role === 'organizer')}
                        </div>
                      )}
                      
                      {/* Stats for organizer */}
                      {activity.role === 'organizer' && (
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
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => {
          confirmAction && confirmAction();
          setShowConfirmDialog(false);
        }}
        title={t('confirm', 'Bevestigen')}
        message={confirmMessage}
        confirmText={t('confirm', 'Bevestigen')}
        cancelText={t('cancel', 'Annuleren')}
      />
      
      {/* Cancel Dialog with Reason Input */}
      {console.log('🎭 [CACHE-BUST-v2.1] Rendering cancel dialog with showCancelDialog:', showCancelDialog)}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => {
          console.log('🚪 [CACHE-BUST-v2.1] Cancel dialog onClose called');
          setShowCancelDialog(false);
        }}
        onConfirm={() => {
          console.log('✅ ConfirmDialog onConfirm called, confirmAction:', confirmAction);
          if (confirmAction) {
            confirmAction();
          } else {
            console.error('❌ confirmAction is null or undefined!');
          }
          setShowCancelDialog(false);
        }}
        title={t('cancelActivity', 'Activiteit Annuleren')}
        message={
          <div>
            <p>{t('cancelConfirm', 'Weet je zeker dat je deze activiteit wilt annuleren?')}</p>
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">{t('cancelReason', 'Reden voor annulering (optioneel):')}</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="form-textarea"
                rows={3}
                placeholder={t('cancelReasonPlaceholder', 'Bijv. weersomstandigheden, onvoorziene omstandigheden...')}
              />
            </div>
          </div>
        }
        confirmText={t('cancelActivity', 'Annuleren')}
        cancelText={t('cancel', 'Terug')}
      />
      
      {/* Alert */}
      <Alert
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        message={alertMessage}
        type="info"
      />

      {/* Edit Activity Dialog */}
      {showEditDialog && editingActivity && (
        <div className="edit-activity-modal">
          <div className="modal-overlay" onClick={() => setShowEditDialog(false)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{t('editActivity', 'Activiteit Bewerken')}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowEditDialog(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <CreateActivity 
                user={user}
                categories={categories}
                editingActivity={editingActivity}
                onActivityCreated={handleActivityUpdated}
                onCancel={() => setShowEditDialog(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyActivities;