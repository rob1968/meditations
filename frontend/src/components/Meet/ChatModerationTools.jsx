import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const ChatModerationTools = ({ 
  message, 
  user, 
  conversation, 
  onReport, 
  onBlock, 
  onDelete, 
  onEdit,
  onClose,
  isOrganizer = false,
  isModerator = false 
}) => {
  const { t } = useTranslation();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportReasons = [
    { id: 'spam', label: t('reportSpam', 'Spam of ongewenste berichten') },
    { id: 'harassment', label: t('reportHarassment', 'Intimidatie of pesterijen') },
    { id: 'inappropriate', label: t('reportInappropriate', 'Ongepaste inhoud') },
    { id: 'hate_speech', label: t('reportHateSpeech', 'Haatdragende taal') },
    { id: 'violence', label: t('reportViolence', 'Geweld of dreigingen') },
    { id: 'privacy', label: t('reportPrivacy', 'Privacyschending') },
    { id: 'misinformation', label: t('reportMisinformation', 'Misinformatie') },
    { id: 'other', label: t('reportOther', 'Overig') }
  ];

  const canDeleteMessage = () => {
    const isOwnMessage = message.sender?._id === user?.id || message.sender?._id === user?._id;
    return isOwnMessage || isOrganizer || isModerator;
  };

  const canEditMessage = () => {
    const isOwnMessage = message.sender?._id === user?.id || message.sender?._id === user?._id;
    return isOwnMessage;
  };

  const canBlockUser = () => {
    const isOwnMessage = message.sender?._id === user?.id || message.sender?._id === user?._id;
    return !isOwnMessage;
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onReport({
        messageId: message._id,
        senderId: message.sender?._id,
        reason: reportReason,
        description: reportDescription.trim(),
        conversationId: conversation._id
      });

      setShowReportDialog(false);
      setReportReason('');
      setReportDescription('');
      onClose();
    } catch (error) {
      console.error('Error reporting message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await onDelete(message._id);
      setShowDeleteDialog(false);
      onClose();
    } catch (error) {
      console.error('Error deleting message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async () => {
    try {
      await onBlock(message.sender?._id);
      onClose();
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  if (showReportDialog) {
    return (
      <div className="moderation-overlay" onClick={onClose}>
        <div className="moderation-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="moderation-header">
            <h3>{t('reportMessage', 'Bericht rapporteren')}</h3>
            <button className="close-btn" onClick={onClose}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="reported-message">
            <div className="message-preview">
              <strong>{message.sender?.username}:</strong> {message.content?.text}
            </div>
          </div>

          <div className="report-form">
            <div className="form-group">
              <label>{t('reportReason', 'Reden voor rapportage')}:</label>
              <div className="report-reasons">
                {reportReasons.map(reason => (
                  <button
                    key={reason.id}
                    className={`reason-btn ${reportReason === reason.id ? 'selected' : ''}`}
                    onClick={() => setReportReason(reason.id)}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>{t('additionalDetails', 'Aanvullende details')} ({t('optional', 'optioneel')}):</label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder={t('reportDescriptionPlaceholder', 'Beschrijf wat er aan de hand is...')}
                rows="3"
                maxLength="500"
              />
              <div className="char-count">{reportDescription.length}/500</div>
            </div>

            <div className="report-warning">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.684-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
              <span>{t('reportWarning', 'Misbruik van het rapportagesysteem kan leiden tot sancties tegen je account.')}</span>
            </div>

            <div className="dialog-actions">
              <button className="cancel-btn" onClick={() => setShowReportDialog(false)}>
                {t('cancel', 'Annuleren')}
              </button>
              <button 
                className="submit-btn" 
                onClick={handleReport}
                disabled={!reportReason || isSubmitting}
              >
                {isSubmitting ? t('submitting', 'Versturen...') : t('submitReport', 'Rapportage versturen')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showDeleteDialog) {
    return (
      <div className="moderation-overlay" onClick={onClose}>
        <div className="moderation-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="moderation-header">
            <h3>{t('deleteMessage', 'Bericht verwijderen')}</h3>
            <button className="close-btn" onClick={onClose}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="delete-confirmation">
            <div className="warning-icon">
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.684-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
            </div>
            <p>{t('deleteConfirmation', 'Weet je zeker dat je dit bericht wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.')}</p>
            
            <div className="message-preview">
              <strong>{message.sender?.username}:</strong> {message.content?.text}
            </div>
          </div>

          <div className="dialog-actions">
            <button className="cancel-btn" onClick={() => setShowDeleteDialog(false)}>
              {t('cancel', 'Annuleren')}
            </button>
            <button 
              className="delete-btn" 
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('deleting', 'Verwijderen...') : t('delete', 'Verwijderen')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="moderation-overlay" onClick={onClose}>
      <div className="moderation-menu" onClick={(e) => e.stopPropagation()}>
        <div className="moderation-header">
          <h4>{t('messageActions', 'Berichtacties')}</h4>
        </div>

        <div className="moderation-actions">
          {canEditMessage() && (
            <button 
              className="action-item edit-action"
              onClick={() => {
                onEdit(message);
                onClose();
              }}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="m18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span>{t('editMessage', 'Bericht bewerken')}</span>
            </button>
          )}

          <button 
            className="action-item report-action"
            onClick={() => setShowReportDialog(true)}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2zM3 7l9 6 9-6"/>
            </svg>
            <span>{t('reportMessage', 'Bericht rapporteren')}</span>
          </button>

          {canBlockUser() && (
            <button 
              className="action-item block-action"
              onClick={handleBlock}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <path d="m4.93 4.93 14.14 14.14"/>
              </svg>
              <span>{t('blockUser', 'Gebruiker blokkeren')}</span>
            </button>
          )}

          {canDeleteMessage() && (
            <button 
              className="action-item delete-action"
              onClick={() => setShowDeleteDialog(true)}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                <polyline points="3,6 5,6 21,6"/>
                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
              </svg>
              <span>{t('deleteMessage', 'Bericht verwijderen')}</span>
            </button>
          )}

          {(isOrganizer || isModerator) && (
            <>
              <div className="action-separator"></div>
              <div className="moderator-section">
                <span className="section-title">{t('moderatorActions', 'Moderatoracties')}</span>
                
                <button 
                  className="action-item warn-action"
                  onClick={() => {
                    // Implement warning functionality
                    console.log('Warning user:', message.sender?.username);
                    onClose();
                  }}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.684-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                  </svg>
                  <span>{t('warnUser', 'Gebruiker waarschuwen')}</span>
                </button>

                <button 
                  className="action-item timeout-action"
                  onClick={() => {
                    // Implement timeout functionality
                    console.log('Timeout user:', message.sender?.username);
                    onClose();
                  }}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                  <span>{t('timeoutUser', 'Gebruiker tijdelijk uitsluiten')}</span>
                </button>

                <button 
                  className="action-item kick-action"
                  onClick={() => {
                    // Implement kick functionality
                    console.log('Kick user:', message.sender?.username);
                    onClose();
                  }}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  <span>{t('kickUser', 'Gebruiker verwijderen uit chat')}</span>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="message-context">
          <div className="context-header">{t('messagePreview', 'Bericht preview')}:</div>
          <div className="context-message">
            <strong>{message.sender?.username}:</strong> {message.content?.text}
          </div>
          <div className="context-time">
            {new Date(message.createdAt).toLocaleString('nl-NL')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModerationTools;