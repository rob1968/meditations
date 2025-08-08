import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { getFullUrl, API_ENDPOINTS } from '../config/api';
import { getSortedCountries } from '../data/countries';
import { getLocalizedLanguages, getLanguageDisplayName } from '../data/languages';
import PiPaymentNew from './PiPaymentNew';
import Alert from './Alert';

const Profile = ({ user, onLogout, onBackToCreate }) => {
  const [stats, setStats] = useState(null);
  const [credits, setCredits] = useState(null);
  const [creditHistory, setCreditHistory] = useState([]);
  const [elevenlabsStats, setElevenlabsStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreditHistory, setShowCreditHistory] = useState(false);
  const [showPiPayment, setShowPiPayment] = useState(false);
  
  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedUser, setEditedUser] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Delete account states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [alertState, setAlertState] = useState({ show: false, message: '', type: 'success' });
  
  const { t, i18n } = useTranslation();
  
  // Helper function to show alerts
  const showAlert = (message, type = 'success') => {
    setAlertState({ show: true, message, type });
  };
  
  // Auto-hide alert messages after 5 seconds
  useEffect(() => {
    if (alertState.show) {
      const timer = setTimeout(() => {
        setAlertState({ show: false, message: '', type: 'success' });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [alertState.show]);
  
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
  
  // Get sorted countries for the current language
  const countries = getSortedCountries(i18n.language);
  
  // Get localized language names
  const availableLanguages = getLocalizedLanguages(t);

  useEffect(() => {
    if (user) {
      fetchUserStats();
      fetchUserCredits();
      // Only fetch ElevenLabs stats for user 'rob'
      if (user.username === 'rob') {
        fetchElevenlabsStats();
      }
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(getFullUrl(API_ENDPOINTS.USER_STATS(user.id)));
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setError(t('failedToLoadStats', 'Failed to load statistics'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserCredits = async () => {
    try {
      const response = await axios.get(getFullUrl(`/api/auth/user/${user.id}/credits`));
      setCredits(response.data);
    } catch (error) {
      console.error('Error fetching user credits:', error);
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

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const meditationTypeLabels = {
    sleep: t('sleepMeditation', 'Sleep'),
    stress: t('stressMeditation', 'Stress'),
    focus: t('focusMeditation', 'Focus'),
    anxiety: t('anxietyMeditation', 'Anxiety'),
    energy: t('energyMeditation', 'Energy')
  };

  // Initialize edit form with current user data
  const startEdit = () => {
    setEditedUser({
      preferredLanguage: user.preferredLanguage || '',
      city: user.location?.city || '',
      country: user.location?.country || '',
      countryCode: user.location?.countryCode || '',
      gender: user.gender || '',
      bio: user.bio || ''
    });
    setIsEditMode(true);
    setSaveMessage('');
  };

  // Cancel edit mode
  const cancelEdit = () => {
    setIsEditMode(false);
    setEditedUser({});
    setSaveMessage('');
  };

  // Handle country selection
  const handleCountryChange = (e) => {
    const selectedCountry = countries.find(c => c.name === e.target.value);
    if (selectedCountry) {
      setEditedUser(prev => ({
        ...prev,
        country: selectedCountry.name,
        countryCode: selectedCountry.code
      }));
    } else {
      setEditedUser(prev => ({
        ...prev,
        country: e.target.value,
        countryCode: ''
      }));
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmUsername !== user.username) {
      setDeleteError(t('usernameDoesNotMatch', 'Username does not match'));
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      const response = await axios.delete(getFullUrl(`/api/auth/delete-account/${user.id}`), {
        data: { confirmUsername: deleteConfirmUsername }
      });

      if (response.data.success) {
        // Clear all local storage
        localStorage.clear();
        
        // Show success message
        showAlert(t('accountDeleted', 'Your account has been permanently deleted'), 'success');
        
        // Redirect to login after delay
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error(response.data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleteError(
        error.response?.data?.error || 
        t('deleteAccountError', 'Failed to delete account. Please try again.')
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Save profile changes
  const saveProfile = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const response = await axios.put(getFullUrl(`/api/auth/user/${user.id}/profile`), {
        preferredLanguage: editedUser.preferredLanguage,
        city: editedUser.city.trim(),
        country: editedUser.country,
        countryCode: editedUser.countryCode,
        gender: editedUser.gender,
        bio: editedUser.bio.trim()
      });

      // Update user data in localStorage
      const updatedUser = { ...user, ...response.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update UI language if language changed
      if (editedUser.preferredLanguage && editedUser.preferredLanguage !== user.preferredLanguage) {
        i18n.changeLanguage(editedUser.preferredLanguage);
      }
      
      setIsEditMode(false);
      setSaveMessage(t('profileUpdated', 'Profile updated successfully!'));
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);
      
      // Note: Profile.jsx is legacy, ProfileInfo.jsx handles updates properly
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage(t('profileUpdateError', 'Failed to update profile. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-info-section">
      <div className="profile-section-header">
        <h3>👤 {t('profile', 'Profile')}</h3>
        {!isEditMode ? (
          <button className="edit-profile-btn" onClick={startEdit}>
            <span className="edit-icon">✏️</span>
            {t('edit', 'Edit')}
          </button>
        ) : (
          <div className="edit-actions">
            <button className="save-btn" onClick={saveProfile} disabled={isSaving}>
              {isSaving ? (
                <>
                  <span className="spinner-small"></span>
                  {t('saving', 'Saving...')}
                </>
              ) : (
                <>
                  <span className="save-icon">💾</span>
                  {t('save', 'Save')}
                </>
              )}
            </button>
            <button className="cancel-btn" onClick={cancelEdit} disabled={isSaving}>
              <span className="cancel-icon">❌</span>
              {t('cancel', 'Cancel')}
            </button>
          </div>
        )}
      </div>

      {saveMessage && (
        <div className={`save-message ${saveMessage.includes('success') ? 'success' : 'error'}`}>
          {saveMessage}
        </div>
      )}

      <div className="profile-info-card">
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
            </div>
          )}

          {/* Statistics Section */}
          <div className="profile-stats">
            <h3>📊 {t('statistics', 'Statistics')}</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">🧘</div>
                <div className="stat-info">
                  <div className="stat-label">{t('totalMeditations', 'Total Meditations')}</div>
                  <div className="stat-value">{stats.totalMeditations}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⏰</div>
                <div className="stat-info">
                  <div className="stat-label">{t('totalTime', 'Total Time')}</div>
                  <div className="stat-value">{formatTime(stats.totalTime)}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🌍</div>
                <div className="stat-info">
                  <div className="stat-label">{t('languages', 'Languages')}</div>
                  <div className="stat-value">{stats.uniqueLanguages}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🎵</div>
                <div className="stat-info">
                  <div className="stat-label">{t('meditationFiles', 'Meditation Files')}</div>
                  <div className="stat-value">{stats.totalAudioFiles}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⭐</div>
                <div className="stat-info">
                  <div className="stat-label">{t('favoriteType', 'Favorite Type')}</div>
                  <div className="stat-value">{meditationTypeLabels[stats.favoriteType] || stats.favoriteType}</div>
                </div>
              </div>
            </div>

            {stats.meditationTypes && Object.keys(stats.meditationTypes).length > 0 && (
              <div className="meditation-breakdown">
                <h4>{t('meditationBreakdown', 'Meditation Breakdown')}</h4>
                <div className="breakdown-list">
                  {Object.entries(stats.meditationTypes).map(([type, count]) => (
                    <div key={type} className="breakdown-item">
                      <div className="breakdown-type">
                        {meditationTypeLabels[type] || type}
                      </div>
                      <div className="breakdown-count">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile Information Section */}
          <div className="profile-info-section">
            <div className="profile-section-header">
              <h3>👤 {t('profile', 'Profile')}</h3>
              {!isEditMode ? (
                <button className="edit-profile-btn" onClick={startEdit}>
                  <span className="edit-icon">✏️</span>
                  {t('edit', 'Edit')}
                </button>
              ) : (
                <div className="edit-actions">
                  <button className="save-btn" onClick={saveProfile} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <span className="spinner-small"></span>
                        {t('saving', 'Saving...')}
                      </>
                    ) : (
                      <>
                        <span className="save-icon">💾</span>
                        {t('save', 'Save')}
                      </>
                    )}
                  </button>
                  <button className="cancel-btn" onClick={cancelEdit} disabled={isSaving}>
                    <span className="cancel-icon">❌</span>
                    {t('cancel', 'Cancel')}
                  </button>
                </div>
              )}
            </div>

            {saveMessage && (
              <div className={`save-message ${saveMessage.includes('success') ? 'success' : 'error'}`}>
                {saveMessage}
              </div>
            )}

            <div className="profile-info-card">
              {/* Username (Read-only) */}
              <div className="profile-field">
                <div className="field-icon">👤</div>
                <div className="field-content">
                  <label className="field-label">{t('username', 'Username')}</label>
                  <div className="field-value">
                    {user.username}
                    {user.piUsername && user.piUsername !== user.username && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '14px', marginLeft: '8px' }}>
                        (π {user.piUsername})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Age (Read-only) */}
              {user.age && (
                <div className="profile-field">
                  <div className="field-icon">🎂</div>
                  <div className="field-content">
                    <label className="field-label">{t('age', 'Age')}</label>
                    <div className="field-value">{user.age} {t('yearsOld', 'years old')}</div>
                  </div>
                </div>
              )}

              {/* Preferred Language */}
              <div className="profile-field">
                <div className="field-icon">🌍</div>
                <div className="field-content">
                  <label className="field-label">{t('preferredLanguage', 'Preferred Language')}</label>
                  {isEditMode ? (
                    <select
                      value={editedUser.preferredLanguage}
                      onChange={(e) => setEditedUser(prev => ({ ...prev, preferredLanguage: e.target.value }))}
                      className="field-input"
                    >
                      <option value="">{t('selectLanguage', 'Select your language')}</option>
                      {availableLanguages.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.localizedName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="field-value">
                      {getLanguageDisplayName(user.preferredLanguage, t) || t('notSet', 'Not set')}
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="profile-field">
                <div className="field-icon">📍</div>
                <div className="field-content">
                  <label className="field-label">{t('location', 'Location')}</label>
                  {isEditMode ? (
                    <div className="location-inputs">
                      <input
                        type="text"
                        value={editedUser.city}
                        onChange={(e) => setEditedUser(prev => ({ ...prev, city: e.target.value }))}
                        placeholder={t('enterCity', 'Enter your city')}
                        className="field-input city-input"
                      />
                      <select
                        value={editedUser.country}
                        onChange={handleCountryChange}
                        className="field-input country-input"
                      >
                        <option value="">{t('selectCountry', 'Select your country')}</option>
                        {countries.map(country => (
                          <option key={country.code} value={country.name}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="field-value">
                      {[user.location?.city, user.location?.country].filter(Boolean).join(', ') || t('notSet', 'Not set')}
                    </div>
                  )}
                </div>
              </div>

              {/* Gender */}
              <div className="profile-field">
                <div className="field-icon">⚡</div>
                <div className="field-content">
                  <label className="field-label">{t('gender', 'Gender')}</label>
                  {isEditMode ? (
                    <select
                      value={editedUser.gender}
                      onChange={(e) => setEditedUser(prev => ({ ...prev, gender: e.target.value }))}
                      className="field-input"
                    >
                      <option value="">{t('selectGender', 'Select your gender')}</option>
                      <option value="male">☀️ {t('male', 'Male')}</option>
                      <option value="female">🌙 {t('female', 'Female')}</option>
                      <option value="other">{t('other', 'Other')}</option>
                      <option value="prefer_not_to_say">{t('preferNotToSay', 'Prefer not to say')}</option>
                    </select>
                  ) : (
                    <div className="field-value">
                      {(() => {
                        const genderLabels = {
                          male: `☀️ ${t('male', 'Male')}`,
                          female: `🌙 ${t('female', 'Female')}`,
                          other: t('other', 'Other'),
                          prefer_not_to_say: t('preferNotToSay', 'Prefer not to say')
                        };
                        return genderLabels[user.gender] || t('notSet', 'Not set');
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className="profile-field bio-field">
                <div className="field-icon">📝</div>
                <div className="field-content">
                  <label className="field-label">{t('bio', 'Bio')}</label>
                  {isEditMode ? (
                    <div className="bio-input-container">
                      <textarea
                        value={editedUser.bio}
                        onChange={(e) => setEditedUser(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder={t('bioPlaceholder', 'Tell us about yourself...')}
                        maxLength={500}
                        rows={3}
                        className="field-input bio-textarea"
                      />
                      <div className="character-count">
                        {500 - editedUser.bio.length} {t('charactersRemaining', 'characters remaining')}
                      </div>
                    </div>
                  ) : (
                    <div className="field-value bio-text">
                      {user.bio || t('notSet', 'Not set')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* ElevenLabs Credits Display - Only for user 'rob' */}
      {user.username === 'rob' && elevenlabsStats && (
        <div className="elevenlabs-credits-display">
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-lg)' }}>
            🔊 {t('elevenLabsTokens', 'ElevenLabs Tokens')}
          </h3>
          <div className="credits-info">
            <span className="credits-icon">🔊</span>
            <div className="credits-text">
              <div className="credits-remaining">
                {elevenlabsStats.currentTier?.limit ? 
                  (elevenlabsStats.currentTier.limit - elevenlabsStats.charactersUsedThisMonth).toLocaleString() :
                  '∞'
                } {t('charactersRemaining', 'tekens over')}
              </div>
              <div className="credits-tier">{elevenlabsStats.currentTier?.name || t('free', 'Free')} {t('tier', 'tier')}</div>
            </div>
          </div>
          {elevenlabsStats.lastReset && (
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 'var(--space-sm)' }}>
              {t('monthlyStatsReset', 'Monthly stats reset on')}: {new Date(elevenlabsStats.lastReset).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      <div className="profile-actions">
        <button 
          onClick={onLogout} 
          className="logout-button-full"
        >
          {t('logout', 'Logout')}
        </button>
        
        <button 
          onClick={() => setShowDeleteConfirm(true)}
          className="delete-account-button"
          style={{
            backgroundColor: '#ff4757',
            color: 'white',
            border: '2px solid #ff4757',
            padding: '16px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '20px',
            width: '100%',
            transition: 'background-color 0.2s',
            boxShadow: '0 4px 8px rgba(255, 71, 87, 0.3)'
          }}
        >
          🗑️ {t('deleteAccount', 'Delete Account')} {/* v2 */}
        </button>
      </div>
      
      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'var(--glass-dark)',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#ff4757', marginBottom: '16px' }}>
              ⚠️ {t('deleteAccountTitle', 'Delete Account')}
            </h3>
            
            <p style={{ marginBottom: '16px', color: '#333' }}>
              {t('deleteAccountWarning', 'This action cannot be undone. All your meditations, token history, and profile data will be permanently deleted.')}
            </p>
            
            <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
              {t('deleteAccountConfirmText', 'To confirm, please type your username:')} <strong>{user.username}</strong>
            </p>
            
            <input
              type="text"
              value={deleteConfirmUsername}
              onChange={(e) => setDeleteConfirmUsername(e.target.value)}
              placeholder={t('typeUsername', 'Type your username')}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '16px',
                textAlign: 'center'
              }}
            />
            
            {deleteError && (
              <div style={{ color: '#ff4757', marginBottom: '16px', fontSize: '14px' }}>
                {deleteError}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmUsername('');
                  setDeleteError('');
                }}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '2px solid var(--glass-border)',
                  backgroundColor: 'var(--glass-light)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {t('cancel', 'Cancel')}
              </button>
              
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmUsername !== user.username}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  backgroundColor: deleteConfirmUsername === user.username ? '#ff4757' : '#ccc',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: deleteConfirmUsername === user.username ? 'pointer' : 'not-allowed'
                }}
              >
                {isDeleting ? (
                  <>
                    <span className="spinner-small"></span>
                    {t('deleting', 'Deleting...')}
                  </>
                ) : (
                  t('deleteAccount', 'Delete Account')
                )}
              </button>
            </div>
          </div>
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

export default Profile;