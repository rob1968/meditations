// Direct test of the enhanced insights service
const express = require('express');
const app = express();

// Load the service directly
const enhancedInsightsService = require('./services/enhancedInsightsService');

console.log('=== Direct Service Test ===');
console.log('Service type:', typeof enhancedInsightsService);
console.log('Has generateEnhancedInsights:', typeof enhancedInsightsService.generateEnhancedInsights);

if (typeof enhancedInsightsService.generateEnhancedInsights === 'function') {
  console.log('✅ Service loaded correctly');
} else {
  console.log('❌ Service not loaded correctly');
  console.log('Available properties:', Object.keys(enhancedInsightsService));
}

// Test endpoint
app.get('/test-insights', async (req, res) => {
  try {
    console.log('Testing insights generation...');
    const insights = await enhancedInsightsService.generateEnhancedInsights('test123', {
      timeframe: 7,
      sophisticationLevel: 'basic'
    });
    res.json({
      success: true,
      insights: insights,
      serviceType: typeof enhancedInsightsService,
      methodType: typeof enhancedInsightsService.generateEnhancedInsights
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      error: error.message,
      serviceType: typeof enhancedInsightsService,
      methodType: typeof enhancedInsightsService.generateEnhancedInsights
    });
  }
});

const port = 5005;
app.listen(port, () => {
  console.log(`Test server running on http://localhost:${port}`);
  console.log(`Test URL: http://localhost:${port}/test-insights`);
});