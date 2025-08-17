import React from 'react';
import './SimpleCalendar.css';

const SimpleCalendar = ({ 
  currentMonth, 
  currentYear, 
  entries, 
  onDateClick,
  onPrevMonth,
  onNextMonth,
  t 
}) => {
  // Get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Generate all calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push({ type: 'empty', day: null });
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasEntry = entries && entries.some(entry => 
        entry.date && entry.date.startsWith(dateStr)
      );
      
      days.push({
        type: 'day',
        day: day,
        date: dateStr,
        hasEntry: hasEntry,
        isToday: isToday(day)
      });
    }
    
    // Fill remaining cells to make 42 total (6 weeks × 7 days)
    while (days.length < 42) {
      days.push({ type: 'empty', day: null });
    }
    
    return days;
  };

  // Check if a day is today
  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           currentMonth === today.getMonth() && 
           currentYear === today.getFullYear();
  };

  // Format month and year
  const formatMonthYear = () => {
    const monthNames = [
      t('january', 'Januari'),
      t('february', 'Februari'),
      t('march', 'Maart'),
      t('april', 'April'),
      t('may', 'Mei'),
      t('june', 'Juni'),
      t('july', 'Juli'),
      t('august', 'Augustus'),
      t('september', 'September'),
      t('october', 'Oktober'),
      t('november', 'November'),
      t('december', 'December')
    ];
    return `${monthNames[currentMonth]} ${currentYear}`;
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();
  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();

  return (
    <div className="simple-calendar">
      {/* Calendar Header */}
      <div className="simple-calendar-header">
        <button 
          className="simple-nav-btn"
          onClick={onPrevMonth}
          aria-label={t('previousMonth', 'Vorige maand')}
        >
          ‹
        </button>
        <h3 className="simple-month-year">{formatMonthYear()}</h3>
        <button 
          className="simple-nav-btn"
          onClick={onNextMonth}
          disabled={isCurrentMonth}
          aria-label={t('nextMonth', 'Volgende maand')}
        >
          ›
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="simple-weekdays">
        {['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'].map((day, index) => (
          <div key={index} className="simple-weekday">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days - Simple Table Style */}
      <div className="simple-calendar-grid">
        {calendarDays.map((dayObj, index) => (
          <div
            key={index}
            className={`simple-day ${
              dayObj.type === 'empty' ? 'simple-day-empty' : ''
            } ${
              dayObj.isToday ? 'simple-day-today' : ''
            } ${
              dayObj.hasEntry ? 'simple-day-has-entry' : ''
            }`}
            onClick={() => {
              if (dayObj.type === 'day' && onDateClick) {
                onDateClick(dayObj.date);
              }
            }}
          >
            {dayObj.day && (
              <>
                <span className="simple-day-number">{dayObj.day}</span>
                {dayObj.hasEntry && <div className="simple-entry-dot">•</div>}
              </>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};

export default SimpleCalendar;