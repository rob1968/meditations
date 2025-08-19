import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import socketService from '../../services/socketService';
import { API_BASE_URL } from '../../config/api';

const ChatWindow = ({ conversation, currentUser, onBack }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingTime = useRef(0);

  // Get other user for direct conversations
  const otherUser = conversation.type === 'direct' 
    ? conversation.participants.find(p => p._id !== currentUser._id)
    : null;

  const conversationTitle = conversation.type === 'direct' 
    ? otherUser?.username || 'Unknown User'
    : conversation.name;

  useEffect(() => {
    if (!conversation?._id || !currentUser?._id) {
      console.warn('Missing conversation or user data, skipping chat initialization');
      return;
    }

    fetchMessages();
    joinConversation();
    setupSocketListeners();

    return () => {
      leaveConversation();
      cleanupSocketListeners();
    };
  }, [conversation?._id, currentUser?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    // Safety check: ensure we have all required data
    if (!conversation?._id || !currentUser?._id) {
      console.warn('Cannot fetch messages: missing conversation or user data', {
        conversationId: conversation?._id,
        userId: currentUser?._id,
        conversation,
        currentUser
      });
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 Fetching messages for conversation:', conversation._id, 'user:', currentUser._id);
      
      const response = await fetch(
        `${API_BASE_URL}/meet/conversations/${conversation._id}/messages?page=${page}&limit=50`,
        {
          headers: {
            'x-user-id': currentUser._id || currentUser.id || ''
          }
        }
      );

      console.log('📡 Messages API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Messages fetched successfully:', data.messages?.length || 0, data);
        setMessages(data.messages || []);
        setHasMore(data.hasMore || false);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch messages:', response.status, errorText);
        
        // For demo purposes, if we get a 401/404, show some mock messages
        if (response.status === 401 || response.status === 404) {
          console.log('🔧 Setting mock messages for demo');
          setMessages([
            {
              _id: 'mock1',
              sender: { _id: 'other', username: 'Demo User' },
              content: { text: 'Hallo! Welkom bij de Meet chat functie.' },
              createdAt: new Date(Date.now() - 1000000).toISOString()
            },
            {
              _id: 'mock2', 
              sender: { _id: currentUser._id, username: currentUser.username },
              content: { text: 'Hallo! Dit ziet er geweldig uit!' },
              createdAt: new Date(Date.now() - 500000).toISOString()
            },
            {
              _id: 'mock3',
              sender: { _id: 'other', username: 'Demo User' },
              content: { text: 'Ja, de nieuwe Telegram-stijl ziet er heel modern uit! 🚀' },
              createdAt: new Date().toISOString()
            }
          ]);
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('💥 Error fetching messages:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const joinConversation = () => {
    if (conversation?._id) {
      socketService.joinConversation(conversation._id);
    }
  };

  const leaveConversation = () => {
    if (conversation?._id) {
      socketService.leaveConversation(conversation._id);
    }
  };

  const setupSocketListeners = () => {
    socketService.on('new_message', handleNewMessage);
    socketService.on('user_typing', handleUserTyping);
    socketService.on('user_stopped_typing', handleUserStoppedTyping);
    socketService.on('user_joined_conversation', handleUserJoined);
    socketService.on('user_left_conversation', handleUserLeft);
  };

  const cleanupSocketListeners = () => {
    socketService.off('new_message', handleNewMessage);
    socketService.off('user_typing', handleUserTyping);
    socketService.off('user_stopped_typing', handleUserStoppedTyping);
    socketService.off('user_joined_conversation', handleUserJoined);
    socketService.off('user_left_conversation', handleUserLeft);
  };

  const handleNewMessage = (data) => {
    if (data?.conversationId === conversation?._id) {
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
        
        // Remove sender from typing users (with safety check)
        if (data.message.sender?._id) {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.message.sender._id);
            return newSet;
          });
        }
      }
    }
  };

  const handleUserTyping = (data) => {
    if (data?.conversationId === conversation?._id && 
        data?.userId !== currentUser?._id && 
        data?.userId) {
      setTypingUsers(prev => new Set([...prev, data.userId]));
    }
  };

  const handleUserStoppedTyping = (data) => {
    if (data?.conversationId === conversation?._id && data?.userId) {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    }
  };

  const handleUserJoined = (data) => {
    if (data?.conversationId === conversation?._id) {
      // Add system message or notification
      console.log(`${data?.username || 'Unknown user'} joined the conversation`);
    }
  };

  const handleUserLeft = (data) => {
    if (data?.conversationId === conversation?._id) {
      // Add system message or notification
      console.log(`${data?.username || 'Unknown user'} left the conversation`);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending || !conversation?._id || !currentUser?._id) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      // Send via socket for real-time delivery
      socketService.sendMessage(conversation._id, messageText);
      
      // Focus back to input
      messageInputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      setNewMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Typing indicator logic (with safety checks)
    if (conversation?._id && currentUser?._id) {
      const now = Date.now();
      lastTypingTime.current = now;
      
      // Start typing indicator
      socketService.startTyping(conversation._id);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 1 second of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (Date.now() - lastTypingTime.current >= 1000 && conversation?._id) {
          socketService.stopTyping(conversation._id);
        }
      }, 1000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Vandaag';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Gisteren';
    } else {
      return date.toLocaleDateString('nl-NL');
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    
    if (!messages || !Array.isArray(messages)) {
      return groups;
    }
    
    messages.forEach(message => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const renderTypingIndicator = () => {
    if (typingUsers.size === 0) return null;

    const typingUsernames = Array.from(typingUsers).map(userId => {
      if (conversation.type === 'direct') {
        return otherUser?.username || 'Someone';
      }
      // For groups, you'd need to map userId to username
      return 'Someone';
    });

    return (
      <div className="typing-indicator">
        <div className="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span className="typing-text">
          {typingUsernames.join(', ')} {typingUsernames.length === 1 ? 'is' : 'zijn'} aan het typen...
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="chat-window">
        <div className="chat-header">
          <button className="back-button" onClick={onBack}>←</button>
          <h3>Loading...</h3>
        </div>
        <div className="chat-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Berichten laden...</p>
          </div>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button className="back-button" onClick={onBack}>
          ←
        </button>
        <div className="chat-info">
          <h3>{conversationTitle}</h3>
          {conversation.type === 'direct' && otherUser && (
            <span className="chat-subtitle">
              {otherUser.location?.city && `${otherUser.location.city} • `}
              {/* Add online status */}
              <span className="status-indicator">Online</span>
            </span>
          )}
          {conversation.type === 'group' && (
            <span className="chat-subtitle">
              {conversation.participants?.length || 0} leden
            </span>
          )}
        </div>
        <div className="chat-actions">
          {conversation.type === 'group' && (
            <button className="meditation-button" title="Start groepsmeditatie">
              🧘‍♀️
            </button>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {Object.entries(messageGroups || {}).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="date-separator">
              <span>{formatDate(dateMessages[0].createdAt)}</span>
            </div>
            
            {dateMessages.map((message, index) => {
              // Safety checks for message and user data
              if (!message || !currentUser) return null;
              
              const isOwnMessage = message.sender?._id === currentUser._id;
              const showAvatar = !isOwnMessage && (
                index === 0 || 
                dateMessages[index - 1]?.sender?._id !== message.sender?._id
              );

              return (
                <div
                  key={message._id}
                  className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}
                >
                  {showAvatar && conversation.type === 'group' && (
                    <div className="message-avatar">
                      {message.sender?.profileImage ? (
                        <img src={message.sender?.profileImage} alt={message.sender?.username || 'Gebruiker'} />
                      ) : (
                        <div className="avatar-placeholder">
                          {message.sender?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="message-content">
                    {!isOwnMessage && conversation.type === 'group' && showAvatar && (
                      <div className="message-sender">{message.sender?.username || 'Onbekend'}</div>
                    )}
                    
                    <div className="message-bubble">
                      <p>{message.content.text}</p>
                      <span className="message-time">{formatTime(message.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        {renderTypingIndicator()}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <div className="input-container">
          <textarea
            ref={messageInputRef}
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={`Bericht naar ${conversationTitle}...`}
            rows="1"
            disabled={isSending}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
            className="send-button"
          >
            {isSending ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;