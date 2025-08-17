import React from 'react';
import { useTranslation } from 'react-i18next';

const UserCard = ({ user, currentUser, onConnect }) => {
  const { t } = useTranslation();

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getLocationDisplay = () => {
    if (user.location?.city && user.location?.country) {
      return `${user.location.city}, ${user.location.country}`;
    }
    if (user.location?.country) {
      return user.location.country;
    }
    return t('locationPrivate', 'Locatie privé');
  };

  const getDistanceDisplay = () => {
    if (user.distance) {
      return user.distance < 1 
        ? t('nearbyUser', '< 1 km')
        : `${Math.round(user.distance)} km`;
    }
    return null;
  };

  return (
    <div className="user-card">
      <div className="user-card-header">
        <div className="user-avatar">
          {user.profileImage ? (
            <img src={user.profileImage} alt={user.username} />
          ) : (
            <div className="avatar-placeholder">
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={`user-status status-${user.isOnline ? 'online' : 'offline'}`}></div>
        </div>
        
        <h3 className="user-name">{user.username}</h3>
        <div className="user-location">
          📍 {getLocationDisplay()}
          {getDistanceDisplay() && ` • ${getDistanceDisplay()}`}
        </div>
        {calculateAge(user.birthDate) && (
          <div className="user-age">{calculateAge(user.birthDate)} {t('yearsOld', 'jaar')}</div>
        )}
      </div>

      <div className="user-card-body">
        {user.bio && (
          <p className="user-bio">{user.bio}</p>
        )}

        {user.interests && user.interests.length > 0 && (
          <div className="user-interests">
            {user.interests.slice(0, 3).map((interest, index) => (
              <span key={index} className="interest-tag">
                {interest}
              </span>
            ))}
            {user.interests.length > 3 && (
              <span className="interest-tag">
                +{user.interests.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="user-stats">
          <div className="user-stat">
            <span className="stat-value">{user.meditationCount || 0}</span>
            <span className="stat-label">{t('meditations', 'meditaties')}</span>
          </div>
          <div className="user-stat">
            <span className="stat-value">{user.journalCount || 0}</span>
            <span className="stat-label">{t('journalEntries', 'journals')}</span>
          </div>
          <div className="user-stat">
            <span className="stat-value">{Math.floor(user.distance || 0)}</span>
            <span className="stat-label">km</span>
          </div>
        </div>
      </div>

      <div className="user-card-actions">
        <button 
          className="connect-button"
          onClick={() => onConnect(user._id)}
        >
          🤝 {t('connect', 'Verbind')}
        </button>
        
        <button className="view-profile-button">
          👤 {t('viewProfile', 'Bekijk')}
        </button>
      </div>
    </div>
  );
};

export default UserCard;