import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';
import ProgressDashboard from './ProgressDashboard';
import EmergencyModal from './EmergencyModal';

const AICoachChat = ({ user, isVisible, onClose, initialMessage = null, initialTab = 'chat' }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab); // 'chat' or 'insights'
  
  // Emergency states
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyData, setEmergencyData] = useState(null);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat with welcome message and set active tab
  useEffect(() => {
    if (isVisible) {
      // Reset active tab when opening
      setActiveTab(initialTab);
      
      if (messages.length === 0 && initialTab === 'chat') {
        const welcomeMessage = initialMessage || t('coachWelcomeMessage', 
          "Hi! I'm Alex, your AI recovery coach. I'm here to support you 24/7. How are you feeling today?"
        );
        
        setMessages([{
          id: Date.now(),
          role: 'coach',
          content: welcomeMessage,
          timestamp: new Date()
        }]);
      }
    }
  }, [isVisible, initialMessage, initialTab, t, messages.length]);

  // Crisis detection function
  const detectCrisis = async (message) => {
    try {
      const response = await axios.post(getFullUrl('/api/ai-coach/assess-crisis'), {
        userId: user.id,
        message,
        context: { chatSession: true }
      });
      
      if (response.data.success && response.data.assessment) {
        const { assessment } = response.data;
        
        if (assessment.requiresEmergency || assessment.severity === 'critical') {
          // Determine crisis type from indicators
          let crisisType = 'general';
          if (assessment.indicators.some(i => ['suicide', 'kill myself', 'end it all'].includes(i))) {
            crisisType = 'suicide';
          } else if (assessment.indicators.some(i => ['self harm', 'cut myself', 'hurt myself'].includes(i))) {
            crisisType = 'self_harm';
          } else if (assessment.indicators.some(i => ['relapse', 'using again'].includes(i))) {
            crisisType = 'relapse';
          }
          
          setEmergencyData({
            crisisType,
            severity: assessment.severity,
            detectedMessage: message,
            assessment
          });
          setShowEmergencyModal(true);
          
          return true; // Crisis detected
        }
      }
      
      return false; // No crisis detected
      
    } catch (error) {
      console.error('Error detecting crisis:', error);
      return false;
    }
  };

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const messageContent = inputMessage.trim();
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    // Check for crisis before processing message
    const isCrisis = await detectCrisis(messageContent);
    if (isCrisis) {
      // Don't proceed with normal chat if crisis detected
      setInputMessage('');
      return;
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Send to AI Coach API
      const response = await axios.post(getFullUrl('/api/ai-coach/chat'), {
        userId: user.id,
        message: userMessage.content,
        context: {
          timestamp: new Date().toISOString(),
          chatSession: true
        }
      });

      // Simulate typing delay for more natural feel
      setTimeout(() => {
        const coachResponse = {
          id: Date.now() + 1,
          role: 'coach',
          content: response.data.response,
          timestamp: new Date(),
          suggestions: response.data.suggestions,
          riskLevel: response.data.riskLevel
        };

        setMessages(prev => [...prev, coachResponse]);
        setIsTyping(false);
        setIsLoading(false);
      }, 1000 + Math.random() * 1000); // 1-2 second delay

    } catch (error) {
      console.error('Error sending message to AI coach:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'coach',
        content: t('coachErrorMessage', "I'm having trouble connecting right now. Please try again in a moment."),
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle suggestion clicks
  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isVisible) return null;

  return (
    <div className="ai-coach-chat-overlay">
      <div className="ai-coach-chat-container" ref={chatContainerRef}>
        {/* Chat Header */}
        <div className="chat-header">
          <div className="coach-info">
            <div className="coach-avatar-small">
              <span>🤖</span>
            </div>
            <div className="coach-details">
              <h3>Alex</h3>
              <span className="coach-status">
                <span className="status-dot online"></span>
                {t('coachOnlineStatus', 'Online')}
              </span>
            </div>
          </div>
          <button className="close-chat-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="coach-tabs">
          <button 
            className={`coach-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 {t('chat', 'Chat')}
          </button>
          <button 
            className={`coach-tab ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            📊 {t('insights', 'Insights')}
          </button>
        </div>

        {/* Chat Content */}
        {activeTab === 'chat' && (
          <>
            {/* Chat Messages */}
            <div className="chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="message-content">
                <div className="message-text">
                  {message.content}
                </div>
                <div className="message-time">
                  {formatTime(message.timestamp)}
                </div>
                
                {/* Risk level indicator for coach messages */}
                {message.role === 'coach' && message.riskLevel && message.riskLevel !== 'low' && (
                  <div className={`risk-indicator ${message.riskLevel}`}>
                    {message.riskLevel === 'high' ? '🔴' : '🟡'} {t('riskLevel', 'Risk')}: {message.riskLevel}
                  </div>
                )}
                
                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="message-suggestions">
                    {message.suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="suggestion-btn"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="message coach">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('chatPlaceholder', 'Type your message...')}
              className="chat-input"
              rows="1"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="send-btn"
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>
          
          {/* Quick actions */}
          <div className="quick-actions">
            <button 
              className="quick-action-btn"
              onClick={() => setInputMessage(t('quickActionFeeling', 'How am I feeling?'))}
            >
              😊 {t('quickFeeling', 'Feeling')}
            </button>
            <button 
              className="quick-action-btn"
              onClick={() => setInputMessage(t('quickActionCraving', 'I\'m having cravings'))}
            >
              ⚠️ {t('quickCraving', 'Craving')}
            </button>
            <button 
              className="quick-action-btn"
              onClick={() => setInputMessage(t('quickActionHelp', 'I need help'))}
            >
              🆘 {t('quickHelp', 'Help')}
            </button>
          </div>
        </div>
          </>
        )}

        {/* Insights Content */}
        {activeTab === 'insights' && (
          <div className="insights-content">
            <ProgressDashboard 
              user={user} 
              onStartCoaching={() => setActiveTab('chat')}
            />
          </div>
        )}
      </div>
      
      {/* Emergency Modal */}
      <EmergencyModal
        user={user}
        isVisible={showEmergencyModal}
        crisisType={emergencyData?.crisisType}
        severity={emergencyData?.severity}
        detectedMessage={emergencyData?.detectedMessage}
        onClose={() => {
          setShowEmergencyModal(false);
          setEmergencyData(null);
        }}
        onGetHelp={(emergencyResponse) => {
          // Switch to chat tab and add emergency context
          setActiveTab('chat');
          if (emergencyResponse) {
            const emergencyMessage = {
              id: Date.now(),
              role: 'coach',
              content: `I understand you're going through a crisis. ${emergencyResponse.message} I'm here to continue supporting you.`,
              timestamp: new Date(),
              isEmergencyResponse: true
            };
            setMessages(prev => [...prev, emergencyMessage]);
          }
        }}
      />
    </div>
  );
};

export default AICoachChat;