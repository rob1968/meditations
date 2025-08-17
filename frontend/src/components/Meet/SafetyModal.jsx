import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const SafetyModal = ({ isOpen, onClose, user, activity }) => {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/safety/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?._id || ''
        },
        body: JSON.stringify({
          reportType,
          description: reportDescription,
          activityId: activity?._id,
          reportedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        alert(t('reportSubmitted', 'Melding ingediend. Dank je voor het helpen veilig te houden!'));
        onClose();
        setReportType('');
        setReportDescription('');
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting safety report:', error);
      alert(t('reportError', 'Er ging iets mis bij het indienen van de melding'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const emergencyContacts = [
    {
      name: t('emergency', 'Noodgevallen'),
      number: '112',
      description: t('emergencyDesc', 'Voor levensbedreigende situaties')
    },
    {
      name: t('police', 'Politie (niet-spoed)'),
      number: '0900-8844',
      description: t('policeDesc', 'Voor niet-spoedeisende politiekwesties')
    },
    {
      name: t('crisis', 'Crisis hulplijn'),
      number: '113',
      description: t('crisisDesc', 'Voor persoonlijke crisis en zelfmoordpreventie')
    }
  ];

  const safetyTips = [
    t('safetyTip1', 'Ontmoet altijd eerst op een openbare plek'),
    t('safetyTip2', 'Vertel iemand waar je naartoe gaat'),
    t('safetyTip3', 'Vertrouw op je gevoel - ga weg als iets niet klopt'),
    t('safetyTip4', 'Deel geen persoonlijke informatie te vroeg'),
    t('safetyTip5', 'Gebruik je eigen vervoer naar en van de activiteit')
  ];

  return (
    <div className="safety-modal-overlay" onClick={onClose}>
      <div className="safety-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="safety-modal-header">
          <h2 className="safety-modal-title">
            🛡️ {t('safetyCenter', 'Veiligheidscentrum')}
          </h2>
          <button className="safety-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="safety-modal-body">
          {/* Safety Tips */}
          <div className="safety-section">
            <h3 className="safety-section-title">
              💡 {t('safetyTips', 'Veiligheidstips')}
            </h3>
            <div className="safety-tips-list">
              {safetyTips.map((tip, index) => (
                <div key={index} className="safety-tip">
                  <span className="tip-icon">✓</span>
                  <span className="tip-text">{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Contacts */}
          <div className="safety-section">
            <h3 className="safety-section-title">
              📞 {t('emergencyContacts', 'Noodcontacten')}
            </h3>
            <div className="emergency-contacts-list">
              {emergencyContacts.map((contact, index) => (
                <div key={index} className="emergency-contact">
                  <div className="contact-info">
                    <div className="contact-name">{contact.name}</div>
                    <div className="contact-description">{contact.description}</div>
                  </div>
                  <a 
                    href={`tel:${contact.number}`} 
                    className="contact-number"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {contact.number}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Report Issue */}
          <div className="safety-section">
            <h3 className="safety-section-title">
              ⚠️ {t('reportIssue', 'Probleem melden')}
            </h3>
            <form onSubmit={handleSubmitReport} className="report-form">
              <div className="form-group">
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">{t('selectReportType', 'Selecteer type melding')}</option>
                  <option value="inappropriate_behavior">{t('inappropriateBehavior', 'Ongepast gedrag')}</option>
                  <option value="fake_profile">{t('fakeProfile', 'Nep profiel')}</option>
                  <option value="spam">{t('spam', 'Spam')}</option>
                  <option value="safety_concern">{t('safetyConcern', 'Veiligheidsbezorgdheid')}</option>
                  <option value="harassment">{t('harassment', 'Intimidatie')}</option>
                  <option value="other">{t('other', 'Anders')}</option>
                </select>
              </div>

              <div className="form-group">
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder={t('reportDescPlaceholder', 'Beschrijf het probleem zo gedetailleerd mogelijk...')}
                  className="form-textarea"
                  rows={4}
                  required
                />
              </div>

              <div className="report-buttons">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={onClose}
                >
                  {t('cancel', 'Annuleren')}
                </button>
                <button 
                  type="submit" 
                  className="submit-report-button"
                  disabled={isSubmitting || !reportType || !reportDescription.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <span className="button-spinner"></span>
                      {t('submitting', 'Indienen...')}
                    </>
                  ) : (
                    <>
                      <span>🚨</span>
                      {t('submitReport', 'Melden')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Trust & Verification Info */}
          <div className="safety-section">
            <h3 className="safety-section-title">
              🏆 {t('trustVerification', 'Vertrouwen & Verificatie')}
            </h3>
            <div className="trust-info">
              <div className="trust-item">
                <span className="trust-icon">✓</span>
                <div className="trust-content">
                  <div className="trust-title">{t('verifiedUsers', 'Geverifieerde gebruikers')}</div>
                  <div className="trust-description">
                    {t('verifiedDesc', 'Gebruikers met een ✓ hebben hun identiteit bevestigd')}
                  </div>
                </div>
              </div>
              
              <div className="trust-item">
                <span className="trust-icon">⭐</span>
                <div className="trust-content">
                  <div className="trust-title">{t('trustScore', 'Vertrouwensscore')}</div>
                  <div className="trust-description">
                    {t('trustScoreDesc', 'Gebaseerd op positieve reviews en activiteiten')}
                  </div>
                </div>
              </div>
              
              <div className="trust-item">
                <span className="trust-icon">🔒</span>
                <div className="trust-content">
                  <div className="trust-title">{t('privacyProtection', 'Privacy bescherming')}</div>
                  <div className="trust-description">
                    {t('privacyDesc', 'Je persoonlijke gegevens zijn veilig en privé')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyModal;