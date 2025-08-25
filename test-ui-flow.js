// Complete UI Flow Test for Activity Join/Leave/Cancel functionality
// This simulates the frontend behavior and tests all scenarios

const BASE_URL = 'http://localhost:5004/api';
const USER_ID = '68a4e1577d38e7e53c8effc1'; // Flop's user ID

const headers = {
  'x-user-id': USER_ID,
  'Content-Type': 'application/json'
};

async function testUIFlow() {
  console.log('🧪 Starting Complete UI Flow Test\n');
  
  // Test 1: Load My Activities (Frontend would do this on page load)
  console.log('1. 📊 Testing My Activities Load...');
  const myActivitiesResponse = await fetch(`${BASE_URL}/activities/user/my-activities`, { headers });
  const myActivities = await myActivitiesResponse.json();
  
  console.log(`   ✅ Organizing: ${myActivities.organizing?.length || 0}`);
  console.log(`   ✅ Participating: ${myActivities.participating?.length || 0}`);
  console.log(`   ✅ Past: ${myActivities.past?.length || 0}\n`);
  
  // Test 2: Load Available Activities (Main activities page)
  console.log('2. 🏃 Testing Available Activities...');
  const activitiesResponse = await fetch(`${BASE_URL}/activities`, { headers });
  const activitiesData = await activitiesResponse.json();
  const availableActivities = activitiesData.activities.slice(0, 3); // Take first 3
  
  for (const activity of availableActivities) {
    const isOrganizer = activity.organizer._id === USER_ID;
    const isParticipant = activity.participants.some(p => p.user === USER_ID);
    const isFull = activity.participants.length >= activity.maxParticipants;
    
    console.log(`   🎯 ${activity.title}:`);
    console.log(`      - Organizer: ${isOrganizer ? '👑 YES' : '❌ NO'}`);
    console.log(`      - Participant: ${isParticipant ? '✅ YES' : '❌ NO'}`);
    console.log(`      - Full: ${isFull ? '🔴 YES' : '🟢 NO'} (${activity.participants.length}/${activity.maxParticipants})`);
    console.log(`      - Can Join: ${!isOrganizer && !isParticipant && !isFull ? '✅ YES' : '❌ NO'}\n`);
  }
  
  // Test 3: Test Join Workflow
  console.log('3. 🤝 Testing Join Workflow...');
  const joinableActivity = availableActivities.find(a => 
    a.organizer._id !== USER_ID && 
    !a.participants.some(p => p.user === USER_ID) &&
    a.participants.length < a.maxParticipants
  );
  
  if (joinableActivity) {
    console.log(`   📝 Attempting to join: ${joinableActivity.title}`);
    const joinResponse = await fetch(`${BASE_URL}/activities/${joinableActivity._id}/join`, {
      method: 'POST',
      headers
    });
    const joinResult = await joinResponse.json();
    
    if (joinResponse.ok) {
      console.log(`   ✅ Join successful: ${joinResult.message}`);
      
      // Test 4: Test Leave Workflow  
      console.log('\n4. 👋 Testing Leave Workflow...');
      const leaveResponse = await fetch(`${BASE_URL}/activities/${joinableActivity._id}/leave`, {
        method: 'POST',
        headers
      });
      const leaveResult = await leaveResponse.json();
      
      if (leaveResponse.ok) {
        console.log(`   ✅ Leave successful: ${leaveResult.message}`);
      } else {
        console.log(`   ❌ Leave failed: ${leaveResult.error}`);
      }
    } else {
      console.log(`   ❌ Join failed: ${joinResult.error}`);
    }
  } else {
    console.log('   ⚠️ No joinable activities found');
  }
  
  // Test 5: Test Organizer Restrictions
  console.log('\n5. 👑 Testing Organizer Restrictions...');
  const organizerActivity = availableActivities.find(a => a.organizer._id === USER_ID);
  
  if (organizerActivity) {
    console.log(`   📝 Testing organizer join prevention on: ${organizerActivity.title}`);
    const restrictionResponse = await fetch(`${BASE_URL}/activities/${organizerActivity._id}/join`, {
      method: 'POST',
      headers
    });
    const restrictionResult = await restrictionResponse.json();
    
    if (restrictionResponse.ok) {
      console.log(`   ❌ FAIL: Organizer was allowed to join!`);
    } else {
      console.log(`   ✅ SUCCESS: ${restrictionResult.error}`);
    }
  } else {
    console.log('   ⚠️ No organizer activities found');
  }
  
  // Test 6: Test Cancel Workflow
  console.log('\n6. ❌ Testing Cancel Workflow...');
  
  // Create a test activity first
  const testActivityData = {
    title: "UI Flow Test Activity",
    description: "Test activity for UI flow testing",
    category: "68a4d9464356e96f6f96c0cf", // Walking category
    date: "2025-08-29",
    startTime: "15:00",
    duration: 90,
    location: {
      name: "Test Park",
      address: "Test Park, Amsterdam",
      city: "Amsterdam",
      country: "Nederland",
      coordinates: { type: "Point", coordinates: [4.8672, 52.3604] }
    },
    maxParticipants: 6
  };
  
  const createResponse = await fetch(`${BASE_URL}/activities`, {
    method: 'POST',
    headers,
    body: JSON.stringify(testActivityData)
  });
  const createResult = await createResponse.json();
  
  if (createResponse.ok) {
    console.log(`   📝 Created test activity: ${createResult.activity.title}`);
    
    // Now test cancel
    const cancelResponse = await fetch(`${BASE_URL}/activities/${createResult.activity._id}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: "UI Flow Test Cancellation" })
    });
    const cancelResult = await cancelResponse.json();
    
    if (cancelResponse.ok) {
      console.log(`   ✅ Cancel successful: ${cancelResult.message}`);
    } else {
      console.log(`   ❌ Cancel failed: ${cancelResult.error}`);
    }
  } else {
    console.log(`   ❌ Failed to create test activity: ${createResult.error}`);
  }
  
  // Test 7: Final State Check
  console.log('\n7. 🔍 Final My Activities State Check...');
  const finalMyActivitiesResponse = await fetch(`${BASE_URL}/activities/user/my-activities`, { headers });
  const finalMyActivities = await finalMyActivitiesResponse.json();
  
  console.log(`   📊 Final Organizing: ${finalMyActivities.organizing?.length || 0}`);
  console.log(`   📊 Final Participating: ${finalMyActivities.participating?.length || 0}`);
  console.log(`   📊 Final Past: ${finalMyActivities.past?.length || 0}`);
  
  // Test 8: Chat Functionality
  console.log('\n8. 💬 Testing Chat Functionality...');
  
  // Get an activity with conversation
  const activityWithConversation = finalMyActivities.participating[0];
  if (activityWithConversation && activityWithConversation.conversationId) {
    console.log(`   🎯 Testing chat for: ${activityWithConversation.title}`);
    
    // Test sending a message
    const messageData = {
      content: "Test message from UI flow test 👋",
      type: "text"
    };
    
    try {
      const sendMessageResponse = await fetch(`${BASE_URL}/conversations/${activityWithConversation.conversationId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(messageData)
      });
      
      if (sendMessageResponse.ok) {
        const messageResult = await sendMessageResponse.json();
        console.log(`   ✅ Message sent successfully: ${messageResult.message?.content}`);
        
        // Test fetching messages
        const fetchMessagesResponse = await fetch(`${BASE_URL}/conversations/${activityWithConversation.conversationId}/messages?limit=5`, { headers });
        
        if (fetchMessagesResponse.ok) {
          const messages = await fetchMessagesResponse.json();
          console.log(`   ✅ Messages fetched: ${messages.length} messages`);
          
          if (messages.length > 0) {
            const latestMessage = messages[0];
            console.log(`   📝 Latest message: "${latestMessage.content}" by ${latestMessage.sender?.username || 'Unknown'}`);
          }
        } else {
          console.log(`   ❌ Failed to fetch messages: ${fetchMessagesResponse.status}`);
        }
        
      } else {
        const error = await sendMessageResponse.json();
        console.log(`   ❌ Failed to send message: ${error.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Chat test error: ${error.message}`);
    }
  } else {
    console.log('   ⚠️ No activities with conversation found');
  }
  
  // Test 9: Activity Creation with Chat Setup
  console.log('\n9. 🏗️ Testing Activity Creation with Chat...');
  
  const newActivityData = {
    title: "Chat Test Activity",
    description: "Testing activity creation with chat functionality",
    category: "68a4d9464356e96f6f96c0cf",
    date: "2025-08-30",
    startTime: "16:00",
    duration: 120,
    location: {
      name: "Chat Test Location",
      address: "Test Street 123, Amsterdam",
      city: "Amsterdam", 
      country: "Nederland",
      coordinates: { type: "Point", coordinates: [4.8672, 52.3604] }
    },
    maxParticipants: 5
  };
  
  try {
    const createChatActivityResponse = await fetch(`${BASE_URL}/activities`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newActivityData)
    });
    
    if (createChatActivityResponse.ok) {
      const chatActivityResult = await createChatActivityResponse.json();
      console.log(`   ✅ Activity with chat created: ${chatActivityResult.activity.title}`);
      console.log(`   💬 Conversation ID: ${chatActivityResult.activity.conversationId || 'None'}`);
      
      // Test initial organizer message
      if (chatActivityResult.activity.conversationId) {
        const welcomeMessage = {
          content: "Welkom in de chat voor deze activiteit! 🎉",
          type: "text"
        };
        
        const welcomeResponse = await fetch(`${BASE_URL}/conversations/${chatActivityResult.activity.conversationId}/messages`, {
          method: 'POST', 
          headers,
          body: JSON.stringify(welcomeMessage)
        });
        
        if (welcomeResponse.ok) {
          console.log(`   ✅ Welcome message sent by organizer`);
        }
      }
      
      // Clean up - cancel the test activity
      const cleanupResponse = await fetch(`${BASE_URL}/activities/${chatActivityResult.activity._id}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: "Test cleanup" })
      });
      
      if (cleanupResponse.ok) {
        console.log(`   🧹 Test activity cleaned up`);
      }
      
    } else {
      const error = await createChatActivityResponse.json();
      console.log(`   ❌ Failed to create activity: ${error.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Activity creation test error: ${error.message}`);
  }
  
  console.log('\n🎉 Complete UI Flow Test (Including Chat) Complete!\n');
}

// Run the test
testUIFlow().catch(console.error);