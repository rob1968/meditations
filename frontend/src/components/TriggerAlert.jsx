import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';

const TriggerAlert = ({ user, trigger, onClose, onGetHelp, onDismiss }) => {
  const { t } = useTranslation();
  const [isGettingHelp, setIsGettingHelp] = useState(false);
  const [intervention, setIntervention] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(10);

  // Auto-dismiss after 10 seconds if no action
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleGetHelp = async () => {
    setIsGettingHelp(true);
    
    try {
      // Get AI intervention
      const response = await axios.post(getFullUrl('/api/ai-coach/intervention'), {
        userId: user.id,
        triggerType: trigger.relatedAddiction,
        urgencyLevel: trigger.riskLevel || 'medium'
      });

      setIntervention(response.data.intervention);
      
      if (onGetHelp) {
        onGetHelp(response.data.intervention);
      }
    } catch (error) {
      console.error('Error getting intervention:', error);
      // Show fallback intervention
      setIntervention({
        interventionType: 'breathing',
        immediateAction: t('fallbackAction', 'Take 5 deep breaths'),
        message: t('fallbackMessage', 'You\'re stronger than this moment. Take it one breath at a time.'),
        copingStrategy: t('fallbackStrategy', 'Breathe in for 4 counts, hold for 4, exhale for 6. Repeat 5 times.'),
        followUpQuestions: [t('fallbackQuestion1', 'How are you feeling now?'), t('fallbackQuestion2', 'What triggered this moment?')]
      });
    }
    
    setIsGettingHelp(false);
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
    onClose();
  };

  const handleStartCoaching = () => {
    if (onGetHelp) {
      onGetHelp(null, true); // Signal to start coaching chat
    }
    onClose();
  };

  // Get appropriate icon and color based on risk level
  const getRiskDisplay = (level) => {
    switch (level) {
      case 'high':
        return { icon: '🚨', color: '#F44336', bgColor: 'rgba(244, 67, 54, 0.1)' };
      case 'medium':
        return { icon: '⚠️', color: '#FF9800', bgColor: 'rgba(255, 152, 0, 0.1)' };
      default:
        return { icon: '💙', color: '#2196F3', bgColor: 'rgba(33, 150, 243, 0.1)' };
    }
  };

  const riskDisplay = getRiskDisplay(trigger.riskLevel);

  if (intervention) {
    return (
      <div className="trigger-alert-overlay">
        <div className="trigger-alert-container intervention">
          <div className="intervention-header">
            <div className="intervention-icon">🤖</div>
            <h2>{t('interventionTitle', 'Alex is here to help')}</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="intervention-content">
            <div className="immediate-action">
              <h3>{t('rightNow', 'Right now')}:</h3>
              <p className="action-text">{intervention.immediateAction}</p>
            </div>

            <div className="coach-message">
              <p>"{intervention.message}"</p>
            </div>

            <div className="coping-strategy">
              <h4>{t('copingStrategy', 'Coping Strategy')}:</h4>
              <p>{intervention.copingStrategy}</p>
            </div>

            <div className="intervention-actions">
              <button 
                className="primary-action-btn"
                onClick={handleStartCoaching}
              >
                💬 {t('talkToAlex', 'Talk to Alex')}
              </button>
              
              <button 
                className="secondary-action-btn"
                onClick={() => {
                  // Mark as helpful and close
                  handleDismiss();
                }}
              >
                ✅ {t('thisHelped', 'This helped')}
              </button>
            </div>

            {intervention.followUpQuestions && (
              <div className="follow-up-questions">
                <p>{t('whenReady', 'When you\'re ready, consider')}:</p>
                <ul>
                  {intervention.followUpQuestions.map((question, index) => (
                    <li key={index}>{question}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="trigger-alert-overlay">
      <div className="trigger-alert-container" style={{ borderColor: riskDisplay.color }}>
        <div className="alert-header" style={{ backgroundColor: riskDisplay.bgColor }}>
          <div className="alert-icon" style={{ color: riskDisplay.color }}>
            {riskDisplay.icon}
          </div>
          <div className="alert-title">
            <h3>{t('triggerDetected', 'Potential trigger detected')}</h3>
            <p>{t('alexNoticed', 'Alex noticed something that might be challenging for you')}</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="alert-content">
          <div className="trigger-info">
            <p><strong>{t('detected', 'Detected')}:</strong> {trigger.trigger}</p>
            {trigger.context && (
              <p className="trigger-context">"{trigger.context}"</p>
            )}
          </div>

          <div className="alert-message">
            <p>{t('triggerMessage', 'Remember, you have the strength to handle this. Would you like some help right now?')}</p>
          </div>

          <div className="alert-actions">
            <button 
              className="get-help-btn"
              onClick={handleGetHelp}
              disabled={isGettingHelp}
            >
              {isGettingHelp ? '⏳' : '🆘'} {t('getHelp', 'Get Help Now')}
            </button>
            
            <button 
              className="start-chat-btn"
              onClick={handleStartCoaching}
            >
              💬 {t('talkToAlex', 'Talk to Alex')}
            </button>
            
            <button 
              className="dismiss-btn"
              onClick={handleDismiss}
            >
              {t('imOkay', 'I\'m okay')} ({timeRemaining}s)
            </button>
          </div>

          <div className="reassurance">
            <p>🔒 {t('confidential', 'This conversation is completely confidential')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TriggerAlert;