import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../../config/api';
import UserCard from './UserCard';

const DiscoverUsers = ({ user }) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    ageMin: 18,
    ageMax: 65,
    maxDistance: 50,
    genderPreferences: [],
    interests: []
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(getFullUrl('/api/discover/users'), {
        params: filters,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (targetUserId) => {
    try {
      await axios.post(getFullUrl('/api/discover/connect'), {
        targetUserId,
        message: t('defaultConnectMessage', 'Hoi! Ik zou graag contact willen maken.')
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      // Remove user from list after connecting
      setUsers(users.filter(u => u._id !== targetUserId));
    } catch (error) {
      console.error('Error connecting to user:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="meet-loading">
        <div className="loading-animation"></div>
        <p className="loading-text">{t('loadingUsers', 'Gebruikers laden...')}</p>
      </div>
    );
  }

  return (
    <div className="discover-users">
      <div className="discover-header">
        <h2 className="discover-title">{t('discoverPeople', 'Ontdek Mensen')}</h2>
        <p className="discover-description">{t('discoverDescription', 'Vind mensen die bij je passen op basis van interesses en locatie')}</p>
      </div>

      <div className="discover-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label className="filter-label">{t('ageRange', 'Leeftijd')}:</label>
            <div className="age-range">
              <input
                className="filter-input"
                type="number"
                value={filters.ageMin}
                onChange={(e) => setFilters({...filters, ageMin: parseInt(e.target.value)})}
                min="18"
                max="100"
              />
              <span>-</span>
              <input
                className="filter-input"
                type="number"
                value={filters.ageMax}
                onChange={(e) => setFilters({...filters, ageMax: parseInt(e.target.value)})}
                min="18"
                max="100"
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">{t('maxDistance', 'Max afstand')}:</label>
            <select
              className="filter-input"
              value={filters.maxDistance}
              onChange={(e) => setFilters({...filters, maxDistance: parseInt(e.target.value)})}
            >
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
              <option value={500}>500 km</option>
              <option value={99999}>{t('anywhere', 'Overal')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="users-grid">
        {users.length === 0 ? (
          <div className="meet-empty">
            <div className="empty-icon">🔍</div>
            <h3 className="empty-title">{t('noUsersFound', 'Geen gebruikers gevonden')}</h3>
            <p className="empty-description">{t('tryAdjustingFilters', 'Probeer je filters aan te passen of kom later terug.')}</p>
          </div>
        ) : (
          users.map((discoveredUser) => (
            <UserCard
              key={discoveredUser._id}
              user={discoveredUser}
              currentUser={user}
              onConnect={handleConnect}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default DiscoverUsers;