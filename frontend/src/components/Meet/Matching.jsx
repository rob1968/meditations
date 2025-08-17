import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import UserCard from './UserCard';

const Matching = ({ user, onNewMatchesChange }) => {
  const { t } = useTranslation();
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, [user]);

  const loadMatches = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading real matches for user:', user?._id || user?.id);

      if (!user?._id && !user?.id) {
        console.log('❌ No user ID available for matches');
        setMatches([]);
        setIsLoading(false);
        return;
      }

      // Load matches from API
      const response = await fetch('/api/users/matches', {
        headers: {
          'x-user-id': user._id || user.id,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Real matches loaded:', data.matches?.length || 0);
        setMatches(data.matches || []);
        
        // Update new matches count if callback provided
        if (onNewMatchesChange) {
          const newMatchesCount = data.matches?.filter(match => 
            !match.viewed && new Date(match.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
          ).length || 0;
          onNewMatchesChange(newMatchesCount);
        }
      } else {
        console.error('❌ Failed to load matches:', response.status);
        setMatches([]);
      }
    } catch (error) {
      console.error('❌ Error loading matches:', error);
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (targetUserId) => {
    try {
      // Remove match after connecting
      setMatches(matches.filter(match => match.user._id !== targetUserId));
      onNewMatchesChange(matches.length - 1);
    } catch (error) {
      console.error('Error connecting to match:', error);
    }
  };

  const handleDismissMatch = (matchId) => {
    const updatedMatches = matches.filter(match => match._id !== matchId);
    setMatches(updatedMatches);
    onNewMatchesChange(updatedMatches.length);
  };

  if (isLoading) {
    return (
      <div className="meet-loading">
        <div className="loading-animation"></div>
        <p className="loading-text">{t('findingMatches', 'Matches zoeken...')}</p>
      </div>
    );
  }

  return (
    <div className="matching">
      <div className="match-header">
        <h2 className="match-title">{t('yourMatches', 'Jouw Matches')}</h2>
        <p className="match-subtitle">
          {t('matchingSubtitle', 'Gebaseerd op je interesses, locatie en activiteit')}
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="meet-empty">
          <div className="empty-icon">✨</div>
          <h3 className="empty-title">{t('noMatchesYet', 'Geen nieuwe matches')}</h3>
          <p className="empty-description">{t('checkBackLater', 'Kom later terug voor nieuwe matches of verbeter je profiel!')}</p>
          <button className="primary-button">
            <span className="button-icon">📝</span>
            <span className="button-text">{t('improveProfile', 'Profiel Verbeteren')}</span>
          </button>
        </div>
      ) : (
        <div className="matches-grid">
          {matches.map((match) => (
            <div key={match._id} className="match-card">
              <div className="match-card-header">
                <div className="match-score">
                  <div className="score-circle">
                    <span className="score-number">{match.matchScore}%</span>
                  </div>
                  <span className="score-label">{t('matchScore', 'Match Score')}</span>
                </div>
                <button 
                  className="dismiss-button"
                  onClick={() => handleDismissMatch(match._id)}
                  title={t('dismissMatch', 'Match verwijderen')}
                >
                  ✕
                </button>
              </div>

              <div className="match-user-card">
                <UserCard 
                  user={match.user}
                  currentUser={user}
                  onConnect={handleConnect}
                />
              </div>

              <div className="match-reasons">
                <h4 className="reasons-title">{t('whyMatch', 'Waarom een match?')}</h4>
                <ul className="reasons-list">
                  {match.reasons.map((reason, index) => (
                    <li key={index} className="reason-item">
                      <span className="reason-icon">✓</span>
                      <span className="reason-text">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="match-actions">
                <button 
                  className="primary-button"
                  onClick={() => handleConnect(match.user._id)}
                >
                  <span className="button-icon">💬</span>
                  <span className="button-text">{t('startConversation', 'Start Gesprek')}</span>
                </button>
                <button className="secondary-button">
                  <span className="button-icon">👤</span>
                  <span className="button-text">{t('viewFullProfile', 'Volledig Profiel')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="match-tips">
        <h3 className="tips-title">{t('improveMatches', 'Betere matches krijgen?')}</h3>
        <div className="tips-grid">
          <div className="tip-card">
            <span className="tip-icon">📝</span>
            <span className="tip-text">{t('tip1', 'Vul je bio volledig in')}</span>
          </div>
          <div className="tip-card">
            <span className="tip-icon">🏷️</span>
            <span className="tip-text">{t('tip2', 'Voeg relevante interesses toe')}</span>
          </div>
          <div className="tip-card">
            <span className="tip-icon">📍</span>
            <span className="tip-text">{t('tip3', 'Houd je locatie bij')}</span>
          </div>
          <div className="tip-card">
            <span className="tip-icon">🧘</span>
            <span className="tip-text">{t('tip4', 'Blijf actief met meditaties en journaling')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Matching;