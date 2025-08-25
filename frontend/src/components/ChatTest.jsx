import React, { useState } from 'react';
import ChatWindow from './Meet/ChatWindow';
import EnhancedChatWindow from './Meet/EnhancedChatWindow';

const ChatTest = () => {
  const [chatType, setChatType] = useState('normal');

  // Mock data for testing
  const mockUser = {
    _id: 'user123',
    id: 'user123',
    username: 'TestUser'
  };

  const mockConversation = {
    _id: 'conv123',
    name: 'Test Chat Room',
    type: 'activity',
    participants: [
      { _id: 'user123', username: 'TestUser' },
      { _id: 'user456', username: 'Demo User' }
    ],
    activity: {
      organizer: 'user123'
    },
    moderators: ['user123']
  };

  const mockDirectConversation = {
    _id: 'conv456',
    type: 'direct',
    participants: [
      { _id: 'user123', username: 'TestUser' },
      { _id: 'user456', username: 'Demo User' }
    ]
  };

  const handleBack = () => {
    console.log('Back button clicked');
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'var(--font-primary)',
      color: 'var(--text-primary)'
    }}>
      <h1 className="text-primary" style={{ marginBottom: '20px' }}>
        🧪 Chat Functionality Test
      </h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setChatType('normal')}
          style={{
            marginRight: '10px',
            padding: '10px 20px',
            backgroundColor: chatType === 'normal' ? 'var(--gradient-card-1)' : 'var(--glass-light)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            cursor: 'pointer'
          }}
        >
          Normal Chat
        </button>
        <button 
          onClick={() => setChatType('enhanced')}
          style={{
            marginRight: '10px',
            padding: '10px 20px',
            backgroundColor: chatType === 'enhanced' ? 'var(--gradient-card-1)' : 'var(--glass-light)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            cursor: 'pointer'
          }}
        >
          Enhanced Chat
        </button>
        <button 
          onClick={() => setChatType('direct')}
          style={{
            padding: '10px 20px',
            backgroundColor: chatType === 'direct' ? 'var(--gradient-card-1)' : 'var(--glass-light)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            cursor: 'pointer'
          }}
        >
          Direct Chat
        </button>
      </div>

      <div className="text-secondary" style={{ marginBottom: '20px', fontSize: '14px' }}>
        <strong>Test Status:</strong><br/>
        • Chat Type: {chatType}<br/>
        • User: {mockUser.username} (ID: {mockUser._id})<br/>
        • Conversation: {chatType === 'direct' ? 'Direct Message' : mockConversation.name}<br/>
        • Mock Data: ✅ Loaded<br/>
        • Expected Behavior: Should show demo messages when API fails (401/404)
      </div>

      <div style={{ 
        border: '2px solid rgba(255,255,255,0.2)', 
        borderRadius: '16px',
        overflow: 'hidden',
        height: '600px'
      }}>
        {chatType === 'normal' && (
          <ChatWindow 
            conversation={mockConversation}
            currentUser={mockUser}
            onBack={handleBack}
          />
        )}
        
        {chatType === 'enhanced' && (
          <EnhancedChatWindow 
            conversation={mockConversation}
            currentUser={mockUser}
            onBack={handleBack}
          />
        )}
        
        {chatType === 'direct' && (
          <ChatWindow 
            conversation={mockDirectConversation}
            currentUser={mockUser}
            onBack={handleBack}
          />
        )}
      </div>

      <div className="text-tertiary" style={{ marginTop: '20px', fontSize: '12px' }}>
        <strong>Test Instructions:</strong><br/>
        1. Switch between chat types using buttons above<br/>
        2. Check console for any errors (should be none now)<br/>
        3. Verify mock messages appear when backend is unavailable<br/>
        4. Test message input and send functionality<br/>
        5. Check responsive design and styling<br/>
        6. Verify text colors are readable (white on dark background)
      </div>
    </div>
  );
};

export default ChatTest;