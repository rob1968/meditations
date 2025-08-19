import React from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from './PageHeader';

const PrivacyPolicy = ({ user, onLogout }) => {
  const { t } = useTranslation();

  return (
    <div className="privacy-policy-page">
      <PageHeader 
        user={user}
        onLogout={onLogout}
      />
      
      <div className="privacy-content">
        <h1 className="privacy-title">{t('privacyPolicy', 'Privacy Policy')}</h1>
        <p className="privacy-updated">{t('lastUpdated', 'Last Updated')}: {new Date().toLocaleDateString()}</p>

        <section className="privacy-section">
          <h2>{t('privacyIntro', 'Introduction')}</h2>
          <p>{t('privacyIntroText', 'PiHappy Meditation App respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information.')}</p>
        </section>

        <section className="privacy-section">
          <h2>{t('dataCollection', 'Data We Collect')}</h2>
          <ul>
            <li>{t('dataPersonal', 'Personal Information: Name, email, profile picture')}</li>
            <li>{t('dataUsage', 'Usage Data: Meditation history, journal entries, preferences')}</li>
            <li>{t('dataHealth', 'Health Data: Mood tracking, addiction recovery progress (optional)')}</li>
            <li>{t('dataPayment', 'Payment Data: Pi Network transaction IDs (no credit cards stored)')}</li>
            <li>{t('dataLocation', 'Location Data: City/country for community features (optional)')}</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>{t('dataUse', 'How We Use Your Data')}</h2>
          <ul>
            <li>{t('usePersonalize', 'Personalize your meditation experience')}</li>
            <li>{t('useAI', 'Provide AI coaching and mood analysis')}</li>
            <li>{t('useCommunity', 'Enable community features and connections')}</li>
            <li>{t('useImprove', 'Improve our services and develop new features')}</li>
            <li>{t('useSupport', 'Provide customer support')}</li>
            <li>{t('useSafety', 'Ensure safety and prevent abuse')}</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>{t('dataSharing', 'Data Sharing')}</h2>
          <p>{t('dataSharingIntro', 'We do not sell your personal data. We share data only in these circumstances:')}</p>
          <ul>
            <li>{t('shareConsent', 'With your explicit consent')}</li>
            <li>{t('shareProviders', 'With service providers (OpenAI for AI, ElevenLabs for voice, Google for TTS)')}</li>
            <li>{t('shareLegal', 'To comply with legal obligations')}</li>
            <li>{t('shareEmergency', 'In emergency situations (crisis intervention)')}</li>
            <li>{t('shareCommunity', 'Public content you choose to share in community features')}</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>{t('dataSecurity', 'Data Security')}</h2>
          <p>{t('dataSecurityText', 'We implement industry-standard security measures including:')}</p>
          <ul>
            <li>{t('securityEncryption', 'SSL/TLS encryption for data transmission')}</li>
            <li>{t('securityStorage', 'Secure cloud storage with encryption at rest')}</li>
            <li>{t('securityAccess', 'Limited access to personal data')}</li>
            <li>{t('securityUpdates', 'Regular security updates and monitoring')}</li>
            <li>{t('securityBackup', 'Regular backups to prevent data loss')}</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>{t('dataRetention', 'Data Retention')}</h2>
          <p>{t('dataRetentionText', 'We retain your data as follows:')}</p>
          <ul>
            <li>{t('retentionAccount', 'Account data: Until you delete your account')}</li>
            <li>{t('retentionMeditation', 'Meditation history: 2 years or until deleted by you')}</li>
            <li>{t('retentionJournal', 'Journal entries: Until deleted by you')}</li>
            <li>{t('retentionBackup', 'Backup data: 30 days after deletion')}</li>
            <li>{t('retentionLegal', 'Legal records: As required by law')}</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>{t('yourRights', 'Your Rights')}</h2>
          <p>{t('yourRightsText', 'You have the right to:')}</p>
          <ul>
            <li>{t('rightAccess', 'Access your personal data')}</li>
            <li>{t('rightCorrect', 'Correct inaccurate data')}</li>
            <li>{t('rightDelete', 'Delete your data ("right to be forgotten")')}</li>
            <li>{t('rightExport', 'Export your data in a portable format')}</li>
            <li>{t('rightRestrict', 'Restrict processing of your data')}</li>
            <li>{t('rightObject', 'Object to data processing')}</li>
            <li>{t('rightWithdraw', 'Withdraw consent at any time')}</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>{t('cookies', 'Cookies and Tracking')}</h2>
          <p>{t('cookiesText', 'We use essential cookies for:')}</p>
          <ul>
            <li>{t('cookiesAuth', 'Authentication and security')}</li>
            <li>{t('cookiesPreferences', 'Remembering your preferences')}</li>
            <li>{t('cookiesLanguage', 'Language settings')}</li>
            <li>{t('cookiesAnalytics', 'Anonymous usage analytics (optional)')}</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>{t('childrenPrivacy', "Children's Privacy")}</h2>
          <p>{t('childrenText', 'Our service is not directed to children under 13. We do not knowingly collect data from children under 13. If you are a parent and believe your child has provided us with personal data, please contact us.')}</p>
        </section>

        <section className="privacy-section">
          <h2>{t('internationalData', 'International Data Transfers')}</h2>
          <p>{t('internationalText', 'Your data may be transferred to and processed in countries outside your residence. We ensure appropriate safeguards are in place for such transfers.')}</p>
        </section>

        <section className="privacy-section">
          <h2>{t('aiDisclosure', 'AI and Machine Learning')}</h2>
          <p>{t('aiText', 'We use AI services for:')}</p>
          <ul>
            <li>{t('aiMeditation', 'Generating personalized meditation content')}</li>
            <li>{t('aiCoaching', 'Providing AI coaching and support')}</li>
            <li>{t('aiMood', 'Analyzing mood patterns (anonymized)')}</li>
            <li>{t('aiVoice', 'Converting text to speech')}</li>
            <li>{t('aiGrammar', 'Grammar and spelling assistance')}</li>
          </ul>
          <p>{t('aiNote', 'AI processing is done securely and your data is not used to train external AI models.')}</p>
        </section>

        <section className="privacy-section">
          <h2>{t('changes', 'Changes to This Policy')}</h2>
          <p>{t('changesText', 'We may update this privacy policy periodically. We will notify you of significant changes via email or in-app notification.')}</p>
        </section>

        <section className="privacy-section">
          <h2>{t('contact', 'Contact Us')}</h2>
          <p>{t('contactText', 'For privacy concerns or questions, contact us at:')}</p>
          <ul>
            <li>{t('contactEmail', 'Email: privacy@pihappy.me')}</li>
            <li>{t('contactWebsite', 'Website: https://pihappy.me')}</li>
            <li>{t('contactAddress', 'Address: PiHappy Meditation, Netherlands')}</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>{t('gdprCompliance', 'GDPR Compliance')}</h2>
          <p>{t('gdprText', 'For EU residents, we comply with GDPR requirements including:')}</p>
          <ul>
            <li>{t('gdprLawful', 'Lawful basis for data processing')}</li>
            <li>{t('gdprTransparent', 'Transparent data practices')}</li>
            <li>{t('gdprMinimization', 'Data minimization principles')}</li>
            <li>{t('gdprDPO', 'Data Protection Officer available for inquiries')}</li>
            <li>{t('gdprBreach', 'Breach notification within 72 hours')}</li>
          </ul>
        </section>

        <div className="privacy-footer">
          <p className="privacy-agreement">
            {t('privacyAgreement', 'By using PiHappy Meditation App, you agree to this Privacy Policy.')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;