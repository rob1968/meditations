import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { getFullUrl, getAuthHeaders } from '../config/api';
import PiPaymentNew from './PiPaymentNew';
import Alert from './Alert';

const Credits = ({ user }) => {
  const [credits, setCredits] = useState(null);
  const [creditHistory, setCreditHistory] = useState([]);
  const [elevenlabsStats, setElevenlabsStats] = useState(null);
  const [showCreditHistory, setShowCreditHistory] = useState(false);
  const [showPiPayment, setShowPiPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [alertState, setAlertState] = useState({ show: false, message: '', type: 'success' });
  const { t } = useTranslation();
  
  // Helper function to show alerts
  const showAlert = (message, type = 'success') => {
    setAlertState({ show: true, message, type });
  };

  // Credit tier packages
  const creditTiers = [
    {
      id: 'starter',
      name: t('starterTier', 'Starter'),
      price: '€4.99',
      credits: 50,
      features: [
        t('basicMeditations', '50 meditation generations'),
        t('allVoices', 'Access to all voices'),
        t('allBackgrounds', 'All background sounds'),
        t('standardSupport', 'Standard support')
      ]
    },
    {
      id: 'popular',
      name: t('popularTier', 'Popular'),
      price: '€9.99',
      credits: 150,
      popular: true,
      savings: '20%',
      features: [
        t('popularMeditations', '150 meditation generations'),
        t('allVoices', 'Access to all voices'),
        t('allBackgrounds', 'All background sounds'),
        t('prioritySupport', 'Priority support'),
        t('bonusTokens', '+10 bonus tokens')
      ]
    },
    {
      id: 'premium',
      name: t('premiumTier', 'Premium'),
      price: '€19.99',
      credits: 400,
      savings: '30%',
      features: [
        t('premiumMeditations', '400 meditation generations'),
        t('allVoices', 'Access to all voices'),
        t('allBackgrounds', 'All background sounds'),
        t('premiumSupport', 'Premium support'),
        t('bonusTokens', '+50 bonus tokens'),
        t('earlyAccess', 'Early access to new features')
      ]
    }
  ];

  useEffect(() => {
    if (user) {
      fetchUserCredits();
      if (user.username === 'rob') {
        fetchElevenlabsStats();
      }
    }
  }, [user]);

  const fetchUserCredits = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(getFullUrl(`/api/users/${user.id}/credits`), {
        headers: getAuthHeaders(user.id)
      });
      setCredits(response.data);
    } catch (error) {
      console.error('Error fetching user credits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchElevenlabsStats = async () => {
    try {
      const response = await axios.get(getFullUrl(`/api/auth/user/${user.id}/elevenlabs-stats`));
      setElevenlabsStats(response.data);
    } catch (error) {
      console.error('Error fetching ElevenLabs stats:', error);
    }
  };

  const fetchCreditHistory = async () => {
    try {
      const response = await axios.get(getFullUrl(`/api/auth/user/${user.id}/credit-history`));
      setCreditHistory(response.data.transactions);
    } catch (error) {
      console.error('Error fetching credit history:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Handle Pi payment completion
  const handlePaymentComplete = (newCreditBalance) => {
    // Update credits in state
    setCredits(prevCredits => ({
      ...prevCredits,
      credits: newCreditBalance
    }));
    
    // Close payment dialog
    setShowPiPayment(false);
    
    // Show success message
    showAlert(t('paymentSuccess', 'Payment successful! Tokens have been added to your account.'), 'success');
  };

  if (isLoading) {
    return (
      <div className="credits-section">
        <div className="credits-loading">
          <div className="spinner-large"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="credits-section">
      <div className="credits-header">
        <h3>💎 {t('tokens', 'Tokens')}</h3>
        <button 
          className="credits-purchase-btn"
          onClick={() => setShowPiPayment(true)}
        >
          <span style={{ fontSize: '16px', marginRight: '8px' }}>π</span>
          {t('buyTokens', 'Buy Tokens')}
        </button>
      </div>
      
      {credits && (
        <div className="credits-display">
          <div className="credits-main">
            <div className="credits-balance">
              <span className="credits-amount">{credits.credits}</span>
              <span className="credits-label">{t('availableTokens', 'Available Tokens')}</span>
            </div>
            
            {credits.credits < 3 && (
              <div className="credits-warning">
                ⚠️ {t('lowTokensWarning', 'Low tokens! Consider purchasing more.')}
              </div>
            )}
          </div>
          
          <div className="credits-stats">
            <div className="credit-stat">
              <span className="stat-label">{t('totalEarned', 'Total Earned')}</span>
              <span className="stat-value">{credits.totalCreditsEarned}</span>
            </div>
            <div className="credit-stat">
              <span className="stat-label">{t('totalSpent', 'Total Spent')}</span>
              <span className="stat-value">{credits.totalCreditsSpent}</span>
            </div>
          </div>
          
          <button 
            className="credit-history-btn"
            onClick={() => {
              setShowCreditHistory(!showCreditHistory);
              if (!showCreditHistory && creditHistory.length === 0) {
                fetchCreditHistory();
              }
            }}
          >
            {showCreditHistory ? '📤 ' + t('hideHistory', 'Hide History') : '📋 ' + t('viewHistory', 'View History')}
          </button>
          
          {showCreditHistory && (
            <div className="credit-history">
              <h4>{t('tokenHistory', 'Token History')}</h4>
              {creditHistory.length === 0 ? (
                <p>{t('noTransactions', 'No transactions yet.')}</p>
              ) : (
                <div className="credit-transactions">
                  {creditHistory.map((transaction, index) => (
                    <div key={index} className="credit-transaction">
                      <div className="transaction-info">
                        <span className="transaction-type">
                          {transaction.type === 'initial' && '🎁'}
                          {transaction.type === 'generation' && '🎵'}
                          {transaction.type === 'sharing' && '🌟'}
                          {transaction.type === 'purchase' && '💳'}
                          {transaction.type === 'bonus' && '🎉'}
                          {transaction.description}
                        </span>
                        <span className="transaction-date">
                          {formatDate(transaction.createdAt)}
                        </span>
                      </div>
                      <span className={`transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Credit Tiers Section */}
      <div className="credit-tiers-section">
        <h3 className="credit-tiers-header">
          🎯 {t('chooseTokenPackage', 'Choose Your Token Package')}
        </h3>
        
        <div className="credit-tiers-grid">
          {creditTiers.map((tier) => (
            <div key={tier.id} className={`credit-tier-card ${tier.popular ? 'popular' : ''}`}>
              {tier.popular && (
                <div className="tier-badge">{t('mostPopular', 'Most Popular')}</div>
              )}
              {tier.savings && (
                <div className="tier-savings">{t('save', 'Save')} {tier.savings}</div>
              )}
              
              <div className="tier-header">
                <h4 className="tier-name">{tier.name}</h4>
                <div className="tier-price">{tier.price}</div>
                <div className="tier-price-label">{t('oneTimePayment', 'One-time payment')}</div>
              </div>
              
              <div className="tier-credits">
                <div className="tier-credits-amount">{tier.credits}</div>
                <div className="tier-credits-label">{t('tokens', 'Tokens')}</div>
              </div>
              
              <div className="tier-features">
                <ul className="tier-features-list">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="tier-feature">
                      <span className="tier-feature-icon">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button 
                className="tier-select-btn"
                onClick={() => showAlert(`${t('paymentComingSoon', 'Payment system coming soon!')} - ${tier.name} (${tier.price})`, 'info')}
              >
                {t('selectPackage', 'Select Package')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ElevenLabs Credits Display - Only for user 'rob' */}
      {user.username === 'rob' && elevenlabsStats && (
        <div className="elevenlabs-credits-display">
          <h3>🔊 {t('elevenLabsTokens', 'ElevenLabs Tokens')}</h3>
          <div className="elevenlabs-info">
            <span className="elevenlabs-icon">🔊</span>
            <div className="elevenlabs-text">
              <div className="elevenlabs-remaining">
                {elevenlabsStats.currentTier?.limit ? 
                  (elevenlabsStats.currentTier.limit - elevenlabsStats.charactersUsedThisMonth).toLocaleString() :
                  '∞'
                } {t('charactersRemaining', 'tekens over')}
              </div>
              <div className="elevenlabs-tier">{elevenlabsStats.currentTier?.name || t('free', 'Free')} {t('tier', 'tier')}</div>
            </div>
          </div>
          {elevenlabsStats.lastReset && (
            <div className="elevenlabs-reset-date">
              {t('monthlyStatsReset', 'Monthly stats reset on')}: {new Date(elevenlabsStats.lastReset).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
      
      {/* Pi Payment Modal */}
      {showPiPayment && (
        <PiPaymentNew
          user={user}
          onPaymentComplete={handlePaymentComplete}
          onClose={() => setShowPiPayment(false)}
        />
      )}
      
      {/* Alert Component */}
      <Alert 
        message={alertState.message}
        type={alertState.type}
        visible={alertState.show}
        onClose={() => setAlertState({ show: false, message: '', type: 'success' })}
        position="fixed"
      />
    </div>
  );
};

export default Credits;