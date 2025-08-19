import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const GroupList = ({ user }) => {
  const { t } = useTranslation();
  const [myGroups, setMyGroups] = useState([]);
  const [discoverGroups, setDiscoverGroups] = useState([]);
  const [activeTab, setActiveTab] = useState('myGroups');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, [user]);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading real groups for user:', user?._id || user?.id);

      if (!user?._id && !user?.id) {
        console.log('❌ No user ID available for groups');
        setMyGroups([]);
        setDiscoverGroups([]);
        setIsLoading(false);
        return;
      }

      // Load user's groups
      const myGroupsResponse = await fetch('/api/groups/my', {
        headers: {
          'x-user-id': user._id || user.id,
          'Content-Type': 'application/json'
        }
      });

      if (myGroupsResponse.ok) {
        const myGroupsData = await myGroupsResponse.json();
        console.log('📦 My groups loaded:', myGroupsData.groups?.length || 0);
        setMyGroups(myGroupsData.groups || []);
      } else {
        console.error('❌ Failed to load my groups:', myGroupsResponse.status);
        setMyGroups([]);
      }

      // Load discoverable groups
      const discoverResponse = await fetch('/api/groups/discover', {
        headers: {
          'x-user-id': user._id || user.id,
          'Content-Type': 'application/json'
        }
      });

      if (discoverResponse.ok) {
        const discoverData = await discoverResponse.json();
        console.log('📦 Discover groups loaded:', discoverData.groups?.length || 0);
        setDiscoverGroups(discoverData.groups || []);
      } else {
        console.error('❌ Failed to load discover groups:', discoverResponse.status);
        setDiscoverGroups([]);
      }
    } catch (error) {
      console.error('❌ Error loading groups:', error);
      setMyGroups([]);
      setDiscoverGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = (groupId) => {
    // TODO: Implement join group functionality
    console.log('Joining group:', groupId);
  };

  const handleCreateGroup = () => {
    // TODO: Implement create group functionality
    console.log('Creating new group');
  };

  if (isLoading) {
    return (
      <div className="meet-loading">
        <div className="loading-animation"></div>
        <p className="loading-text">{t('loadingGroups', 'Groepen laden...')}</p>
      </div>
    );
  }

  return (
    <div className="group-list">
      <div className="group-header">
        <h2 className="group-title">{t('groups', 'Groepen')}</h2>
        <p className="group-subtitle">{t('groupsSubtitle', 'Sluit je aan bij communities of start je eigen groep')}</p>
      </div>

      <div className="group-tabs">
        <div className="group-tabs-container">
          <button 
            className={`group-tab ${activeTab === 'myGroups' ? 'active' : ''}`}
            onClick={() => setActiveTab('myGroups')}
          >
            <span className="group-tab-icon">👥</span>
            <span className="group-tab-label">{t('myGroups', 'Mijn Groepen')}</span>
            <span className="group-tab-count">({myGroups.length})</span>
          </button>
          <button 
            className={`group-tab ${activeTab === 'discover' ? 'active' : ''}`}
            onClick={() => setActiveTab('discover')}
          >
            <span className="group-tab-icon">🔍</span>
            <span className="group-tab-label">{t('discoverGroups', 'Ontdek')}</span>
            <span className="group-tab-count">({discoverGroups.length})</span>
          </button>
        </div>
        
        <button className="create-group-button" onClick={handleCreateGroup}>
          <span className="button-icon">➕</span>
          <span className="button-text">{t('createGroup', 'Groep Aanmaken')}</span>
        </button>
      </div>

      <div className="group-content">
        {activeTab === 'myGroups' && (
          <div className="my-groups">
            {myGroups.length === 0 ? (
              <div className="meet-empty">
                <div className="empty-icon">👥</div>
                <h3 className="empty-title">{t('noGroupsYet', 'Nog geen groepen')}</h3>
                <p className="empty-description">{t('joinOrCreateGroup', 'Sluit je aan bij een groep of maak er zelf een aan!')}</p>
              </div>
            ) : (
              <div className="groups-grid">
                {myGroups.map((group) => (
                  <div key={group._id} className="group-card">
                    <div className="group-card-header">
                      <div className="group-info">
                        <h3 className="group-name">{group.name}</h3>
                        <div className="group-meta">
                          <span className="member-count">
                            <span className="meta-icon">👥</span>
                            {group.memberCount}
                          </span>
                          <span className="privacy-indicator">
                            {group.privacy === 'open' ? '🌐' : group.privacy === 'closed' ? '🔒' : '🚪'}
                          </span>
                        </div>
                      </div>
                      {group.unreadMessages > 0 && (
                        <div className="notification-badge">{group.unreadMessages}</div>
                      )}
                    </div>
                    
                    <div className="group-card-body">
                      <p className="group-description">{group.description}</p>
                      
                      <div className="group-tags">
                        {group.tags.map((tag, index) => (
                          <span key={index} className="tag">#{tag}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="group-card-footer">
                      <div className="last-activity">
                        <span className="activity-label">{t('lastActivity', 'Laatste activiteit')}:</span>
                        <span className="activity-time">{group.latestActivity.toLocaleTimeString()}</span>
                      </div>
                      <button className="primary-button">
                        <span className="button-icon">💬</span>
                        <span className="button-text">{t('openGroup', 'Open Groep')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="discover-groups">
            <div className="groups-grid">
              {discoverGroups.map((group) => (
                <div key={group._id} className="group-card discover-card">
                  <div className="group-card-header">
                    <div className="group-info">
                      <h3 className="group-name">{group.name}</h3>
                      <div className="group-meta">
                        <span className="member-count">
                          <span className="meta-icon">👥</span>
                          {group.memberCount}
                        </span>
                        <span className="privacy-indicator">
                          {group.privacy === 'open' ? '🌐' : group.privacy === 'closed' ? '🔒' : '🚪'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group-card-body">
                    <p className="group-description">{group.description}</p>
                    
                    <div className="group-tags">
                      {group.tags.map((tag, index) => (
                        <span key={index} className="tag">#{tag}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="group-card-footer">
                    <div className="created-by">
                      <span className="creator-label">{t('createdBy', 'Aangemaakt door')}:</span>
                      <span className="creator-name">{group.createdBy?.username || t('unknownUser', 'Onbekend')}</span>
                    </div>
                    <button 
                      className="secondary-button"
                      onClick={() => handleJoinGroup(group._id)}
                    >
                      <span className="button-icon">🤝</span>
                      <span className="button-text">
                        {group.privacy === 'open' ? t('joinGroup', 'Lid Worden') : t('requestToJoin', 'Verzoek Verzenden')}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupList;