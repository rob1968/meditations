import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import socketService from '../../services/socketService';
import ChatWindow from './ChatWindow';

const ChatList = ({ user, activityId, onUnreadCountChange }) => {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchConversations();
    setupSocketListeners();
    
    return () => {
      cleanupSocketListeners();
    };
  }, [user._id]);

  // Auto-select activity conversation if activityId is provided
  useEffect(() => {
    if (activityId && conversations.length > 0) {
      const activityConversation = conversations.find(
        conv => conv.metadata?.activityId === activityId
      );
      if (activityConversation) {
        setSelectedConversation(activityConversation);
        setActiveTab('activities');
      }
    }
  }, [activityId, conversations]);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading real conversations for user:', user._id);

      if (!user?._id && !user?.id) {
        console.log('❌ No user ID available for conversations');
        setConversations([]);
        setIsLoading(false);
        return;
      }

      // Load real conversations from API
      const response = await fetch('/api/conversations', {
        headers: {
          'x-user-id': user._id || user.id,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Real conversations loaded:', data.conversations?.length || 0);
        setConversations(data.conversations || []);
        
        // Update unread count if callback provided
        if (onUnreadCountChange) {
          const unreadCount = data.conversations?.reduce((count, conv) => 
            count + (conv.unreadCount || 0), 0
          ) || 0;
          onUnreadCountChange(unreadCount);
        }
      } else {
        console.error('❌ Failed to load conversations:', response.status);
        setConversations([]);
      }
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const setupSocketListeners = () => {
    if (socketService.socket) {
      socketService.on('new_message', handleNewMessage);
      socketService.on('conversation_updated', handleConversationUpdate);
    }
  };

  const cleanupSocketListeners = () => {
    if (socketService.socket) {
      socketService.off('new_message', handleNewMessage);
      socketService.off('conversation_updated', handleConversationUpdate);
    }
  };

  const handleNewMessage = (data) => {
    console.log('📩 New message received:', data);
    
    // Update conversation list
    setConversations(prev => prev.map(conv => {
      if (conv._id === data.conversationId) {
        return {
          ...conv,
          lastMessage: {
            text: data.message.text,
            timestamp: new Date(data.message.timestamp),
            sender: data.message.sender
          },
          unreadCount: conv._id === selectedConversation?._id ? 0 : conv.unreadCount + 1
        };
      }
      return conv;
    }));
  };

  const handleConversationUpdate = (data) => {
    console.log('🔄 Conversation updated:', data);
    fetchConversations(); // Refresh conversations
  };

  const filteredConversations = conversations.filter(conv => {
    switch (activeTab) {
      case 'activities':
        return conv.type === 'activity';
      case 'direct':
        return conv.type === 'direct';
      default:
        return true;
    }
  });

  const getConversationTitle = (conversation) => {
    if (conversation.type === 'activity') {
      return conversation.metadata?.name || 'Activiteit Chat';
    } else if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(p => p._id !== user._id);
      return otherParticipant?.username || 'Direct Chat';
    }
    return 'Chat';
  };

  const getConversationSubtitle = (conversation) => {
    if (conversation.type === 'activity' && conversation.metadata?.activityDate) {
      const date = new Date(conversation.metadata.activityDate);
      const now = new Date();
      const diffMs = date - now;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        return `${diffDays} ${diffDays === 1 ? 'dag' : 'dagen'}`;
      } else if (diffHours > 0) {
        return `${diffHours} ${diffHours === 1 ? 'uur' : 'uur'}`;
      } else if (diffMs > 0) {
        return 'Binnenkort';
      } else {
        return 'Bezig';
      }
    }
    return `${conversation.participants.length} ${t('participants', 'deelnemers')}`;
  };

  const formatLastMessageTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}u`;
    if (minutes > 0) return `${minutes}m`;
    return 'nu';
  };

  if (selectedConversation) {
    return (
      <ChatWindow
        conversation={selectedConversation}
        user={user}
        onBack={() => setSelectedConversation(null)}
        onMessageSent={handleNewMessage}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="chat-list-loading">
        <div className="loading-animation"></div>
        <p className="loading-text">{t('loadingChats', 'Chats laden...')}</p>
      </div>
    );
  }

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h2 className="chat-list-title">{t('chats', 'Chats')}</h2>
        <p className="chat-list-subtitle">
          {t('chatSubtitle', 'Praat met andere deelnemers over activiteiten')}
        </p>
      </div>

      <div className="chat-tabs">
        <div className="chat-tabs-container">
          <button
            className={`chat-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span className="chat-tab-icon">💬</span>
            <span className="chat-tab-label">{t('allChats', 'Alle')}</span>
            <span className="chat-tab-count">({conversations.length})</span>
          </button>
          
          <button
            className={`chat-tab ${activeTab === 'activities' ? 'active' : ''}`}
            onClick={() => setActiveTab('activities')}
          >
            <span className="chat-tab-icon">📅</span>
            <span className="chat-tab-label">{t('activityChats', 'Activiteiten')}</span>
            <span className="chat-tab-count">
              ({conversations.filter(c => c.type === 'activity').length})
            </span>
          </button>
          
          <button
            className={`chat-tab ${activeTab === 'direct' ? 'active' : ''}`}
            onClick={() => setActiveTab('direct')}
          >
            <span className="chat-tab-icon">👤</span>
            <span className="chat-tab-label">{t('directChats', 'Direct')}</span>
            <span className="chat-tab-count">
              ({conversations.filter(c => c.type === 'direct').length})
            </span>
          </button>
        </div>
      </div>

      <div className="chat-list-content">
        {filteredConversations.length === 0 ? (
          <div className="no-chats">
            <div className="no-chats-icon">
              {activeTab === 'activities' && '📅'}
              {activeTab === 'direct' && '👤'}
              {activeTab === 'all' && '💬'}
            </div>
            <h3 className="no-chats-title">
              {activeTab === 'activities' && t('noActivityChats', 'Geen activiteit chats')}
              {activeTab === 'direct' && t('noDirectChats', 'Geen directe chats')}
              {activeTab === 'all' && t('noChats', 'Geen chats')}
            </h3>
            <p className="no-chats-description">
              {activeTab === 'activities' && t('noActivityChatsDesc', 'Meld je aan voor activiteiten om te chatten met andere deelnemers')}
              {activeTab === 'direct' && t('noDirectChatsDesc', 'Start een direct gesprek door op iemands profiel te klikken')}
              {activeTab === 'all' && t('noChatsDesc', 'Je chatgeschiedenis verschijnt hier')}
            </p>
          </div>
        ) : (
          <div className="conversations-list">
            {filteredConversations.map(conversation => (
              <div
                key={conversation._id}
                className="conversation-item"
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="conversation-avatar">
                  {conversation.type === 'activity' ? (
                    <span className="activity-chat-icon">📅</span>
                  ) : (
                    <span className="direct-chat-icon">👤</span>
                  )}
                  {conversation.unreadCount > 0 && (
                    <span className="unread-indicator">{conversation.unreadCount}</span>
                  )}
                </div>

                <div className="conversation-content">
                  <div className="conversation-header">
                    <h4 className="conversation-title">
                      {getConversationTitle(conversation)}
                    </h4>
                    <span className="conversation-time">
                      {conversation.lastMessage ? 
                        formatLastMessageTime(conversation.lastMessage.timestamp) : 
                        ''
                      }
                    </span>
                  </div>

                  <div className="conversation-preview">
                    <span className="conversation-subtitle">
                      {getConversationSubtitle(conversation)}
                    </span>
                    {conversation.lastMessage && (
                      <span className="last-message">
                        <span className="message-sender">
                          {conversation.lastMessage.sender.username}:
                        </span>
                        <span className="message-text">
                          {conversation.lastMessage.text.length > 40
                            ? conversation.lastMessage.text.substring(0, 40) + '...'
                            : conversation.lastMessage.text
                          }
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="conversation-indicators">
                  {conversation.type === 'activity' && (
                    <div className="activity-status">
                      <span className="participants-count">
                        👥 {conversation.participants.length}
                      </span>
                    </div>
                  )}
                  <span className="conversation-arrow">›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;