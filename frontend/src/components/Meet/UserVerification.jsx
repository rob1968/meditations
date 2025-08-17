import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const UserVerification = ({ user, onVerificationUpdate }) => {
  const { t } = useTranslation();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState(1);
  const [verificationData, setVerificationData] = useState({
    documentType: '',
    documentNumber: '',
    phoneNumber: user?.phoneNumber || '',
    verificationType: 'phone' // phone, email, document
  });

  const handleStartVerification = async (type) => {
    setIsVerifying(true);
    setVerificationData(prev => ({ ...prev, verificationType: type }));

    try {
      const response = await fetch('/api/verification/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?._id || ''
        },
        body: JSON.stringify({
          type,
          phoneNumber: verificationData.phoneNumber,
          email: user?.email
        })
      });

      if (response.ok) {
        const result = await response.json();
        setVerificationStep(2);
        alert(t('verificationStarted', 'Verificatiecode verstuurd! Controleer je telefoon/email.'));
      } else {
        throw new Error('Failed to start verification');
      }
    } catch (error) {
      console.error('Error starting verification:', error);
      alert(t('verificationError', 'Er ging iets mis bij het starten van de verificatie'));
      setIsVerifying(false);
    }
  };

  const handleCompleteVerification = async (code) => {
    try {
      const response = await fetch('/api/verification/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?._id || ''
        },
        body: JSON.stringify({
          code,
          type: verificationData.verificationType
        })
      });

      if (response.ok) {
        const result = await response.json();
        setVerificationStep(3);
        if (onVerificationUpdate) {
          onVerificationUpdate(result);
        }
        alert(t('verificationSuccess', 'Verificatie succesvol! Je account is nu geverifieerd.'));
      } else {
        throw new Error('Invalid verification code');
      }
    } catch (error) {
      console.error('Error completing verification:', error);
      alert(t('verificationCodeError', 'Ongeldige verificatiecode. Probeer opnieuw.'));
    }
  };

  const getVerificationBadge = (trustScore) => {
    if (trustScore >= 90) return { icon: '🏆', color: '#ffd700', text: 'Elite' };
    if (trustScore >= 75) return { icon: '⭐', color: '#10b981', text: 'Vertrouwd' };
    if (trustScore >= 50) return { icon: '✓', color: '#3b82f6', text: 'Geverifieerd' };
    return { icon: '👤', color: '#6b7280', text: 'Nieuw' };
  };

  const verificationBadge = getVerificationBadge(user?.trustScore || 0);

  if (user?.isVerified) {
    return (
      <div className="user-verification verified">
        <div className="verification-status">
          <div className="verification-badge verified">
            <span className="badge-icon">✓</span>
            <span className="badge-text">{t('verified', 'Geverifieerd')}</span>
          </div>
          <div className="trust-score">
            <span 
              className="trust-badge"
              style={{ backgroundColor: verificationBadge.color }}
            >
              {verificationBadge.icon} {verificationBadge.text}
            </span>
            <span className="trust-number">{user?.trustScore || 0}/100</span>
          </div>
        </div>
        
        <div className="verification-benefits">
          <h4 className="benefits-title">{t('verificationBenefits', 'Verificatie voordelen')}</h4>
          <ul className="benefits-list">
            <li>✓ {t('benefit1', 'Verhoogd vertrouwen bij andere gebruikers')}</li>
            <li>✓ {t('benefit2', 'Toegang tot premium activiteiten')}</li>
            <li>✓ {t('benefit3', 'Snellere goedkeuring van je activiteiten')}</li>
            <li>✓ {t('benefit4', 'Uitgebreide veiligheidsfeatures')}</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="user-verification unverified">
      <div className="verification-header">
        <h3 className="verification-title">
          🛡️ {t('verifyAccount', 'Account Verificatie')}
        </h3>
        <p className="verification-subtitle">
          {t('verificationSubtitle', 'Verhoog je vertrouwen en veiligheid door je account te verifiëren')}
        </p>
      </div>

      {verificationStep === 1 && (
        <div className="verification-options">
          <div className="verification-option">
            <div className="option-content">
              <div className="option-icon">📱</div>
              <div className="option-info">
                <h4 className="option-title">{t('phoneVerification', 'Telefoonnummer Verificatie')}</h4>
                <p className="option-description">
                  {t('phoneVerificationDesc', 'Verifieer je telefoonnummer met een SMS code')}
                </p>
              </div>
            </div>
            <button 
              className="verify-button"
              onClick={() => handleStartVerification('phone')}
              disabled={isVerifying}
            >
              {t('verifyPhone', 'Verifieer Telefoon')}
            </button>
          </div>

          <div className="verification-option">
            <div className="option-content">
              <div className="option-icon">📧</div>
              <div className="option-info">
                <h4 className="option-title">{t('emailVerification', 'Email Verificatie')}</h4>
                <p className="option-description">
                  {t('emailVerificationDesc', 'Verifieer je email adres met een verificatiecode')}
                </p>
              </div>
            </div>
            <button 
              className="verify-button"
              onClick={() => handleStartVerification('email')}
              disabled={isVerifying}
            >
              {t('verifyEmail', 'Verifieer Email')}
            </button>
          </div>

          <div className="verification-option premium">
            <div className="option-content">
              <div className="option-icon">🆔</div>
              <div className="option-info">
                <h4 className="option-title">{t('documentVerification', 'ID Verificatie')}</h4>
                <p className="option-description">
                  {t('documentVerificationDesc', 'Upload een geldig identiteitsbewijs voor volledige verificatie')}
                </p>
              </div>
            </div>
            <button 
              className="verify-button premium"
              onClick={() => handleStartVerification('document')}
              disabled={isVerifying}
            >
              {t('verifyDocument', 'Verifieer ID')}
            </button>
          </div>
        </div>
      )}

      {verificationStep === 2 && (
        <div className="verification-code-step">
          <h4 className="step-title">
            {t('enterVerificationCode', 'Voer verificatiecode in')}
          </h4>
          <p className="step-description">
            {verificationData.verificationType === 'phone' 
              ? t('smsCodeSent', 'We hebben een SMS code gestuurd naar je telefoonnummer')
              : t('emailCodeSent', 'We hebben een verificatiecode gestuurd naar je email')
            }
          </p>
          
          <div className="code-input-container">
            <input
              type="text"
              className="code-input"
              placeholder={t('verificationCodePlaceholder', 'Voer 6-cijferige code in')}
              maxLength={6}
              onChange={(e) => {
                if (e.target.value.length === 6) {
                  handleCompleteVerification(e.target.value);
                }
              }}
            />
          </div>

          <button 
            className="resend-button"
            onClick={() => handleStartVerification(verificationData.verificationType)}
          >
            {t('resendCode', 'Code opnieuw verzenden')}
          </button>
        </div>
      )}

      {verificationStep === 3 && (
        <div className="verification-success">
          <div className="success-icon">🎉</div>
          <h4 className="success-title">{t('verificationComplete', 'Verificatie Voltooid!')}</h4>
          <p className="success-description">
            {t('verificationCompleteDesc', 'Je account is nu geverifieerd. Je kunt nu deelnemen aan alle activiteiten!')}
          </p>
        </div>
      )}

      <div className="verification-info">
        <h4 className="info-title">{t('whyVerify', 'Waarom verifiëren?')}</h4>
        <div className="info-benefits">
          <div className="benefit-item">
            <span className="benefit-icon">🔒</span>
            <span className="benefit-text">{t('increasedSafety', 'Verhoogde veiligheid')}</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">🤝</span>
            <span className="benefit-text">{t('buildTrust', 'Vertrouwen opbouwen')}</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">⭐</span>
            <span className="benefit-text">{t('premiumFeatures', 'Premium functies')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserVerification;