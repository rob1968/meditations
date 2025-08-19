import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const ActivityCalendar = ({ user, activities = [], onSelectActivity, onDateSelect }) => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarActivities, setCalendarActivities] = useState([]);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  const calendarRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Update calendar activities when activities prop changes
  useEffect(() => {
    console.log('📅 ActivityCalendar received activities:', activities?.length || 0);
    
    // Use only real activities - no more mock data
    if (activities && activities.length > 0) {
      console.log('📅 Using real activities for calendar');
      setCalendarActivities(activities);
    } else {
      console.log('📅 No activities, showing empty calendar');
      setCalendarActivities([]);
    }
  }, [activities]);


  // Get the first day of the current month
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  // Get the last day of the current month
  const getLastDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  // Get days in the current month view (including padding days)
  const getCalendarDays = () => {
    const firstDay = getFirstDayOfMonth(currentDate);
    const lastDay = getLastDayOfMonth(currentDate);
    const startDate = new Date(firstDay);
    
    // Start from Monday of the week containing the first day
    const dayOfWeek = firstDay.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday (0) to 6
    startDate.setDate(firstDay.getDate() - mondayOffset);

    const days = [];
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (7 - (lastDay.getDay() === 0 ? 7 : lastDay.getDay())));

    let currentDay = new Date(startDate);
    while (currentDay <= endDate) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return days;
  };

  // Get activities for a specific date
  const getActivitiesForDate = (date) => {
    const dateStr = date.toDateString();
    return calendarActivities.filter(activity => {
      const activityDate = new Date(activity.date);
      return activityDate.toDateString() === dateStr;
    });
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is in current month
  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth() && 
           date.getFullYear() === currentDate.getFullYear();
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Handle date click
  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dayActivities = getActivitiesForDate(date);
    if (dayActivities.length > 0) {
      setShowBottomSheet(true);
    }
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  // Handle swipe gestures
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNextMonth();
    }
    if (isRightSwipe) {
      goToPreviousMonth();
    }
  };

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'month' ? 'week' : 'month');
  };

  // Get week days for week view
  const getWeekDays = () => {
    const startOfWeek = new Date(selectedDate || new Date());
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
    startOfWeek.setDate(diff);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  // Get month and year string
  const getMonthYearString = () => {
    return currentDate.toLocaleDateString('nl-NL', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Get activity color based on category
  const getActivityColor = (activity) => {
    const colors = [
      '#667eea', '#f093fb', '#ff6b6b', '#4ecdc4', 
      '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b',
      '#6c5ce7', '#fd79a8', '#00b894', '#fdcb6e'
    ];
    
    const index = activity.category?._id ? 
      activity.category._id.charCodeAt(activity.category._id.length - 1) % colors.length : 
      0;
    
    return colors[index];
  };

  const calendarDays = getCalendarDays();
  const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  return (
    <div className="activity-calendar">
      <div className="calendar-header">
        <h2 className="calendar-title">{t('calendar', 'Kalender')}</h2>
        <div className="calendar-navigation">
          <button 
            className="nav-button mobile-touch-target"
            onClick={goToPreviousMonth}
            title={t('previousMonth', 'Vorige maand')}
          >
            ←
          </button>
          <span className="current-month" onClick={toggleViewMode}>
            {getMonthYearString()}
            <span className="view-mode-indicator">
              {viewMode === 'month' ? '📅' : '📋'}
            </span>
          </span>
          <button 
            className="nav-button mobile-touch-target"
            onClick={goToNextMonth}
            title={t('nextMonth', 'Volgende maand')}
          >
            →
          </button>
        </div>
      </div>

      <div 
        className="calendar-grid"
        ref={calendarRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Week day headers */}
        <div className="calendar-weekdays">
          {weekDays?.map(day => (
            <div key={day} className="weekday-header mobile-calendar-header">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className={`calendar-days ${viewMode === 'week' ? 'week-view' : 'month-view'}`}>
          {(viewMode === 'week' ? getWeekDays() : calendarDays)?.map((date, index) => {
            const dayActivities = getActivitiesForDate(date);
            const isCurrentMonthDay = viewMode === 'week' || isCurrentMonth(date);
            const isTodayDay = isToday(date);
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

            return (
              <div
                key={index}
                className={`calendar-day mobile-calendar-day ${!isCurrentMonthDay ? 'other-month' : ''} 
                           ${isTodayDay ? 'today' : ''} 
                           ${isSelected ? 'selected' : ''}
                           ${dayActivities.length > 0 ? 'has-activities' : ''}`}
                onClick={() => handleDateClick(date)}
              >
                <div className="day-number mobile-day-number">{date.getDate()}</div>
                
                {dayActivities.length > 0 && (
                  <div className="day-activities mobile-day-activities">
                    {viewMode === 'week' ? (
                      <div className="activity-preview">
                        {dayActivities?.slice(0, 2)?.map((activity, actIndex) => (
                          <div
                            key={activity._id}
                            className="activity-preview-item"
                            style={{ borderLeft: `3px solid ${getActivityColor(activity)}` }}
                          >
                            <span className="activity-time">{activity.startTime}</span>
                            <span className="activity-emoji">{activity.category?.emoji}</span>
                          </div>
                        ))}
                        {dayActivities.length > 2 && (
                          <div className="activity-more-preview">+{dayActivities.length - 2}</div>
                        )}
                      </div>
                    ) : (
                      <>
                        {dayActivities?.slice(0, 2)?.map((activity, actIndex) => (
                          <div
                            key={activity._id}
                            className="activity-dot mobile-activity-dot"
                            style={{ backgroundColor: getActivityColor(activity) }}
                            title={activity.title}
                          >
                            {activity.category?.emoji}
                          </div>
                        ))}
                        {dayActivities.length > 2 && (
                          <div className="activity-count-badge">
                            +{dayActivities.length - 2}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sheet for Activities */}
      {showBottomSheet && selectedDate && (
        <div className="bottom-sheet-overlay" onClick={() => setShowBottomSheet(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <div className="sheet-handle"></div>
              <h3 className="selected-date-title">
                {selectedDate.toLocaleDateString('nl-NL', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </h3>
              <button 
                className="close-sheet-button mobile-touch-target"
                onClick={() => setShowBottomSheet(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="bottom-sheet-content">
              {getActivitiesForDate(selectedDate).length === 0 ? (
                <div className="no-activities-state">
                  <div className="no-activities-icon">📅</div>
                  <p className="no-activities-message">
                    {t('noActivitiesThisDay', 'Geen activiteiten op deze dag')}
                  </p>
                </div>
              ) : (
                <div className="date-activities-list">
                  {getActivitiesForDate(selectedDate)?.map(activity => (
                    <div
                      key={activity._id}
                      className="calendar-activity-item mobile-activity-card"
                      onClick={() => {
                        onSelectActivity(activity);
                        setShowBottomSheet(false);
                      }}
                    >
                      <div className="activity-time-badge">
                        {activity.startTime}
                      </div>
                      <div className="activity-info">
                        <div className="activity-title">{activity.title}</div>
                        <div className="activity-location">
                          📍 {activity.location?.name}
                        </div>
                        <div className="activity-participants">
                          👥 {activity.participants?.length || 0} deelnemers
                        </div>
                      </div>
                      <div 
                        className="activity-category-indicator"
                        style={{ backgroundColor: getActivityColor(activity) }}
                      >
                        {activity.category?.emoji}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar controls */}
      <div className="calendar-controls">
        <div className="view-toggle">
          <button 
            className={`view-toggle-button mobile-touch-target ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            📅 {t('month', 'Maand')}
          </button>
          <button 
            className={`view-toggle-button mobile-touch-target ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            📋 {t('week', 'Week')}
          </button>
        </div>
        
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-dot today-dot"></div>
            <span>{t('today', 'Vandaag')}</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot activity-dot-sample"></div>
            <span>{t('hasActivities', 'Heeft activiteiten')}</span>
          </div>
          <div className="swipe-hint">
            ↔️ {t('swipeToNavigate', 'Swipe om te navigeren')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityCalendar;