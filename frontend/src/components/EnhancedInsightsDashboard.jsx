import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';
import './EnhancedInsightsDashboard.css';

const EnhancedInsightsDashboard = ({ user }) => {
  const { t } = useTranslation();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    loadEnhancedInsights();
  }, [user.id]);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoadingProgress(prev => {
          if (prev < 10) return 10;
          if (prev < 25) return 25;
          if (prev < 40) return 40;
          if (prev < 60) return 60;
          if (prev < 80) return 80;
          if (prev < 95) return 95;
          return prev;
        });
      }, 2000); // Slower progression for 30+ second AI analysis
      return () => clearTimeout(timer);
    }
  }, [loading, loadingProgress]);

  const loadEnhancedInsights = async () => {
    try {
      setLoading(true);
      setLoadingProgress(0);
      setError(null);
      
      console.log('Loading enhanced insights for user:', user.id);
      
      const response = await axios.get(
        getFullUrl(`/api/ai-coach/enhanced-insights/${user.id}`),
        {
          params: {
            timeframe: 30,
            language: localStorage.getItem('preferredLanguage') || 'en'
          },
          timeout: 30000 // 30 second timeout for complex AI analysis
        }
      );

      console.log('Enhanced insights response:', response.data);

      if (response.data.success) {
        setLoadingProgress(100);
        setTimeout(() => {
          setInsights(response.data.insights);
          setLoading(false);
        }, 500);
      } else {
        throw new Error(response.data.message || 'Failed to load insights');
      }
    } catch (err) {
      console.error('Failed to load enhanced insights:', err);
      
      // If timeout or connection error, show mock data
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout') || !err.response) {
        console.log('API timeout - showing demo data');
        setLoadingProgress(100);
        setTimeout(() => {
          setInsights({
            summary: {
              title: "🔌 Offline Mode - Demo Insights",
              description: "⚠️ Verbinding met server mislukt. Dit zijn voorbeeldgegevens om de interface te demonstreren.",
              period: "Laatste 30 dagen (Demo Data)"
            },
            metrics: {
              totalMeditations: 42,
              totalMinutes: 630,
              averageDuration: 15,
              favoriteType: "Focus",
              streakDays: 7
            },
            trends: [
              { label: "Meditaties deze week", value: 12, change: "+20%" },
              { label: "Gemiddelde sessieduur", value: "15 min", change: "+3 min" },
              { label: "Welzijnsscore", value: "8.2/10", change: "+0.5" }
            ],
            recommendations: [
              "Probeer 's ochtends te mediteren voor betere focus",
              "Je stressmeditaties zijn zeer effectief geweest",
              "Overweeg langere sessies in het weekend"
            ]
          });
          setLoading(false);
          setError(null);
        }, 500);
      } else {
        const errorMessage = err.response?.data?.message || err.message || t('failedToLoadInsights', 'Failed to load insights');
        setError(errorMessage);
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="enhanced-insights-dashboard">
        <div className="insights-loading">
          <div className="brain-emoji">🧠</div>
          <div className="simple-progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="progress-text">{loadingProgress}%</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enhanced-insights-dashboard">
        <div className="error-container">
          <p>{error}</p>
          <button onClick={loadEnhancedInsights} className="retry-button">
            {t('retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="enhanced-insights-dashboard">
        <div className="no-insights">
          <p>{t('noInsightsAvailable', 'No insights available yet')}</p>
        </div>
      </div>
    );
  }

  // Simple render for mock data
  const renderSimpleInsights = () => {
    if (!insights) return null;
    
    return (
      <div className="simple-insights">
        {insights.summary && (
          <div className="insight-header">
            <h2>{insights.summary.title}</h2>
            <p className="description">{insights.summary.description}</p>
            <p className="period">{insights.summary.period}</p>
          </div>
        )}
        
        {insights.metrics && (
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-icon">🧘</span>
              <span className="metric-value">{insights.metrics.totalMeditations}</span>
              <span className="metric-label">Meditaties</span>
            </div>
            <div className="metric-card">
              <span className="metric-icon">⏱️</span>
              <span className="metric-value">{insights.metrics.totalMinutes}</span>
              <span className="metric-label">Minuten</span>
            </div>
            <div className="metric-card">
              <span className="metric-icon">⏳</span>
              <span className="metric-value">{insights.metrics.averageDuration} min</span>
              <span className="metric-label">Gem. Duur</span>
            </div>
            <div className="metric-card">
              <span className="metric-icon">🔥</span>
              <span className="metric-value">{insights.metrics.streakDays}</span>
              <span className="metric-label">Dagen Streak</span>
            </div>
          </div>
        )}
        
        {insights.trends && insights.trends.length > 0 && (
          <div className="trends-section">
            <h3>📊 Trends</h3>
            <div className="trends-list">
              {insights.trends.map((trend, idx) => (
                <div key={idx} className="trend-item">
                  <span className="trend-label">{trend.label}</span>
                  <span className="trend-value">{trend.value}</span>
                  <span className={`trend-change ${trend.change.startsWith('+') ? 'positive' : 'negative'}`}>
                    {trend.change}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {insights.recommendations && insights.recommendations.length > 0 && (
          <div className="recommendations-section">
            <h3>💡 Aanbevelingen</h3>
            <ul className="recommendations-list">
              {insights.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
  
  // Render insights sections
  const renderWellnessTrends = () => {
    const trends = insights.categories?.wellness_trends;
    if (!trends) return null;

    return (
      <div className="insight-section wellness-trends">
        <h3>📈 {t('wellnessTrends', 'Wellness Trends')}</h3>
        
        {trends.moodStability && (
          <div className="mood-stability">
            <h4>{t('moodStability', 'Mood Stability')}</h4>
            <div className="metric-row">
              <span className="metric-label">{t('trend', 'Trend')}:</span>
              <span className={`metric-value trend-${trends.moodStability.trend}`}>
                {trends.moodStability.trend === 'improving' ? '📈' : 
                 trends.moodStability.trend === 'declining' ? '📉' : '➡️'} 
                {t(trends.moodStability.trend, trends.moodStability.trend)}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">{t('volatilityScore', 'Volatility')}:</span>
              <span className="metric-value">{trends.moodStability.volatilityScore}%</span>
            </div>
            {trends.moodStability.insights && (
              <ul className="insights-list">
                {trends.moodStability.insights.map((insight, idx) => (
                  <li key={idx}>{insight}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {trends.consistencyPatterns && (
          <div className="consistency-patterns">
            <h4>{t('consistencyPatterns', 'Consistency Patterns')}</h4>
            {trends.consistencyPatterns.journalingStreak && (
              <p>🔥 {t('journalingStreak', 'Journaling Streak')}: {trends.consistencyPatterns.journalingStreak} {t('days', 'days')}</p>
            )}
            {trends.consistencyPatterns.recommendations && (
              <ul className="recommendations">
                {trends.consistencyPatterns.recommendations.map((rec, idx) => (
                  <li key={idx}>💡 {rec}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderRecoveryProgress = () => {
    const recovery = insights.categories?.recovery_progress;
    if (!recovery) return null;

    return (
      <div className="insight-section recovery-progress">
        <h3>🎯 {t('recoveryProgress', 'Recovery Progress')}</h3>
        
        {recovery.overallRecoveryHealth && (
          <div className="overall-health">
            <div className="health-score">
              <span className="score-label">{t('healthScore', 'Health Score')}:</span>
              <span className={`score-value score-${recovery.overallRecoveryHealth.score >= 70 ? 'good' : recovery.overallRecoveryHealth.score >= 40 ? 'medium' : 'low'}`}>
                {recovery.overallRecoveryHealth.score}/100
              </span>
            </div>
            <p className="health-summary">{recovery.overallRecoveryHealth.summary}</p>
          </div>
        )}

        {recovery.addictionBreakdown && recovery.addictionBreakdown.length > 0 && (
          <div className="addiction-breakdown">
            <h4>{t('addictionDetails', 'Addiction Details')}</h4>
            {recovery.addictionBreakdown.map((addiction, idx) => (
              <div key={idx} className="addiction-item">
                <h5>{addiction.type}</h5>
                <div className="addiction-metrics">
                  <span className={`risk-level risk-${addiction.riskLevel}`}>
                    {t('risk', 'Risk')}: {t(addiction.riskLevel, addiction.riskLevel)}
                  </span>
                  <span className="days-clean">
                    {addiction.daysClean} {t('daysClean', 'days clean')}
                  </span>
                </div>
                <p className="progress-summary">{addiction.progressSummary}</p>
              </div>
            ))}
          </div>
        )}

        {recovery.triggerInsights && (
          <div className="trigger-insights">
            <h4>{t('triggerInsights', 'Trigger Insights')}</h4>
            {recovery.triggerInsights.mostCommonTriggers && recovery.triggerInsights.mostCommonTriggers.length > 0 && (
              <div className="common-triggers">
                <p>{t('commonTriggers', 'Common Triggers')}:</p>
                <div className="trigger-tags">
                  {recovery.triggerInsights.mostCommonTriggers.map((trigger, idx) => (
                    <span key={idx} className="trigger-tag">⚠️ {trigger}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPredictions = () => {
    if (!insights.predictions) return null;

    const { riskAssessment, opportunities } = insights.predictions;

    return (
      <div className="insight-section predictions">
        <h3>🔮 {t('predictions', 'Predictions & Alerts')}</h3>
        
        {riskAssessment && (
          <div className="risk-assessment">
            <h4>{t('riskAssessment', 'Risk Assessment')}</h4>
            <div className={`overall-risk risk-${riskAssessment.overallRiskLevel}`}>
              {t('overallRisk', 'Overall Risk')}: {t(riskAssessment.overallRiskLevel, riskAssessment.overallRiskLevel)}
            </div>
            
            {riskAssessment.addictionRelapseRisk && (
              <div className="relapse-risk">
                <p className={`risk-level-${riskAssessment.addictionRelapseRisk.level}`}>
                  {t('relapseRisk', 'Relapse Risk')}: {t(riskAssessment.addictionRelapseRisk.level, riskAssessment.addictionRelapseRisk.level)}
                </p>
                {riskAssessment.addictionRelapseRisk.riskFactors && (
                  <ul className="risk-factors">
                    {riskAssessment.addictionRelapseRisk.riskFactors.map((factor, idx) => (
                      <li key={idx}>⚠️ {factor}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {opportunities && (
          <div className="opportunities">
            <h4>{t('opportunities', 'Growth Opportunities')}</h4>
            {opportunities.growth_opportunities && (
              <ul className="opportunity-list">
                {opportunities.growth_opportunities.map((opp, idx) => (
                  <li key={idx}>✨ {opp}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderActionPlan = () => {
    if (!insights.actionPlan) return null;

    const { immediateActions, weeklyGoals, personalized_mantras } = insights.actionPlan;

    return (
      <div className="insight-section action-plan">
        <h3>📋 {t('actionPlan', 'Your Action Plan')}</h3>
        
        {immediateActions && immediateActions.length > 0 && (
          <div className="immediate-actions">
            <h4>{t('immediateActions', 'Immediate Actions')}</h4>
            {immediateActions.map((action, idx) => (
              <div key={idx} className={`action-item priority-${action.priority}`}>
                <span className="action-priority">{action.priority === 'high' ? '🔴' : action.priority === 'medium' ? '🟡' : '🟢'}</span>
                <span className="action-text">{action.action}</span>
                <span className="action-timeframe">({action.timeframe})</span>
              </div>
            ))}
          </div>
        )}

        {weeklyGoals && weeklyGoals.length > 0 && (
          <div className="weekly-goals">
            <h4>{t('weeklyGoals', 'Weekly Goals')}</h4>
            {weeklyGoals.map((goal, idx) => (
              <div key={idx} className="goal-item">
                <p className="goal-text">🎯 {goal.goal}</p>
                {goal.daily_habits && (
                  <div className="daily-habits">
                    {goal.daily_habits.map((habit, hidx) => (
                      <span key={hidx} className="habit-tag">📅 {habit}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {personalized_mantras && personalized_mantras.length > 0 && (
          <div className="mantras">
            <h4>{t('personalMantras', 'Your Personal Mantras')}</h4>
            {personalized_mantras.map((mantra, idx) => (
              <div key={idx} className="mantra-item">
                💭 "{mantra}"
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="enhanced-insights-dashboard">
      <div className="insights-header">
        <h2>🧠 {t('enhancedInsights', 'Enhanced Insights')}</h2>
        <button onClick={loadEnhancedInsights} className="refresh-button" style={{padding: '8px 16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>
          🔄 {t('refresh', 'Refresh')}
        </button>
      </div>

      <div className="insights-content">
        {/* Use simple insights renderer for mock data */}
        {renderSimpleInsights()}
      </div>

      {insights.metadata && (
        <div className="insights-footer">
          <p className="metadata">
            {t('analyzed', 'Analyzed')} {insights.metadata.dataPointsAnalyzed?.journalEntries || 0} {t('journalEntries', 'journal entries')}, 
            {' '}{insights.metadata.dataPointsAnalyzed?.coachSessions || 0} {t('coachSessions', 'coach sessions')}
          </p>
          <p className="generated-at">
            {t('generatedAt', 'Generated at')}: {new Date(insights.metadata.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default EnhancedInsightsDashboard;