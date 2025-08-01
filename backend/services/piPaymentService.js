/**
 * Pi Network Payment Service
 * 
 * This service handles:
 * - Pi Network payment creation and processing
 * - Integration with Pi blockchain via Stellar SDK
 * - Payment lifecycle management (create, submit, complete, cancel)
 * - Error handling and payment validation
 */

const PiNetwork = require('pi-backend').default;

class PiPaymentService {
  constructor() {
    this.pi = null;
    this.isInitialized = false;
  }

  // Initialize Pi Network SDK
  async initialize() {
    try {
      const apiKey = process.env.PI_API_KEY;
      const walletPrivateSeed = process.env.PI_WALLET_PRIVATE_SEED;

      if (!apiKey) {
        throw new Error('PI_API_KEY is required in environment variables');
      }

      if (!walletPrivateSeed || walletPrivateSeed === 'S_YOUR_WALLET_PRIVATE_SEED_HERE') {
        throw new Error('PI_WALLET_PRIVATE_SEED is required in environment variables');
      }

      // Initialize Pi Network SDK
      this.pi = new PiNetwork(apiKey, walletPrivateSeed);
      this.isInitialized = true;

      console.log('Pi Payment Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Pi Payment Service:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  // Create a payment for meditation credits
  async createMeditationPayment(userId, amount, metadata = {}) {
    if (!this.isInitialized) {
      throw new Error('Pi Payment Service not initialized');
    }

    try {
      const paymentData = {
        amount: parseFloat(amount),
        memo: `Meditation App - Credits Purchase`,
        metadata: {
          productType: 'meditation_credits',
          userId: userId,
          ...metadata
        },
        uid: userId
      };

      console.log('Creating Pi payment:', paymentData);
      const paymentId = await this.pi.createPayment(paymentData);
      
      console.log('Pi payment created successfully:', paymentId);
      return {
        success: true,
        paymentId: paymentId,
        amount: amount,
        memo: paymentData.memo
      };
    } catch (error) {
      console.error('Error creating Pi payment:', error);
      throw new Error(`Failed to create Pi payment: ${error.message}`);
    }
  }

  // Submit payment to Pi blockchain
  async submitPayment(paymentId) {
    if (!this.isInitialized) {
      throw new Error('Pi Payment Service not initialized');
    }

    try {
      console.log('Submitting Pi payment to blockchain:', paymentId);
      const txid = await this.pi.submitPayment(paymentId);
      
      console.log('Pi payment submitted successfully:', { paymentId, txid });
      return {
        success: true,
        paymentId: paymentId,
        transactionId: txid
      };
    } catch (error) {
      console.error('Error submitting Pi payment:', error);
      throw new Error(`Failed to submit Pi payment: ${error.message}`);
    }
  }

  // Complete payment on Pi server
  async completePayment(paymentId, txid) {
    if (!this.isInitialized) {
      throw new Error('Pi Payment Service not initialized');
    }

    try {
      console.log('Completing Pi payment:', { paymentId, txid });
      const completedPayment = await this.pi.completePayment(paymentId, txid);
      
      console.log('Pi payment completed successfully:', completedPayment);
      return {
        success: true,
        payment: completedPayment
      };
    } catch (error) {
      console.error('Error completing Pi payment:', error);
      throw new Error(`Failed to complete Pi payment: ${error.message}`);
    }
  }

  // Get payment details
  async getPayment(paymentId) {
    if (!this.isInitialized) {
      throw new Error('Pi Payment Service not initialized');
    }

    try {
      console.log('Retrieving Pi payment:', paymentId);
      const payment = await this.pi.getPayment(paymentId);
      
      return {
        success: true,
        payment: payment
      };
    } catch (error) {
      console.error('Error retrieving Pi payment:', error);
      throw new Error(`Failed to retrieve Pi payment: ${error.message}`);
    }
  }

  // Cancel payment
  async cancelPayment(paymentId) {
    if (!this.isInitialized) {
      throw new Error('Pi Payment Service not initialized');
    }

    try {
      console.log('Cancelling Pi payment:', paymentId);
      const result = await this.pi.cancelPayment(paymentId);
      
      console.log('Pi payment cancelled successfully:', result);
      return {
        success: true,
        paymentId: paymentId
      };
    } catch (error) {
      console.error('Error cancelling Pi payment:', error);
      throw new Error(`Failed to cancel Pi payment: ${error.message}`);
    }
  }

  // Get incomplete payments for recovery
  async getIncompletePayments() {
    if (!this.isInitialized) {
      throw new Error('Pi Payment Service not initialized');
    }

    try {
      console.log('Retrieving incomplete Pi payments');
      const payments = await this.pi.getIncompleteServerPayments();
      
      return {
        success: true,
        payments: payments
      };
    } catch (error) {
      console.error('Error retrieving incomplete Pi payments:', error);
      throw new Error(`Failed to retrieve incomplete Pi payments: ${error.message}`);
    }
  }

  // Check if service is ready
  isReady() {
    return this.isInitialized && this.pi !== null;
  }
}

// Export singleton instance
const piPaymentService = new PiPaymentService();
module.exports = piPaymentService;