/**
 * Pi Network Payment Routes
 * 
 * Handles Pi Network payment operations:
 * - Create payments for meditation credits
 * - Submit payments to Pi blockchain
 * - Complete payments and update user credits
 * - Handle payment callbacks and webhooks
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const piPaymentService = require('../services/piPaymentService');

// Create Pi payment for meditation credits
router.post('/create', async (req, res) => {
  try {
    const { userId, amount, creditsAmount } = req.body;

    // Validation
    if (!userId || !amount || !creditsAmount) {
      return res.status(400).json({
        success: false,
        error: 'userId, amount, and creditsAmount are required'
      });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Ensure user has Pi Network authentication
    if (!user.piUserId || user.authMethod !== 'pi') {
      return res.status(400).json({
        success: false,
        error: 'Pi Network authentication required for Pi payments'
      });
    }

    // Check if Pi Payment Service is ready
    if (!piPaymentService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Pi Payment Service not available'
      });
    }

    console.log(`Creating Pi payment for Pi user ID: ${user.piUserId}, App user ID: ${userId}`);

    // Create payment using Pi Network user ID (not app user ID)
    const paymentResult = await piPaymentService.createMeditationPayment(
      user.piUserId,  // Use Pi Network user ID instead of app user ID
      amount,
      {
        creditsAmount: creditsAmount,
        userEmail: user.email,
        appUserId: userId,  // Store app user ID for reference
        piUsername: user.piUsername,
        timestamp: new Date().toISOString()
      }
    );

    res.json({
      success: true,
      ...paymentResult
    });

  } catch (error) {
    console.error('Error creating Pi payment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Submit payment to Pi blockchain
router.post('/submit', async (req, res) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'paymentId is required'
      });
    }

    if (!piPaymentService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Pi Payment Service not available'
      });
    }

    const submitResult = await piPaymentService.submitPayment(paymentId);

    res.json({
      success: true,
      ...submitResult
    });

  } catch (error) {
    console.error('Error submitting Pi payment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Complete payment and add credits to user
router.post('/complete', async (req, res) => {
  try {
    const { paymentId, txid, userId, creditsAmount } = req.body;

    if (!paymentId || !txid || !userId || !creditsAmount) {
      return res.status(400).json({
        success: false,
        error: 'paymentId, txid, userId, and creditsAmount are required'
      });
    }

    if (!piPaymentService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Pi Payment Service not available'
      });
    }

    // Complete payment with Pi Network
    const completeResult = await piPaymentService.completePayment(paymentId, txid);

    if (completeResult.success) {
      // Add credits to user account
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      user.credits = (user.credits || 0) + parseInt(creditsAmount);
      await user.save();

      console.log(`Added ${creditsAmount} credits to user ${userId}. New balance: ${user.credits}`);

      res.json({
        success: true,
        payment: completeResult.payment,
        newCreditBalance: user.credits,
        creditsAdded: creditsAmount
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to complete payment with Pi Network'
      });
    }

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

    if (!piPaymentService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Pi Payment Service not available'
      });
    }

    const paymentResult = await piPaymentService.getPayment(paymentId);

    res.json({
      success: true,
      ...paymentResult
    });

  } catch (error) {
    console.error('Error getting Pi payment status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel payment
router.post('/cancel', async (req, res) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'paymentId is required'
      });
    }

    if (!piPaymentService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Pi Payment Service not available'
      });
    }

    const cancelResult = await piPaymentService.cancelPayment(paymentId);

    res.json({
      success: true,
      ...cancelResult
    });

  } catch (error) {
    console.error('Error cancelling Pi payment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get incomplete payments for recovery
router.get('/incomplete', async (req, res) => {
  try {
    if (!piPaymentService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Pi Payment Service not available'
      });
    }

    const incompleteResult = await piPaymentService.getIncompletePayments();

    res.json({
      success: true,
      ...incompleteResult
    });

  } catch (error) {
    console.error('Error getting incomplete Pi payments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;