import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const ActivityChannelControls = ({ conversation, currentUser, onClose }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('permissions');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Channel-wide settings
  const [channelSettings, setChannelSettings] = useState({
    slowMode: false,
    slowModeInterval: 30,
    membersCanInvite: true,
    membersCanUploadFiles: true,
    moderatedMode: false,
    announcementOnly: false
  });

  const participants = conversation.participants || [];
  const organizer = conversation.activity?.organizer || conversation.organizer;

  const handleUpdateChannelSettings = async (newSettings) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/meet/conversations/${conversation._id}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id || currentUser._id
        },
        body: JSON.stringify(newSettings)
      });

      if (response.ok) {
        setChannelSettings(newSettings);
        console.log('Channel settings updated successfully');
      }
    } catch (error) {
      console.error('Error updating channel settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserPermissionToggle = async (userId, permission) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/meet/conversations/${conversation._id}/user-permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id || currentUser._id
        },
        body: JSON.stringify({
          targetUserId: userId,
          permission: permission,
          action: 'toggle'
        })
      });

      if (response.ok) {
        console.log(`User permission ${permission} toggled for user ${userId}`);
      }
    } catch (error) {
      console.error('Error updating user permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMuteUser = async (userId, duration = 3600000) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/meet/conversations/${conversation._id}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id || currentUser._id
        },
        body: JSON.stringify({
          targetUserId: userId,
          duration: duration,
          reason: 'Muted by organizer'
        })
      });

      if (response.ok) {
        console.log(`User ${userId} muted for ${duration}ms`);
      }
    } catch (error) {
      console.error('Error muting user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKickUser = async (userId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/meet/conversations/${conversation._id}/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id || currentUser._id
        },
        body: JSON.stringify({
          targetUserId: userId,
          reason: 'Removed by organizer'
        })
      });

      if (response.ok) {
        console.log(`User ${userId} kicked from channel`);
      }
    } catch (error) {
      console.error('Error kicking user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChannelSettings = () => (
    <div className="channel-settings-panel">
      <h4>{t('channelSettings', 'Kanaalinstellingen')}</h4>
      
      <div className="settings-group">
        <div className="setting-item">
          <label className="setting-label">
            <input
              type="checkbox"
              checked={channelSettings.slowMode}
              onChange={(e) => {
                const newSettings = { ...channelSettings, slowMode: e.target.checked };
                setChannelSettings(newSettings);
                handleUpdateChannelSettings(newSettings);
              }}
              disabled={isLoading}
            />
            <span>{t('slowMode', 'Langzame modus')}</span>
          </label>
          <p className="setting-description">
            {t('slowModeDesc', 'Beperkt hoe vaak gebruikers berichten kunnen versturen')}
          </p>
          
          {channelSettings.slowMode && (
            <div className="sub-setting">
              <label>
                {t('slowModeInterval', 'Interval (seconden)')}:
                <input
                  type="number"
                  value={channelSettings.slowModeInterval}
                  min="5"
                  max="300"
                  onChange={(e) => {
                    const newSettings = { ...channelSettings, slowModeInterval: parseInt(e.target.value) };
                    setChannelSettings(newSettings);
                  }}
                  onBlur={() => handleUpdateChannelSettings(channelSettings)}
                  disabled={isLoading}
                />
              </label>
            </div>
          )}
        </div>

        <div className="setting-item">
          <label className="setting-label">
            <input
              type="checkbox"
              checked={channelSettings.membersCanInvite}
              onChange={(e) => {
                const newSettings = { ...channelSettings, membersCanInvite: e.target.checked };
                setChannelSettings(newSettings);
                handleUpdateChannelSettings(newSettings);
              }}
              disabled={isLoading}
            />
            <span>{t('membersCanInvite', 'Leden kunnen anderen uitnodigen')}</span>
          </label>
        </div>

        <div className="setting-item">
          <label className="setting-label">
            <input
              type="checkbox"
              checked={channelSettings.membersCanUploadFiles}
              onChange={(e) => {
                const newSettings = { ...channelSettings, membersCanUploadFiles: e.target.checked };
                setChannelSettings(newSettings);
                handleUpdateChannelSettings(newSettings);
              }}
              disabled={isLoading}
            />
            <span>{t('membersCanUploadFiles', 'Leden kunnen bestanden uploaden')}</span>
          </label>
        </div>

        <div className="setting-item">
          <label className="setting-label">
            <input
              type="checkbox"
              checked={channelSettings.announcementOnly}
              onChange={(e) => {
                const newSettings = { ...channelSettings, announcementOnly: e.target.checked };
                setChannelSettings(newSettings);
                handleUpdateChannelSettings(newSettings);
              }}
              disabled={isLoading}
            />
            <span>{t('announcementOnly', 'Alleen aankondigingen')}</span>
          </label>
          <p className="setting-description">
            {t('announcementOnlyDesc', 'Alleen organisators en moderators kunnen berichten versturen')}
          </p>
        </div>
      </div>
    </div>
  );

  const renderUserManagement = () => (
    <div className="user-management-panel">
      <h4>{t('userManagement', 'Gebruikersbeheer')} ({participants.length})</h4>
      
      <div className="users-list">
        {participants.map(user => (
          <div key={user._id} className="user-item">
            <div className="user-info">
              <div className="user-avatar">
                {user.profileImage ? (
                  <img src={user.profileImage} alt={user.username} />
                ) : (
                  <span>{user.username?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="user-details">
                <span className="user-name">{user.username}</span>
                <div className="user-badges">
                  {user._id === organizer && (
                    <span className="badge organizer">{t('organizer', 'Organisator')}</span>
                  )}
                  {conversation.moderators?.includes(user._id) && (
                    <span className="badge moderator">{t('moderator', 'Moderator')}</span>
                  )}
                </div>
              </div>
            </div>
            
            {user._id !== organizer && user._id !== (currentUser.id || currentUser._id) && (
              <div className="user-actions">
                <button
                  className="action-btn mute-btn"
                  onClick={() => handleMuteUser(user._id, 3600000)}
                  disabled={isLoading}
                  title={t('muteUser', 'Dempen (1 uur)')}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
                  </svg>
                </button>
                
                <button
                  className="action-btn kick-btn"
                  onClick={() => handleKickUser(user._id)}
                  disabled={isLoading}
                  title={t('kickUser', 'Uit kanaal verwijderen')}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                </button>

                <button
                  className="action-btn permissions-btn"
                  onClick={() => setSelectedUser(user)}
                  disabled={isLoading}
                  title={t('managePermissions', 'Rechten beheren')}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="moderation-overlay">
      <div className="channel-controls-dialog">
        <div className="moderation-header">
          <h3>{t('activityChannelControls', 'Activiteitskanaal Besturing')}</h3>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="channel-controls-content">
          <div className="controls-tabs">
            <button 
              className={`tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
              onClick={() => setActiveTab('permissions')}
            >
              {t('channelSettings', 'Kanaalinstellingen')}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              {t('userManagement', 'Gebruikers')} ({participants.length})
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'permissions' ? renderChannelSettings() : renderUserManagement()}
          </div>
        </div>

        {selectedUser && (
          <div className="user-permissions-overlay">
            <div className="user-permissions-dialog">
              <div className="moderation-header">
                <h4>{t('managePermissions', 'Rechten beheren')}: {selectedUser.username}</h4>
                <button className="close-btn" onClick={() => setSelectedUser(null)}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              
              <div className="permissions-list">
                <div className="permission-item">
                  <label>
                    <input 
                      type="checkbox" 
                      defaultChecked={true}
                      onChange={(e) => handleUserPermissionToggle(selectedUser._id, 'canSendMessages')}
                    />
                    {t('canSendMessages', 'Kan berichten versturen')}
                  </label>
                </div>
                
                <div className="permission-item">
                  <label>
                    <input 
                      type="checkbox" 
                      defaultChecked={true}
                      onChange={(e) => handleUserPermissionToggle(selectedUser._id, 'canUploadFiles')}
                    />
                    {t('canUploadFiles', 'Kan bestanden uploaden')}
                  </label>
                </div>
                
                <div className="permission-item">
                  <label>
                    <input 
                      type="checkbox" 
                      defaultChecked={true}
                      onChange={(e) => handleUserPermissionToggle(selectedUser._id, 'canInviteUsers')}
                    />
                    {t('canInviteUsers', 'Kan gebruikers uitnodigen')}
                  </label>
                </div>

                <div className="permission-item">
                  <label>
                    <input 
                      type="checkbox" 
                      defaultChecked={false}
                      onChange={(e) => handleUserPermissionToggle(selectedUser._id, 'isModerator')}
                    />
                    {t('makeModerator', 'Moderator maken')}
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityChannelControls;