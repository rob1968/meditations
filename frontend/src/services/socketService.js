import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

class SocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventHandlers = new Map();
    this.typingTimeouts = new Map();
  }

  // Initialize socket connection
  connect(userId) {
    if (this.socket && this.isConnected) {
      return Promise.resolve();
    }

    this.userId = userId;

    // Determine socket URL - for production use the same domain
    let socketUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      socketUrl = API_BASE_URL.replace('/api', '');
    } else {
      // For production, use same domain (Nginx will proxy to backend)
      socketUrl = window.location.origin;
    }
    
    console.log('🔌 Connecting to socket at:', socketUrl);
    
    this.socket = io(socketUrl, {
      auth: {
        userId: userId
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    return new Promise((resolve, reject) => {
      // Connection success
      this.socket.on('connect', () => {
        console.log('✅ Socket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      // Connection error
      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        this.isConnected = false;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          setTimeout(() => this.connect(userId), 2000 * this.reconnectAttempts);
        } else {
          reject(error);
        }
      });

      // Disconnection
      this.socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        this.isConnected = false;
        
        // Auto-reconnect unless manually disconnected
        if (reason !== 'io client disconnect') {
          setTimeout(() => this.connect(userId), 3000);
        }
      });

      // Setup default event handlers
      this.setupDefaultHandlers();
    });
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.userId = null;
    }
  }

  // Setup default event handlers
  setupDefaultHandlers() {
    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('socket_error', error);
    });

    // Conversation events
    this.socket.on('conversation_joined', (data) => {
      this.emit('conversation_joined', data);
    });

    this.socket.on('new_message', (data) => {
      this.emit('new_message', data);
    });

    this.socket.on('user_typing', (data) => {
      this.emit('user_typing', data);
    });

    this.socket.on('user_stopped_typing', (data) => {
      this.emit('user_stopped_typing', data);
    });

    // Connection events
    this.socket.on('new_connection_request', (data) => {
      this.emit('new_connection_request', data);
    });

    this.socket.on('connection_request_responded', (data) => {
      this.emit('connection_request_responded', data);
    });

    // User presence
    this.socket.on('contact_status_changed', (data) => {
      this.emit('contact_status_changed', data);
    });

    this.socket.on('user_joined_conversation', (data) => {
      this.emit('user_joined_conversation', data);
    });

    this.socket.on('user_left_conversation', (data) => {
      this.emit('user_left_conversation', data);
    });

    // Group events
    this.socket.on('user_joined_group', (data) => {
      this.emit('user_joined_group', data);
    });

    // Meditation features
    this.socket.on('group_meditation_started', (data) => {
      this.emit('group_meditation_started', data);
    });

    // Emergency alerts
    this.socket.on('emergency_alert', (data) => {
      this.emit('emergency_alert', data);
    });
  }

  // ============ CONVERSATION METHODS ============

  joinConversation(conversationId) {
    if (!this.isConnected) return;
    
    this.socket.emit('join_conversation', { conversationId });
  }

  leaveConversation(conversationId) {
    if (!this.isConnected) return;
    
    this.socket.emit('leave_conversation', { conversationId });
    
    // Clear typing timeout for this conversation
    if (this.typingTimeouts.has(conversationId)) {
      clearTimeout(this.typingTimeouts.get(conversationId));
      this.typingTimeouts.delete(conversationId);
    }
  }

  sendMessage(conversationId, text, type = 'text', replyTo = null) {
    if (!this.isConnected) return;
    
    this.socket.emit('send_message', {
      conversationId,
      text,
      type,
      replyTo
    });
    
    // Stop typing indicator
    this.stopTyping(conversationId);
  }

  // ============ TYPING INDICATORS ============

  startTyping(conversationId) {
    if (!this.isConnected) return;
    
    this.socket.emit('typing_start', { conversationId });
    
    // Auto-stop typing after 3 seconds of inactivity
    if (this.typingTimeouts.has(conversationId)) {
      clearTimeout(this.typingTimeouts.get(conversationId));
    }
    
    const timeout = setTimeout(() => {
      this.stopTyping(conversationId);
    }, 3000);
    
    this.typingTimeouts.set(conversationId, timeout);
  }

  stopTyping(conversationId) {
    if (!this.isConnected) return;
    
    this.socket.emit('typing_stop', { conversationId });
    
    if (this.typingTimeouts.has(conversationId)) {
      clearTimeout(this.typingTimeouts.get(conversationId));
      this.typingTimeouts.delete(conversationId);
    }
  }

  // ============ USER PRESENCE ============

  updateStatus(status, meditationType = null, duration = null) {
    if (!this.isConnected) return;
    
    this.socket.emit('update_status', {
      status,
      meditationType,
      duration
    });
  }

  // ============ CONNECTION REQUESTS ============

  notifyConnectionRequestSent(targetUserId, connectionId) {
    if (!this.isConnected) return;
    
    this.socket.emit('connection_request_sent', {
      targetUserId,
      connectionId
    });
  }

  notifyConnectionRequestResponse(connectionId, action, fromUserId) {
    if (!this.isConnected) return;
    
    this.socket.emit('connection_request_response', {
      connectionId,
      action,
      fromUserId
    });
  }

  // ============ GROUP FEATURES ============

  notifyJoinGroup(groupId, groupName) {
    if (!this.isConnected) return;
    
    this.socket.emit('join_group', {
      groupId,
      groupName
    });
  }

  startGroupMeditation(conversationId, meditationType, duration) {
    if (!this.isConnected) return;
    
    this.socket.emit('start_group_meditation', {
      conversationId,
      meditationType,
      duration
    });
  }

  // ============ EMERGENCY FEATURES ============

  sendEmergencyAlert(message, location = null) {
    if (!this.isConnected) return;
    
    this.socket.emit('emergency_alert', {
      message,
      location
    });
  }

  // ============ EVENT HANDLING ============

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(handler);
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // ============ UTILITY METHODS ============

  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      userId: this.userId,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;