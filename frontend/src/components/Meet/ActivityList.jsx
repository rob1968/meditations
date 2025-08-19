import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ActivityCard from './ActivityCard';
import ActivityFilters from './ActivityFilters';

const ActivityList = ({ user, categories, onSelectActivity }) => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
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

  useEffect(() => {
    loadActivities();
    if (activeView === 'recommended') {
      loadRecommendations();
    }
  }, [filters, page, activeView]);

  const loadActivities = async () => {
    if (activeView === 'recommended') return; // Don't load regular activities in recommended view
    
    setIsLoading(true);
    try {
      console.log('🔄 Loading real activities from API...');
      
      if (!user?._id && !user?.id) {
        console.log('❌ No user ID available for API call');
        setActivities([]);
        setIsLoading(false);
        return;
      }
      
      // Build query parameters for filters
      const queryParams = new URLSearchParams({
        status: 'approved', // Only show approved activities
        page: page.toString(),
        limit: '10'
      });
      
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.date) queryParams.append('date', filters.date);
      if (filters.city) queryParams.append('city', filters.city);
      if (filters.language) queryParams.append('language', filters.language);
      
      const response = await fetch(`/api/activities?${queryParams.toString()}`, {
        headers: {
          'x-user-id': user._id || user.id,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Real activities loaded:', data.activities?.length || 0);
        
        if (page === 1) {
          setActivities(data.activities || []);
        } else {
          setActivities(prev => [...prev, ...(data.activities || [])]);
        }
        
        setHasMore(data.pagination?.page < data.pagination?.pages);
      } else {
        console.error('❌ Failed to load activities:', response.status);
        // Fallback to empty activities instead of mock data
        setActivities([]);
      }
    } catch (error) {
      console.error('❌ Error loading activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      console.log("🔄 Loading real activity recommendations...");
      
      if (!user?._id && !user?.id) {
        console.log("❌ No user ID available for recommendations");
        setRecommendedActivities([]);
        setIsLoading(false);
        return;
      }
      
      // Load recommended activities from API based on user profile
      const response = await fetch("/api/activities/recommendations", {
        headers: {
          "x-user-id": user._id || user.id,
          "Content-Type": "application/json"
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("📦 Real recommendations loaded:", data.activities?.length || 0);
        setRecommendedActivities(data.activities || []);
      } else {
        console.error("❌ Failed to load recommendations:", response.status);
        // Fallback: use approved activities as recommendations
        const fallbackResponse = await fetch("/api/activities?status=approved&limit=5", {
          headers: {
            "x-user-id": user._id || user.id,
            "Content-Type": "application/json"
          }
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

  const handleJoinActivity = async (activityId) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?._id || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local state to reflect joined status
        setActivities(prev => prev.map(activity => 
          activity._id === activityId 
            ? { ...activity, participants: [...activity.participants, { user: user }] }
            : activity
        ));
        
        // Show success message
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
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const currentActivities = activeView === 'recommended' ? recommendedActivities : filteredActivities;

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

  // Remove unused variable since we now use groupActivitiesByDate inline

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
            <span className="view-tab-count">({activities.length})</span>
          </button>
          
          <button
            className={`view-tab mobile-touch-target ${activeView === 'recommended' ? 'active' : ''}`}
            onClick={() => setActiveView('recommended')}
          >
            <span className="view-tab-icon">✨</span>
            <span className="view-tab-label">{t('recommended', 'Aanbevolen')}</span>
            <span className="view-tab-count">({recommendedActivities.length})</span>
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
                    onSelect={() => onSelectActivity(activity)}
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
                        onSelect={() => onSelectActivity(activity)}
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
    </div>
  );
};

export default ActivityList;