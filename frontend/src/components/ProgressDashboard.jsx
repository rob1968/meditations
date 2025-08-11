import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';

const ProgressDashboard = ({ user, onStartCoaching }) => {
  const { t } = useTranslation();
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('30');

  useEffect(() => {
    if (user) {
      fetchInsights();
    }
  }, [user, timeframe]);

  // Auto-hide error messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchInsights = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await axios.get(getFullUrl(`/api/ai-coach/insights/${user.id}?timeframe=${timeframe}`));
      
      if (response.data.success) {
        // Store both insights and metadata
        const insightsData = {
          ...response.data.insights,
          metadata: response.data.metadata
        };
        setInsights(insightsData);
      } else {
        setError(t('failedToLoadInsights', 'Failed to load insights'));
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
      setError(t('failedToLoadProgressInsights', 'Failed to load progress insights'));
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressColor = (progress) => {
    switch (progress) {
      case 'improving': return '#10b981';
      case 'stable': return '#f59e0b';
      case 'concerning': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatCleanDays = (cleanDays) => {
    if (!cleanDays || Object.keys(cleanDays).length === 0) {
      return t('noActiveRecoveryTracking', 'No active recovery tracking');
    }
    
    return Object.entries(cleanDays).map(([addiction, days]) => (
      <div key={addiction} className="clean-days-item">
        <span className="addiction-type">{addiction}</span>
        <span className="days-count">{days} {t('days', 'days')}</span>
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="progress-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t('loading', 'Loading')} {t('progressInsights', 'Progress Insights')}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="progress-dashboard error">
        <div className="error-message">
          <h3>😔 {t('errorLoadingInsights', 'Error Loading Insights')}</h3>
          <p>{error}</p>
          <button onClick={fetchInsights} className="retry-btn">
            🔄 {t('tryAgain', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="progress-dashboard no-data">
        <div className="no-data-message">
          <h3>📊 {t('noInsightsYet', 'No Insights Yet')}</h3>
          <p>{t('startJournalingForInsights', 'Start journaling to see your progress insights!')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="progress-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-title">
          <h2>📊 {t('progressInsights', 'Progress Insights')}</h2>
          <p className="timeframe-info">
            {t('last', 'Last')} {insights.metadata?.timeframe || timeframe} {t('days', 'days')}
          </p>
        </div>
        
        <div className="timeframe-selector">
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="timeframe-select"
          >
            <option value="7">7 {t('days', 'days')}</option>
            <option value="30">30 {t('days', 'days')}</option>
            <option value="90">90 {t('days', 'days')}</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="overview-grid">
        <div className="overview-card">
          <div className="card-icon">📝</div>
          <div className="card-content">
            <h3>{insights.metadata?.journalEntriesCount || 0}</h3>
            <p>{t('journalEntries', 'Journal Entries')}</p>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="card-icon">💬</div>
          <div className="card-content">
            <h3>{insights.metadata?.coachSessionsCount || 0}</h3>
            <p>{t('coachSessions', 'Coach Sessions')}</p>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="card-icon">🎯</div>
          <div className="card-content">
            <h3>{insights.metadata?.addictionsCount || 0}</h3>
            <p>{t('activeRecovery', 'Active Recovery')}</p>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="card-icon">🔥</div>
          <div className="card-content">
            <h3>{insights.engagementMetrics.currentJournalStreak}</h3>
            <p>{t('dayStreak', 'Day Streak')}</p>
          </div>
        </div>
      </div>

      {/* Progress Status */}
      <div className="progress-status-card">
        <div className="status-header">
          <h3>🎯 {t('overallProgress', 'Overall Progress')}</h3>
          <div 
            className="progress-indicator"
            style={{ color: getProgressColor(insights.aiInsights.overallProgress) }}
          >
            {insights.aiInsights.overallProgress}
          </div>
        </div>
        
        <div className="motivational-message">
          <p>"{insights.aiInsights.motivationalMessage}"</p>
        </div>
      </div>

      {/* Mood Analysis */}
      <div className="analysis-card">
        <div className="card-header">
          <h3>{getTrendIcon(insights.moodAnalysis.trend)} {t('moodAnalysis', 'Mood Analysis')}</h3>
          <div className="trend-indicator">
            {insights.moodAnalysis.trend}
          </div>
        </div>
        
        <div className="mood-metrics">
          <div className="metric">
            <span className="metric-label">{t('averageScore', 'Average Score')}</span>
            <span className="metric-value">{insights.moodAnalysis.averageScore}/10</span>
          </div>
          
          <div className="metric">
            <span className="metric-label">{t('mostCommonMood', 'Most Common')}</span>
            <span className="metric-value">{insights.moodAnalysis.mostCommonMood}</span>
          </div>
          
          <div className="metric">
            <span className="metric-label">{t('improvement', 'Improvement')}</span>
            <span className={`metric-value ${insights.moodAnalysis.improvement >= 0 ? 'positive' : 'negative'}`}>
              {insights.moodAnalysis.improvement >= 0 ? '+' : ''}{insights.moodAnalysis.improvement}
            </span>
          </div>
        </div>
      </div>

      {/* Trigger Analysis */}
      <div className="analysis-card">
        <div className="card-header">
          <h3>⚠️ {t('triggerAnalysis', 'Trigger Analysis')}</h3>
        </div>
        
        <div className="trigger-metrics">
          <div className="trigger-counts">
            <div className="trigger-count high-risk">
              <span className="count">{insights.triggerAnalysis.highRiskCount}</span>
              <span className="label">{t('highRisk', 'High Risk')}</span>
            </div>
            
            <div className="trigger-count medium-risk">
              <span className="count">{insights.triggerAnalysis.mediumRiskCount}</span>
              <span className="label">{t('mediumRisk', 'Medium Risk')}</span>
            </div>
            
            <div className="trigger-count low-risk">
              <span className="count">{insights.triggerAnalysis.lowRiskCount}</span>
              <span className="label">{t('lowRisk', 'Low Risk')}</span>
            </div>
          </div>
          
          {insights.triggerAnalysis.mostCommonTrigger !== 'none' && (
            <div className="common-trigger">
              <span className="label">{t('mostCommonTrigger', 'Most Common')}:</span>
              <span className="value">{insights.triggerAnalysis.mostCommonTrigger}</span>
            </div>
          )}
        </div>
      </div>

      {/* Recovery Progress */}
      <div className="analysis-card">
        <div className="card-header">
          <h3>🌱 {t('recoveryProgress', 'Recovery Progress')}</h3>
        </div>
        
        <div className="recovery-metrics">
          {insights.recoveryProgress.longestStreak > 0 && (
            <div className="metric">
              <span className="metric-label">{t('longestStreak', 'Longest Streak')}</span>
              <span className="metric-value">{insights.recoveryProgress.longestStreak} {t('days', 'days')}</span>
            </div>
          )}
          
          <div className="clean-days-section">
            <h4>{t('cleanDays', 'Clean Days')}</h4>
            <div className="clean-days-list">
              {formatCleanDays(insights.recoveryProgress.cleanDays)}
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="insights-card">
        <div className="card-header">
          <h3>💡 {t('keyInsights', 'Key Insights')}</h3>
        </div>
        
        <div className="insights-list">
          {insights.aiInsights.keyInsights.map((insight, index) => (
            <div key={index} className="insight-item">
              <span className="insight-bullet">•</span>
              <span className="insight-text">{insight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="strengths-improvements-grid">
        <div className="strengths-card">
          <div className="card-header">
            <h3>💪 {t('strengths', 'Strengths')}</h3>
          </div>
          
          <div className="items-list">
            {insights.aiInsights.strengths.map((strength, index) => (
              <div key={index} className="strength-item">
                <span className="item-icon">✅</span>
                <span className="item-text">{strength}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="improvements-card">
          <div className="card-header">
            <h3>🎯 {t('areasForImprovement', 'Areas for Improvement')}</h3>
          </div>
          
          <div className="items-list">
            {insights.aiInsights.areasForImprovement.map((area, index) => (
              <div key={index} className="improvement-item">
                <span className="item-icon">🔧</span>
                <span className="item-text">{area}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="recommendations-card">
        <div className="card-header">
          <h3>📋 {t('recommendations', 'Recommendations')}</h3>
        </div>
        
        <div className="recommendations-list">
          {insights.recommendations.map((rec, index) => (
            <div key={index} className="recommendation-item">
              <div 
                className="priority-indicator"
                style={{ backgroundColor: getPriorityColor(rec.priority) }}
              ></div>
              
              <div className="recommendation-content">
                <h4>{rec.title}</h4>
                <p>{rec.description}</p>
                <button 
                  className="action-button"
                  onClick={() => {
                    if (rec.action.includes('Alex') || rec.action.includes('coach')) {
                      onStartCoaching();
                    }
                  }}
                >
                  {rec.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div className="next-steps-card">
        <div className="card-header">
          <h3>🚀 {t('nextSteps', 'Next Steps')}</h3>
        </div>
        
        <div className="next-steps-list">
          {insights.aiInsights.nextSteps.map((step, index) => (
            <div key={index} className="next-step-item">
              <span className="step-number">{index + 1}</span>
              <span className="step-text">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <button 
          className="talk-to-alex-btn"
          onClick={onStartCoaching}
        >
          💬 {t('talkToAlex', 'Talk to Alex')}
        </button>
        
        <p className="last-updated">
          {t('lastUpdated', 'Last updated')}: {new Date(insights.generatedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default ProgressDashboard;