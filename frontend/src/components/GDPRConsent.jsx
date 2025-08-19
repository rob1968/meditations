/**
 * GDPR Consent Component
 * Shows GDPR compliance banner for EU users
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { detectUserCountry, isGDPRRequired } from '../services/countryService';

const GDPRConsent = () => {
  const { t } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    personalization: true
  });

  useEffect(() => {
    const checkGDPRRequirement = async () => {
      try {
        // Check if user has already given consent
        const consentGiven = localStorage.getItem('gdpr_consent');
        if (consentGiven) {
          return;
        }

        // Check if user is in GDPR region
        const country = await detectUserCountry();
        if (isGDPRRequired(country)) {
          setShowBanner(true);
        }
      } catch (error) {
        console.warn('GDPR check failed:', error);
      }
    };

    checkGDPRRequirement();
  }, []);

  const handleAcceptAll = () => {
    const consent = {
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
      timestamp: Date.now()
    };
    
    localStorage.setItem('gdpr_consent', JSON.stringify(consent));
    setShowBanner(false);
  };

  const handleAcceptSelected = () => {
    const consent = {
      ...preferences,
      timestamp: Date.now()
    };
    
    localStorage.setItem('gdpr_consent', JSON.stringify(consent));
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleRejectAll = () => {
    const consent = {
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
      timestamp: Date.now()
    };
    
    localStorage.setItem('gdpr_consent', JSON.stringify(consent));
    setShowBanner(false);
  };

  const handlePreferenceChange = (key, value) => {
    if (key === 'necessary') return; // Cannot be disabled
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* GDPR Banner */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        color: 'white',
        padding: '20px',
        zIndex: 10000,
        borderTop: '3px solid #6B46C1'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: '#6B46C1' }}>
              {t('cookieConsent', 'Cookie Consent')}
            </h3>
            <p style={{ margin: 0, lineHeight: 1.5, fontSize: '14px' }}>
              {t('gdprMessage', 'We use cookies and similar technologies to provide the best experience on our meditation app. Some are essential for functionality, while others help us improve your experience through analytics and personalization. You can customize your preferences or accept all.')}
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <button
              onClick={handleAcceptAll}
              style={{
                background: '#6B46C1',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {t('acceptAll', 'Accept All')}
            </button>
            
            <button
              onClick={handleRejectAll}
              style={{
                background: 'transparent',
                color: '#ccc',
                border: '1px solid #666',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {t('rejectAll', 'Reject All')}
            </button>
            
            <button
              onClick={() => setShowPreferences(true)}
              style={{
                background: 'transparent',
                color: '#6B46C1',
                border: '1px solid #6B46C1',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {t('customizePreferences', 'Customize Preferences')}
            </button>
            
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#6B46C1',
                fontSize: '14px',
                textDecoration: 'underline'
              }}
            >
              {t('privacyPolicy', 'Privacy Policy')}
            </a>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10001,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0, color: '#333' }}>
                {t('cookiePreferences', 'Cookie Preferences')}
              </h2>
              <button
                onClick={() => setShowPreferences(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: '#666', lineHeight: 1.5, margin: 0 }}>
                {t('gdprDetailsMessage', 'Customize your cookie preferences below. Essential cookies are required for the app to function and cannot be disabled.')}
              </p>
            </div>

            {/* Cookie Categories */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Necessary Cookies */}
              <div style={{
                padding: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <h4 style={{ margin: 0, color: '#333' }}>
                    {t('necessaryCookies', 'Necessary Cookies')}
                  </h4>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled={true}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  {t('necessaryCookiesDesc', 'Required for the app to function properly. These cannot be disabled.')}
                </p>
              </div>

              {/* Analytics Cookies */}
              <div style={{
                padding: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <h4 style={{ margin: 0, color: '#333' }}>
                    {t('analyticsCookies', 'Analytics Cookies')}
                  </h4>
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => handlePreferenceChange('analytics', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  {t('analyticsCookiesDesc', 'Help us understand how you use the app to improve your experience.')}
                </p>
              </div>

              {/* Marketing Cookies */}
              <div style={{
                padding: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <h4 style={{ margin: 0, color: '#333' }}>
                    {t('marketingCookies', 'Marketing Cookies')}
                  </h4>
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => handlePreferenceChange('marketing', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  {t('marketingCookiesDesc', 'Used to show you relevant content and advertisements.')}
                </p>
              </div>

              {/* Personalization Cookies */}
              <div style={{
                padding: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <h4 style={{ margin: 0, color: '#333' }}>
                    {t('personalizationCookies', 'Personalization Cookies')}
                  </h4>
                  <input
                    type="checkbox"
                    checked={preferences.personalization}
                    onChange={(e) => handlePreferenceChange('personalization', e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  {t('personalizationCookiesDesc', 'Customize your meditation experience based on your preferences.')}
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowPreferences(false)}
                style={{
                  background: 'transparent',
                  color: '#666',
                  border: '1px solid #ccc',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                onClick={handleAcceptSelected}
                style={{
                  background: '#6B46C1',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {t('savePreferences', 'Save Preferences')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GDPRConsent;