/**
 * Test Pi Network API Connection
 */

const axios = require('axios');
require('dotenv').config();

const PI_API_KEY = process.env.PI_API_KEY;

console.log('=== Testing Pi Network API ===');
console.log('API Key:', PI_API_KEY ? `${PI_API_KEY.substring(0, 10)}...${PI_API_KEY.substring(PI_API_KEY.length - 10)}` : 'NOT SET');
console.log('Sandbox Mode:', process.env.PI_SANDBOX_MODE);

async function testPiAPI() {
  try {
    // Test 1: Check API key validity with a simple request
    console.log('\n1. Testing API key validity...');
    
    // Try sandbox API if sandbox mode is enabled
    const apiUrl = process.env.PI_SANDBOX_MODE === 'true' 
      ? 'https://sandbox.minepi.com/v2/me'
      : 'https://api.minepi.com/v2/me';
    
    console.log('Using API URL:', apiUrl);
    
    const config = {
      method: 'get',
      url: apiUrl,
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      }
    };

    try {
      const response = await axios(config);
      console.log('✅ API Key is valid!');
      console.log('App info:', response.data);
    } catch (error) {
      if (error.response) {
        console.error('❌ API Key error:', error.response.status, error.response.data);
        
        if (error.response.status === 401) {
          console.error('The API key is invalid or not authorized');
        }
      } else {
        console.error('❌ Network error:', error.message);
      }
    }

    // Test 2: Try to get recent payments
    console.log('\n2. Checking recent payments...');
    
    const paymentsUrl = process.env.PI_SANDBOX_MODE === 'true'
      ? 'https://sandbox.minepi.com/v2/payments'
      : 'https://api.minepi.com/v2/payments';
      
    const paymentsConfig = {
      method: 'get',
      url: paymentsUrl,
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      }
    };

    try {
      const paymentsResponse = await axios(paymentsConfig);
      console.log('✅ Can access payments endpoint');
      console.log('Recent payments count:', paymentsResponse.data?.data?.length || 0);
      
      if (paymentsResponse.data?.data?.length > 0) {
        console.log('Latest payment:', paymentsResponse.data.data[0]);
      }
    } catch (error) {
      if (error.response) {
        console.error('❌ Payments endpoint error:', error.response.status, error.response.data);
      } else {
        console.error('❌ Network error:', error.message);
      }
    }

    // Test 3: Check if we're using the right API endpoint
    console.log('\n3. Testing payment creation endpoint structure...');
    console.log('Expected endpoints:');
    console.log('- Approve: POST /v2/payments/{payment_id}/approve');
    console.log('- Complete: POST /v2/payments/{payment_id}/complete');
    console.log('- Cancel: POST /v2/payments/{payment_id}/cancel');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testPiAPI();