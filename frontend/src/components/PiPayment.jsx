/**
 * Pi Network Payment Component
 * 
 * Handles Pi Network payment flow for purchasing meditation credits:
 * - Create payment requests
 * - Handle payment callbacks
 * - Process payment completion
 * - Update user credit balance
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getFullUrl } from '../config/api';

const PiPayment = ({ user, onPaymentComplete, onClose }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [currentPayment, setCurrentPayment] = useState(null);
  const [error, setError] = useState(null);

  // Credit packages
  const creditPackages = [
    { credits: 10, price: 1.0, popular: false },
    { credits: 25, price: 2.0, popular: true },
    { credits: 50, price: 3.5, popular: false },
    { credits: 100, price: 6.0, popular: false }
  ];

  // Create Pi payment
  const createPiPayment = async (packageInfo) => {
    setLoading(true);
    setError(null);
    setPaymentStatus('Creating payment...');

    try {
      // Create payment on backend
      const response = await fetch(getFullUrl('/api/pi-payments/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          amount: packageInfo.price,
          creditsAmount: packageInfo.credits
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create payment');
      }

      setCurrentPayment({
        paymentId: result.paymentId,
        amount: result.amount,
        credits: packageInfo.credits
      });

      setPaymentStatus('Payment created. Processing...');
      
      // Create Pi payment on frontend
      await processPiPayment(result.paymentId, packageInfo);

    } catch (error) {
      console.error('Error creating Pi payment:', error);
      setError(error.message);
      setPaymentStatus('');
    } finally {
      setLoading(false);
    }
  };

  // Process Pi payment using Pi SDK
  const processPiPayment = async (paymentId, packageInfo) => {
    try {
      setPaymentStatus('Opening Pi payment...');

      // Create Pi payment using frontend SDK
      const payment = await window.Pi.createPayment({
        amount: packageInfo.price,
        memo: `${packageInfo.credits} Meditation Credits`,
        metadata: {
          paymentId: paymentId,
          creditsAmount: packageInfo.credits
        }
      }, {
        onReadyForServerApproval: async (paymentId) => {
          console.log('Payment ready for server approval:', paymentId);
          setPaymentStatus('Submitting to blockchain...');
          
          // Submit payment to Pi blockchain via backend
          const submitResponse = await fetch(getFullUrl('/api/pi-payments/submit'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paymentId }),
          });

          const submitResult = await submitResponse.json();
          
          if (!submitResult.success) {
            throw new Error(submitResult.error || 'Failed to submit payment');
          }
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          console.log('Payment ready for completion:', paymentId, txid);
          setPaymentStatus('Completing payment...');
          
          // Complete payment and add credits
          const completeResponse = await fetch(getFullUrl('/api/pi-payments/complete'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentId,
              txid,
              userId: user.id,
              creditsAmount: packageInfo.credits
            }),
          });

          const completeResult = await completeResponse.json();
          
          if (completeResult.success) {
            setPaymentStatus('Payment completed successfully!');
            setTimeout(() => {
              onPaymentComplete(completeResult.newCreditBalance);
            }, 2000);
          } else {
            throw new Error(completeResult.error || 'Failed to complete payment');
          }
        },
        onCancel: (paymentId) => {
          console.log('Payment cancelled:', paymentId);
          setPaymentStatus('Payment cancelled');
          setCurrentPayment(null);
          setError('Payment was cancelled');
        },
        onError: (error, payment) => {
          console.error('Payment error:', error, payment);
          setError(`Payment error: ${error.message || error}`);
          setPaymentStatus('');
          setCurrentPayment(null);
        }
      });

    } catch (error) {
      console.error('Error processing Pi payment:', error);
      setError(error.message);
      setPaymentStatus('');
      setCurrentPayment(null);
    }
  };

  return (
    <div className="pi-payment-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#6B46C1' }}>
            <span style={{ fontSize: '24px' }}>π</span> {t('piPayment', 'Pi Payment')}
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {paymentStatus && (
          <div style={{
            padding: '12px',
            backgroundColor: '#E7F3FF',
            border: '1px solid #6B46C1',
            borderRadius: '8px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            {paymentStatus}
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#FFF0F0',
            border: '1px solid #DC2626',
            borderRadius: '8px',
            marginBottom: '16px',
            color: '#DC2626',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {!currentPayment && !loading && (
          <div>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
              {t('selectCreditsPackage', 'Select a credits package to purchase with Pi:')}
            </p>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              {creditPackages.map((pkg, index) => (
                <div 
                  key={index}
                  style={{
                    border: pkg.popular ? '2px solid #6B46C1' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '16px',
                    position: 'relative',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    backgroundColor: pkg.popular ? '#F8F7FF' : 'white',
                    opacity: loading ? 0.6 : 1
                  }}
                  onClick={() => !loading && createPiPayment(pkg)}
                >
                  {pkg.popular && (
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '16px',
                      backgroundColor: '#6B46C1',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {t('popular', 'POPULAR')}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1F2937' }}>
                        {pkg.credits} {t('credits', 'Credits')}
                      </div>
                      <div style={{ color: '#6B7280', fontSize: '14px' }}>
                        ~{Math.round(pkg.credits / pkg.price)} {t('creditsPerPi', 'credits per π')}
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

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #E5E7EB',
              borderTop: '4px solid #6B46C1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <p>{t('processing', 'Processing payment...')}</p>
          </div>
        )}

        <div style={{ 
          marginTop: '20px', 
          padding: '12px', 
          backgroundColor: '#F9FAFB', 
          borderRadius: '8px',
          fontSize: '12px',
          color: '#6B7280',
          textAlign: 'center'
        }}>
          {t('piPaymentNote', 'Payments are processed securely through Pi Network blockchain')}
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

export default PiPayment;