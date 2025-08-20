import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getFullUrl, API_ENDPOINTS } from '../config/api';
import { getAuthHeaders } from '../utils/userUtils';

const StepNavigation = ({ 
  currentStep, 
  totalSteps, 
  onNext, 
  onPrev, 
  isCurrentStepValid,
  onSave,
  onGenerate,
  isGenerating 
}) => {
  const { t } = useTranslation();
  const [userCredits, setUserCredits] = useState(null);

  const isLastStep = currentStep === totalSteps;

  // Fetch user credits when on the last step
  useEffect(() => {
    if (isLastStep) {
      const fetchCredits = async () => {
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          if (user.id) {
            const response = await axios.get(getFullUrl(API_ENDPOINTS.USER_CREDITS(user.id)), {
              headers: getAuthHeaders(user)
            });
            setUserCredits(response.data.credits);
          }
        } catch (error) {
          console.error('Error fetching credits:', error);
        }
      };
      fetchCredits();
    }
  }, [isLastStep]);

  return (
    <div className="step-navigation">
      {/* Only show Generate button for final step - navigation via clickable step indicators */}
      {isLastStep && (
        <>
          {/* Credit Status Display */}
          {userCredits !== null && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              borderRadius: '8px',
              background: userCredits === 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              border: `1px solid ${userCredits === 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '14px',
                color: userCredits === 0 ? '#fca5a5' : '#86efac',
                fontWeight: '500'
              }}>
                {userCredits === 0 ? '⚠️' : '✅'} {t('creditStatus', 'Token Status')}: <strong>{userCredits}</strong> {userCredits === 1 ? 'token' : 'tokens'}
              </div>
              {userCredits === 0 && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  color: '#fca5a5'
                }}>
                  {t('insufficientCreditsWarning', 'Je hebt minimaal 1 token nodig om audio te genereren')}
                </div>
              )}
            </div>
          )}
          
          <button
            className="generate-btn primary"
            onClick={onGenerate}
            disabled={!isCurrentStepValid || isGenerating || userCredits === 0}
            style={{
              opacity: userCredits === 0 ? 0.5 : 1,
              cursor: userCredits === 0 ? 'not-allowed' : 'pointer'
            }}
            title={userCredits === 0 ? t('buyTokensFirst', 'Koop eerst tokens om audio te genereren') : ''}
          >
            {isGenerating ? t('generating', 'Genereren...') : `🎵 ${t('generateAudio', 'Audio Genereren')}`}
          </button>
          
          {userCredits === 0 && (
            <div style={{
              marginTop: '12px',
              textAlign: 'center'
            }}>
              <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const creditsButton = document.querySelector('[data-credits-button]');
                  if (creditsButton) creditsButton.click();
                }}
                style={{
                  color: '#60a5fa',
                  textDecoration: 'underline',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                💎 {t('buyTokens', 'Tokens Kopen')}
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StepNavigation;