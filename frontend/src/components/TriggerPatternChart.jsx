import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const TriggerPatternChart = ({ entries, addictions }) => {
  const { t } = useTranslation();
  const [triggerData, setTriggerData] = useState({
    patterns: [],
    timeDistribution: {},
    severityBreakdown: {},
    commonWords: []
  });
  
  useEffect(() => {
    analyzeTriggerPatterns();
  }, [entries, addictions]);
  
  const analyzeTriggerPatterns = () => {
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
      smoking: t('smoking', 'Roken'),
      drugs: t('drugs', 'Drugs'),
      gambling: t('gambling', 'Gokken'),
      gaming: t('gaming', 'Gamen'),
      shopping: t('shopping', 'Winkelen'),
      food: t('food', 'Eten'),
      sex: t('sex', 'Seks'),
      work: t('work', 'Werk'),
      social_media: t('socialMedia', 'Social Media'),
      caffeine: t('caffeine', 'Cafeïne'),
      sugar: t('sugar', 'Suiker'),
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
      morning: t('morning', 'Ochtend'),
      afternoon: t('afternoon', 'Middag'),
      evening: t('evening', 'Avond'),
      night: t('night', 'Nacht')
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
          font-size: 18px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .total-triggers {
          background: #f0f2f5;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }
        
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .chart-section {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 15px;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #333;
        }
        
        .addiction-patterns {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .pattern-item {
          background: white;
          border-radius: 6px;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .pattern-info {
          flex: 1;
        }
        
        .pattern-name {
          font-weight: 500;
          margin-bottom: 4px;
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
          font-size: 20px;
          font-weight: 600;
          color: #667eea;
        }
        
        .time-distribution {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .time-bar {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .time-label {
          width: 80px;
          font-size: 13px;
        }
        
        .bar-container {
          flex: 1;
          height: 24px;
          background: #e0e0e0;
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        }
        
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 4px;
          transition: width 0.5s ease;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 6px;
        }
        
        .bar-value {
          color: white;
          font-size: 11px;
          font-weight: 500;
        }
        
        .severity-breakdown {
          display: flex;
          justify-content: space-around;
          padding: 10px 0;
        }
        
        .severity-item {
          text-align: center;
        }
        
        .severity-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          font-weight: 600;
          margin: 0 auto 8px;
        }
        
        .severity-label {
          font-size: 12px;
          color: #666;
        }
        
        .word-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 10px 0;
        }
        
        .word-tag {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 16px;
          padding: 6px 12px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .word-count {
          background: #667eea;
          color: white;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 500;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #999;
        }
        
        .empty-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
        
        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
          
          .time-label {
            width: 60px;
            font-size: 12px;
          }
        }
      `}</style>
      
      <div className="chart-header">
        <h3 className="chart-title">
          📊 {t('triggerPatterns', 'Trigger Patronen')}
        </h3>
        {totalTriggers > 0 && (
          <span className="total-triggers">
            {totalTriggers} {t('totalTriggers', 'totaal triggers')}
          </span>
        )}
      </div>
      
      {totalTriggers === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <p>{t('noTriggersFound', 'Nog geen triggers gedetecteerd')}</p>
        </div>
      ) : (
        <>
          <div className="charts-grid">
            {/* Addiction Patterns */}
            {triggerData.patterns.length > 0 && (
              <div className="chart-section">
                <h4 className="section-title">{t('byAddiction', 'Per Verslaving')}</h4>
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
              <h4 className="section-title">{t('timeDistribution', 'Tijd Verdeling')}</h4>
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
              <h4 className="section-title">{t('severityLevels', 'Ernst Niveaus')}</h4>
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
                      {severity === 'low' ? t('low', 'Laag') : 
                       severity === 'medium' ? t('medium', 'Gemiddeld') : 
                       t('high', 'Hoog')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Common Trigger Words */}
          {triggerData.commonWords.length > 0 && (
            <div className="chart-section">
              <h4 className="section-title">{t('commonTriggerWords', 'Veelvoorkomende Trigger Woorden')}</h4>
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