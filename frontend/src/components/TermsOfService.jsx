import React from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from './PageHeader';

const TermsOfService = ({ user, onLogout }) => {
  const { t } = useTranslation();

  return (
    <div className="terms-page">
      <PageHeader 
        user={user}
        onLogout={onLogout}
      />
      
      <div className="terms-content">
        <h1 className="terms-title">{t('termsOfService', 'Terms of Service')}</h1>
        <p className="terms-updated">{t('lastUpdated', 'Last Updated')}: {new Date().toLocaleDateString()}</p>

        <section className="terms-section">
          <h2>{t('termsAcceptance', 'Acceptance of Terms')}</h2>
          <p>{t('termsAcceptanceText', 'By accessing and using PiHappy Meditation App, you accept and agree to be bound by these Terms of Service and our Privacy Policy.')}</p>
        </section>

        <section className="terms-section">
          <h2>{t('serviceDescription', 'Service Description')}</h2>
          <p>{t('serviceDescriptionText', 'PiHappy Meditation provides:')}</p>
          <ul>
            <li>{t('serviceAI', 'AI-powered personalized meditation sessions')}</li>
            <li>{t('serviceJournal', 'Digital journaling with mood tracking')}</li>
            <li>{t('serviceCoaching', 'AI life coaching and support')}</li>
            <li>{t('serviceCommunity', 'Community features for connection and support')}</li>
            <li>{t('serviceActivities', 'Social activities and meetup organization')}</li>
            <li>{t('serviceAudio', 'Custom audio and background music')}</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>{t('userAccounts', 'User Accounts')}</h2>
          <p>{t('userAccountsText', 'When creating an account, you agree to:')}</p>
          <ul>
            <li>{t('accountAccurate', 'Provide accurate and complete information')}</li>
            <li>{t('accountSecurity', 'Maintain the security of your account')}</li>
            <li>{t('accountResponsible', 'Be responsible for all activities under your account')}</li>
            <li>{t('accountNotify', 'Notify us of any unauthorized use')}</li>
            <li>{t('accountAge', 'Be at least 13 years of age')}</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>{t('acceptableUse', 'Acceptable Use Policy')}</h2>
          <p>{t('acceptableUseText', 'You agree NOT to:')}</p>
          <ul>
            <li>{t('useIllegal', 'Use the service for illegal purposes')}</li>
            <li>{t('useHarm', 'Harass, abuse, or harm others')}</li>
            <li>{t('useFalse', 'Provide false or misleading information')}</li>
            <li>{t('useViolate', 'Violate intellectual property rights')}</li>
            <li>{t('useSpam', 'Send spam or unauthorized advertising')}</li>
            <li>{t('useHack', 'Attempt to hack or disrupt the service')}</li>
            <li>{t('useScrape', 'Scrape or copy content without permission')}</li>
            <li>{t('useImpersonate', 'Impersonate others or create fake accounts')}</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>{t('paymentTerms', 'Payment and Credits')}</h2>
          <ul>
            <li>{t('paymentPi', 'Payments are processed through Pi Network')}</li>
            <li>{t('paymentCredits', 'Credits are non-refundable and non-transferable')}</li>
            <li>{t('paymentUsage', 'Credits are used for AI generation and premium features')}</li>
            <li>{t('paymentExpiry', 'Credits do not expire unless account is terminated')}</li>
            <li>{t('paymentDisputes', 'Payment disputes must be raised within 30 days')}</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>{t('intellectualProperty', 'Intellectual Property')}</h2>
          <p>{t('intellectualPropertyText', 'Ownership and rights:')}</p>
          <ul>
            <li>{t('ipApp', 'The app and its original content remain our property')}</li>
            <li>{t('ipUser', 'You retain rights to your personal content')}</li>
            <li>{t('ipLicense', 'You grant us license to use your content for service operation')}</li>
            <li>{t('ipGenerated', 'AI-generated content is provided for your personal use')}</li>
            <li>{t('ipShared', 'Shared community content may be used by other users')}</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>{t('healthDisclaimer', 'Health and Medical Disclaimer')}</h2>
          <p className="terms-warning">{t('healthDisclaimerImportant', 'IMPORTANT:')}</p>
          <ul>
            <li>{t('healthNotMedical', 'This app is NOT a substitute for professional medical advice')}</li>
            <li>{t('healthEmergency', 'In emergencies, contact local emergency services immediately')}</li>
            <li>{t('healthConsult', 'Always consult healthcare professionals for medical concerns')}</li>
            <li>{t('healthMeditation', 'Meditation may not be suitable for all conditions')}</li>
            <li>{t('healthResponsibility', 'You use the app at your own risk')}</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>{t('aiDisclaimer', 'AI Services Disclaimer')}</h2>
          <p>{t('aiDisclaimerText', 'Regarding AI-generated content:')}</p>
          <ul>
            <li>{t('aiAccuracy', 'AI responses may not always be accurate or appropriate')}</li>
            <li>{t('aiNotProfessional', 'AI coaching is not professional therapy or counseling')}</li>
            <li>{t('aiVerify', 'Always verify important information independently')}</li>
            <li>{t('aiLimitations', 'AI has limitations and may misunderstand context')}</li>
            <li>{t('aiImprovement', 'We continuously work to improve AI quality')}</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>{t('limitation', 'Limitation of Liability')}</h2>
          <p>{t('limitationText', 'To the maximum extent permitted by law:')}</p>
          <ul>
            <li>{t('limitationService', 'Service is provided "as is" without warranties')}</li>
            <li>{t('limitationDamages', 'We are not liable for indirect or consequential damages')}</li>
            <li>{t('limitationLoss', 'We are not responsible for data loss or corruption')}</li>
            <li>{t('limitationThirdParty', 'We are not liable for third-party services or content')}</li>
            <li>{t('limitationMax', 'Maximum liability is limited to amount paid in last 12 months')}</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>{t('indemnification', 'Indemnification')}</h2>
          <p>{t('indemnificationText', 'You agree to indemnify and hold harmless PiHappy Meditation from any claims arising from your use of the service, violation of these terms, or infringement of any rights.')}</p>
        </section>

        <section className="terms-section">
          <h2>{t('termination', 'Termination')}</h2>
          <p>{t('terminationText', 'Account termination:')}</p>
          <ul>
            <li>{t('terminationUser', 'You may delete your account at any time')}</li>
            <li>{t('terminationViolation', 'We may suspend or terminate accounts for violations')}</li>
            <li>{t('terminationData', 'Upon termination, your data will be deleted per our Privacy Policy')}</li>
            <li>{t('terminationRefund', 'No refunds for unused credits upon termination')}</li>
            <li>{t('terminationContent', 'You may export your content before termination')}</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>{t('modifications', 'Modifications to Service')}</h2>
          <p>{t('modificationsText', 'We reserve the right to:')}</p>
          <ul>
            <li>{t('modifyService', 'Modify or discontinue features')}</li>
            <li>{t('modifyPricing', 'Change pricing with 30 days notice')}</li>
            <li>{t('modifyTerms', 'Update these terms with notification')}</li>
            <li>{t('modifyAPI', 'Change or limit API access')}</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>{t('governingLaw', 'Governing Law')}</h2>
          <p>{t('governingLawText', 'These terms are governed by the laws of the Netherlands. Any disputes shall be resolved in Dutch courts, except where prohibited by law.')}</p>
        </section>

        <section className="terms-section">
          <h2>{t('severability', 'Severability')}</h2>
          <p>{t('severabilityText', 'If any provision of these terms is found unenforceable, the remaining provisions will continue in full force and effect.')}</p>
        </section>

        <section className="terms-section">
          <h2>{t('entireAgreement', 'Entire Agreement')}</h2>
          <p>{t('entireAgreementText', 'These Terms of Service and our Privacy Policy constitute the entire agreement between you and PiHappy Meditation.')}</p>
        </section>

        <section className="terms-section">
          <h2>{t('contact', 'Contact Information')}</h2>
          <p>{t('contactTermsText', 'For questions about these terms:')}</p>
          <ul>
            <li>{t('contactEmail', 'Email: legal@pihappy.me')}</li>
            <li>{t('contactWebsite', 'Website: https://pihappy.me')}</li>
            <li>{t('contactSupport', 'Support: support@pihappy.me')}</li>
          </ul>
        </section>

        <div className="terms-footer">
          <p className="terms-agreement">
            {t('termsAgreement', 'By using PiHappy Meditation App, you acknowledge that you have read, understood, and agree to these Terms of Service.')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;