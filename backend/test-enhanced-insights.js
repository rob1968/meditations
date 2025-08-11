// Test script to debug Enhanced Insights service
const enhancedInsightsService = require('./services/enhancedInsightsService');

console.log('Type of enhancedInsightsService:', typeof enhancedInsightsService);
console.log('Is it an object:', typeof enhancedInsightsService === 'object');
console.log('Has generateEnhancedInsights method:', typeof enhancedInsightsService.generateEnhancedInsights);
console.log('Methods available:', Object.getOwnPropertyNames(enhancedInsightsService).filter(name => typeof enhancedInsightsService[name] === 'function'));

// Test importing the class directly
const EnhancedInsightsServiceClass = require('./services/enhancedInsightsService');
console.log('Class type:', typeof EnhancedInsightsServiceClass);

if (typeof EnhancedInsightsServiceClass === 'function') {
  console.log('Service exported as class, creating instance...');
  const instance = new EnhancedInsightsServiceClass();
  console.log('Instance has generateEnhancedInsights:', typeof instance.generateEnhancedInsights);
}