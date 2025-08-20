import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { i18n } = useTranslation();
  
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
        isToday: isToday(day),
        isFuture: isFutureDate(day)
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

  // Check if a day is in the future
  const isFutureDate = (day) => {
    const today = new Date();
    const dayDate = new Date(currentYear, currentMonth, day);
    
    // Debug logging
    console.log('isFutureDate check:', {
      day,
      currentYear,
      currentMonth,
      dayDate: dayDate.toDateString(),
      today: today.toDateString(),
      isFuture: dayDate > today
    });
    
    return dayDate > today;
  };

  // Format month and year using proper internationalization
  const formatMonthYear = () => {
    const date = new Date(currentYear, currentMonth);
    
    // Map i18n language codes to proper locales for date formatting
    const languageToLocale = {
      'en': 'en-US',
      'nl': 'nl-NL', 
      'de': 'de-DE',
      'fr': 'fr-FR',
      'es': 'es-ES',
      'it': 'it-IT',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'pt': 'pt-BR',
      'ru': 'ru-RU',
      'zh': 'zh-CN',
      'ar': 'ar-SA',
      'hi': 'hi-IN'
    };
    
    const currentLanguage = i18n.language || 'en';
    const locale = languageToLocale[currentLanguage] || 'en-US';
    
    // Use the selected UI language for month names
    const formatter = new Intl.DateTimeFormat(locale, { 
      month: 'long',
      year: 'numeric' 
    });
    return formatter.format(date);
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
        {[
          t('sundayShort', 'Zo'),
          t('mondayShort', 'Ma'), 
          t('tuesdayShort', 'Di'),
          t('wednesdayShort', 'Wo'),
          t('thursdayShort', 'Do'),
          t('fridayShort', 'Vr'),
          t('saturdayShort', 'Za')
        ].map((day, index) => (
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
            } ${
              dayObj.isFuture ? 'simple-day-future' : ''
            }`}
            onClick={() => {
              console.log('Calendar day clicked:', {
                day: dayObj.day,
                date: dayObj.date,
                isFuture: dayObj.isFuture,
                type: dayObj.type,
                willCall: dayObj.type === 'day' && !dayObj.isFuture
              });
              
              if (dayObj.type === 'day' && !dayObj.isFuture && onDateClick) {
                onDateClick(dayObj.date);
              } else if (dayObj.isFuture) {
                console.log('Blocked future date click');
              }
            }}
            style={{ 
              cursor: dayObj.isFuture ? 'not-allowed' : 'pointer',
              opacity: dayObj.isFuture ? 0.4 : 1
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