import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';

const ProgressDashboard = ({ user, onStartCoaching }) => {
  const { t, i18n } = useTranslation();
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('7');

  useEffect(() => {
    if (user) {
      fetchEnhancedInsights();
    }
  }, [user, timeframe]);

  const fetchEnhancedInsights = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        timeframe,
        sophistication: 'intermediate',
        categories: 'recovery_progress,wellness_trends',
        comparisons: 'true',
        predictions: 'true',
        language: i18n.language
      });
      
      const response = await axios.get(
        getFullUrl(`/api/ai-coach/enhanced-insights/${user.id}?${params}`)
      );
      
      if (response.data.success) {
        setInsights(response.data.insights);
        console.log('Enhanced Insights loaded:', response.data.insights);
      } else {
        setError(t('failedToLoadInsights', 'Failed to load insights'));
      }
    } catch (error) {
      console.error('Error fetching enhanced insights:', error);
      setError(t('failedToLoadProgressInsights', 'Failed to load progress insights'));
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'critical': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend?.toLowerCase()) {
      case 'improving': return '📈';
      case 'stable': return '📊';
      case 'declining': return '📉';
      case 'volatile': return '⚡';
      default: return '📊';
    }
  };

  if (isLoading) {
    return (
      <div className="progress-dashboard loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h3>{t('loading', 'Loading')} Enhanced Insights...</h3>
          <p>Analyzing your wellness patterns...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="progress-dashboard error">
        <div className="error-container">
          <h3>😔 {t('insightsError', 'Insights Error')}</h3>
          <p>{error}</p>
          <button onClick={fetchEnhancedInsights} className="retry-button">
            {t('tryAgain', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="progress-dashboard no-data">
        <div className="no-data-container">
          <h3>📊 {t('noInsightsYet', 'No Insights Yet')}</h3>
          <p>{t('addJournalEntries', 'Add some journal entries to see your progress insights')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="progress-dashboard">
      {/* Header */}
      <div className="insights-header">
        <h2>📊 {t('recoveryInsights', 'Recovery Progress Insights')}</h2>
        <p>{t('basedOnData', 'Based on your journal entries and progress tracking')}</p>
        
        <div className="timeframe-selector">
          <label>{t('timeframe', 'Timeframe')}:</label>
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            <option value="7">{t('lastWeek', 'Last 7 days')}</option>
            <option value="30">{t('lastMonth', 'Last 30 days')}</option>
            <option value="90">{t('last3Months', 'Last 3 months')}</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="overview-grid">
        <div className="overview-card">
          <div className="card-icon">📝</div>
          <div className="card-content">
            <h3>{insights?.metadata?.dataPointsAnalyzed?.journalEntries || 0}</h3>
            <p>{t('journalEntries', 'Journal Entries')}</p>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="card-icon">🎯</div>
          <div className="card-content">
            <h3>{insights?.metadata?.dataPointsAnalyzed?.addictionData || 0}</h3>
            <p>{t('activeRecovery', 'Tracked Addictions')}</p>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="card-icon">💪</div>
          <div className="card-content">
            <h3>{insights?.categories?.recovery_progress?.overallRecoveryHealth?.score || 0}</h3>
            <p>{t('recoveryScore', 'Recovery Score')}</p>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="card-icon">{getTrendIcon(insights?.categories?.recovery_progress?.overallRecoveryHealth?.trend)}</div>
          <div className="card-content">
            <h3>{insights?.categories?.recovery_progress?.overallRecoveryHealth?.trend || 'stable'}</h3>
            <p>{t('trend', 'Trend')}</p>
          </div>
        </div>
      </div>

      {/* Recovery Progress */}
      {insights?.categories?.recovery_progress && (
        <div className="recovery-section">
          <h3>🎯 {t('recoveryProgress', 'Recovery Progress')}</h3>
          
          {/* Overall Health */}
          {insights.categories.recovery_progress.overallRecoveryHealth && (
            <div className="overall-health-card">
              <div className="health-header">
                <div className="health-score">
                  <span className="score-number" 
                        style={{ color: getRiskColor(insights.categories.recovery_progress.overallRecoveryHealth.score > 70 ? 'low' : 'medium') }}>
                    {insights.categories.recovery_progress.overallRecoveryHealth.score}
                  </span>
                  <span className="score-label">/100</span>
                </div>
                <div className="health-trend">
                  <span className="trend-icon">{getTrendIcon(insights.categories.recovery_progress.overallRecoveryHealth.trend)}</span>
                  <span className="trend-text">{insights.categories.recovery_progress.overallRecoveryHealth.trend}</span>
                </div>
              </div>
              <p className="health-summary">{insights.categories.recovery_progress.overallRecoveryHealth.summary}</p>
            </div>
          )}

          {/* Addiction Breakdown */}
          {insights.categories.recovery_progress.addictionBreakdown?.length > 0 && (
            <div className="addictions-section">
              <h4>{t('addictionBreakdown', 'Addiction Progress')}</h4>
              <div className="addictions-grid">
                {insights.categories.recovery_progress.addictionBreakdown.map((addiction, index) => (
                  <div key={index} className="addiction-card">
                    <div className="addiction-header">
                      <div className="addiction-type">
                        <span className="addiction-icon">
                          {addiction.type === 'gambling' ? '🎰' :
                           addiction.type === 'alcohol' ? '🍺' :
                           addiction.type === 'smoking' ? '🚬' :
                           addiction.type === 'social_media' ? '📱' :
                           addiction.type === 'shopping' ? '🛍️' : '⚪'}
                        </span>
                        <span className="addiction-name">{addiction.type}</span>
                      </div>
                      <div className="risk-badge" style={{ backgroundColor: getRiskColor(addiction.riskLevel) }}>
                        {addiction.riskLevel}
                      </div>
                    </div>
                    
                    <div className="addiction-stats">
                      <div className="stat">
                        <span className="stat-label">{t('daysClean', 'Days Clean')}</span>
                        <span className="stat-value">{addiction.daysClean}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">{t('status', 'Status')}</span>
                        <span className="stat-value">{addiction.status}</span>
                      </div>
                    </div>
                    
                    <div className="addiction-details">
                      <p className="trigger-info">
                        <strong>{t('triggers', 'Triggers')}:</strong> {addiction.triggerFrequency}
                      </p>
                      <p className="progress-summary">{addiction.progressSummary}</p>
                      
                      {addiction.recommendations?.length > 0 && (
                        <div className="recommendations">
                          <strong>{t('recommendations', 'Recommendations')}:</strong>
                          <ul>
                            {addiction.recommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trigger Insights */}
          {insights.categories.recovery_progress.triggerInsights && (
            <div className="triggers-section">
              <h4>⚠️ {t('triggerInsights', 'Trigger Analysis')}</h4>
              
              <div className="triggers-grid">
                {insights.categories.recovery_progress.triggerInsights.mostCommonTriggers?.length > 0 && (
                  <div className="trigger-card">
                    <h5>{t('commonTriggers', 'Most Common Triggers')}</h5>
                    <div className="trigger-tags">
                      {insights.categories.recovery_progress.triggerInsights.mostCommonTriggers.map((trigger, index) => (
                        <span key={index} className="trigger-tag">{trigger}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {insights.categories.recovery_progress.triggerInsights.triggerMoodCorrelation && (
                  <div className="trigger-card">
                    <h5>{t('moodCorrelation', 'Mood Correlation')}</h5>
                    <p>{insights.categories.recovery_progress.triggerInsights.triggerMoodCorrelation}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Key Highlights */}
      {insights?.overview && (
        <div className="highlights-section">
          <h3>✨ {t('keyHighlights', 'Key Highlights')}</h3>
          <div className="highlight-card">
            <p className="highlight-text">{insights.overview.keyHighlight}</p>
            <p className="progress-summary">{insights.overview.progressSummary}</p>
            {insights.overview.nextFocus && (
              <div className="next-focus">
                <strong>{t('nextFocus', 'Next Focus')}:</strong> {insights.overview.nextFocus}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .progress-dashboard {
          padding: var(--space-lg);
          min-height: 100vh;
          max-width: 414px;
          margin: 0 auto;
        }

        .insights-header {
          text-align: center;
          margin-bottom: var(--space-2xl);
          background: var(--glass-light);
          padding: var(--space-xl);
          border-radius: var(--radius-xl);
          backdrop-filter: blur(15px);
          border: 1px solid var(--glass-medium);
        }

        .insights-header h2 {
          margin: 0 0 var(--space-sm) 0;
          color: var(--text-primary);
          font-size: var(--text-2xl);
          font-weight: 600;
        }

        .insights-header p {
          color: var(--text-secondary);
          margin: 0 0 var(--space-lg) 0;
          font-size: var(--text-base);
        }

        .timeframe-selector {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
        }

        .timeframe-selector label {
          color: var(--text-secondary);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .timeframe-selector select {
          padding: var(--space-sm) var(--space-md);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: var(--radius-md);
          background: var(--glass-medium);
          color: var(--text-primary);
          font-size: var(--text-sm);
          backdrop-filter: blur(10px);
          transition: all var(--duration-normal) var(--easing-smooth);
        }

        .timeframe-selector select:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.3);
          background: var(--glass-light);
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-md);
          margin-bottom: var(--space-2xl);
        }

        .overview-card {
          background: var(--glass-light);
          padding: var(--space-lg);
          border-radius: var(--radius-lg);
          backdrop-filter: blur(15px);
          border: 1px solid var(--glass-medium);
          transition: all var(--duration-normal) var(--easing-smooth);
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .overview-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
          border-color: var(--glass-light);
        }

        .card-icon {
          font-size: var(--text-xl);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--glass-medium);
          border-radius: var(--radius-sm);
          flex-shrink: 0;
        }

        .card-content h3 {
          margin: 0;
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }

        .card-content p {
          margin: 4px 0 0 0;
          color: var(--text-secondary);
          font-size: var(--text-xs);
          line-height: 1.2;
        }

        .recovery-section {
          background: var(--glass-light);
          padding: var(--space-xl);
          border-radius: var(--radius-xl);
          backdrop-filter: blur(15px);
          border: 1px solid var(--glass-medium);
          margin-bottom: var(--space-xl);
        }

        .recovery-section h3 {
          margin: 0 0 var(--space-lg) 0;
          color: var(--text-primary);
          font-size: var(--text-lg);
          font-weight: 600;
        }

        .overall-health-card {
          background: var(--glass-medium);
          padding: var(--space-lg);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-xl);
          backdrop-filter: blur(10px);
        }

        .health-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-sm);
        }

        .health-score {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .score-number {
          font-size: var(--text-3xl);
          font-weight: 700;
          color: var(--text-primary);
        }

        .score-label {
          font-size: var(--text-lg);
          color: var(--text-secondary);
        }

        .health-trend {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: var(--text-sm);
          color: var(--text-secondary);
          background: var(--glass-light);
          padding: var(--space-xs) var(--space-sm);
          border-radius: var(--radius-sm);
        }

        .health-summary {
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
          font-size: var(--text-sm);
        }

        .addictions-section h4 {
          margin: 0 0 var(--space-lg) 0;
          color: var(--text-primary);
          font-size: var(--text-base);
          font-weight: 600;
        }

        .addictions-grid {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .addiction-card {
          border: 1px solid var(--glass-medium);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          background: var(--glass-medium);
          backdrop-filter: blur(10px);
          transition: all var(--duration-normal) var(--easing-smooth);
        }

        .addiction-card:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
          border-color: var(--glass-light);
        }

        .addiction-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-md);
        }

        .addiction-type {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
        }

        .addiction-icon {
          font-size: var(--text-lg);
        }

        .addiction-name {
          font-weight: 600;
          text-transform: capitalize;
          color: var(--text-primary);
          font-size: var(--text-base);
        }

        .risk-badge {
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          color: white;
          font-size: var(--text-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .addiction-stats {
          display: flex;
          gap: var(--space-lg);
          margin-bottom: var(--space-md);
          padding-bottom: var(--space-md);
          border-bottom: 1px solid var(--glass-light);
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .stat-label {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
        }

        .stat-value {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--text-primary);
        }

        .addiction-details p {
          margin: var(--space-xs) 0;
          color: var(--text-secondary);
          line-height: 1.4;
          font-size: var(--text-sm);
        }

        .recommendations {
          margin-top: var(--space-sm);
          padding-top: var(--space-sm);
          border-top: 1px solid var(--glass-light);
        }

        .recommendations ul {
          margin: var(--space-xs) 0 0 0;
          padding-left: var(--space-lg);
        }

        .recommendations li {
          color: var(--text-secondary);
          margin-bottom: 4px;
          font-size: var(--text-sm);
        }

        .triggers-section {
          margin-top: var(--space-xl);
        }

        .triggers-section h4 {
          margin: 0 0 var(--space-lg) 0;
          color: var(--text-primary);
          font-size: var(--text-base);
          font-weight: 600;
        }

        .triggers-grid {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .trigger-card {
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          backdrop-filter: blur(10px);
        }

        .trigger-card h5 {
          margin: 0 0 var(--space-sm) 0;
          color: #f59e0b;
          font-size: var(--text-sm);
          font-weight: 600;
        }

        .trigger-card p {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--text-sm);
          line-height: 1.4;
        }

        .trigger-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-xs);
        }

        .trigger-tag {
          background: #f59e0b;
          color: white;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: 500;
        }

        .highlights-section {
          background: var(--glass-light);
          padding: var(--space-xl);
          border-radius: var(--radius-xl);
          backdrop-filter: blur(15px);
          border: 1px solid var(--glass-medium);
        }

        .highlights-section h3 {
          margin: 0 0 var(--space-lg) 0;
          color: var(--text-primary);
          font-size: var(--text-lg);
          font-weight: 600;
        }

        .highlight-card {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: var(--radius-md);
          padding: var(--space-lg);
          backdrop-filter: blur(10px);
        }

        .highlight-text {
          font-size: var(--text-base);
          font-weight: 600;
          color: #10b981;
          margin: 0 0 var(--space-xs) 0;
        }

        .progress-summary {
          color: var(--text-secondary);
          margin: 0 0 var(--space-sm) 0;
          font-size: var(--text-sm);
          line-height: 1.4;
        }

        .next-focus {
          color: #10b981;
          font-weight: 500;
          font-size: var(--text-sm);
        }

        .loading-container, .error-container, .no-data-container {
          text-align: center;
          padding: var(--space-5xl) var(--space-lg);
          color: var(--text-primary);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--glass-light);
          border-top: 3px solid var(--text-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto var(--space-lg);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .retry-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: var(--space-sm) var(--space-lg);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 600;
          font-size: var(--text-sm);
          transition: all var(--duration-normal) var(--easing-smooth);
        }

        .retry-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        @media (max-width: 768px) {
          .progress-dashboard {
            padding: var(--space-md);
          }

          .overview-grid {
            grid-template-columns: 1fr;
            gap: var(--space-sm);
          }

          .overview-card {
            padding: var(--space-md);
            gap: var(--space-sm);
          }

          .card-content h3 {
            font-size: var(--text-lg);
          }

          .card-content p {
            font-size: 11px;
          }

          .addiction-stats {
            gap: var(--space-md);
          }
        }
      `}</style>
    </div>
  );
};

export default ProgressDashboard;