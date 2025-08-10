import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';

const SimpleProgressDashboard = ({ user }) => {
  const { t } = useTranslation();
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('30');

  // Dark theme styles
  const dashboardStyles = {
    container: {
      maxWidth: '100%',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      color: '#ffffff',
      background: 'transparent'
    },
    card: {
      background: 'rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '24px',
      backdropFilter: 'blur(15px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
    },
    innerCard: {
      background: 'rgba(255, 255, 255, 0.06)',
      borderRadius: '12px',
      padding: '16px',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      marginBottom: '12px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#ffffff',
      margin: 0
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchInsights();
    }
  }, [user?.id, timeframe]);

  const fetchInsights = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await axios.get(getFullUrl(`/api/ai-coach/insights/${user.id}?timeframe=${timeframe}`));
      
      if (response.data.success) {
        setInsights(response.data.insights);
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
      case 'positive': return '#10b981';
      case 'neutral': return '#f59e0b';
      case 'concerning': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'stable': return '📊';  
      case 'declining': return '📉';
      default: return '📊';
    }
  };

  if (isLoading) {
    return (
      <div style={dashboardStyles.container}>
        <div style={{
          ...dashboardStyles.card,
          textAlign: 'center',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#ffffff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#ffffff', margin: 0 }}>
              🧠 {t('analyzingProgress', 'Analyzing Your Progress')}
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', lineHeight: '1.5', margin: 0 }}>
              {t('loadingInsights', 'Loading your insights...')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={dashboardStyles.container}>
        <div style={{
          ...dashboardStyles.card,
          textAlign: 'center',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontSize: '48px', filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))' }}>😔</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#ffffff', margin: 0 }}>
              {t('errorLoadingInsights', 'Error Loading Insights')}
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', lineHeight: '1.5', margin: 0 }}>
              {error}
            </p>
            <button onClick={fetchInsights} style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>🔄</span>
              {t('tryAgain', 'Try Again')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div style={dashboardStyles.container}>
        <div style={{
          ...dashboardStyles.card,
          textAlign: 'center',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontSize: '48px', filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))' }}>📊</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#ffffff', margin: 0 }}>
              {t('noInsightsYet', 'No Insights Yet')}
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', lineHeight: '1.5', margin: 0 }}>
              {t('startJournalingForInsights', 'Start journaling to see your progress insights!')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={dashboardStyles.container}>
      {/* Header Card */}
      <div style={dashboardStyles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#ffffff', margin: '0 0 8px 0' }}>
              📊 {t('progressInsights', 'Progress Insights')}
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', margin: 0 }}>
              {t('last', 'Last')} {timeframe} {t('days', 'days')}
            </p>
          </div>
          
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '12px',
              color: '#ffffff',
              padding: '12px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              minWidth: '120px'
            }}
          >
            <option value="7" style={{ background: '#1a2332', color: 'white' }}>7 {t('days', 'days')}</option>
            <option value="30" style={{ background: '#1a2332', color: 'white' }}>30 {t('days', 'days')}</option>
            <option value="90" style={{ background: '#1a2332', color: 'white' }}>90 {t('days', 'days')}</option>
          </select>
        </div>
      </div>

      {/* Overall Progress Card */}
      <div style={dashboardStyles.card}>
        <div style={dashboardStyles.header}>
          <div style={{ fontSize: '20px' }}>🎯</div>
          <h3 style={dashboardStyles.title}>{t('overallProgress', 'Overall Progress')}</h3>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ 
            fontSize: '24px',
            fontWeight: '700',
            padding: '20px 24px',
            borderRadius: '16px',
            textTransform: 'capitalize',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: getProgressColor(insights.overallProgress),
            background: `linear-gradient(135deg, ${getProgressColor(insights.overallProgress)}20, ${getProgressColor(insights.overallProgress)}10)`
          }}>
            {insights.overallProgress}
          </div>
        </div>
      </div>

      {/* Key Insights Card */}
      <div style={dashboardStyles.card}>
        <div style={dashboardStyles.header}>
          <div style={{ fontSize: '20px' }}>💡</div>
          <h3 style={dashboardStyles.title}>{t('keyInsights', 'Key Insights')}</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {insights.keyInsights && insights.keyInsights.map((insight, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              ...dashboardStyles.innerCard
            }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '18px', fontWeight: 'bold', minWidth: '12px', marginTop: '2px' }}>•</div>
              <p style={{ color: '#ffffff', fontSize: '16px', lineHeight: '1.5', margin: 0 }}>{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mood Trends Card */}
      {insights.moodTrends && (
        <div style={dashboardStyles.card}>
          <div style={dashboardStyles.header}>
            <div style={{ fontSize: '20px' }}>{getTrendIcon(insights.moodTrends.trend)}</div>
            <h3 style={dashboardStyles.title}>{t('moodTrends', 'Mood Trends')}</h3>
          </div>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={dashboardStyles.innerCard}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('primaryMood', 'Primary Mood')}
                </span>
                <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600', textTransform: 'capitalize' }}>
                  {insights.moodTrends.primary}
                </span>
              </div>
              <div style={dashboardStyles.innerCard}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('trend', 'Trend')}
                </span>
                <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600', textTransform: 'capitalize' }}>
                  {insights.moodTrends.trend}
                </span>
              </div>
            </div>
            {insights.moodTrends.description && (
              <div style={dashboardStyles.innerCard}>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                  {insights.moodTrends.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations Card */}
      <div style={dashboardStyles.card}>
        <div style={dashboardStyles.header}>
          <div style={{ fontSize: '20px' }}>📝</div>
          <h3 style={dashboardStyles.title}>{t('recommendations', 'Recommendations')}</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {insights.recommendations && insights.recommendations.map((rec, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              ...dashboardStyles.innerCard
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                {index + 1}
              </div>
              <p style={{ color: '#ffffff', fontSize: '16px', lineHeight: '1.5', margin: 0 }}>{rec}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps Card */}
      {insights.nextSteps && (
        <div style={dashboardStyles.card}>
          <div style={dashboardStyles.header}>
            <div style={{ fontSize: '20px' }}>🎯</div>
            <h3 style={dashboardStyles.title}>{t('nextSteps', 'Next Steps')}</h3>
          </div>
          <div style={dashboardStyles.innerCard}>
            <p style={{ color: '#ffffff', fontSize: '16px', lineHeight: '1.5', margin: 0 }}>
              {insights.nextSteps}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleProgressDashboard;