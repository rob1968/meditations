import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ActivityCard from './ActivityCard';
import ActivityFilters from './ActivityFilters';
import { getUserId, getAuthHeaders } from '../../utils/userUtils';

const ActivityList = ({ user, categories, onSelectActivity }) => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  
  // Translate backend error messages to user-friendly localized messages
  const translateJoinError = (errorMessage) => {
    switch (errorMessage) {
      case 'Age restrictions not met':
        return t('joinErrorAgeRestrictions', 'Je voldoet niet aan de leeftijdsvereisten voor deze activiteit. Controleer je profiel instellingen.');
      case 'Gender preferences not met':
        return t('joinErrorGenderPreferences', 'Deze activiteit is alleen voor een specifiek geslacht.');
      case 'Already participating':
        return t('joinErrorAlreadyParticipating', 'Je neemt al deel aan deze activiteit.');
      case 'Activity is full':
        return t('joinErrorActivityFull', 'Deze activiteit is vol. Probeer je aan te melden voor de wachtlijst.');
      case 'Activity has ended':
        return t('joinErrorActivityEnded', 'Deze activiteit is al afgelopen.');
      case 'Activity not found':
        return t('joinErrorActivityNotFound', 'Activiteit niet gevonden.');
      case 'Activity is not published':
        return t('joinErrorActivityNotPublished', 'Deze activiteit is nog niet beschikbaar voor aanmeldingen.');
      case 'Invitation required':
        return t('joinErrorInvitationRequired', 'Je hebt een uitnodiging nodig voor deze activiteit.');
      case 'Je hebt al een activiteit op deze dag':
        return t('joinErrorSameDayActivity', 'Je hebt al een activiteit op deze dag.');
      case 'Je bent al organisator en automatisch deelnemer van deze activiteit':
        return t('joinErrorAlreadyOrganizer', 'Je bent organisator van deze activiteit en neemt automatisch deel.');
      default:
        return errorMessage || t('joinFailed', 'Kon niet aanmelden voor activiteit');
    }
  };
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [recommendedActivities, setRecommendedActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('all');
  const [filters, setFilters] = useState({
    category: '',
    date: '',
    city: user?.location?.city || '',
    maxDistance: 25,
    language: user?.preferredLanguage || 'nl'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    // Always load regular activities for the "all" tab count
    loadActivities();
    if (activeView === 'recommended') {
      loadRecommendations();
    }
  }, [filters, page, activeView]);

  const loadActivities = async () => {
    
    setIsLoading(true);
    try {
      console.log('🔄 Loading real activities from API...');
      
      const userId = getUserId(user);
      if (!userId) {
        console.log('❌ No user ID available for API call');
        setActivities([]);
        setIsLoading(false);
        return;
      }
      
      // Build query parameters for filters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.date) queryParams.append('date', filters.date);
      if (filters.city) queryParams.append('city', filters.city);
      if (filters.language) queryParams.append('language', filters.language);
      
      const response = await fetch(`/api/activities?${queryParams.toString()}`, {
        headers: getAuthHeaders(user)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Real activities loaded:', data.activities?.length || 0);
        
        if (page === 1) {
          setActivities(data.activities || []);
          setFilteredActivities(data.activities || []);
        } else {
          setActivities(prev => [...prev, ...(data.activities || [])]);
          setFilteredActivities(prev => [...prev, ...(data.activities || [])]);
        }
        
        setHasMore(data.pagination?.page < data.pagination?.pages);
      } else {
        console.error('❌ Failed to load activities:', response.status);
        // Fallback to empty activities instead of mock data
        setActivities([]);
        setFilteredActivities([]);
      }
    } catch (error) {
      console.error('❌ Error loading activities:', error);
      setActivities([]);
      setFilteredActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      console.log("🔄 Loading real activity recommendations...");
      
      const userId = getUserId(user);
      if (!userId) {
        console.log("❌ No user ID available for recommendations");
        setRecommendedActivities([]);
        setIsLoading(false);
        return;
      }
      
      // Load recommended activities from API based on user profile
      const response = await fetch("/api/activities/recommendations", {
        headers: getAuthHeaders(user)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("📦 Real recommendations loaded:", data.activities?.length || 0);
        setRecommendedActivities(data.activities || []);
      } else {
        console.error("❌ Failed to load recommendations:", response.status);
        // Fallback: use published/upcoming activities as recommendations
        const fallbackResponse = await fetch("/api/activities?limit=5", {
          headers: getAuthHeaders(user)
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log("📦 Fallback recommendations loaded:", fallbackData.activities?.length || 0);
          setRecommendedActivities(fallbackData.activities || []);
        } else {
          setRecommendedActivities([]);
        }
      }
    } catch (error) {
      console.error("❌ Error loading recommendations:", error);
      setRecommendedActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const showSuccessMessage = (message, icon = '✅') => {
    setSuccessMessage({ message, icon });
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handleJoinActivity = async (activityId) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/join`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local state to reflect joined status properly
        const updateFunction = (activity) => {
          if (activity._id !== activityId) return activity;
          
          if (result.waitlist) {
            // User was added to waitlist
            return {
              ...activity,
              waitlist: [...(activity.waitlist || []), { user: user, joinedAt: new Date() }]
            };
          } else {
            // User successfully joined as participant
            return {
              ...activity,
              participants: [...(activity.participants || []), { user: user, status: 'confirmed', joinedAt: new Date() }]
            };
          }
        };
        
        setActivities(prev => prev.map(updateFunction));
        setFilteredActivities(prev => prev.map(updateFunction));
        
        // Haptic feedback simulation
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        
        return result;
      } else {
        const error = await response.json();
        console.error('❌ Join failed:', error);
        const userFriendlyMessage = translateJoinError(error.error);
        throw new Error(userFriendlyMessage);
      }
    } catch (error) {
      console.error('💥 Error joining activity:', error);
      if (error.message) {
        throw error; // Re-throw with translated message
      }
      throw new Error(t('joinError', 'Er ging iets mis bij het aanmelden'));
    }
  };

  const handleLeaveActivity = async (activityId) => {
    try {
      console.log('🚪 Attempting to leave activity:', activityId, 'User:', getUserId(user));
      
      const response = await fetch(`/api/activities/${activityId}/leave`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      });

      console.log('📡 Leave response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Leave successful:', result);
        
        // Update local state to reflect left status properly
        const currentUserId = getUserId(user);
        
        const updateFunction = (activity) => {
          if (activity._id !== activityId) return activity;
          
          if (result.waitlist) {
            // User was removed from waitlist
            return {
              ...activity,
              waitlist: (activity.waitlist || []).filter(w => getUserId(w.user) !== currentUserId)
            };
          } else {
            // User left as participant, potentially move someone from waitlist
            const updatedParticipants = activity.participants.filter(p => 
              getUserId(p.user || p) !== currentUserId
            );
            let updatedWaitlist = activity.waitlist || [];
            
            // If there was a waitlist and space opened up, move first person
            if (updatedWaitlist.length > 0 && updatedParticipants.length < activity.maxParticipants) {
              const nextUser = updatedWaitlist[0];
              updatedParticipants.push({ user: nextUser.user, status: 'confirmed', joinedAt: new Date() });
              updatedWaitlist = updatedWaitlist.slice(1);
            }
            
            return {
              ...activity,
              participants: updatedParticipants,
              waitlist: updatedWaitlist
            };
          }
        };
        
        setActivities(prev => prev.map(updateFunction));
        setFilteredActivities(prev => prev.map(updateFunction));
        setRecommendedActivities(prev => prev.map(updateFunction));
        
        // Haptic feedback simulation
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
        
        return result;
      } else {
        const error = await response.json();
        console.error('❌ Leave failed:', error);
        throw new Error(error.error || t('leaveFailed', 'Kon niet afmelden voor activiteit'));
      }
    } catch (error) {
      console.error('💥 Error leaving activity:', error);
      if (error.message) {
        throw error; // Re-throw with translated message
      }
      throw new Error(t('leaveError', 'Er ging iets mis bij het afmelden'));
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const currentActivities = activeView === 'recommended' ? (recommendedActivities || []) : (filteredActivities || []);
  
  // Debug logging for activity counts
  console.log('🔍 ActivityList Debug:', {
    activeView,
    activitiesCount: activities?.length || 0,
    filteredActivitiesCount: filteredActivities?.length || 0, 
    recommendedActivitiesCount: recommendedActivities?.length || 0,
    currentActivitiesCount: currentActivities?.length || 0
  });

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


  if (isLoading && page === 1) {
    return (
      <div className="activity-list-loading">
        <div className="loading-animation"></div>
        <p className="loading-text">{t('loadingActivities', 'Activiteiten laden...')}</p>
      </div>
    );
  }

  return (
    <div className="activity-list">
      <div className="activity-list-header">
        <h2 className="activity-list-title">
          {activeView === 'recommended' 
            ? t('recommendedActivities', 'Aanbevolen voor jou')
            : t('upcomingActivities', 'Aankomende Activiteiten')
          }
        </h2>
        <button 
          className="filter-button mobile-touch-target"
          onClick={() => setShowFilters(!showFilters)}
        >
          <span className="filter-icon">🔧</span>
          <span className="filter-text">{t('filters', 'Filters')}</span>
          {Object.values(filters).filter(v => v).length > 0 && (
            <span className="filter-badge">
              {Object.values(filters).filter(v => v).length}
            </span>
          )}
        </button>
      </div>

      <div className="view-tabs">
        <div className="view-tabs-container">
          <button
            className={`view-tab mobile-touch-target ${activeView === 'all' ? 'active' : ''}`}
            onClick={() => setActiveView('all')}
          >
            <span className="view-tab-icon">🗓️</span>
            <span className="view-tab-label">{t('allActivities', 'Alle activiteiten')}</span>
            <span className="view-tab-count">({activities?.length || 0})</span>
          </button>
          
          <button
            className={`view-tab mobile-touch-target ${activeView === 'recommended' ? 'active' : ''}`}
            onClick={() => setActiveView('recommended')}
          >
            <span className="view-tab-icon">✨</span>
            <span className="view-tab-label">{t('recommended', 'Aanbevolen')}</span>
            <span className="view-tab-count">({recommendedActivities?.length || 0})</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <ActivityFilters
          filters={filters}
          categories={categories}
          onFilterChange={handleFilterChange}
          onClose={() => setShowFilters(false)}
        />
      )}

      {currentActivities.length === 0 ? (
        <div className="no-activities">
          <div className="no-activities-icon">📅</div>
          <h3 className="no-activities-title">
            {t('noActivities', 'Geen activiteiten gevonden')}
          </h3>
          <p className="no-activities-description">
            {t('noActivitiesDesc', 'Probeer je filters aan te passen of maak zelf een activiteit aan!')}
          </p>
        </div>
      ) : (
        <div className="activities-container">
          {activeView === 'recommended' ? (
            <div className="recommended-activities">
              {recommendedActivities.map(activity => (
                <div key={activity._id} className="recommended-activity-wrapper">
                  <div className="recommendation-info">
                    <div className="match-score">
                      <span className="match-percentage">{activity.matchScore}% match</span>
                      <div className="match-reasons">
                        {activity.matchReasons?.slice(0, 2).map((reason, index) => (
                          <span key={index} className="match-reason">
                            ✓ {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <ActivityCard
                    activity={activity}
                    user={user}
                    onJoin={() => handleJoinActivity(activity._id)}
                    onLeave={() => handleLeaveActivity(activity._id)}
                    onSelect={() => onSelectActivity(activity)}
                    showDirectActions={true}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="activities-grouped">
              {Object.entries(groupActivitiesByDate(currentActivities)).map(([dateGroup, activities]) => (
                <div key={dateGroup} className="activity-date-group">
                  <h3 className="date-group-title">{dateGroup}</h3>
                  <div className="activities-grid">
                    {activities.map(activity => (
                      <ActivityCard
                        key={activity._id}
                        activity={activity}
                        user={user}
                        onJoin={() => handleJoinActivity(activity._id)}
                        onLeave={() => handleLeaveActivity(activity._id)}
                        onSelect={() => onSelectActivity(activity)}
                        showDirectActions={true}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasMore && !isLoading && (
        <div className="load-more-container">
          <button className="load-more-button mobile-touch-target" onClick={loadMore}>
            <span className="button-icon">📥</span>
            <span className="button-text">{t('loadMore', 'Meer laden')}</span>
          </button>
        </div>
      )}

      {isLoading && page > 1 && (
        <div className="loading-more">
          <div className="loading-spinner"></div>
          <p>{t('loadingMore', 'Meer activiteiten laden...')}</p>
        </div>
      )}

      {successMessage && (
        <div className="success-message-overlay">
          <div className="success-message">
            <span className="success-icon">{successMessage.icon}</span>
            <span className="success-text">{successMessage.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityList;