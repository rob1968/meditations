import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import socketService from '../../services/socketService';
import ActivityList from './ActivityList';
import MyActivities from './MyActivities';
import CreateActivity from './CreateActivity';
import ChatList from './ChatList';
import ActivityCalendar from './ActivityCalendar';
import SafetyModal from './SafetyModal';
import UserVerification from './UserVerification';
import AdminActivities from './AdminActivities';

const MeetHub = ({ user }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('discover');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [categories, setCategories] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [approvedActivities, setApprovedActivities] = useState([]);

  useEffect(() => {
    // Initialize socket connection when MeetHub loads
    if (user?._id) {
      initializeSocket();
    }

    return () => {
      // Clean up socket when component unmounts
      socketService.disconnect();
    };
  }, [user?._id]);

  useEffect(() => {
    // Load activity categories and approved activities
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        console.log('🔄 Loading categories and activities...');
        
        // Load categories
        const categoriesResponse = await fetch('/api/activities/categories');
        console.log('📡 Categories API status:', categoriesResponse.status);
        
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          console.log('📦 Categories loaded:', categoriesData?.length || 0);
          setCategories(categoriesData || []);
        } else {
          console.error('❌ Categories API failed:', categoriesResponse.status);
          // Set fallback category
          setCategories([
            { _id: 'fallback', name: { nl: 'Algemeen' }, emoji: '✨', color: '#6B46C1' }
          ]);
        }

        // Load approved activities for calendar
        if (user?._id || user?.id) {
          console.log('🔄 Loading approved activities for calendar...');
          const activitiesResponse = await fetch('/api/activities?status=approved', {
            headers: {
              'x-user-id': user._id || user.id,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('📡 Activities API status:', activitiesResponse.status);
          
          if (activitiesResponse.ok) {
            const activitiesData = await activitiesResponse.json();
            console.log('📦 Approved activities loaded:', activitiesData?.activities?.length || 0);
            setApprovedActivities(activitiesData?.activities || []);
          } else {
            console.error('Failed to load activities:', activitiesResponse.status);
            setApprovedActivities([]);
          }
        }
      } catch (error) {
        console.error('❌ Data loading error:', error);
        setCategories([
          { _id: 'fallback', name: { nl: 'Algemeen' }, emoji: '✨', color: '#6B46C1' }
        ]);
        setApprovedActivities([]);
      } finally {
        console.log('🏁 Data loading complete');
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user?._id, user?.id]);

  const initializeSocket = async () => {
    try {
      console.log('🔌 Attempting socket connection for user:', user._id);
      await socketService.connect(user._id);
      setIsSocketConnected(true);
      
      // Set user status as online
      socketService.updateStatus('online');
      
      console.log('✅ Socket connected for Meet functionality');
    } catch (error) {
      console.error('❌ Failed to connect socket:', error);
      // For now, continue without socket connection (activities still work)
      setIsSocketConnected(false);
    }
  };

  const allTabs = [
    { 
      id: 'discover', 
      icon: '🔍', 
      label: t('discoverActivities', 'Ontdekken'),
      badge: null
    },
    { 
      id: 'calendar', 
      icon: '📅', 
      label: t('calendar', 'Kalender'),
      badge: null
    },
    { 
      id: 'my-activities', 
      icon: '👤', 
      label: t('myActivities', 'Mijn'),
      badge: null
    },
    { 
      id: 'create', 
      icon: '➕', 
      label: t('createActivity', 'Nieuw'),
      badge: null,
      requiresVerification: true
    },
    { 
      id: 'chats', 
      icon: '💬', 
      label: t('activityChats', 'Chats'),
      badge: unreadMessages > 0 ? unreadMessages : null
    },
    { 
      id: 'admin', 
      icon: '🛡️', 
      label: t('admin', 'Admin'),
      badge: null,
      adminOnly: true
    }
  ];

  // Filter tabs based on user verification status and admin access
  const tabs = allTabs.filter(tab => {
    if (tab.requiresVerification) {
      const canShow = user?.isVerified === true;
      console.log(`🔍 Tab "${tab.id}" requires verification - User verified: ${user?.isVerified}, Show tab: ${canShow}`);
      return canShow;
    }
    if (tab.adminOnly) {
      const canShow = (user?.username === 'rob' || user?.username === 'robbie') && user?.isVerified === true;
      console.log(`🔍 Tab "${tab.id}" is admin only - User: ${user?.username}, Verified: ${user?.isVerified}, Show tab: ${canShow}`);
      return canShow;
    }
    return true;
  });

  const renderContent = () => {
    console.log('🎬 Rendering content for tab:', activeTab);
    console.log('🔍 Available tabs:', tabs.map(t => t.id));
    console.log('👤 User verification status:', user?.isVerified);
    
    if (isLoading) {
      return (
        <div className="meet-loading">
          <div className="loading-animation"></div>
          <p className="loading-text">{t('loading', 'Laden...')}</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'discover':
        return (
          <ActivityList 
            user={user} 
            categories={categories}
            onSelectActivity={(activity) => {
              setSelectedActivity(activity);
              setActiveTab('chats');
            }}
          />
        );
      case 'calendar':
        return (
          <ActivityCalendar 
            user={user}
            activities={approvedActivities}
            onSelectActivity={(activity) => {
              setSelectedActivity(activity);
              setActiveTab('chats');
            }}
            onDateSelect={(date) => {
              console.log('📅 Selected date:', date);
            }}
          />
        );
      case 'my-activities':
        return (
          <MyActivities 
            user={user}
            onSelectActivity={(activity) => {
              setSelectedActivity(activity);
              setActiveTab('chats');
            }}
          />
        );
      case 'create':
        console.log('🔨 Rendering CreateActivity component');
        console.log('📦 Categories available:', categories?.length || 0);
        console.log('👤 User for CreateActivity:', user?.username);
        return (
          <CreateActivity 
            user={user} 
            categories={categories}
            onActivityCreated={(newActivity) => {
              console.log('🎉 Activity created:', newActivity);
              setSelectedActivity(newActivity);
              setActiveTab('my-activities');
            }}
          />
        );
      case 'chats':
        return (
          <ChatList 
            user={user} 
            activityId={selectedActivity?._id}
            onUnreadCountChange={setUnreadMessages}
          />
        );
      case 'admin':
        return (
          <AdminActivities 
            user={user}
          />
        );
      default:
        return (
          <ActivityList 
            user={user} 
            categories={categories}
            onSelectActivity={(activity) => {
              setSelectedActivity(activity);
              setActiveTab('chats');
            }}
          />
        );
    }
  };

  return (
    <div className="meet-hub">
      <div className="meet-header">
        <h1 className="meet-title">{t('meet', 'Ontmoeten')}</h1>
        <p className="meet-subtitle">
          {t('meetSubtitle', 'Doe mee aan groepsactiviteiten en ontmoet nieuwe mensen')}
        </p>
        
        <div className="meet-header-actions">
          {user?.isVerified && (
            <button 
              className="create-activity-button primary-button"
              onClick={() => {
                console.log('🔄 Create button clicked, switching to create tab');
                console.log('User verified status:', user?.isVerified);
                setActiveTab('create');
              }}
              title={t('createActivity', 'Nieuwe activiteit aanmaken')}
            >
              ➕ {t('createActivity', 'Activiteit aanmaken')}
            </button>
          )}
          
          {/* Debug info - show user verification status */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{fontSize: '12px', color: '#666', marginTop: '8px'}}>
              Debug: User {user?.username} - Verified: {user?.isVerified ? 'Yes' : 'No'}
            </div>
          )}
          
          <button 
            className="safety-button secondary-button"
            onClick={() => setShowSafetyModal(true)}
            title={t('safetyCenter', 'Veiligheidscentrum')}
          >
            🛡️ {t('safety', 'Veiligheid')}
          </button>
          
          {!user?.isVerified && (
            <button 
              className="verification-button secondary-button"
              onClick={() => setShowVerificationModal(true)}
              title={t('verifyAccount', 'Account Verificatie')}
            >
              ✓ {t('verify', 'Verifiëren')}
            </button>
          )}
          
          {user?.isVerified && (
            <div className="verified-badge-header" title={t('verified', 'Geverifieerd')}>
              <span className="verified-icon">✓</span>
              <span className="verified-text">{t('verified', 'Geverifieerd')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="meet-tabs">
        <div className="meet-tabs-container">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`meet-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="meet-tab-icon">{tab.icon}</span>
              <span className="meet-tab-label">{tab.label}</span>
              {tab.badge && (
                <span className="meet-tab-badge">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="meet-content">
        {renderContent()}
      </div>

      {!isSocketConnected && user?._id && (
        <div className="socket-status-info">
          <span className="info-icon">ℹ️</span>
          <span className="info-text">
            {t('limitedRealtime', 'Real-time chat wordt geladen...')}
          </span>
        </div>
      )}

      {/* Safety Modal */}
      <SafetyModal
        isOpen={showSafetyModal}
        onClose={() => setShowSafetyModal(false)}
        user={user}
        activity={selectedActivity}
      />

      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="verification-modal-overlay" onClick={() => setShowVerificationModal(false)}>
          <div className="verification-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="verification-modal-header">
              <h2>{t('accountVerification', 'Account Verificatie')}</h2>
              <button 
                className="close-modal-button"
                onClick={() => setShowVerificationModal(false)}
              >
                ✕
              </button>
            </div>
            <UserVerification
              user={user}
              onVerificationUpdate={(result) => {
                console.log('Verification updated:', result);
                setShowVerificationModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetHub;