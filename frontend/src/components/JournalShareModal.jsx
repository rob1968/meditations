import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';

const JournalShareModal = ({ 
  entry, 
  user, 
  visible, 
  onClose, 
  onShareSuccess 
}) => {
  const { t } = useTranslation();
  const [privacyLevel, setPrivacyLevel] = useState(entry?.privacy || 'private');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [shareSettings, setShareSettings] = useState({
    allowAudioSharing: true,
    allowTextSharing: true,
    anonymousSharing: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    if (visible && user?.id) {
      fetchUserGroups();
    }
    if (entry) {
      setPrivacyLevel(entry.privacy || 'private');
      setSelectedGroups(entry.sharedWithGroups?.map(g => g.groupId) || []);
      setShareSettings({
        allowAudioSharing: entry.shareSettings?.allowAudioSharing !== false,
        allowTextSharing: entry.shareSettings?.allowTextSharing !== false,
        anonymousSharing: entry.shareSettings?.anonymousSharing || false
      });
    }
  }, [visible, user, entry]);

  const fetchUserGroups = async () => {
    if (!user?.id) return;
    
    setLoadingGroups(true);
    try {
      const response = await axios.get(getFullUrl('/api/journalGroups/groups'), {
        params: { userId: user.id }
      });
      
      if (response.data.success) {
        setUserGroups(response.data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching user groups:', error);
      setError(t('failedToLoadGroups', 'Failed to load groups'));
    } finally {
      setLoadingGroups(false);
    }
  };

  const handlePrivacyChange = (newPrivacy) => {
    setPrivacyLevel(newPrivacy);
    if (newPrivacy === 'private') {
      setSelectedGroups([]);
    } else if (newPrivacy === 'public') {
      setSelectedGroups([]);
    }
  };

  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const handleShare = async () => {
    if (!entry?._id) return;

    setIsLoading(true);
    setError('');

    try {
      // Update entry privacy and sharing settings
      const response = await axios.put(getFullUrl(`/api/journal/${entry._id}/privacy`), {
        userId: user.id,
        privacy: privacyLevel,
        shareSettings,
        groupIds: privacyLevel === 'group' ? selectedGroups : []
      });

      if (response.data.success) {
        onShareSuccess(response.data.entry);
        onClose();
      }
    } catch (error) {
      console.error('Error updating journal sharing:', error);
      setError(error.response?.data?.error || t('failedToUpdateSharing', 'Failed to update sharing settings'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content journal-share-modal">
        <div className="modal-header">
          <h3>🔗 {t('shareJournalEntry', 'Share Journal Entry')}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Entry Info */}
          <div className="entry-preview">
            <h4>{entry?.title}</h4>
            <p className="entry-date">
              {entry?.date ? new Date(entry.date).toLocaleDateString() : ''}
            </p>
          </div>

          {/* Privacy Level Selection */}
          <div className="privacy-section">
            <h4>{t('privacyLevel', 'Privacy Level')}</h4>
            <div className="privacy-options">
              <label className={`privacy-option ${privacyLevel === 'private' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="private"
                  checked={privacyLevel === 'private'}
                  onChange={(e) => handlePrivacyChange(e.target.value)}
                />
                <span className="privacy-icon">🔒</span>
                <div>
                  <strong>{t('private', 'Private')}</strong>
                  <p>{t('privateDescription', 'Only visible to you')}</p>
                </div>
              </label>

              <label className={`privacy-option ${privacyLevel === 'group' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="group"
                  checked={privacyLevel === 'group'}
                  onChange={(e) => handlePrivacyChange(e.target.value)}
                />
                <span className="privacy-icon">👥</span>
                <div>
                  <strong>{t('group', 'Group')}</strong>
                  <p>{t('groupDescription', 'Share with selected groups')}</p>
                </div>
              </label>

              <label className={`privacy-option ${privacyLevel === 'public' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="public"
                  checked={privacyLevel === 'public'}
                  onChange={(e) => handlePrivacyChange(e.target.value)}
                />
                <span className="privacy-icon">🌍</span>
                <div>
                  <strong>{t('public', 'Public')}</strong>
                  <p>{t('publicDescription', 'Visible to everyone')}</p>
                </div>
              </label>
            </div>
          </div>

          {/* Group Selection (if group privacy selected) */}
          {privacyLevel === 'group' && (
            <div className="group-selection">
              <h4>{t('selectGroups', 'Select Groups')}</h4>
              {loadingGroups ? (
                <div className="loading-groups">
                  <div className="spinner"></div>
                  <span>{t('loadingGroups', 'Loading groups...')}</span>
                </div>
              ) : userGroups.length === 0 ? (
                <div className="no-groups">
                  <p>{t('noGroupsFound', 'No groups found. Create or join groups to share with them.')}</p>
                  <button 
                    className="create-group-btn"
                    onClick={() => {
                      // TODO: Navigate to group creation
                      console.log('Navigate to group creation');
                    }}
                  >
                    {t('createGroup', 'Create Group')}
                  </button>
                </div>
              ) : (
                <div className="groups-list">
                  {userGroups.map(group => (
                    <label 
                      key={group._id} 
                      className={`group-option ${selectedGroups.includes(group._id) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group._id)}
                        onChange={() => handleGroupToggle(group._id)}
                      />
                      <div className="group-info">
                        <strong>{group.name}</strong>
                        <span className="member-count">
                          {group.memberCount} {t('members', 'members')}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Share Settings */}
          {privacyLevel !== 'private' && (
            <div className="share-settings">
              <h4>{t('shareSettings', 'Share Settings')}</h4>
              <div className="settings-options">
                <label className="setting-option">
                  <input
                    type="checkbox"
                    checked={shareSettings.allowTextSharing}
                    onChange={(e) => setShareSettings(prev => ({
                      ...prev,
                      allowTextSharing: e.target.checked
                    }))}
                  />
                  <span>{t('allowTextSharing', 'Allow text sharing')}</span>
                </label>

                {entry?.audioFile && (
                  <label className="setting-option">
                    <input
                      type="checkbox"
                      checked={shareSettings.allowAudioSharing}
                      onChange={(e) => setShareSettings(prev => ({
                        ...prev,
                        allowAudioSharing: e.target.checked
                      }))}
                    />
                    <span>{t('allowAudioSharing', 'Allow audio sharing')}</span>
                  </label>
                )}

                <label className="setting-option">
                  <input
                    type="checkbox"
                    checked={shareSettings.anonymousSharing}
                    onChange={(e) => setShareSettings(prev => ({
                      ...prev,
                      anonymousSharing: e.target.checked
                    }))}
                  />
                  <span>{t('anonymousSharing', 'Share anonymously')}</span>
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-btn" 
            onClick={onClose}
            disabled={isLoading}
          >
            {t('cancel', 'Cancel')}
          </button>
          <button 
            className="share-btn"
            onClick={handleShare}
            disabled={isLoading || (privacyLevel === 'group' && selectedGroups.length === 0)}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                {t('updating', 'Updating...')}
              </>
            ) : (
              <>
                🔗 {t('updateSharing', 'Update Sharing')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JournalShareModal;