import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const CalendarHeatmap = ({ entries, userId }) => {
  const { t } = useTranslation();
  const [heatmapData, setHeatmapData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  useEffect(() => {
    generateHeatmapData();
  }, [entries, selectedMonth, selectedYear]);
  
  const generateHeatmapData = () => {
    const data = {};
    entries.forEach(entry => {
      const date = new Date(entry.date);
      if (date.getMonth() === selectedMonth && date.getFullYear() === selectedYear) {
        const day = date.getDate();
        if (!data[day]) {
          data[day] = {
            count: 0,
            mood: null,
            hasRelapse: false,
            wordCount: 0
          };
        }
        data[day].count++;
        data[day].mood = entry.detectedMood;
        data[day].wordCount += (entry.text || '').split(' ').length;
        
        // Check for relapse indicators
        if (entry.automaticRelapseDetected || 
            (entry.triggers && entry.triggers.some(t => t.severity === 'high'))) {
          data[day].hasRelapse = true;
        }
      }
    });
    setHeatmapData(data);
  };
  
  const getDaysInMonth = () => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = () => {
    return new Date(selectedYear, selectedMonth, 1).getDay();
  };
  
  const getIntensityClass = (dayData) => {
    if (!dayData) return 'empty';
    if (dayData.hasRelapse) return 'relapse';
    if (dayData.count === 0) return 'empty';
    if (dayData.count === 1) return 'low';
    if (dayData.count === 2) return 'medium';
    return 'high';
  };
  
  const getMoodEmoji = (mood) => {
    const moodEmojis = {
      happy: '😊',
      sad: '😢',
      anxious: '😰',
      calm: '😌',
      excited: '🤗',
      angry: '😠',
      grateful: '🙏',
      stressed: '😫',
      hopeful: '🌟',
      neutral: '😐'
    };
    return moodEmojis[mood] || '📝';
  };
  
  const monthNames = [
    t('january', 'January'),
    t('february', 'February'),
    t('march', 'March'),
    t('april', 'April'),
    t('may', 'May'),
    t('june', 'June'),
    t('july', 'July'),
    t('august', 'August'),
    t('september', 'September'),
    t('october', 'October'),
    t('november', 'November'),
    t('december', 'December')
  ];
  
  const weekDays = [
    t('sun', 'Sun'),
    t('mon', 'Mon'),
    t('tue', 'Tue'),
    t('wed', 'Wed'),
    t('thu', 'Thu'),
    t('fri', 'Fri'),
    t('sat', 'Sat')
  ];
  
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };
  
  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth();
    const firstDay = getFirstDayOfMonth();
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="calendar-day empty"></div>
      );
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = heatmapData[day];
      const intensityClass = getIntensityClass(dayData);
      const isToday = 
        day === new Date().getDate() && 
        selectedMonth === new Date().getMonth() && 
        selectedYear === new Date().getFullYear();
      
      days.push(
        <div 
          key={day} 
          className={`calendar-day ${intensityClass} ${isToday ? 'today' : ''}`}
          title={dayData ? `${dayData.count} ${t('entries', 'entries')} - ${dayData.wordCount} ${t('words', 'words')}` : t('noEntries', 'No entries')}
        >
          <span className="day-number">{day}</span>
          {dayData && dayData.mood && (
            <span className="mood-emoji">{getMoodEmoji(dayData.mood)}</span>
          )}
          {dayData && dayData.hasRelapse && (
            <span className="relapse-indicator">⚠️</span>
          )}
        </div>
      );
    }
    
    return days;
  };
  
  const getStats = () => {
    const totalEntries = Object.values(heatmapData).reduce((sum, day) => sum + day.count, 0);
    const daysWritten = Object.keys(heatmapData).length;
    const totalWords = Object.values(heatmapData).reduce((sum, day) => sum + day.wordCount, 0);
    const relapsedays = Object.values(heatmapData).filter(day => day.hasRelapse).length;
    
    return { totalEntries, daysWritten, totalWords, relapsedays };
  };
  
  const stats = getStats();
  
  return (
    <div className="calendar-heatmap">
      <style jsx>{`
        .calendar-heatmap {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .calendar-navigation {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .nav-button {
          background: #f0f2f5;
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 18px;
          transition: background 0.3s;
        }
        
        .nav-button:hover {
          background: #e4e6e9;
        }
        
        .month-year {
          font-size: 18px;
          font-weight: 600;
          min-width: 150px;
          text-align: center;
        }
        
        .weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 8px;
        }
        
        .weekday {
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          padding: 4px;
        }
        
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        
        .calendar-day {
          aspect-ratio: 1;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.3s;
          cursor: pointer;
          min-height: 50px;
        }
        
        .calendar-day.empty {
          background: #f8f9fa;
        }
        
        .calendar-day.low {
          background: #e3f2fd;
          border: 1px solid #90caf9;
        }
        
        .calendar-day.medium {
          background: #bbdefb;
          border: 1px solid #64b5f6;
        }
        
        .calendar-day.high {
          background: #90caf9;
          border: 1px solid #42a5f5;
        }
        
        .calendar-day.relapse {
          background: #ffebee;
          border: 2px solid #ef5350;
        }
        
        .calendar-day.today {
          box-shadow: 0 0 0 2px #667eea;
        }
        
        .calendar-day:hover:not(.empty) {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10;
        }
        
        .day-number {
          font-size: 14px;
          font-weight: 500;
        }
        
        .mood-emoji {
          position: absolute;
          top: 2px;
          right: 2px;
          font-size: 12px;
        }
        
        .relapse-indicator {
          position: absolute;
          bottom: 2px;
          right: 2px;
          font-size: 10px;
        }
        
        .legend {
          display: flex;
          gap: 15px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          flex-wrap: wrap;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #666;
        }
        
        .legend-box {
          width: 20px;
          height: 20px;
          border-radius: 4px;
        }
        
        @media (max-width: 768px) {
          .calendar-day {
            min-height: 40px;
          }
          
          .day-number {
            font-size: 12px;
          }
        }
      `}</style>
      
      <div className="calendar-header">
        <h3>📅 {t('journalActivity', 'Journal Activity')}</h3>
        <div className="calendar-navigation">
          <button className="nav-button" onClick={handlePrevMonth}>‹</button>
          <span className="month-year">{monthNames[selectedMonth]} {selectedYear}</span>
          <button className="nav-button" onClick={handleNextMonth}>›</button>
        </div>
      </div>
      
      <div className="weekdays">
        {weekDays.map(day => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>
      
      <div className="calendar-grid">
        {renderCalendarDays()}
      </div>
      
      <div className="legend">
        <div className="legend-item">
          <div className="legend-box" style={{background: '#f8f9fa'}}></div>
          <span>{t('noEntry', 'No entry')}</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{background: '#e3f2fd', border: '1px solid #90caf9'}}></div>
          <span>1 {t('entry', 'entry')}</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{background: '#bbdefb', border: '1px solid #64b5f6'}}></div>
          <span>2 {t('entries', 'entries')}</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{background: '#90caf9', border: '1px solid #42a5f5'}}></div>
          <span>3+ {t('entries', 'entries')}</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{background: '#ffebee', border: '2px solid #ef5350'}}></div>
          <span>{t('relapseDetected', 'Relapse detected')}</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeatmap;