import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl } from '../config/api';

const EmergencyModal = ({ 
  user, 
  isVisible, 
  crisisType = 'general', 
  severity = 'high',
  detectedMessage = '',
  onClose, 
  onGetHelp 
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [emergencyResponse, setEmergencyResponse] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showResources, setShowResources] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Get user location for localized emergency resources
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            console.log('Location access denied, using default resources');
          }
        );
      }

      // Automatically trigger emergency response
      handleEmergency();
    }
  }, [isVisible, crisisType, severity]);

  const handleEmergency = async () => {
    try {
      setIsLoading(true);
      
      const response = await axios.post(getFullUrl('/api/ai-coach/emergency'), {
        userId: user.id,
        crisisType,
        severity,
        userMessage: detectedMessage,
        location: userLocation
      });
      
      if (response.data.success) {
        setEmergencyResponse(response.data);
      } else {
        throw new Error('Emergency response failed');
      }
      
    } catch (error) {
      console.error('Emergency handling error:', error);
      // Use fallback emergency response
      setEmergencyResponse({
        message: "I'm here for you right now. Your safety is the most important thing.",
        immediateActions: [
          t('emergencyDanger', "If you're in immediate danger, call 911"),
          t('contactTrustedPerson', "Contact a trusted friend or family member"),
          t('crisisTextLine', "Call the Crisis Text Line: Text HOME to 741741")
        ],
        resources: [
          { name: 'Crisis Text Line', contact: 'Text HOME to 741741', urgent: true },
          { name: 'National Suicide Prevention Lifeline', contact: '988', urgent: true },
          { name: 'Emergency Services', contact: '911', urgent: true }
        ],
        severity,
        emergency: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallEmergency = (contact) => {
    // For mobile devices, try to initiate call
    if (contact.includes('911') || contact.includes('988')) {
      window.location.href = `tel:${contact.replace(/[^0-9]/g, '')}`;
    } else if (contact.includes('741741')) {
      // For text services, show instructions
      alert(t('textInstructions', 'Send a text message with "HOME" to 741741'));
    } else {
      // Copy contact info to clipboard
      navigator.clipboard.writeText(contact).then(() => {
        alert(t('contactCopied', 'Contact information copied to clipboard'));
      }).catch(() => {
        alert(`${t('contact', 'Contact')}: ${contact}`);
      });
    }
  };

  const getSeverityColor = (level) => {
    switch (level) {
      case 'critical': return '#dc2626';
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getSeverityIcon = (level) => {
    switch (level) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '🟡';
      default: return 'ℹ️';
    }
  };

  const getCrisisTypeTitle = (type) => {
    const titles = {
      suicide: t('suicideCrisis', 'Suicide Crisis'),
      self_harm: t('selfHarmCrisis', 'Self-Harm Crisis'),
      relapse: t('relapseCrisis', 'Relapse Crisis'),
      substance_abuse: t('substanceAbuseCrisis', 'Substance Abuse Crisis'),
      domestic_violence: t('domesticViolenceCrisis', 'Domestic Violence Crisis'),
      panic_attack: t('panicAttackCrisis', 'Panic Attack'),
      general: t('emergencySupport', 'Emergency Support')
    };
    return titles[type] || titles.general;
  };

  if (!isVisible) return null;

  return (
    <div className="emergency-modal-overlay">
      <div className="emergency-modal-container">
        {/* Emergency Header */}
        <div className="emergency-header" style={{ borderColor: getSeverityColor(severity) }}>
          <div className="emergency-icon" style={{ color: getSeverityColor(severity) }}>
            {getSeverityIcon(severity)}
          </div>
          <div className="emergency-title">
            <h2>{getCrisisTypeTitle(crisisType)}</h2>
            <p className="severity-level" style={{ color: getSeverityColor(severity) }}>
              {t('severity', 'Severity')}: {severity.toUpperCase()}
            </p>
          </div>
          <button className="emergency-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Emergency Content */}
        <div className="emergency-content">
          {isLoading ? (
            <div className="emergency-loading">
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
              <p>{t('gettingHelp', 'Getting immediate help for you...')}</p>
            </div>
          ) : emergencyResponse ? (
            <>
              {/* AI Response Message */}
              <div className="emergency-message">
                <div className="message-icon">🤖</div>
                <div className="message-content">
                  <p>"{emergencyResponse.message}"</p>
                </div>
              </div>

              {/* Immediate Actions */}
              {emergencyResponse.immediateActions && (
                <div className="immediate-actions">
                  <h3>{t('immediateActions', 'Immediate Actions')}</h3>
                  <div className="actions-list">
                    {emergencyResponse.immediateActions.map((action, index) => (
                      <div key={index} className="action-item">
                        <span className="action-number">{index + 1}</span>
                        <span className="action-text">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency Contacts */}
              <div className="emergency-contacts">
                <h3>{t('emergencyContacts', 'Emergency Contacts')}</h3>
                <div className="contacts-grid">
                  {emergencyResponse.resources?.filter(r => r.urgent).map((resource, index) => (
                    <div key={index} className="contact-card">
                      <div className="contact-info">
                        <h4>{resource.name}</h4>
                        <p className="contact-number">{resource.contact}</p>
                        <p className="contact-description">{resource.description}</p>
                        <span className="availability">{resource.available}</span>
                      </div>
                      <button 
                        className="call-btn"
                        onClick={() => handleCallEmergency(resource.contact)}
                      >
                        📞 {t('contact', 'Contact')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Resources Toggle */}
              {emergencyResponse.resources?.filter(r => !r.urgent).length > 0 && (
                <div className="additional-resources">
                  <button 
                    className="toggle-resources-btn"
                    onClick={() => setShowResources(!showResources)}
                  >
                    {showResources ? '▼' : '▶'} {t('additionalResources', 'Additional Resources')}
                  </button>
                  
                  {showResources && (
                    <div className="resources-list">
                      {emergencyResponse.resources.filter(r => !r.urgent).map((resource, index) => (
                        <div key={index} className="resource-item">
                          <div className="resource-info">
                            <h5>{resource.name}</h5>
                            <p>{resource.description}</p>
                            <span className="resource-contact">{resource.contact}</span>
                          </div>
                          <button 
                            className="resource-btn"
                            onClick={() => handleCallEmergency(resource.contact)}
                          >
                            {t('contact', 'Contact')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="emergency-error">
              <h3>{t('emergencyError', 'Unable to connect to emergency services')}</h3>
              <p>{t('emergencyFallback', 'Please contact emergency services directly:')}</p>
              <div className="fallback-contacts">
                <button 
                  className="emergency-btn critical"
                  onClick={() => handleCallEmergency('911')}
                >
                  🚨 {t('call911', 'Call 911')}
                </button>
                <button 
                  className="emergency-btn high"
                  onClick={() => handleCallEmergency('988')}
                >
                  📞 {t('call988', 'Call 988')}
                </button>
                <button 
                  className="emergency-btn medium"
                  onClick={() => handleCallEmergency('741741')}
                >
                  💬 {t('text741741', 'Text 741741')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Emergency Footer */}
        <div className="emergency-footer">
          <div className="safety-reminder">
            <p>🔒 {t('emergencyPrivacy', 'Your safety is our priority. All conversations are confidential.')}</p>
          </div>
          
          <div className="emergency-actions">
            {onGetHelp && (
              <button 
                className="get-professional-help-btn"
                onClick={() => {
                  onGetHelp(emergencyResponse);
                  onClose();
                }}
              >
                💬 {t('continueWithAlex', 'Continue with Alex')}
              </button>
            )}
            
            <button 
              className="im-safe-btn"
              onClick={onClose}
            >
              ✅ {t('imSafeNow', "I'm getting help")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyModal;