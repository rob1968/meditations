import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const ActivityCalendar = ({ user, activities = [], onSelectActivity, onDateSelect }) => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarActivities, setCalendarActivities] = useState([]);

  // Update calendar activities when activities prop changes
  useEffect(() => {
    console.log('📅 ActivityCalendar received activities:', activities?.length || 0);
    
    // Use real activities if provided, otherwise fall back to mock data
    if (activities && activities.length > 0) {
      console.log('📅 Using real activities for calendar');
      setCalendarActivities(activities);
    } else {
      console.log('📅 No real activities, using mock data');
      const mockActivities = generateMockActivities();
      setCalendarActivities(mockActivities);
    }
  }, [activities]);

  // Generate mock activities for calendar demonstration
  const generateMockActivities = () => {
    const today = new Date();
    const mockData = [];
    
    // Create activities for the next 30 days
    for (let i = 0; i < 15; i++) {
      const activityDate = new Date(today);
      activityDate.setDate(today.getDate() + i);
      
      // Random number of activities per day (0-3)
      const numActivities = Math.floor(Math.random() * 4);
      
      for (let j = 0; j < numActivities; j++) {
        const categories = [
          { _id: 'cat1', emoji: '☕', name: { nl: 'Koffie' } },
          { _id: 'cat2', emoji: '🍽️', name: { nl: 'Dining' } },
          { _id: 'cat3', emoji: '🌳', name: { nl: 'Wandelen' } },
          { _id: 'cat4', emoji: '💪', name: { nl: 'Sport' } },
          { _id: 'cat5', emoji: '🎨', name: { nl: 'Cultuur' } },
          { _id: 'cat6', emoji: '🍺', name: { nl: 'Borrel' } }
        ];
        
        const category = categories[Math.floor(Math.random() * categories.length)];
        const startTimes = ['10:00', '14:00', '16:00', '19:00', '20:30'];
        const locations = [
          'Café Central', 'Vondelpark', 'Museum Quarter', 
          'Jordaan District', 'Dam Square', 'Leidseplein'
        ];
        
        mockData.push({
          _id: `mock-cal-${i}-${j}`,
          title: `${category.name.nl} meetup`,
          category: category,
          date: activityDate.toISOString(),
          startTime: startTimes[Math.floor(Math.random() * startTimes.length)],
          location: {
            name: locations[Math.floor(Math.random() * locations.length)],
            city: 'Amsterdam'
          },
          participants: Array.from({ length: 2 + Math.floor(Math.random() * 4) }, (_, k) => ({
            user: { _id: `user-${k}`, username: `User${k}` },
            status: 'confirmed'
          }))
        });
      }
    }
    
    return mockData;
  };

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
    if (onDateSelect) {
      onDateSelect(date);
    }
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
            className="nav-button"
            onClick={goToPreviousMonth}
            title={t('previousMonth', 'Vorige maand')}
          >
            ←
          </button>
          <span className="current-month">{getMonthYearString()}</span>
          <button 
            className="nav-button"
            onClick={goToNextMonth}
            title={t('nextMonth', 'Volgende maand')}
          >
            →
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {/* Week day headers */}
        <div className="calendar-weekdays">
          {weekDays.map(day => (
            <div key={day} className="weekday-header">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="calendar-days">
          {calendarDays.map((date, index) => {
            const dayActivities = getActivitiesForDate(date);
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDay = isToday(date);
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

            return (
              <div
                key={index}
                className={`calendar-day ${!isCurrentMonthDay ? 'other-month' : ''} 
                           ${isTodayDay ? 'today' : ''} 
                           ${isSelected ? 'selected' : ''}
                           ${dayActivities.length > 0 ? 'has-activities' : ''}`}
                onClick={() => handleDateClick(date)}
              >
                <div className="day-number">{date.getDate()}</div>
                
                {dayActivities.length > 0 && (
                  <div className="day-activities">
                    {dayActivities.slice(0, 3).map((activity, actIndex) => (
                      <div
                        key={activity._id}
                        className="activity-dot"
                        style={{ backgroundColor: getActivityColor(activity) }}
                        title={activity.title}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectActivity(activity);
                        }}
                      />
                    ))}
                    {dayActivities.length > 3 && (
                      <div className="activity-more">
                        +{dayActivities.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected date activities */}
      {selectedDate && (
        <div className="selected-date-activities">
          <h3 className="selected-date-title">
            {selectedDate.toLocaleDateString('nl-NL', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </h3>
          
          {getActivitiesForDate(selectedDate).length === 0 ? (
            <p className="no-activities-message">
              {t('noActivitiesThisDay', 'Geen activiteiten op deze dag')}
            </p>
          ) : (
            <div className="date-activities-list">
              {getActivitiesForDate(selectedDate).map(activity => (
                <div
                  key={activity._id}
                  className="calendar-activity-item"
                  onClick={() => onSelectActivity(activity)}
                >
                  <div className="activity-time">
                    {activity.startTime}
                  </div>
                  <div className="activity-info">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-location">
                      📍 {activity.location?.name}
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
      )}

      {/* Calendar legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-dot today-dot"></div>
          <span>{t('today', 'Vandaag')}</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot activity-dot-sample"></div>
          <span>{t('hasActivities', 'Heeft activiteiten')}</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityCalendar;