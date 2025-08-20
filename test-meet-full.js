#!/usr/bin/env node

/**
 * Comprehensive Meet Page Test Suite
 * Tests all Meet functionality including activities, calendar, and chat
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5004/api';
const TEST_USER_ID = '6880bc6ffcc2f024b6f630fd'; // Use existing user

// Test configurations
const testConfig = {
  userId: TEST_USER_ID,
  headers: {
    'x-user-id': TEST_USER_ID,
    'Content-Type': 'application/json'
  }
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(testName, success, details = '') {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}`);
  if (details) console.log(`   ${details}`);
  
  testResults.tests.push({ testName, success, details });
  if (success) testResults.passed++;
  else testResults.failed++;
}

async function testAPI(endpoint, method = 'GET', data = null, headers = testConfig.headers) {
  try {
    const config = { method, url: `${API_BASE}${endpoint}`, headers };
    if (data) config.data = data;
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status || 0
    };
  }
}

async function testMeetActivities() {
  console.log('\n🔍 Testing Meet Activities API...');
  
  // Test get activities
  const activitiesResult = await testAPI('/meet/activities');
  logTest('Get Activities', activitiesResult.success, 
    activitiesResult.success ? `Found ${activitiesResult.data.activities?.length || 0} activities` : activitiesResult.error);
  
  // Test create activity
  const newActivity = {
    title: 'Test Meditation Session',
    description: 'A test group meditation session',
    type: 'meditation',
    category: 'mindfulness',
    date: new Date().toISOString(),
    startTime: '19:00',
    endTime: '20:00',
    maxParticipants: 10,
    location: 'Online',
    tags: ['meditation', 'mindfulness', 'test'],
    isRecurring: false
  };
  
  const createResult = await testAPI('/meet/activities', 'POST', newActivity);
  logTest('Create Activity', createResult.success, 
    createResult.success ? `Created activity ID: ${createResult.data.activity?._id}` : createResult.error);
  
  return createResult.data?.activity?._id;
}

async function testMeetCalendar(activityId) {
  console.log('\n📅 Testing Meet Calendar API...');
  
  // Test get calendar activities
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const calendarResult = await testAPI(`/meet/calendar/${currentMonth}`);
  logTest('Get Calendar Activities', calendarResult.success, 
    calendarResult.success ? `Found ${calendarResult.data.activities?.length || 0} calendar activities` : calendarResult.error);
  
  // Test join activity if we created one
  if (activityId) {
    const joinResult = await testAPI(`/meet/activities/${activityId}/join`, 'POST');
    logTest('Join Activity', joinResult.success, 
      joinResult.success ? 'Successfully joined activity' : joinResult.error);
  }
  
  return calendarResult.success;
}

async function testMeetChat() {
  console.log('\n💬 Testing Meet Chat API...');
  
  // Test get conversations
  const conversationsResult = await testAPI('/meet/conversations');
  logTest('Get Conversations', conversationsResult.success, 
    conversationsResult.success ? `Found ${conversationsResult.data.conversations?.length || 0} conversations` : conversationsResult.error);
  
  // Test create conversation
  const newConversation = {
    type: 'activity',
    title: 'Test Chat',
    participants: [TEST_USER_ID]
  };
  
  const createConvResult = await testAPI('/meet/conversations', 'POST', newConversation);
  logTest('Create Conversation', createConvResult.success, 
    createConvResult.success ? `Created conversation ID: ${createConvResult.data.conversation?._id}` : createConvResult.error);
  
  return createConvResult.data?.conversation?._id;
}

async function testMeetSocket() {
  console.log('\n🔌 Testing Socket.io Connection...');
  
  try {
    // Test socket endpoint availability
    const socketTest = await axios.get('http://localhost:5004/socket.io/socket.io.js');
    logTest('Socket.io Client Library', socketTest.status === 200, 'Socket.io client script available');
  } catch (error) {
    logTest('Socket.io Client Library', false, 'Socket.io client script not accessible');
  }
  
  // Note: Full socket testing would require socket.io-client library
  console.log('   ℹ️  Real-time socket testing requires browser environment');
}

async function testMeetCategories() {
  console.log('\n📂 Testing Meet Categories...');
  
  const categoriesResult = await testAPI('/activities/categories');
  logTest('Get Activity Categories', categoriesResult.success, 
    categoriesResult.success ? `Found ${categoriesResult.data.categories?.length || 0} categories` : categoriesResult.error);
}

async function testMeetUserVerification() {
  console.log('\n✅ Testing User Verification...');
  
  const userResult = await testAPI('/meet/user/profile');
  logTest('Get User Profile', userResult.success, 
    userResult.success ? `User: ${userResult.data.user?.username}` : userResult.error);
}

async function runAllTests() {
  console.log('🧪 MEET PAGE COMPREHENSIVE TEST SUITE');
  console.log('=====================================\n');
  
  try {
    // Run all test suites
    const activityId = await testMeetActivities();
    await testMeetCalendar(activityId);
    const conversationId = await testMeetChat();
    await testMeetSocket();
    await testMeetCategories();
    await testMeetUserVerification();
    
    // Test Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.tests.length}`);
    console.log(`🎯 Success Rate: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%`);
    
    // Detailed results
    if (testResults.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      testResults.tests.filter(t => !t.success).forEach(test => {
        console.log(`   • ${test.testName}: ${test.details}`);
      });
    }
    
    // Cleanup created test data
    console.log('\n🧹 Cleaning up test data...');
    if (activityId) {
      const deleteResult = await testAPI(`/meet/activities/${activityId}`, 'DELETE');
      console.log(`   ${deleteResult.success ? '✅' : '❌'} Test activity cleanup`);
    }
    
    console.log('\n🏁 Meet Page Testing Complete!');
    
  } catch (error) {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(console.error);