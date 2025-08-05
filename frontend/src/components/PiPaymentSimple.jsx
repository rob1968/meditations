/**
 * Simplified Pi Network Payment Component
 * Based on working Pi SDK implementation pattern
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getFullUrl } from '../config/api';

const PiPaymentSimple = ({ user, onPaymentComplete, onClose }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [error, setError] = useState(null);
  const [piAuth, setPiAuth] = useState(null);

  // Credit packages
  const creditPackages = [
    { credits: 10, price: 1.0, popular: false },
    { credits: 25, price: 2.0, popular: true },
    { credits: 50, price: 3.5, popular: false },
    { credits: 100, price: 6.0, popular: false }
  ];

  // Initialize Pi SDK on component mount
  useEffect(() => {
    if (window.Pi) {
      console.log('Initializing Pi SDK...');
      try {
        window.Pi.init({ version: "2.0", sandbox: false });
        console.log('Pi SDK initialized');
      } catch (err) {
        console.error('Pi init error:', err);
      }
    }
  }, []);

  // Simple Pi payment function
  const startPiPayment = async (packageInfo) => {
    console.log('=== SIMPLE PI PAYMENT START ===');
    setLoading(true);
    setError(null);
    setPaymentStatus(t('startingPiPayment', 'Starting Pi payment...'));

    try {
      // Check Pi SDK
      if (!window.Pi) {
        throw new Error('Pi SDK not available. Please open in Pi Browser.');
      }

      // Authenticate if not already authenticated
      if (!piAuth) {
        console.log('Authenticating...');
        setPaymentStatus(t('authenticatingWithPi', 'Authenticating...'));
        
        const auth = await window.Pi.authenticate(
          ['payments'], 
          (payment) => {
            console.log('Incomplete payment found:', payment);
          }
        );
        
        setPiAuth(auth);
        console.log('Authenticated:', auth);
      }

      // Create payment
      console.log('Creating payment...');
      setPaymentStatus(t('creatingPayment', 'Creating payment...'));
      
      const paymentData = {
        amount: packageInfo.price,
        memo: `${packageInfo.credits} Meditation Tokens`,
        metadata: { 
          credits: packageInfo.credits,
          userId: user.id 
        }
      };

      const callbacks = {
        onReadyForServerApproval: (paymentId) => {
          console.log('Ready for approval:', paymentId);
          setPaymentStatus(t('approvingPayment', 'Approving...'));
          
          // Approve payment
          fetch(getFullUrl('/api/pi-payments/approve'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId })
          })
          .then(res => res.json())
          .then(result => {
            console.log('Approved:', result);
          })
          .catch(err => {
            console.error('Approval error:', err);
          });
        },
        
        onReadyForServerCompletion: (paymentId, txid) => {
          console.log('Ready for completion:', paymentId, txid);
          setPaymentStatus(t('completingPayment', 'Completing...'));
          
          // Complete payment
          fetch(getFullUrl('/api/pi-payments/complete'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId,
              txid,
              userId: user.id,
              creditsAmount: packageInfo.credits
            })
          })
          .then(res => res.json())
          .then(result => {
            console.log('Completed:', result);
            if (result.success && result.newCreditBalance) {
              setPaymentStatus(t('paymentSuccess', 'Payment successful!'));
              setTimeout(() => {
                onPaymentComplete(result.newCreditBalance);
              }, 2000);
            }
          })
          .catch(err => {
            console.error('Completion error:', err);
            setError(t('paymentFailed', 'Payment failed'));
          });
        },
        
        onCancel: (paymentId) => {
          console.log('Payment cancelled:', paymentId);
          setError(t('paymentCancelled', 'Payment cancelled'));
          setLoading(false);
        },
        
        onError: (error, payment) => {
          console.error('Payment error:', error, payment);
          setError(error.message || t('paymentError', 'Payment error'));
          setLoading(false);
        }
      };

      // Create payment
      await window.Pi.createPayment(paymentData, callbacks);
      
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || t('paymentError', 'Payment error'));
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', padding: '24px',
        maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#6B46C1' }}>
            <span style={{ fontSize: '24px' }}>π</span> Pi Payment
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: '24px',
              cursor: 'pointer', padding: '0', width: '32px', height: '32px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#FEE', padding: '12px', borderRadius: '8px',
            marginBottom: '20px', color: '#C53030'
          }}>
            {error}
          </div>
        )}

        {/* Status Message */}
        {paymentStatus && !error && (
          <div style={{
            backgroundColor: '#E6FFFA', padding: '12px', borderRadius: '8px',
            marginBottom: '20px', color: '#047481', textAlign: 'center'
          }}>
            {paymentStatus}
          </div>
        )}

        {/* Credit Packages */}
        {!loading && (
          <div>
            <h3>{t('selectPackage', 'Select Token Package')}</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {creditPackages.map((pkg, index) => (
                <button
                  key={index}
                  onClick={() => startPiPayment(pkg)}
                  style={{
                    padding: '16px',
                    border: pkg.popular ? '2px solid #6B46C1' : '1px solid #E2E8F0',
                    borderRadius: '8px',
                    backgroundColor: pkg.popular ? '#F3E8FF' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    position: 'relative'
                  }}
                >
                  {pkg.popular && (
                    <span style={{
                      position: 'absolute', top: '-10px', right: '10px',
                      backgroundColor: '#6B46C1', color: 'white',
                      padding: '2px 8px', borderRadius: '12px', fontSize: '12px'
                    }}>
                      {t('popular', 'Popular')}
                    </span>
                  )}
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6B46C1' }}>
                    {pkg.credits} {t('tokens', 'Tokens')}
                  </div>
                  <div style={{ fontSize: '18px', color: '#4A5568', marginTop: '4px' }}>
                    π {pkg.price}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '16px', color: '#718096' }}>
              {paymentStatus || t('processing', 'Processing...')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PiPaymentSimple;