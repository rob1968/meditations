const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const UserConnection = require('../models/UserConnection');
const User = require('../models/User');

// Track connected users and their active conversations
const connectedUsers = new Map(); // userId -> { socketId, username, activeConversations: Set }
const typingUsers = new Map(); // conversationId -> Set of userIds

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.username} (${socket.userId})`);
    
    // Track connected user
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      username: socket.username,
      activeConversations: new Set(),
      status: 'online',
      lastActivity: Date.now()
    });
    
    // Notify contacts about online status
    notifyContactsOfStatusChange(socket.userId, 'online');
    
    // ============ CONVERSATION MANAGEMENT ============
    
    // Join conversation room
    socket.on('join_conversation', async (data) => {
      try {
        const { conversationId } = data;
        
        // Verify user has access to this conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.isParticipant(socket.userId)) {
          socket.emit('error', { message: 'Access denied to conversation' });
          return;
        }
        
        // Join the room
        socket.join(`conversation_${conversationId}`);
        
        // Track active conversation
        const userData = connectedUsers.get(socket.userId);
        if (userData) {
          userData.activeConversations.add(conversationId);
        }
        
        // Mark conversation as read
        await Message.markConversationAsRead(conversationId, socket.userId);
        
        console.log(`📱 ${socket.username} joined conversation: ${conversationId}`);
        
        // Notify others in conversation about user joining
        socket.to(`conversation_${conversationId}`).emit('user_joined_conversation', {
          userId: socket.userId,
          username: socket.username,
          conversationId
        });
        
        socket.emit('conversation_joined', { conversationId });
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });
    
    // Leave conversation room
    socket.on('leave_conversation', (data) => {
      const { conversationId } = data;
      
      socket.leave(`conversation_${conversationId}`);
      
      // Remove from active conversations
      const userData = connectedUsers.get(socket.userId);
      if (userData) {
        userData.activeConversations.delete(conversationId);
      }
      
      // Stop typing if user was typing
      handleTypingStop(socket, conversationId);
      
      console.log(`📱 ${socket.username} left conversation: ${conversationId}`);
      
      socket.to(`conversation_${conversationId}`).emit('user_left_conversation', {
        userId: socket.userId,
        username: socket.username,
        conversationId
      });
    });
    
    // ============ MESSAGING ============
    
    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, text, type = 'text', replyTo } = data;
        
        // Verify access
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.isParticipant(socket.userId)) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }
        
        // Create message
        const messageData = {
          conversation: conversationId,
          sender: socket.userId,
          content: { text, type }
        };
        
        if (replyTo) {
          messageData.replyTo = replyTo;
        }
        
        const message = await Message.create(messageData);
        await message.populate('sender', 'username profileImage');
        
        // Update conversation's last message
        await conversation.updateLastMessage({
          text: text,
          sender: socket.userId,
          timestamp: message.createdAt
        });
        
        // Update connection interaction if direct conversation
        if (conversation.type === 'direct') {
          const otherParticipant = conversation.participants.find(p => !p.equals(socket.userId));
          if (otherParticipant) {
            const connection = await UserConnection.findConnection(socket.userId, otherParticipant);
            if (connection) {
              await connection.addInteraction('message');
            }
          }
        }
        
        // Stop typing indicator
        handleTypingStop(socket, conversationId);
        
        // Broadcast message to conversation participants
        io.to(`conversation_${conversationId}`).emit('new_message', {
          message,
          conversationId
        });
        
        // Send push notification to offline users (implement later)
        await sendPushNotificationToOfflineUsers(conversation, message, socket.userId);
        
        console.log(`💬 Message sent in ${conversationId} by ${socket.username}`);
        
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // ============ TYPING INDICATORS ============
    
    socket.on('typing_start', (data) => {
      const { conversationId } = data;
      handleTypingStart(socket, conversationId);
    });
    
    socket.on('typing_stop', (data) => {
      const { conversationId } = data;
      handleTypingStop(socket, conversationId);
    });
    
    // ============ USER PRESENCE ============
    
    socket.on('update_status', async (data) => {
      const { status, meditationType, duration } = data;
      
      const userData = connectedUsers.get(socket.userId);
      if (userData) {
        userData.status = status;
        userData.lastActivity = Date.now();
        
        if (status === 'meditating') {
          userData.meditation = { type: meditationType, startedAt: Date.now(), duration };
        } else {
          delete userData.meditation;
        }
      }
      
      // Notify contacts about status change
      notifyContactsOfStatusChange(socket.userId, status, { meditationType, duration });
      
      console.log(`🧘 ${socket.username} status: ${status}`);
    });
    
    // ============ CONNECTION REQUESTS ============
    
    socket.on('connection_request_sent', (data) => {
      const { targetUserId, connectionId } = data;
      
      // Notify target user if online
      const targetUser = connectedUsers.get(targetUserId);
      if (targetUser) {
        io.to(targetUser.socketId).emit('new_connection_request', {
          connectionId,
          from: {
            userId: socket.userId,
            username: socket.username
          }
        });
      }
    });
    
    socket.on('connection_request_response', (data) => {
      const { connectionId, action, fromUserId } = data;
      
      // Notify requesting user if online
      const requestingUser = connectedUsers.get(fromUserId);
      if (requestingUser) {
        io.to(requestingUser.socketId).emit('connection_request_responded', {
          connectionId,
          action, // 'accepted' or 'rejected'
          by: {
            userId: socket.userId,
            username: socket.username
          }
        });
      }
    });
    
    // ============ GROUP ACTIVITIES ============
    
    socket.on('join_group', (data) => {
      const { groupId, groupName } = data;
      
      // Broadcast to group members
      socket.to(`conversation_${groupId}`).emit('user_joined_group', {
        userId: socket.userId,
        username: socket.username,
        groupId,
        groupName
      });
    });
    
    // ============ MEDITATION FEATURES ============
    
    socket.on('start_group_meditation', async (data) => {
      const { conversationId, meditationType, duration } = data;
      
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.isParticipant(socket.userId)) {
          return;
        }
        
        // Broadcast meditation session start
        io.to(`conversation_${conversationId}`).emit('group_meditation_started', {
          sessionId: `meditation_${Date.now()}`,
          startedBy: {
            userId: socket.userId,
            username: socket.username
          },
          meditationType,
          duration,
          startTime: Date.now()
        });
        
        console.log(`🧘‍♀️ Group meditation started by ${socket.username} in ${conversationId}`);
        
      } catch (error) {
        console.error('Error starting group meditation:', error);
      }
    });
    
    // ============ CRISIS SUPPORT ============
    
    socket.on('emergency_alert', async (data) => {
      const { message, location } = data;
      
      try {
        // Find user's emergency contacts and close connections
        const user = await User.findById(socket.userId).populate('emergencyContacts');
        const connections = await UserConnection.getUserConnections(socket.userId, 'accepted');
        
        // Create emergency alert
        const alertData = {
          fromUser: {
            userId: socket.userId,
            username: socket.username
          },
          message,
          location,
          timestamp: Date.now(),
          type: 'emergency'
        };
        
        // Notify online connected users
        connections.forEach(connection => {
          const otherUser = connection.getOtherUser(socket.userId);
          const connectedUser = connectedUsers.get(otherUser.toString());
          if (connectedUser) {
            io.to(connectedUser.socketId).emit('emergency_alert', alertData);
          }
        });
        
        console.log(`🚨 Emergency alert from ${socket.username}`);
        
      } catch (error) {
        console.error('Error handling emergency alert:', error);
      }
    });
    
    // ============ DISCONNECT HANDLING ============
    
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.username} (${socket.userId})`);
      
      // Clean up typing indicators
      const userData = connectedUsers.get(socket.userId);
      if (userData) {
        userData.activeConversations.forEach(conversationId => {
          handleTypingStop(socket, conversationId);
        });
      }
      
      // Remove from connected users
      connectedUsers.delete(socket.userId);
      
      // Notify contacts about offline status
      setTimeout(() => {
        // Check if user reconnected quickly
        if (!connectedUsers.has(socket.userId)) {
          notifyContactsOfStatusChange(socket.userId, 'offline');
        }
      }, 5000); // 5 second grace period for reconnection
    });
  });
  
  // ============ HELPER FUNCTIONS ============
  
  function handleTypingStart(socket, conversationId) {
    if (!typingUsers.has(conversationId)) {
      typingUsers.set(conversationId, new Set());
    }
    
    const typingInConversation = typingUsers.get(conversationId);
    typingInConversation.add(socket.userId);
    
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
      userId: socket.userId,
      username: socket.username,
      conversationId
    });
  }
  
  function handleTypingStop(socket, conversationId) {
    const typingInConversation = typingUsers.get(conversationId);
    if (typingInConversation) {
      typingInConversation.delete(socket.userId);
      
      if (typingInConversation.size === 0) {
        typingUsers.delete(conversationId);
      }
      
      socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
        userId: socket.userId,
        conversationId
      });
    }
  }
  
  async function notifyContactsOfStatusChange(userId, status, extraData = {}) {
    try {
      const connections = await UserConnection.getUserConnections(userId, 'accepted');
      
      connections.forEach(connection => {
        const otherUser = connection.getOtherUser(userId);
        const connectedUser = connectedUsers.get(otherUser.toString());
        
        if (connectedUser) {
          io.to(connectedUser.socketId).emit('contact_status_changed', {
            userId,
            status,
            ...extraData,
            timestamp: Date.now()
          });
        }
      });
    } catch (error) {
      console.error('Error notifying contacts of status change:', error);
    }
  }
  
  async function sendPushNotificationToOfflineUsers(conversation, message, senderId) {
    // TODO: Implement push notifications for mobile
    // This would integrate with FCM/APNS for mobile push notifications
    
    const offlineParticipants = conversation.participants.filter(participantId => {
      return !participantId.equals(senderId) && !connectedUsers.has(participantId.toString());
    });
    
    if (offlineParticipants.length > 0) {
      console.log(`📧 Would send push notification to ${offlineParticipants.length} offline users`);
      // Implement actual push notification logic here
    }
  }
  
  // ============ UTILITY ENDPOINTS FOR DEBUGGING ============
  
  // Expose connected users count for monitoring
  setInterval(() => {
    const onlineCount = connectedUsers.size;
    const meditatingCount = Array.from(connectedUsers.values()).filter(user => user.status === 'meditating').length;
    
    if (onlineCount > 0) {
      console.log(`👥 Online users: ${onlineCount} (${meditatingCount} meditating)`);
    }
  }, 60000); // Every minute
  
  return {
    getConnectedUsers: () => connectedUsers,
    getTypingUsers: () => typingUsers,
    notifyUser: (userId, event, data) => {
      const user = connectedUsers.get(userId);
      if (user) {
        io.to(user.socketId).emit(event, data);
      }
    }
  };
};