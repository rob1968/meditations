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

const AdvancedProgressDashboard = ({ user }) => {
  const { t } = useTranslation();
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('30');
  const [chartData, setChartData] = useState({
    moodTrends: null,
    progressRing: null,
    activityHeatmap: null
  });

  // Advanced dark theme styles
  const dashboardStyles = {
    container: {
      maxWidth: '100%',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
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
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#ffffff',
      margin: '0 0 8px 0',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
    },
    subtitle: {
      fontSize: '16px',
      color: 'rgba(255, 255, 255, 0.8)',
      margin: '0 0 24px 0'
    },
    chartTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#ffffff',
      margin: '0 0 20px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#ffffff',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchAdvancedInsights();
    }
  }, [user?.id, timeframe]);

  const fetchAdvancedInsights = async () => {
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
      console.error('Error fetching advanced insights:', error);
      setError(t('failedToLoadProgressInsights', 'Failed to load progress insights'));
    } finally {
      setIsLoading(false);
    }
  };

  const generateChartData = (insightsData) => {
    // Generate mock data for visualization (in real app, this would come from API)
    const days = parseInt(timeframe);
    const dates = Array.from({ length: days }, (_, i) => 
      format(subDays(new Date(), days - 1 - i), 'MMM dd')
    );

    // Mood trend data
    const moodScores = Array.from({ length: days }, () => Math.random() * 100);
    const avgScore = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;
    
    const moodTrendData = {
      labels: dates,
      datasets: [
        {
          label: t('moodScore', 'Mood Score'),
          data: moodScores,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true
        },
        {
          label: t('average', 'Average'),
          data: Array(days).fill(avgScore),
          borderColor: 'rgba(255, 206, 84, 0.8)',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0
        }
      ]
    };

    // Progress ring data
    const progressData = {
      labels: [t('completed', 'Completed'), t('remaining', 'Remaining')],
      datasets: [
        {
          data: [75, 25], // 75% progress
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(75, 85, 99, 0.3)'
          ],
          borderColor: [
            'rgba(16, 185, 129, 1)',
            'rgba(75, 85, 99, 0.5)'
          ],
          borderWidth: 2
        }
      ]
    };

    setChartData({
      moodTrends: moodTrendData,
      progressRing: progressData,
      activityHeatmap: null // TODO: Implement calendar heatmap
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

  if (isLoading) {
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
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#10b981',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <h2 style={dashboardStyles.title}>
              🧠 {t('analyzingAdvancedProgress', 'Analyzing Your Advanced Progress')}
            </h2>
            <p style={dashboardStyles.subtitle}>
              {t('generatingCharts', 'Generating interactive charts and insights...')}
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
              {t('errorLoadingAdvancedInsights', 'Error Loading Advanced Insights')}
            </h2>
            <p style={dashboardStyles.subtitle}>{error}</p>
            <button onClick={fetchAdvancedInsights} style={{
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
              {t('noAdvancedInsightsYet', 'No Advanced Insights Yet')}
            </h2>
            <p style={dashboardStyles.subtitle}>
              {t('startJournalingForAdvancedInsights', 'Start journaling to see your advanced analytics and charts!')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={dashboardStyles.container}>
      {/* Header Card with Overview */}
      <div style={dashboardStyles.headerCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={dashboardStyles.title}>
              📈 {t('advancedAnalytics', 'Advanced Analytics')}
            </h1>
            <p style={dashboardStyles.subtitle}>
              {t('comprehensiveProgressAnalysis', 'Comprehensive progress analysis for the last')} {timeframe} {t('days', 'days')}
            </p>
          </div>
          
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '16px',
              color: '#ffffff',
              padding: '16px 20px',
              fontSize: '16px',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              minWidth: '140px',
              fontWeight: '500'
            }}
          >
            <option value="7" style={{ background: '#1a2332', color: 'white' }}>7 {t('days', 'days')}</option>
            <option value="30" style={{ background: '#1a2332', color: 'white' }}>30 {t('days', 'days')}</option>
            <option value="90" style={{ background: '#1a2332', color: 'white' }}>90 {t('days', 'days')}</option>
          </select>
        </div>

        {/* Quick Stats */}
        <div style={{ ...dashboardStyles.statsGrid, marginTop: '24px' }}>
          <div style={dashboardStyles.statCard}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: getProgressColor(insights.overallProgress) }}>
              75%
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {t('overallProgress', 'Overall Progress')}
            </div>
          </div>
          <div style={dashboardStyles.statCard}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
              12
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {t('streakDays', 'Streak Days')}
            </div>
          </div>
          <div style={dashboardStyles.statCard}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6' }}>
              8.2
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {t('avgMoodScore', 'Avg Mood Score')}
            </div>
          </div>
          <div style={dashboardStyles.statCard}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>
              {insights.recommendations ? insights.recommendations.length : 0}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {t('activeGoals', 'Active Goals')}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={dashboardStyles.gridContainer}>
        {/* Mood Trends Line Chart */}
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
              {t('goalProgress', 'Goal Progress')}
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

      {/* Insights and Recommendations */}
      <div style={dashboardStyles.gridContainer}>
        {/* Key Insights */}
        <div style={dashboardStyles.card}>
          <h3 style={dashboardStyles.chartTitle}>
            <span>💡</span>
            {t('keyInsights', 'Key Insights')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {insights.keyInsights && insights.keyInsights.map((insight, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>
                <p style={{ color: '#ffffff', fontSize: '16px', lineHeight: '1.6', margin: 0 }}>{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Items */}
        <div style={dashboardStyles.card}>
          <h3 style={dashboardStyles.chartTitle}>
            <span>✅</span>
            {t('actionItems', 'Action Items')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {insights.recommendations && insights.recommendations.map((rec, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}>
                <input 
                  type="checkbox" 
                  style={{
                    width: '20px',
                    height: '20px',
                    accentColor: '#10b981'
                  }}
                />
                <p style={{ color: '#ffffff', fontSize: '16px', lineHeight: '1.6', margin: 0, flex: 1 }}>{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedProgressDashboard;