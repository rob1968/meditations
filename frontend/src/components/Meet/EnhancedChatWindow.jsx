import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import socketService from '../../services/socketService';
import { API_BASE_URL } from '../../config/api';
import ChatFileUpload from './ChatFileUpload';
import ChatModerationTools from './ChatModerationTools';
import ActivityChannelControls from './ActivityChannelControls';

const EnhancedChatWindow = ({ conversation, currentUser, onBack }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showModerationTools, setShowModerationTools] = useState(null);
  const [channelPermissions, setChannelPermissions] = useState({});
  
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingTime = useRef(0);

  // Available reactions
  const reactions = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '💯'];

  // Get other user for direct conversations
  const otherUser = conversation.type === 'direct' 
    ? conversation.participants.find(p => p._id !== (currentUser?.id || currentUser?._id))
    : null;

  const conversationTitle = conversation.type === 'direct' 
    ? otherUser?.username || 'Unknown User'
    : conversation.name;

  // Check user permissions for activity-specific channels
  const isActivityOrganizer = conversation.type === 'activity' && 
    (conversation.activity?.organizer === (currentUser?.id || currentUser?._id) ||
     conversation.organizer === (currentUser?.id || currentUser?._id));
  
  const isModerator = conversation.moderators?.includes(currentUser?.id || currentUser?._id) || 
    isActivityOrganizer;

  const hasChannelPermissions = (permission) => {
    if (conversation.type !== 'activity') return true;
    if (isActivityOrganizer || isModerator) return true;
    
    const userPermissions = channelPermissions[currentUser?.id || currentUser?._id] || {};
    return userPermissions[permission] !== false; // Default to true unless explicitly denied
  };

  useEffect(() => {
    if (!conversation?._id || !currentUser?._id) {
      // Skip initialization during loading - this is normal
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
    if (!conversation?._id || !currentUser?._id) {
      // Silently return during initial loading - this is normal behavior
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 Fetching enhanced messages for conversation:', conversation._id);
      
      const response = await fetch(
        `${API_BASE_URL}/meet/conversations/${conversation._id}/messages?page=${page}&limit=50`,
        {
          headers: {
            'x-user-id': currentUser.id || currentUser._id || ''
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Enhanced messages fetched successfully:', data.messages?.length || 0);
        setMessages(data.messages || []);
        setHasMore(data.hasMore || false);
      } else {
        // Enhanced demo messages with reactions and threading
        console.log('🔧 Setting enhanced demo messages');
        setMessages([
          {
            _id: 'demo1',
            sender: { _id: 'other', username: 'Emma', profileImage: null },
            content: { 
              text: 'Hallo allemaal! Super leuk dat we allemaal bij deze wandeling zijn! 🌲',
              type: 'text'
            },
            reactions: {
              '👍': [{ user: currentUser.id || currentUser._id, username: currentUser.username }],
              '🌲': [{ user: 'other2', username: 'Mark' }]
            },
            createdAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            _id: 'demo2',
            sender: { _id: currentUser.id || currentUser._id, username: currentUser.username },
            content: { 
              text: 'Ja, ik heb er echt zin in! Hoe laat vertrekken we precies?',
              type: 'text'
            },
            replyTo: {
              _id: 'demo1',
              sender: { username: 'Emma' },
              content: { text: 'Hallo allemaal! Super leuk dat we...' }
            },
            reactions: {
              '❤️': [{ user: 'other', username: 'Emma' }]
            },
            createdAt: new Date(Date.now() - 3000000).toISOString()
          },
          {
            _id: 'demo3',
            sender: { _id: 'other2', username: 'Mark', profileImage: null },
            content: { 
              text: 'We vertrekken om 10:00 vanaf het treinstation. Vergeet je wandelschoenen niet! 👟',
              type: 'text'
            },
            reactions: {
              '👍': [
                { user: currentUser.id || currentUser._id, username: currentUser.username },
                { user: 'other', username: 'Emma' }
              ]
            },
            createdAt: new Date(Date.now() - 1800000).toISOString()
          },
          {
            _id: 'demo4',
            sender: { _id: 'other', username: 'Emma', profileImage: null },
            content: { 
              text: 'Perfect! Zien jullie bij de hoofdingang. Tot zo! 👋',
              type: 'text'
            },
            createdAt: new Date(Date.now() - 900000).toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('💥 Error fetching enhanced messages:', error);
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
    socketService.on('message_reaction', handleMessageReaction);
    socketService.on('user_typing', handleUserTyping);
    socketService.on('user_stopped_typing', handleUserStoppedTyping);
  };

  const cleanupSocketListeners = () => {
    socketService.off('new_message', handleNewMessage);
    socketService.off('message_reaction', handleMessageReaction);
    socketService.off('user_typing', handleUserTyping);
    socketService.off('user_stopped_typing', handleUserStoppedTyping);
  };

  const handleNewMessage = (data) => {
    if (data?.conversationId === conversation?._id) {
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
        
        // Remove sender from typing users
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

  const handleMessageReaction = (data) => {
    if (data?.conversationId === conversation?._id) {
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, reactions: data.reactions }
          : msg
      ));
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

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachmentPreview) || isSending || !conversation?._id || !currentUser?._id) return;
    
    // Check channel permissions
    if (!hasChannelPermissions('canSendMessages')) {
      console.warn('User does not have permission to send messages in this channel');
      return;
    }

    const messageText = newMessage.trim();
    let messageData = {
      text: messageText,
      type: 'text',
      replyTo: replyingTo
    };

    // Handle file attachment
    if (attachmentPreview) {
      messageData = {
        text: messageText || `📎 ${attachmentPreview.name}`,
        type: attachmentPreview.isImage ? 'image' : 'file',
        attachment: {
          name: attachmentPreview.name,
          size: attachmentPreview.size,
          type: attachmentPreview.type,
          url: attachmentPreview.previewUrl // In real implementation, this would be uploaded URL
        },
        replyTo: replyingTo
      };
    }

    setNewMessage('');
    setReplyingTo(null);
    setAttachmentPreview(null);
    setIsSending(true);

    try {
      // Create optimistic message
      const optimisticMessage = {
        _id: 'temp_' + Date.now(),
        sender: { 
          _id: currentUser.id || currentUser._id, 
          username: currentUser.username 
        },
        content: messageData,
        createdAt: new Date().toISOString(),
        reactions: {},
        replyTo: replyingTo
      };

      setMessages(prev => [...prev, optimisticMessage]);

      // Send via socket for real-time delivery
      socketService.sendMessage(conversation._id, messageData);
      
      messageInputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
      setReplyingTo(replyingTo);
      if (messageData.attachment) {
        setAttachmentPreview(attachmentPreview);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = async (messageId, reaction) => {
    try {
      // Optimistic update
      setMessages(prev => prev.map(msg => {
        if (msg._id === messageId) {
          const reactions = { ...msg.reactions };
          const currentUserId = currentUser.id || currentUser._id;
          
          if (reactions[reaction]) {
            const userIndex = reactions[reaction].findIndex(u => u.user === currentUserId);
            if (userIndex >= 0) {
              // Remove reaction
              reactions[reaction].splice(userIndex, 1);
              if (reactions[reaction].length === 0) {
                delete reactions[reaction];
              }
            } else {
              // Add reaction
              reactions[reaction].push({ 
                user: currentUserId, 
                username: currentUser.username 
              });
            }
          } else {
            // Add new reaction type
            reactions[reaction] = [{ 
              user: currentUserId, 
              username: currentUser.username 
            }];
          }
          
          return { ...msg, reactions };
        }
        return msg;
      }));

      // Send reaction via socket
      socketService.sendReaction(conversation._id, messageId, reaction);
      
      setShowReactionPicker(null);
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  };

  const handleFileSelect = (fileData) => {
    setAttachmentPreview(fileData);
    setShowFileUpload(false);
  };

  // Moderation handlers
  const handleReport = async (reportData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/meet/conversations/${conversation._id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || currentUser?._id
        },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        console.log('Report submitted successfully');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };

  const handleBlockUser = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/meet/conversations/${conversation._id}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || currentUser?._id
        },
        body: JSON.stringify({ blockedUserId: userId })
      });

      if (response.ok) {
        console.log('User blocked successfully');
        // Remove messages from blocked user in UI
        setMessages(prev => prev.filter(msg => msg.sender?._id !== userId));
      }
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/meet/conversations/${conversation._id}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser?.id || currentUser?._id
        }
      });

      if (response.ok) {
        console.log('Message deleted successfully');
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleEditMessage = (message) => {
    // For now, just copy the message text to input for editing
    setNewMessage(message.content?.text || '');
    setReplyingTo(null);
    messageInputRef.current?.focus();
  };

  // Activity-specific channel controls
  const handleMuteUser = async (userId, duration = 3600000) => { // 1 hour default
    if (!isActivityOrganizer && !isModerator) return;

    try {
      const response = await fetch(`${API_BASE_URL}/meet/conversations/${conversation._id}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || currentUser?._id
        },
        body: JSON.stringify({ 
          mutedUserId: userId, 
          duration: duration,
          reason: 'Muted by organizer'
        })
      });

      if (response.ok) {
        console.log('User muted successfully');
      }
    } catch (error) {
      console.error('Error muting user:', error);
    }
  };

  const handleSetChannelPermissions = async (userId, permissions) => {
    if (!isActivityOrganizer && !isModerator) return;

    try {
      const response = await fetch(`${API_BASE_URL}/meet/conversations/${conversation._id}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || currentUser?._id
        },
        body: JSON.stringify({ 
          targetUserId: userId, 
          permissions: permissions
        })
      });

      if (response.ok) {
        console.log('Channel permissions updated');
        setChannelPermissions(prev => ({
          ...prev,
          [userId]: permissions
        }));
      }
    } catch (error) {
      console.error('Error updating channel permissions:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('image')) return '🖼️';
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('audio')) return '🎵';
    if (fileType?.includes('video')) return '🎬';
    if (fileType?.includes('text')) return '📝';
    return '📎';
  };

  const renderFileAttachment = (attachment) => {
    if (!attachment) return null;

    if (attachment.type?.startsWith('image/') || attachment.url?.includes('image')) {
      return (
        <div className="image-attachment">
          <img src={attachment.url} alt={attachment.name} />
        </div>
      );
    }

    return (
      <div className="message-file-attachment">
        <div className="file-attachment-header">
          <div className="file-icon">
            {getFileIcon(attachment.type)}
          </div>
          <div className="file-info">
            <div className="file-name">{attachment.name}</div>
            <div className="file-size">{formatFileSize(attachment.size)}</div>
          </div>
          <button className="file-download-btn" onClick={() => {
            // In real implementation, this would download the file
            console.log('Download file:', attachment.name);
          }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m7-10v12m0 0l-3-3m3 3l3-3"/>
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Typing indicator logic
    if (conversation?._id && currentUser?._id) {
      const now = Date.now();
      lastTypingTime.current = now;
      
      socketService.startTyping(conversation._id);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
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

  const renderReactions = (message) => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) {
      return null;
    }

    return (
      <div className="message-reactions">
        {Object.entries(message.reactions).map(([emoji, users]) => (
          <button
            key={emoji}
            className={`reaction-bubble ${users.some(u => u.user === (currentUser.id || currentUser._id)) ? 'own-reaction' : ''}`}
            onClick={() => handleReaction(message._id, emoji)}
          >
            <span className="reaction-emoji">{emoji}</span>
            <span className="reaction-count">{users.length}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderReplyPreview = () => {
    if (!replyingTo) return null;

    return (
      <div className="reply-preview">
        <div className="reply-preview-content">
          <span className="reply-preview-sender">{replyingTo.sender.username}</span>
          <span className="reply-preview-text">
            {replyingTo.content.text.length > 50 
              ? replyingTo.content.text.substring(0, 50) + '...'
              : replyingTo.content.text
            }
          </span>
        </div>
        <button 
          className="reply-preview-close"
          onClick={() => setReplyingTo(null)}
        >
          ✕
        </button>
      </div>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.size === 0) return null;

    const typingUserArray = Array.from(typingUsers);
    const typingUsernames = typingUserArray.map(userId => {
      if (conversation.type === 'direct') {
        return otherUser?.username || 'Someone';
      } else {
        // For group chats, find user by ID in participants
        const typingUser = conversation.participants?.find(p => p._id === userId);
        return typingUser?.username || 'Someone';
      }
    }).filter(Boolean);

    let typingText = '';
    if (typingUsernames.length === 1) {
      typingText = `${typingUsernames[0]} is typing...`;
    } else if (typingUsernames.length === 2) {
      typingText = `${typingUsernames[0]} and ${typingUsernames[1]} are typing...`;
    } else if (typingUsernames.length > 2) {
      typingText = `${typingUsernames.length} people are typing...`;
    }

    return (
      <div className="enhanced-typing-indicator">
        <div className="typing-avatars">
          {typingUserArray.slice(0, 3).map((userId, index) => {
            const user = conversation.participants?.find(p => p._id === userId);
            return (
              <div key={userId} className="typing-avatar" style={{ left: `${index * 8}px` }}>
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user.username} />
                ) : (
                  <div className="avatar-placeholder">
                    {user?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="typing-dots">
                  <span style={{ animationDelay: `${index * 0.2}s` }}></span>
                  <span style={{ animationDelay: `${index * 0.2 + 0.2}s` }}></span>
                  <span style={{ animationDelay: `${index * 0.2 + 0.4}s` }}></span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="typing-text">
          <span className="typing-message">{typingText}</span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="enhanced-chat-window">
        <div className="enhanced-chat-header">
          <button className="back-button" onClick={onBack}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <h3>Loading...</h3>
        </div>
        <div className="enhanced-chat-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Enhanced berichten laden...</p>
          </div>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="enhanced-chat-window">
      {/* Enhanced Header */}
      <div className="enhanced-chat-header">
        <button className="back-button" onClick={onBack}>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        
        <div className="chat-info">
          <div className="chat-avatar">
            {conversation.type === 'direct' && otherUser?.profileImage ? (
              <img src={otherUser.profileImage} alt={otherUser.username} />
            ) : (
              <div className="avatar-placeholder">
                {conversation.type === 'direct' ? 
                  otherUser?.username?.[0]?.toUpperCase() : 
                  '👥'
                }
              </div>
            )}
            <div className="online-indicator"></div>
          </div>
          
          <div className="chat-details">
            <h3>{conversationTitle}</h3>
            <div className="chat-subtitle">
              {conversation.type === 'direct' ? (
                <>
                  {otherUser?.location?.city && `${otherUser.location.city} • `}
                  <span className="status-text">Online nu</span>
                </>
              ) : (
                <span>{conversation.participants?.length || 0} deelnemers</span>
              )}
            </div>
          </div>
        </div>

        <div className="chat-actions">
          <button className="header-action-btn" title="Oproep">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
          </button>
          
          <button className="header-action-btn" title="Video oproep">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </button>
          
          {conversation.type === 'activity' && (
            <button className="header-action-btn" title="Groepsmeditatie">
              🧘‍♀️
            </button>
          )}

          {isActivityOrganizer && (
            <button className="header-action-btn" title="Kanaalbesturing" onClick={() => setShowModerationTools('channel')}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Messages */}
      <div className="enhanced-chat-messages">
        {Object.entries(messageGroups || {}).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="enhanced-date-separator">
              <span>{formatDate(dateMessages[0].createdAt)}</span>
            </div>
            
            {dateMessages.map((message, index) => {
              if (!message || !currentUser) return null;
              
              const isOwnMessage = message.sender?._id === (currentUser.id || currentUser._id);
              const showAvatar = !isOwnMessage && (
                index === 0 || 
                dateMessages[index - 1]?.sender?._id !== message.sender?._id
              );

              return (
                <div
                  key={message._id}
                  className={`enhanced-message ${isOwnMessage ? 'own-message' : 'other-message'}`}
                >
                  {showAvatar && conversation.type !== 'direct' && (
                    <div className="enhanced-message-avatar">
                      {message.sender?.profileImage ? (
                        <img src={message.sender.profileImage} alt={message.sender.username} />
                      ) : (
                        <div className="avatar-placeholder">
                          {message.sender?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="enhanced-message-content">
                    {!isOwnMessage && conversation.type !== 'direct' && showAvatar && (
                      <div className="message-sender-name">{message.sender?.username}</div>
                    )}
                    
                    {/* Reply preview */}
                    {message.replyTo && (
                      <div className="message-reply-preview">
                        <div className="reply-line"></div>
                        <div className="reply-content">
                          <span className="reply-sender">{message.replyTo.sender.username}</span>
                          <span className="reply-text">{message.replyTo.content.text}</span>
                        </div>
                      </div>
                    )}
                    
                    <div 
                      className="enhanced-message-bubble"
                      onClick={() => setSelectedMessage(selectedMessage === message._id ? null : message._id)}
                    >
                      <div className="message-text">
                        {message.content.text}
                      </div>

                      {/* File attachment rendering */}
                      {message.content.attachment && renderFileAttachment(message.content.attachment)}
                      
                      <div className="message-meta">
                        <span className="message-time">{formatTime(message.createdAt)}</span>
                        {isOwnMessage && (
                          <div className="message-status">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 6L9 17l-5-5"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reactions */}
                    {renderReactions(message)}

                    {/* Message Actions */}
                    {selectedMessage === message._id && (
                      <div className="message-actions">
                        <button
                          className="action-btn reply-btn"
                          onClick={() => {
                            setReplyingTo({
                              _id: message._id,
                              sender: message.sender,
                              content: message.content
                            });
                            setSelectedMessage(null);
                            messageInputRef.current?.focus();
                          }}
                        >
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                          </svg>
                          Reageer
                        </button>
                        
                        <button
                          className="action-btn reaction-btn"
                          onClick={() => setShowReactionPicker(showReactionPicker === message._id ? null : message._id)}
                        >
                          😊 Reactie
                        </button>

                        <button
                          className="action-btn moderation-btn"
                          onClick={() => setShowModerationTools(message._id)}
                        >
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zM12 13a1 1 0 110-2 1 1 0 010 2zM12 20a1 1 0 110-2 1 1 0 010 2z"/>
                          </svg>
                          Meer
                        </button>
                      </div>
                    )}

                    {/* Reaction Picker */}
                    {showReactionPicker === message._id && (
                      <div className="reaction-picker">
                        {reactions.map(emoji => (
                          <button
                            key={emoji}
                            className="reaction-option"
                            onClick={() => handleReaction(message._id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        {renderTypingIndicator()}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input */}
      <div className="enhanced-chat-input">
        {renderReplyPreview()}
        
        {attachmentPreview && (
          <div className="attachment-preview">
            {attachmentPreview.type === 'image' ? (
              <img src={attachmentPreview.url} alt="Preview" className="preview-image" />
            ) : (
              <div className="preview-file">
                📄 {attachmentPreview.name}
              </div>
            )}
            <button onClick={() => setAttachmentPreview(null)}>✕</button>
          </div>
        )}
        
        <div className="input-container">
          <button 
            className="attach-button"
            onClick={() => setShowFileUpload(true)}
            title={
              hasChannelPermissions('canUploadFiles') 
                ? t('attachFile', 'Bijlage toevoegen')
                : t('noFilePermission', 'Geen toestemming voor bestandsuploads')
            }
            disabled={!hasChannelPermissions('canUploadFiles')}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
            </svg>
          </button>
          
          <div className="message-input-wrapper">
            <textarea
              ref={messageInputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={
                !hasChannelPermissions('canSendMessages') 
                  ? t('noSendPermission', 'Je hebt geen toestemming om berichten te versturen in dit kanaal')
                  : `Bericht aan ${conversationTitle}...`
              }
              rows="1"
              disabled={isSending || !hasChannelPermissions('canSendMessages')}
              className="enhanced-message-input"
            />
          </div>
          
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending || !hasChannelPermissions('canSendMessages')}
            className="enhanced-send-button"
          >
            {isSending ? (
              <div className="send-loading">
                <div className="loading-dot"></div>
              </div>
            ) : (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            )}
          </button>
        </div>
        
      </div>

      {/* Moderation Tools */}
      {showModerationTools && showModerationTools !== 'channel' && (
        <ChatModerationTools
          message={messages.find(msg => msg._id === showModerationTools)}
          user={currentUser}
          conversation={conversation}
          onReport={handleReport}
          onBlock={handleBlockUser}
          onDelete={handleDeleteMessage}
          onEdit={handleEditMessage}
          onClose={() => setShowModerationTools(null)}
          isOrganizer={isActivityOrganizer}
          isModerator={isModerator}
        />
      )}

      {/* Activity Channel Controls */}
      {showModerationTools === 'channel' && isActivityOrganizer && (
        <ActivityChannelControls
          conversation={conversation}
          currentUser={currentUser}
          onClose={() => setShowModerationTools(null)}
        />
      )}

      {/* File Upload Modal */}
      {showFileUpload && (
        <ChatFileUpload
          onFileSelect={handleFileSelect}
          onClose={() => setShowFileUpload(false)}
          maxFileSize={10 * 1024 * 1024} // 10MB limit
        />
      )}
    </div>
  );
};

export default EnhancedChatWindow;