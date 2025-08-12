import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { format, subDays, parseISO } from 'date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const UnifiedInsightsDashboard = ({ user }) => {
  const { t } = useTranslation();
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('30');
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'detailed', 'charts'
  const [chartData, setChartData] = useState({
    moodTrends: null,
    progressRing: null
  });

  // Unified dark theme styles
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
    headerCard: {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 100%)',
      borderRadius: '20px',
      padding: '32px',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
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
    chartCard: {
      background: 'rgba(255, 255, 255, 0.06)',
      borderRadius: '20px',
      padding: '32px',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
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
    },
    chartTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#ffffff',
      margin: '0 0 20px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '16px'
    },
    statCard: {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    tabButton: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '12px',
      color: '#ffffff',
      padding: '12px 20px',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontWeight: '500'
    },
    activeTabButton: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: '1px solid rgba(255, 255, 255, 0.25)',
      color: '#ffffff',
      fontWeight: '600'
    }
  };

  // Chart.js options for dark theme
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#ffffff',
          font: { size: 14 },
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.2)'
        },
        ticks: {
          color: '#ffffff'
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.2)'
        },
        ticks: {
          color: '#ffffff'
        }
      }
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
        generateChartData(response.data.insights);
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

  const generateChartData = (insightsData) => {
    // Generate mock chart data for demonstration
    // In a real implementation, this would process actual data
    const dates = Array.from({ length: 14 }, (_, i) => 
      format(subDays(new Date(), 13 - i), 'MMM dd')
    );
    
    const moodData = Array.from({ length: 14 }, () => 
      Math.floor(Math.random() * 4) + 6 // Random mood scores between 6-10
    );

    setChartData({
      moodTrends: {
        labels: dates,
        datasets: [
          {
            label: t('moodScore', 'Mood Score'),
            data: moodData,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            borderWidth: 3,
            pointBackgroundColor: '#667eea',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 6,
            fill: true,
            tension: 0.4
          }
        ]
      },
      progressRing: {
        labels: [t('completed', 'Completed'), t('remaining', 'Remaining')],
        datasets: [
          {
            data: [75, 25],
            backgroundColor: [
              'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              'rgba(255, 255, 255, 0.1)'
            ],
            borderColor: ['#667eea', 'rgba(255, 255, 255, 0.2)'],
            borderWidth: 2
          }
        ]
      }
    });
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
          ...dashboardStyles.headerCard,
          textAlign: 'center',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              border: '4px solid rgba(255, 255, 255, 0.3)', 
              borderTop: '4px solid #ffffff', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.8)' }}>
              {t('loadingInsights', 'Loading insights...')}
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
          ...dashboardStyles.headerCard,
          textAlign: 'center',
          minHeight: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <div style={{ fontSize: '64px', filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' }}>😔</div>
            <h2 style={dashboardStyles.title}>
              {t('errorLoadingInsights', 'Error Loading Insights')}
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px' }}>{error}</p>
            <button onClick={fetchInsights} style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
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
          ...dashboardStyles.headerCard,
          textAlign: 'center',
          minHeight: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <div style={{ fontSize: '64px', filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' }}>📊</div>
            <h2 style={dashboardStyles.title}>
              {t('noInsightsYet', 'No Insights Yet')}
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', textAlign: 'center', maxWidth: '400px' }}>
              {t('startJournalingForInsights', 'Start journaling to see your personalized insights and progress analytics!')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={dashboardStyles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header Card with Controls */}
      <div style={dashboardStyles.headerCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#ffffff', margin: '0 0 8px 0' }}>
              📊 {t('progressInsights', 'Progress Insights')}
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', margin: 0 }}>
              {t('comprehensiveAnalysisLast', 'Comprehensive analysis for the last')} {timeframe} {t('days', 'days')}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* View Mode Tabs */}
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '16px' }}>
              {[
                { key: 'overview', label: t('overview', 'Overview'), icon: '📋' },
                { key: 'charts', label: t('charts', 'Charts'), icon: '📈' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setViewMode(tab.key)}
                  style={{
                    ...dashboardStyles.tabButton,
                    ...(viewMode === tab.key ? dashboardStyles.activeTabButton : {}),
                    padding: '8px 16px',
                    fontSize: '13px'
                  }}
                >
                  <span style={{ marginRight: '6px' }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Timeframe Selector */}
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

        {/* Quick Stats - Always Visible */}
        <div style={{ ...dashboardStyles.statsGrid, marginTop: '24px' }}>
          <div style={dashboardStyles.statCard}>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: getProgressColor(insights.overallProgress),
              marginBottom: '4px'
            }}>
              {insights.overallProgress === 'positive' ? '📈' : insights.overallProgress === 'neutral' ? '📊' : '📉'}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {t('overallProgress', 'Overall Progress')}
            </div>
            <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', textTransform: 'capitalize', marginTop: '4px' }}>
              {t(insights.overallProgress, insights.overallProgress === 'positive' ? 'Positief' : insights.overallProgress === 'neutral' ? 'Neutraal' : 'Zorgwekkend')}
            </div>
          </div>
          
          {insights.moodTrends && (
            <>
              <div style={dashboardStyles.statCard}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6', marginBottom: '4px' }}>
                  {getTrendIcon(insights.moodTrends.trend)}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {t('moodTrend', 'Mood Trend')}
                </div>
                <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', textTransform: 'capitalize', marginTop: '4px' }}>
                  {t(insights.moodTrends.trend, insights.moodTrends.trend === 'improving' ? 'Verbeterend' : insights.moodTrends.trend === 'stable' ? 'Stabiel' : 'Afnemend')}
                </div>
              </div>
              
              <div style={dashboardStyles.statCard}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
                  😊
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {t('primaryMood', 'Primary Mood')}
                </div>
                <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', textTransform: 'capitalize', marginTop: '4px' }}>
                  {t(insights.moodTrends.primary, insights.moodTrends.primary)}
                </div>
              </div>
            </>
          )}
          
          <div style={dashboardStyles.statCard}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px' }}>
              {insights.recommendations ? insights.recommendations.length : 0}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {t('recommendations', 'Recommendations')}
            </div>
          </div>
        </div>
      </div>

      {/* Content Based on View Mode */}
      {viewMode === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Key Insights */}
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

          {/* Recommendations */}
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

          {/* Next Steps */}
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
      )}

      {viewMode === 'charts' && (
        <div style={dashboardStyles.gridContainer}>
          {/* Mood Trends Chart */}
          {chartData.moodTrends && (
            <div style={dashboardStyles.chartCard}>
              <h3 style={dashboardStyles.chartTitle}>
                <span>📈</span>
                {t('moodTrendsChart', 'Mood Trends Over Time')}
              </h3>
              <div style={{ height: '300px', position: 'relative' }}>
                <Line data={chartData.moodTrends} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Progress Ring Chart */}
          {chartData.progressRing && (
            <div style={dashboardStyles.chartCard}>
              <h3 style={dashboardStyles.chartTitle}>
                <span>🎯</span>
                {t('progressOverview', 'Progress Overview')}
              </h3>
              <div style={{ height: '300px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Doughnut 
                  data={chartData.progressRing} 
                  options={{
                    ...chartOptions,
                    cutout: '70%',
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          color: '#ffffff',
                          font: { size: 14 }
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UnifiedInsightsDashboard;