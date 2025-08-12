/**
 * Pi Network Payment Routes (Direct API Implementation)
 * 
 * Handles Pi Network payment operations without pi-backend package:
 * - Approve payments for meditation credits
 * - Complete payments and update user credits
 * - Direct communication with Pi Network API
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');

// Helper function to call Pi Network API using axios (pingo1 pattern)
async function callPiAPI(endpoint, method = 'GET', body = null) {
  const apiKey = process.env.PI_API_KEY;
  
  if (!apiKey) {
    console.error('PI_API_KEY is not set in environment variables.');
    throw new Error('Server configuration error for Pi Payments.');
  }

  // Always use production URL like pingo1
  const baseUrl = 'https://api.minepi.com/v2';

  const config = {
    method: method.toLowerCase(),
    url: `${baseUrl}/${endpoint}`,
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    }
  };

  if (body) {
    config.data = body;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code that falls out of the range of 2xx
      console.error(`Pi API error for ${endpoint}:`, error.response.data);
      throw new Error(error.response.data.error_message || `Pi API error: ${error.response.status}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error(`No response from Pi API ${endpoint}:`, error.request);
      throw new Error(`No response from Pi API ${endpoint}`);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error(`Error calling Pi API ${endpoint}:`, error.message);
      throw error;
    }
  }
}

// Approve payment endpoint (pingo1 pattern)
router.post('/approve', async (req, res) => {
  const { paymentId } = req.body;
  
  if (!paymentId) {
    return res.status(400).json({ message: 'Missing paymentId' });
  }
  
  if (!process.env.PI_API_KEY) {
    console.error('PI_API_KEY is not set in environment variables.');
    return res.status(500).json({ message: 'Server configuration error for Pi Payments.' });
  }

  try {
    console.log(`Approving Pi payment paymentId: ${paymentId}`);
    
    const piServerResponse = await axios.post(
      `https://api.minepi.com/v2/payments/${paymentId}/approve`,
      {},
      {
        headers: {
          'Authorization': `Key ${process.env.PI_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!piServerResponse.data) {
      console.error('Pi Server approve failed:', piServerResponse.status);
      return res.status(piServerResponse.status).json({ 
        message: 'Pi server failed to approve payment.', 
        details: piServerResponse.data 
      });
    }
    
    // Approval successful, Pi SDK on client will call onReadyForServerCompletion
    console.log(`Pi payment paymentId: ${paymentId} approved by app server.`);
    res.status(200).json({ 
      success: true,
      message: 'Payment approved, awaiting completion.' 
    });
    
  } catch (error) {
    if (error.response) {
      console.error('Pi Server approve failed:', error.response.status, error.response.data);
      return res.status(error.response.status).json({ 
        message: 'Pi server failed to approve payment.', 
        details: error.response.data 
      });
    }
    console.error('Error approving Pi payment:', error);
    res.status(500).json({ 
      message: 'Internal server error during payment approval.', 
      error: error.message 
    });
  }
});

// Complete payment and add credits (pingo1 pattern)
router.post('/complete', async (req, res) => {
  const { paymentId, txid, userId, creditsAmount } = req.body;
  
  if (!paymentId || !txid) {
    return res.status(400).json({ message: 'Missing paymentId or txid' });
  }
  
  if (!process.env.PI_API_KEY) {
    console.error('PI_API_KEY is not set in environment variables.');
    return res.status(500).json({ message: 'Server configuration error for Pi Payments.' });
  }

  try {

    console.log(`Completing Pi payment paymentId: ${paymentId} with txid: ${txid}`);
    
    // Use direct axios call like pingo1
    const piServerResponse = await axios.post(
      `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      { txid },
      {
        headers: {
          'Authorization': `Key ${process.env.PI_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!piServerResponse.data) {
      console.error('Pi Server complete payment failed:', piServerResponse.status);
      return res.status(piServerResponse.status).json({ 
        message: 'Pi server failed to complete payment.', 
        details: piServerResponse.data 
      });
    }
    
    const result = piServerResponse.data;
    
    console.log(`Payment ${paymentId} completed successfully`);
    
    // If userId and creditsAmount provided, add credits to user
    if (userId && creditsAmount) {
      try {
        const user = await User.findById(userId);
        if (user) {
          // Add credits using the built-in method that also tracks transaction history
          user.addCredits(parseInt(creditsAmount), 'purchase', `Pi Network payment - ${creditsAmount} credits (π${result.amount || 'N/A'})`);
          await user.save();
          
          console.log(`Added ${creditsAmount} credits to user ${userId}. New balance: ${user.credits}`);
          
          return res.json({
            success: true,
            payment: result,
            newCreditBalance: user.credits,
            creditsAdded: creditsAmount
          });
        }
      } catch (saveError) {
        // Handle ParallelSaveError with atomic operation
        if (saveError.name === 'ParallelSaveError') {
          console.log('ParallelSaveError detected, using atomic update...');
          try {
            // Use findByIdAndUpdate for atomic operation to avoid race conditions
            const updatedUser = await User.findByIdAndUpdate(
              userId,
              { 
                $inc: { credits: parseInt(creditsAmount) },
                $push: {
                  creditHistory: {
                    type: 'purchase',
                    amount: parseInt(creditsAmount),
                    description: `Pi Network payment - ${creditsAmount} credits (π${result.amount || 'N/A'})`,
                    date: new Date(),
                    relatedId: paymentId
                  }
                }
              },
              { new: true, runValidators: true }
            );
            
            console.log(`Added ${creditsAmount} credits to user ${userId} (atomic update). New balance: ${updatedUser.credits}`);
            
            return res.json({
              success: true,
              payment: result,
              newCreditBalance: updatedUser.credits,
              creditsAdded: creditsAmount
            });
          } catch (retryError) {
            console.error('Atomic update failed:', retryError);
            throw retryError;
          }
        } else {
          throw saveError;
        }
      }
    }
    
    res.json({
      success: true,
      payment: result
    });

  } catch (error) {
    console.error('Error completing Pi payment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get payment status
router.get('/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    console.log(`Getting Pi payment status: ${paymentId}`);
    
    // Call Pi API to get payment status
    const result = await callPiAPI(`payments/${paymentId}`);
    
    res.json({
      success: true,
      payment: result
    });

  } catch (error) {
    console.error('Error getting Pi payment status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TEMPORARY: Handle old /create endpoint calls and redirect to new flow
router.post('/create', async (req, res) => {
  console.log('WARNING: Old /create endpoint called - returning redirect instructions');
  
  res.json({
    success: false,
    error: 'CACHE_ISSUE: Please refresh your browser completely. The payment system has been updated.',
    action: 'refresh_browser',
    instructions: 'Close Pi Browser completely and reopen the app to use the new payment system.'
  });
});

// Check Pi API configuration
router.get('/check-config', async (req, res) => {
  try {
    const apiKey = process.env.PI_API_KEY;
    
    res.json({
      success: true,
      apiKeyConfigured: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      sandboxMode: process.env.PI_SANDBOX_MODE === 'true'
    });
    
  } catch (error) {
    console.error('Error checking Pi config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;