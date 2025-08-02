/**
 * Pi Network Payment Component - NEW IMPLEMENTATION
 * Expert Pi SDK Implementation - NO BACKEND CREATE CALLS
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getFullUrl } from '../config/api';

const PiPaymentNew = ({ user, onPaymentComplete, onClose }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [error, setError] = useState(null);

  // Credit packages
  const creditPackages = [
    { credits: 10, price: 1.0, popular: false },
    { credits: 25, price: 2.0, popular: true },
    { credits: 50, price: 3.5, popular: false },
    { credits: 100, price: 6.0, popular: false }
  ];

  // Create Pi payment directly using Pi SDK - NO BACKEND CALLS
  const startPiPayment = async (packageInfo) => {
    console.log('=== NEW PI PAYMENT FLOW START ===');
    setLoading(true);
    setError(null);
    setPaymentStatus('Starting Pi payment...');

    try {
      if (!window.Pi) {
        throw new Error('Pi SDK not available');
      }

      console.log('Creating Pi payment with SDK directly...');
      
      // DIRECT Pi.createPayment call - NO backend involvement
      const payment = await window.Pi.createPayment({
        amount: packageInfo.price,
        memo: `${packageInfo.credits} Meditation Credits`,
        metadata: {
          creditsAmount: packageInfo.credits,
          userId: user.id,
          userEmail: user.email || '',
          timestamp: Date.now()
        }
      }, {
        // Pi SDK Callbacks
        onReadyForServerApproval: async (paymentId) => {
          console.log('🔄 Pi SDK: onReadyForServerApproval', paymentId);
          setPaymentStatus('Approving payment with Pi Network...');
          
          try {
            const response = await fetch(getFullUrl('/api/pi-payments/approve'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId })
            });

            const result = await response.json();
            console.log('✅ Approve result:', result);
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to approve payment');
            }
          } catch (error) {
            console.error('❌ Approve error:', error);
            throw error;
          }
        },

        onReadyForServerCompletion: async (paymentId, txid) => {
          console.log('🔄 Pi SDK: onReadyForServerCompletion', paymentId, txid);
          setPaymentStatus('Completing payment...');
          
          try {
            const response = await fetch(getFullUrl('/api/pi-payments/complete'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentId,
                txid,
                userId: user.id,
                creditsAmount: packageInfo.credits
              })
            });

            const result = await response.json();
            console.log('✅ Complete result:', result);
            
            if (result.success) {
              setPaymentStatus('✅ Payment completed successfully!');
              setTimeout(() => {
                onPaymentComplete(result.newCreditBalance || (user.credits + packageInfo.credits));
                onClose(); // Close modal after successful payment
              }, 1500);
            } else {
              throw new Error(result.error || 'Failed to complete payment');
            }
          } catch (error) {
            console.error('❌ Complete error:', error);
            throw error;
          }
        },

        onCancel: (paymentId) => {
          console.log('❌ Pi SDK: Payment cancelled', paymentId);
          setPaymentStatus('Payment cancelled');
          setError('Payment was cancelled by user');
          setLoading(false);
        },

        onError: (error, payment) => {
          console.error('❌ Pi SDK: Payment error', error, payment);
          setError(`Pi payment error: ${error.message || error}`);
          setPaymentStatus('');
          setLoading(false);
        }
      });

      console.log('✅ Pi.createPayment() completed successfully');
      
    } catch (error) {
      console.error('❌ Error starting Pi payment:', error);
      setError(error.message);
      setPaymentStatus('');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', padding: '24px',
        maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#6B46C1' }}>
            <span style={{ fontSize: '24px' }}>π</span> NEW Pi Payment
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '24px',
            cursor: 'pointer', color: '#666'
          }}>×</button>
        </div>

        {/* Status */}
        {paymentStatus && (
          <div style={{
            padding: '12px', backgroundColor: '#E7F3FF',
            border: '1px solid #6B46C1', borderRadius: '8px',
            marginBottom: '16px', textAlign: 'center'
          }}>
            {paymentStatus}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px', backgroundColor: '#FFF0F0',
            border: '1px solid #DC2626', borderRadius: '8px',
            marginBottom: '16px', color: '#DC2626', textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Credit Packages */}
        {!loading && (
          <div>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
              Select credits package (NEW Pi SDK implementation):
            </p>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              {creditPackages.map((pkg, index) => (
                <div key={index} style={{
                  border: pkg.popular ? '2px solid #6B46C1' : '1px solid #E5E7EB',
                  borderRadius: '8px', padding: '16px', position: 'relative',
                  cursor: 'pointer', backgroundColor: pkg.popular ? '#F8F7FF' : 'white'
                }} onClick={() => startPiPayment(pkg)}>
                  
                  {pkg.popular && (
                    <div style={{
                      position: 'absolute', top: '-8px', right: '16px',
                      backgroundColor: '#6B46C1', color: 'white', padding: '4px 12px',
                      borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'
                    }}>POPULAR</div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1F2937' }}>
                        {pkg.credits} Credits
                      </div>
                      <div style={{ color: '#6B7280', fontSize: '14px' }}>
                        ~{Math.round(pkg.credits / pkg.price)} credits per π
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6B46C1' }}>
                        π {pkg.price}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{
              width: '40px', height: '40px', border: '4px solid #E5E7EB',
              borderTop: '4px solid #6B46C1', borderRadius: '50%',
              animation: 'spin 1s linear infinite', margin: '0 auto 16px'
            }}></div>
            <p>Processing payment...</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ 
          marginTop: '20px', padding: '12px', backgroundColor: '#F9FAFB', 
          borderRadius: '8px', fontSize: '12px', color: '#6B7280', textAlign: 'center'
        }}>
          🔥 NEW Pi SDK implementation - Direct payment flow
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PiPaymentNew;