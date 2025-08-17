import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const AdminActivities = ({ user }) => {
  // Admin activities moderation panel
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [currentTab, setCurrentTab] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  useEffect(() => {
    console.log('🔍 AdminActivities useEffect triggered');
    console.log('🔍 User check:', user?.username, user?.isVerified);
    console.log('🔍 User object:', user);
    
    // Check if user is robbie or rob admin
    const isAdmin = (user?.username === 'rob' || user?.username === 'robbie') && user?.isVerified;
    
    if (isAdmin) {
      console.log('✅ User is admin, loading data...');
      
      // Ensure user has proper ObjectId format for API calls
      if (!user._id && !user.id) {
        console.log('❌ User missing ObjectId, cannot make API calls');
        return;
      }
      
      loadActivities();
      loadStats();
    } else {
      console.log('❌ User is not admin or not verified');
    }
  }, [user, currentTab]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading admin activities for tab:', currentTab);
      console.log('🔧 User ID:', user._id || user.id);
      
      const response = await fetch(`/api/activities/admin/pending?status=${currentTab}`, {
        headers: {
          'x-user-id': user._id || user.id,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Admin activities loaded:', data.activities?.length || 0);
        console.log('📋 Activities data:', data.activities);
        setActivities(data.activities || []);
      } else {
        console.error('Failed to load admin activities:', response.status);
      }
    } catch (error) {
      console.error('Error loading admin activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      console.log('📊 Loading admin stats...');
      console.log('🔧 User ID for stats:', user._id || user.id);
      
      const response = await fetch('/api/activities/admin/stats', {
        headers: {
          'x-user-id': user._id || user.id,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Stats loaded:', data.stats);
        setStats(data.stats || { pending: 0, approved: 0, rejected: 0, total: 0 });
      } else {
        console.error('Failed to load admin stats:', response.status);
      }
    } catch (error) {
      console.error('Error loading admin stats:', error);
    }
  };

  const handleApprove = async () => {
    if (!selectedActivity) return;
    
    setIsProcessing(true);
    try {
      console.log('🔄 Starting approval process...');
      console.log('🔧 Selected activity ID:', selectedActivity._id);
      console.log('🔧 User ID:', user._id || user.id);
      console.log('🔧 Admin notes:', adminNotes);
      
      const response = await fetch(`/api/activities/admin/${selectedActivity._id}/approve`, {
        method: 'POST',
        headers: {
          'x-user-id': user._id || user.id,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminNotes })
      });

      console.log('🔧 Response status:', response.status);
      console.log('🔧 Response headers:', response.headers);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Activity approved:', result.message);
        
        // Remove from current list and reload
        setActivities(prev => prev.filter(a => a._id !== selectedActivity._id));
        loadStats();
        
        // Reset modal state
        setShowApprovalModal(false);
        setSelectedActivity(null);
        setAdminNotes('');
      } else {
        const errorText = await response.text();
        console.error('Failed to approve activity:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error approving activity:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedActivity || !rejectionReason.trim()) return;
    
    setIsProcessing(true);
    try {
      console.log('🔄 Starting rejection process...');
      console.log('🔧 Selected activity ID:', selectedActivity._id);
      console.log('🔧 User ID:', user._id || user.id);
      console.log('🔧 Rejection reason:', rejectionReason);
      
      const response = await fetch(`/api/activities/admin/${selectedActivity._id}/reject`, {
        method: 'POST',
        headers: {
          'x-user-id': user._id || user.id,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          rejectionReason: rejectionReason.trim(),
          adminNotes: adminNotes.trim() || undefined
        })
      });

      console.log('🔧 Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('❌ Activity rejected:', result.message);
        
        // Remove from current list and reload
        setActivities(prev => prev.filter(a => a._id !== selectedActivity._id));
        loadStats();
        
        // Reset modal state
        setShowRejectionModal(false);
        setSelectedActivity(null);
        setAdminNotes('');
        setRejectionReason('');
      } else {
        const errorText = await response.text();
        console.error('Failed to reject activity:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error rejecting activity:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      default: return '📋';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Check if user is admin
  if ((user?.username !== 'rob' && user?.username !== 'robbie') || !user?.isVerified) {
    return (
      <div className="admin-access-denied">
        <div className="access-denied-content">
          <span className="access-denied-icon">🔒</span>
          <h3>Geen toegang</h3>
          <p>Admin toegang vereist</p>
          <div style={{marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '5px', fontSize: '12px'}}>
            <strong>🔧 Debug Info:</strong><br/>
            Username: {user?.username || 'none'}<br/>
            Verified: {user?.isVerified ? 'yes' : 'no'}<br/>
            User ID: {user?._id || user?.id || 'missing'}<br/>
            <br/>
            <strong>For testing, run in console:</strong><br/>
            <code style={{background: 'white', padding: '2px'}}>
              localStorage.setItem('user', '{"{"}"id":"68a02a3173a675b2d6693db1","_id":"68a02a3173a675b2d6693db1","username":"robbie","isVerified":true{"}"}'); location.reload();
            </code>
          </div>
        </div>
      </div>
    );
  }

  console.log('🛡️ Rendering AdminActivities for user:', user?.username);
  console.log('📊 Current stats:', stats);
  console.log('📋 Current activities:', activities?.length || 0);
  console.log('🔧 Current tab:', currentTab);
  console.log('⏳ Is loading:', isLoading);

  return (
    <div className="admin-activities">
      <div className="admin-header">
        <h2>🛡️ Admin Panel</h2>
        <p>Activiteiten moderatie en goedkeuring</p>
        
        <div className="admin-stats">
          <div className="stat-card">
            <span className="stat-icon">⏳</span>
            <div className="stat-info">
              <span className="stat-number">{stats.pending}</span>
              <span className="stat-label">Wachtend</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-info">
              <span className="stat-number">{stats.approved}</span>
              <span className="stat-label">Goedgekeurd</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">❌</span>
            <div className="stat-info">
              <span className="stat-number">{stats.rejected}</span>
              <span className="stat-label">Afgewezen</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📊</span>
            <div className="stat-info">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Totaal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${currentTab === 'pending' ? 'active' : ''}`}
          onClick={() => setCurrentTab('pending')}
        >
          ⏳ Wachtend ({stats.pending})
        </button>
        <button
          className={`admin-tab ${currentTab === 'approved' ? 'active' : ''}`}
          onClick={() => setCurrentTab('approved')}
        >
          ✅ Goedgekeurd ({stats.approved})
        </button>
        <button
          className={`admin-tab ${currentTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setCurrentTab('rejected')}
        >
          ❌ Afgewezen ({stats.rejected})
        </button>
      </div>

      <div className="admin-content">
        {isLoading ? (
          <div className="admin-loading">
            <div className="loading-animation"></div>
            <p>Activiteiten laden...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="admin-empty">
            <span className="empty-icon">{getStatusIcon(currentTab)}</span>
            <h3>Geen activiteiten</h3>
            <p>Er zijn geen {currentTab === 'pending' ? 'wachtende' : currentTab === 'approved' ? 'goedgekeurde' : 'afgewezen'} activiteiten.</p>
          </div>
        ) : (
          <div className="admin-activities-list">
            {activities.map((activity) => (
              <div key={activity._id} className="admin-activity-card">
                <div className="activity-header">
                  <div className="activity-title-section">
                    <h3 className="activity-title">{activity.title}</h3>
                    <div className="activity-meta">
                      <span className="activity-organizer">
                        👤 {activity.organizer?.username || 'Onbekend'}
                        {activity.organizer?.isVerified && <span className="verified-badge">✓</span>}
                      </span>
                      <span className="activity-category">
                        {activity.category?.emoji} {activity.category?.name?.nl || 'Algemeen'}
                      </span>
                    </div>
                  </div>
                  <div className="activity-status" style={{ color: getStatusColor(activity.approvalStatus) }}>
                    {getStatusIcon(activity.approvalStatus)} {activity.approvalStatus}
                  </div>
                </div>

                <div className="activity-details">
                  <p className="activity-description">{activity.description}</p>
                  <div className="activity-info">
                    <span className="activity-date">📅 {formatDate(activity.date)}</span>
                    <span className="activity-location">📍 {activity.location?.name}</span>
                    <span className="activity-participants">
                      👥 {activity.participantCount || 0}/{activity.maxParticipants}
                    </span>
                  </div>
                  
                  {activity.rejectionReason && (
                    <div className="rejection-reason">
                      <strong>Reden afwijzing:</strong> {activity.rejectionReason}
                    </div>
                  )}
                  
                  {activity.adminNotes && (
                    <div className="admin-notes">
                      <strong>Admin notities:</strong> {activity.adminNotes}
                    </div>
                  )}
                  
                  <div className="activity-timestamps">
                    <span>Aangemaakt: {formatDate(activity.createdAt)}</span>
                    {activity.approvedAt && (
                      <span>Behandeld: {formatDate(activity.approvedAt)}</span>
                    )}
                  </div>
                </div>

                {currentTab === 'pending' && (
                  <div className="activity-actions">
                    <button
                      className="approve-button"
                      onClick={() => {
                        setSelectedActivity(activity);
                        setShowApprovalModal(true);
                      }}
                    >
                      ✅ Goedkeuren
                    </button>
                    <button
                      className="reject-button"
                      onClick={() => {
                        setSelectedActivity(activity);
                        setShowRejectionModal(true);
                      }}
                    >
                      ❌ Afwijzen
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedActivity && (
        <div className="admin-modal-overlay" onClick={() => setShowApprovalModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✅ Activiteit Goedkeuren</h3>
              <button 
                className="close-button"
                onClick={() => setShowApprovalModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <p><strong>Activiteit:</strong> {selectedActivity.title}</p>
              <p><strong>Organisator:</strong> {selectedActivity.organizer?.username}</p>
              
              <div className="form-group">
                <label>Admin notities (optioneel):</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Eventuele opmerkingen voor goedkeuring..."
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setShowApprovalModal(false)}
                disabled={isProcessing}
              >
                Annuleren
              </button>
              <button
                className="confirm-approve-button"
                onClick={handleApprove}
                disabled={isProcessing}
              >
                {isProcessing ? 'Goedkeuren...' : '✅ Definitief Goedkeuren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && selectedActivity && (
        <div className="admin-modal-overlay" onClick={() => setShowRejectionModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>❌ Activiteit Afwijzen</h3>
              <button 
                className="close-button"
                onClick={() => setShowRejectionModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <p><strong>Activiteit:</strong> {selectedActivity.title}</p>
              <p><strong>Organisator:</strong> {selectedActivity.organizer?.username}</p>
              
              <div className="form-group">
                <label>Reden voor afwijzing (verplicht):</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Geef een duidelijke reden waarom deze activiteit wordt afgewezen..."
                  rows={3}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Admin notities (optioneel):</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Eventuele aanvullende opmerkingen..."
                  rows={2}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setShowRejectionModal(false)}
                disabled={isProcessing}
              >
                Annuleren
              </button>
              <button
                className="confirm-reject-button"
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
              >
                {isProcessing ? 'Afwijzen...' : '❌ Definitief Afwijzen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminActivities;