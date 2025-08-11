import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';

const TriggerPatternChart = ({ user, addictions }) => {
  const { t } = useTranslation();
  const [triggerData, setTriggerData] = useState({
    patterns: [],
    timeDistribution: {},
    severityBreakdown: {},
    commonWords: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (user?.id) {
      fetchTriggerPatterns();
    }
  }, [user?.id, addictions]);
  
  const fetchTriggerPatterns = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get(getFullUrl(`/api/ai-coach/trigger-patterns/${user.id}`));
      
      if (response.data.success) {
        const entries = response.data.entries;
        console.log('📊 Received trigger data:', entries);
        analyzeTriggerPatterns(entries);
      } else {
        setError('Failed to load trigger patterns');
      }
    } catch (error) {
      console.error('Error fetching trigger patterns:', error);
      setError('Failed to load trigger patterns');
      // Fallback to empty data
      setTriggerData({
        patterns: [],
        timeDistribution: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        severityBreakdown: { low: 0, medium: 0, high: 0 },
        commonWords: []
      });
    } finally {
      setLoading(false);
    }
  };
  
  const analyzeTriggerPatterns = (entries) => {
    const patterns = {};
    const timeDistribution = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0
    };
    const severityCount = {
      low: 0,
      medium: 0,
      high: 0
    };
    const wordFrequency = {};
    
    entries.forEach(entry => {
      if (entry.triggers && entry.triggers.length > 0) {
        entry.triggers.forEach(trigger => {
          // Count trigger patterns by addiction type
          const addiction = trigger.relatedAddiction || 'unknown';
          if (!patterns[addiction]) {
            patterns[addiction] = {
              name: addiction,
              count: 0,
              severity: { low: 0, medium: 0, high: 0 },
              triggers: []
            };
          }
          patterns[addiction].count++;
          patterns[addiction].severity[trigger.severity || 'medium']++;
          patterns[addiction].triggers.push(trigger.trigger);
          
          // Count severity
          severityCount[trigger.severity || 'medium']++;
          
          // Analyze time distribution
          const hour = new Date(entry.date).getHours();
          if (hour >= 5 && hour < 12) timeDistribution.morning++;
          else if (hour >= 12 && hour < 17) timeDistribution.afternoon++;
          else if (hour >= 17 && hour < 22) timeDistribution.evening++;
          else timeDistribution.night++;
          
          // Extract common trigger words
          const words = trigger.trigger.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.length > 3) {
              wordFrequency[word] = (wordFrequency[word] || 0) + 1;
            }
          });
        });
      }
    });
    
    // Sort and get top trigger words
    const sortedWords = Object.entries(wordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
    
    // Convert patterns to array and sort by count
    const patternArray = Object.values(patterns)
      .sort((a, b) => b.count - a.count);
    
    setTriggerData({
      patterns: patternArray,
      timeDistribution,
      severityBreakdown: severityCount,
      commonWords: sortedWords
    });
  };
  
  const getAddictionLabel = (type) => {
    const labels = {
      alcohol: t('alcohol', 'Alcohol'),
      smoking: t('smoking', 'Smoking'),
      drugs: t('drugs', 'Drugs'),
      gambling: t('gambling', 'Gambling'),
      gaming: t('gaming', 'Gaming'),
      shopping: t('shopping', 'Shopping'),
      food: t('food', 'Eten'),
      sex: t('sex', 'Seks'),
      work: t('work', 'Werk'),
      social_media: t('socialMedia', 'Social Media'),
      caffeine: t('caffeine', 'Caffeine'),
      sugar: t('sugar', 'Sugar'),
      exercise: t('exercise', 'Sport'),
      porn: t('porn', 'Porno'),
      internet: t('internet', 'Internet'),
      phone: t('phone', 'Telefoon'),
      other: t('other', 'Anders')
    };
    return labels[type] || type;
  };
  
  const getTimeLabel = (time) => {
    const labels = {
      morning: t('morning', 'Morning'),
      afternoon: t('afternoon', 'Afternoon'),
      evening: t('evening', 'Evening'),
      night: t('night', 'Night')
    };
    return labels[time] || time;
  };
  
  const getSeverityColor = (severity) => {
    const colors = {
      low: '#4caf50',
      medium: '#ff9800',
      high: '#f44336'
    };
    return colors[severity] || '#999';
  };
  
  const totalTriggers = triggerData.patterns.reduce((sum, p) => sum + p.count, 0);
  const maxTimeCount = Math.max(...Object.values(triggerData.timeDistribution));
  const maxSeverityCount = Math.max(...Object.values(triggerData.severityBreakdown));
  
  return (
    <div className="trigger-pattern-chart">
      <style jsx>{`
        .trigger-pattern-chart {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .chart-title {
          font-size: 20px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #1a1a1a;
        }
        
        .total-triggers {
          background: #667eea;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
        }
        
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .chart-section {
          background: #ffffff;
          border: 1px solid #e1e5e9;
          border-radius: 10px;
          padding: 18px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .section-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 16px;
          color: #2d3748;
          border-bottom: 2px solid #667eea;
          padding-bottom: 6px;
        }
        
        .addiction-patterns {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .pattern-item {
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s ease;
        }
        
        .pattern-item:hover {
          background: #edf2f7;
          border-color: #667eea;
          transform: translateY(-1px);
        }
        
        .pattern-info {
          flex: 1;
        }
        
        .pattern-name {
          font-weight: 600;
          margin-bottom: 6px;
          font-size: 15px;
          color: #2d3748;
        }
        
        .pattern-severity {
          display: flex;
          gap: 8px;
          font-size: 12px;
        }
        
        .severity-badge {
          padding: 2px 6px;
          border-radius: 4px;
          color: white;
        }
        
        .pattern-count {
          font-size: 24px;
          font-weight: 700;
          color: #667eea;
          background: #edf2f7;
          padding: 8px 12px;
          border-radius: 20px;
          min-width: 45px;
          text-align: center;
        }
        
        .time-distribution {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .time-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f7fafc;
          padding: 8px;
          border-radius: 6px;
        }
        
        .time-label {
          width: 90px;
          font-size: 14px;
          font-weight: 600;
          color: #4a5568;
        }
        
        .bar-container {
          flex: 1;
          height: 28px;
          background: #e2e8f0;
          border-radius: 8px;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #5a67d8);
          border-radius: 8px;
          transition: width 0.6s ease-out;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 8px;
          box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
        }
        
        .bar-value {
          color: white;
          font-size: 12px;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        
        .severity-breakdown {
          display: flex;
          justify-content: space-around;
          padding: 16px 0;
          gap: 10px;
        }
        
        .severity-item {
          text-align: center;
          flex: 1;
        }
        
        .severity-circle {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          font-weight: 700;
          margin: 0 auto 10px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          transition: transform 0.2s ease;
        }
        
        .severity-circle:hover {
          transform: scale(1.05);
        }
        
        .severity-label {
          font-size: 13px;
          font-weight: 600;
          color: #4a5568;
        }
        
        .word-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 16px 0;
        }
        
        .word-tag {
          background: #f7fafc;
          border: 2px solid #e2e8f0;
          border-radius: 20px;
          padding: 8px 14px;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          color: #2d3748;
        }
        
        .word-tag:hover {
          background: #edf2f7;
          border-color: #667eea;
          transform: translateY(-1px);
        }
        
        .word-count {
          background: #667eea;
          color: white;
          border-radius: 12px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 600;
          min-width: 20px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
        }
        
        .empty-state {
          text-align: center;
          padding: 60px 40px;
          color: #718096;
          background: #f7fafc;
          border-radius: 12px;
          border: 2px dashed #cbd5e0;
        }
        
        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .empty-state p {
          font-size: 16px;
          font-weight: 500;
          margin: 0;
          color: #4a5568;
        }
        
        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
          
          .chart-section {
            padding: 14px;
          }
          
          .time-label {
            width: 70px;
            font-size: 13px;
          }
          
          .severity-circle {
            width: 60px;
            height: 60px;
            font-size: 18px;
          }
          
          .pattern-count {
            font-size: 20px;
            padding: 6px 10px;
          }
          
          .empty-state {
            padding: 40px 20px;
          }
          
          .empty-icon {
            font-size: 48px;
          }
        }
      `}</style>
      
      <div className="chart-header">
        <h3 className="chart-title">
          📊 {t('triggerPatterns', 'Trigger Patterns')}
        </h3>
        {totalTriggers > 0 && (
          <span className="total-triggers">
            {totalTriggers} {t('totalTriggers', 'total triggers')}
          </span>
        )}
      </div>
      
      {loading ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p>{t('loadingTriggerPatterns', 'Loading trigger patterns...')}</p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-icon">❌</div>
          <p>{error}</p>
        </div>
      ) : totalTriggers === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <p>{t('noTriggersFound', 'No triggers detected yet')}</p>
        </div>
      ) : (
        <>
          <div className="charts-grid">
            {/* Addiction Patterns */}
            {triggerData.patterns.length > 0 && (
              <div className="chart-section">
                <h4 className="section-title">{t('byAddiction', 'By Addiction')}</h4>
                <div className="addiction-patterns">
                  {triggerData.patterns.slice(0, 5).map(pattern => (
                    <div key={pattern.name} className="pattern-item">
                      <div className="pattern-info">
                        <div className="pattern-name">{getAddictionLabel(pattern.name)}</div>
                        <div className="pattern-severity">
                          {Object.entries(pattern.severity).map(([sev, count]) => 
                            count > 0 && (
                              <span 
                                key={sev}
                                className="severity-badge"
                                style={{ background: getSeverityColor(sev) }}
                              >
                                {count}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                      <div className="pattern-count">{pattern.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Time Distribution */}
            <div className="chart-section">
              <h4 className="section-title">{t('timeDistribution', 'Time Distribution')}</h4>
              <div className="time-distribution">
                {Object.entries(triggerData.timeDistribution).map(([time, count]) => (
                  <div key={time} className="time-bar">
                    <span className="time-label">{getTimeLabel(time)}</span>
                    <div className="bar-container">
                      <div 
                        className="bar-fill"
                        style={{ width: `${(count / maxTimeCount) * 100}%` }}
                      >
                        {count > 0 && <span className="bar-value">{count}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Severity Breakdown */}
            <div className="chart-section">
              <h4 className="section-title">{t('severityLevels', 'Severity Levels')}</h4>
              <div className="severity-breakdown">
                {Object.entries(triggerData.severityBreakdown).map(([severity, count]) => (
                  <div key={severity} className="severity-item">
                    <div 
                      className="severity-circle"
                      style={{ background: getSeverityColor(severity) }}
                    >
                      {count}
                    </div>
                    <span className="severity-label">
                      {severity === 'low' ? t('low', 'Low') : 
                       severity === 'medium' ? t('medium', 'Medium') : 
                       t('high', 'High')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Common Trigger Words */}
          {triggerData.commonWords.length > 0 && (
            <div className="chart-section">
              <h4 className="section-title">{t('commonTriggerWords', 'Common Trigger Words')}</h4>
              <div className="word-cloud">
                {triggerData.commonWords.map(({ word, count }) => (
                  <span key={word} className="word-tag">
                    {word}
                    <span className="word-count">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TriggerPatternChart;