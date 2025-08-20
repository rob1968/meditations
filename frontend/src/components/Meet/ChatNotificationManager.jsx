import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const ChatNotificationManager = ({ currentUser, conversations, enabled = true }) => {
  const { t } = useTranslation();
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [notificationSettings, setNotificationSettings] = useState({
    directMessages: true,
    mentions: true,
    activityUpdates: true,
    moderatorActions: true,
    soundEnabled: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00'
    }
  });
  
  const [activeNotifications, setActiveNotifications] = useState(new Map());
  const audioContextRef = useRef(null);
  const soundBuffersRef = useRef({});

  useEffect(() => {
    if (!enabled) return;
    
    initializeNotifications();
    loadNotificationSettings();
    initializeAudio();
    
    return () => {
      // Cleanup active notifications
      activeNotifications.forEach(notification => {
        if (notification && typeof notification.close === 'function') {
          notification.close();
        }
      });
    };
  }, [enabled]);

  const initializeNotifications = async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        console.log('🔔 Notification permission:', permission);
      } else {
        console.warn('⚠️ Browser does not support notifications');
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
    }
  };

  const loadNotificationSettings = () => {
    try {
      const saved = localStorage.getItem('chatNotificationSettings');
      if (saved) {
        setNotificationSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('❌ Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = (newSettings) => {
    try {
      localStorage.setItem('chatNotificationSettings', JSON.stringify(newSettings));
      setNotificationSettings(newSettings);
    } catch (error) {
      console.error('❌ Error saving notification settings:', error);
    }
  };

  const initializeAudio = async () => {
    try {
      // Initialize Web Audio API for notification sounds
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      // Load notification sound buffers
      const soundFiles = {
        message: '/assets/sounds/message-notification.mp3',
        mention: '/assets/sounds/mention-notification.mp3',
        activity: '/assets/sounds/activity-notification.mp3'
      };

      for (const [key, url] of Object.entries(soundFiles)) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            soundBuffersRef.current[key] = audioBuffer;
          }
        } catch (error) {
          console.warn(`⚠️ Could not load ${key} sound:`, error);
        }
      }
    } catch (error) {
      console.warn('⚠️ Audio context initialization failed:', error);
    }
  };

  const playNotificationSound = (soundType = 'message') => {
    if (!notificationSettings.soundEnabled || !audioContextRef.current || !soundBuffersRef.current[soundType]) {
      return;
    }

    try {
      const source = audioContextRef.current.createBufferSource();
      const gainNode = audioContextRef.current.createGain();
      
      source.buffer = soundBuffersRef.current[soundType];
      gainNode.gain.value = 0.3; // Moderate volume
      
      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      source.start();
    } catch (error) {
      console.warn('⚠️ Error playing notification sound:', error);
    }
  };

  const isQuietHours = () => {
    if (!notificationSettings.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = notificationSettings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = notificationSettings.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  };

  const shouldNotifyForMessage = (message, conversation) => {
    if (!enabled || notificationPermission !== 'granted') return false;
    if (isQuietHours()) return false;
    
    // Don't notify for own messages
    if (message.sender?._id === (currentUser?.id || currentUser?._id)) return false;
    
    // Check notification settings
    if (conversation.type === 'direct' && !notificationSettings.directMessages) return false;
    if (conversation.type === 'activity' && !notificationSettings.activityUpdates) return false;
    
    // Check for mentions
    const messageText = message.content?.text || '';
    const userMentioned = messageText.includes(`@${currentUser?.username}`) || 
                         messageText.includes('@everyone') ||
                         messageText.includes('@here');
    
    if (userMentioned && !notificationSettings.mentions) return false;
    
    // Special notification for activity organizers
    if (conversation.type === 'activity') {
      const isOrganizer = conversation.activity?.organizer === (currentUser?.id || currentUser?._id);
      if (isOrganizer && message.content?.type === 'activity_update') {
        return notificationSettings.moderatorActions;
      }
    }
    
    return true;
  };

  const showChatNotification = (message, conversation) => {
    if (!shouldNotifyForMessage(message, conversation)) return;
    
    try {
      const conversationTitle = conversation.type === 'direct' 
        ? conversation.participants.find(p => p._id !== (currentUser?.id || currentUser?._id))?.username || 'Unknown'
        : conversation.name || 'Group Chat';
      
      const senderName = message.sender?.username || 'Unknown';
      const messageText = message.content?.text || '';
      
      let notificationTitle = '';
      let notificationBody = '';
      let soundType = 'message';
      
      // Determine notification content based on message type and context
      if (conversation.type === 'direct') {
        notificationTitle = `${senderName}`;
        notificationBody = messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText;
      } else if (conversation.type === 'activity') {
        notificationTitle = `${conversationTitle}`;
        notificationBody = `${senderName}: ${messageText.length > 80 ? messageText.substring(0, 80) + '...' : messageText}`;
        soundType = 'activity';
      }
      
      // Check for mentions and adjust notification
      if (messageText.includes(`@${currentUser?.username}`) || messageText.includes('@everyone')) {
        notificationTitle = `💬 ${notificationTitle}`;
        notificationBody = `Je bent genoemd: ${notificationBody}`;
        soundType = 'mention';
      }
      
      // Special handling for activity updates
      if (message.content?.type === 'activity_update') {
        notificationTitle = `📅 ${conversationTitle}`;
        notificationBody = `Activiteitsupdate: ${messageText}`;
        soundType = 'activity';
      }
      
      // Create and show notification
      const notification = new Notification(notificationTitle, {
        body: notificationBody,
        icon: '/assets/icons/chat-notification.png',
        badge: '/assets/icons/badge.png',
        tag: `chat-${conversation._id}`,
        requireInteraction: false,
        silent: !notificationSettings.soundEnabled,
        data: {
          conversationId: conversation._id,
          messageId: message._id,
          timestamp: Date.now()
        }
      });
      
      // Store notification reference
      setActiveNotifications(prev => new Map(prev).set(message._id, notification));
      
      // Handle notification click
      notification.onclick = () => {
        window.focus();
        // Emit event for parent component to handle navigation
        window.dispatchEvent(new CustomEvent('chatNotificationClick', {
          detail: { conversationId: conversation._id, messageId: message._id }
        }));
        notification.close();
      };
      
      // Auto-close notification after 5 seconds
      setTimeout(() => {
        notification.close();
        setActiveNotifications(prev => {
          const newMap = new Map(prev);
          newMap.delete(message._id);
          return newMap;
        });
      }, 5000);
      
      // Play notification sound
      playNotificationSound(soundType);
      
    } catch (error) {
      console.error('❌ Error showing chat notification:', error);
    }
  };

  const showModerationNotification = (action, targetUser, conversation) => {
    if (!enabled || notificationPermission !== 'granted' || !notificationSettings.moderatorActions) return;
    if (isQuietHours()) return;
    
    try {
      const conversationTitle = conversation.name || 'Activity Chat';
      
      let title = '';
      let body = '';
      
      switch (action.type) {
        case 'user_muted':
          title = `🔇 Gebruiker gedempt`;
          body = `${targetUser.username} is gedempt in ${conversationTitle}`;
          break;
        case 'user_kicked':
          title = `👋 Gebruiker verwijderd`;
          body = `${targetUser.username} is verwijderd uit ${conversationTitle}`;
          break;
        case 'message_deleted':
          title = `🗑️ Bericht verwijderd`;
          body = `Een bericht is verwijderd in ${conversationTitle}`;
          break;
        case 'channel_settings_changed':
          title = `⚙️ Kanaalinstellingen gewijzigd`;
          body = `Instellingen zijn aangepast in ${conversationTitle}`;
          break;
        default:
          return;
      }
      
      const notification = new Notification(title, {
        body: body,
        icon: '/assets/icons/moderation-notification.png',
        tag: `moderation-${conversation._id}-${Date.now()}`,
        requireInteraction: false,
        silent: !notificationSettings.soundEnabled
      });
      
      setTimeout(() => notification.close(), 4000);
      playNotificationSound('activity');
      
    } catch (error) {
      console.error('❌ Error showing moderation notification:', error);
    }
  };

  const NotificationSettingsPanel = ({ onClose }) => (
    <div className="notification-settings-overlay">
      <div className="notification-settings-dialog">
        <div className="moderation-header">
          <h3>{t('notificationSettings', 'Berichtnotificaties')}</h3>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div className="notification-settings-content">
          <div className="settings-section">
            <h4>{t('messageTypes', 'Berichttypen')}</h4>
            
            <label className="setting-item">
              <input
                type="checkbox"
                checked={notificationSettings.directMessages}
                onChange={(e) => saveNotificationSettings({
                  ...notificationSettings,
                  directMessages: e.target.checked
                })}
              />
              <span>{t('directMessages', 'Directe berichten')}</span>
            </label>
            
            <label className="setting-item">
              <input
                type="checkbox"
                checked={notificationSettings.mentions}
                onChange={(e) => saveNotificationSettings({
                  ...notificationSettings,
                  mentions: e.target.checked
                })}
              />
              <span>{t('mentions', 'Vermeldingen (@gebruikersnaam)')}</span>
            </label>
            
            <label className="setting-item">
              <input
                type="checkbox"
                checked={notificationSettings.activityUpdates}
                onChange={(e) => saveNotificationSettings({
                  ...notificationSettings,
                  activityUpdates: e.target.checked
                })}
              />
              <span>{t('activityUpdates', 'Activiteitsupdates')}</span>
            </label>
            
            <label className="setting-item">
              <input
                type="checkbox"
                checked={notificationSettings.moderatorActions}
                onChange={(e) => saveNotificationSettings({
                  ...notificationSettings,
                  moderatorActions: e.target.checked
                })}
              />
              <span>{t('moderatorActions', 'Moderatoracties')}</span>
            </label>
          </div>
          
          <div className="settings-section">
            <h4>{t('soundAndDisplay', 'Geluid & Weergave')}</h4>
            
            <label className="setting-item">
              <input
                type="checkbox"
                checked={notificationSettings.soundEnabled}
                onChange={(e) => saveNotificationSettings({
                  ...notificationSettings,
                  soundEnabled: e.target.checked
                })}
              />
              <span>{t('playSound', 'Notificatiegeluid afspelen')}</span>
            </label>
          </div>
          
          <div className="settings-section">
            <h4>{t('quietHours', 'Stille uren')}</h4>
            
            <label className="setting-item">
              <input
                type="checkbox"
                checked={notificationSettings.quietHours.enabled}
                onChange={(e) => saveNotificationSettings({
                  ...notificationSettings,
                  quietHours: {
                    ...notificationSettings.quietHours,
                    enabled: e.target.checked
                  }
                })}
              />
              <span>{t('enableQuietHours', 'Stille uren inschakelen')}</span>
            </label>
            
            {notificationSettings.quietHours.enabled && (
              <div className="quiet-hours-settings">
                <div className="time-input-group">
                  <label>
                    {t('from', 'Van')}:
                    <input
                      type="time"
                      value={notificationSettings.quietHours.start}
                      onChange={(e) => saveNotificationSettings({
                        ...notificationSettings,
                        quietHours: {
                          ...notificationSettings.quietHours,
                          start: e.target.value
                        }
                      })}
                    />
                  </label>
                  
                  <label>
                    {t('until', 'Tot')}:
                    <input
                      type="time"
                      value={notificationSettings.quietHours.end}
                      onChange={(e) => saveNotificationSettings({
                        ...notificationSettings,
                        quietHours: {
                          ...notificationSettings.quietHours,
                          end: e.target.value
                        }
                      })}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
          
          <div className="notification-status">
            {notificationPermission === 'granted' ? (
              <div className="status-granted">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>{t('notificationsEnabled', 'Notificaties ingeschakeld')}</span>
              </div>
            ) : notificationPermission === 'denied' ? (
              <div className="status-denied">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>{t('notificationsBlocked', 'Notificaties geblokkeerd door browser')}</span>
              </div>
            ) : (
              <div className="status-pending">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>{t('notificationsPending', 'Wacht op toestemming...')}</span>
                <button 
                  className="request-permission-btn"
                  onClick={() => initializeNotifications()}
                >
                  {t('requestPermission', 'Toestemming vragen')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Expose notification methods to parent components
  React.useImperativeHandle = React.useImperativeHandle || (() => {});
  
  return {
    showChatNotification,
    showModerationNotification,
    NotificationSettingsPanel,
    notificationPermission,
    notificationSettings,
    isQuietHours: isQuietHours(),
    enabled: enabled && notificationPermission === 'granted'
  };
};

export default ChatNotificationManager;