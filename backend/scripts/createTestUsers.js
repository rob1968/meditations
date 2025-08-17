const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const UserConnection = require('../models/UserConnection');

const testUsers = [
  {
    username: 'testgebruiker1',
    birthDate: new Date('1990-05-15'),
    location: {
      city: 'Amsterdam',
      country: 'Nederland',
      formattedAddress: 'Amsterdam, Nederland'
    },
    gender: 'female',
    preferredLanguage: 'nl',
    bio: 'Ik ben al 3 jaar bezig met mindfulness en meditatie. Zoek mensen om ervaringen mee te delen en samen te groeien.',
    authMethod: 'traditional'
  },
  {
    username: 'mindful_mike',
    birthDate: new Date('1985-11-22'),
    location: {
      city: 'Utrecht',
      country: 'Nederland',
      formattedAddress: 'Utrecht, Nederland'
    },
    gender: 'male',
    preferredLanguage: 'nl',
    bio: 'Bezig met herstel van burn-out. Meditatie helpt me enorm. Zou graag een accountability partner hebben.',
    authMethod: 'traditional'
  },
  {
    username: 'zen_sarah',
    birthDate: new Date('1992-03-08'),
    location: {
      city: 'Rotterdam',
      country: 'Nederland',
      formattedAddress: 'Rotterdam, Nederland'
    },
    gender: 'female',
    preferredLanguage: 'nl',
    bio: 'Yoga instructeur en mindfulness coach. Deel graag mijn kennis en leer van anderen.',
    authMethod: 'traditional'
  },
  {
    username: 'rustige_robin',
    birthDate: new Date('1988-07-30'),
    location: {
      city: 'Den Haag',
      country: 'Nederland',
      formattedAddress: 'Den Haag, Nederland'
    },
    gender: 'male',
    preferredLanguage: 'nl',
    bio: 'Bezig met overwinnen van verslaving. Meditatie en journaling zijn mijn ankers. Zoek gelijkgestemden.',
    authMethod: 'traditional'
  },
  {
    username: 'peaceful_anna',
    birthDate: new Date('1995-12-14'),
    location: {
      city: 'Eindhoven',
      country: 'Nederland',
      formattedAddress: 'Eindhoven, Nederland'
    },
    gender: 'female',
    preferredLanguage: 'nl',
    bio: 'Student psychologie met interesse in mindfulness. Onderzoek de voordelen van meditatie voor mentale gezondheid.',
    authMethod: 'traditional'
  },
  {
    username: 'calm_carlos',
    birthDate: new Date('1982-09-05'),
    location: {
      city: 'Groningen',
      country: 'Nederland',
      formattedAddress: 'Groningen, Nederland'
    },
    gender: 'male',
    preferredLanguage: 'nl',
    bio: 'Vader van twee kinderen. Meditatie helpt me geduldig en present te blijven in het drukke gezinsleven.',
    authMethod: 'traditional'
  },
  {
    username: 'serene_sophie',
    birthDate: new Date('1991-06-18'),
    location: {
      city: 'Breda',
      country: 'Nederland',
      formattedAddress: 'Breda, Nederland'
    },
    gender: 'female',
    preferredLanguage: 'nl',
    bio: 'Werkzaam in de zorg. Meditatie helpt me om met stress om te gaan en empathisch te blijven.',
    authMethod: 'traditional'
  },
  {
    username: 'balanced_ben',
    birthDate: new Date('1987-01-25'),
    location: {
      city: 'Tilburg',
      country: 'Nederland',
      formattedAddress: 'Tilburg, Nederland'
    },
    gender: 'male',
    preferredLanguage: 'nl',
    bio: 'Ondernemer die balance zoekt tussen werk en leven. Meditatie is mijn dagelijkse reset knop.',
    authMethod: 'traditional'
  }
];

const sampleConversations = [
  {
    participants: ['testgebruiker1', 'mindful_mike'],
    messages: [
      {
        sender: 'mindful_mike',
        text: 'Hoi! Ik zag dat je ook bezig bent met mindfulness. Hoe bevalt het je?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 uur geleden
      },
      {
        sender: 'testgebruiker1',
        text: 'Hey Mike! Ja, ik doe het nu al 3 jaar. Het heeft mijn leven echt veranderd. Hoe lang ben jij er al mee bezig?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5) // 1.5 uur geleden
      },
      {
        sender: 'mindful_mike',
        text: 'Ongeveer een jaar nu. Begonnen na mijn burn-out. Welke technieken werk jij het beste vind?',
        timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minuten geleden
      }
    ]
  },
  {
    participants: ['zen_sarah', 'testgebruiker1'],
    messages: [
      {
        sender: 'zen_sarah',
        text: 'Hallo! Als yoga instructeur ben ik altijd geïnteresseerd in verschillende meditatie ervaringen. Wat is jouw favoriete manier om te mediteren?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6) // 6 uur geleden
      },
      {
        sender: 'testgebruiker1',
        text: 'Hi Sarah! Ik ben vooral fan van body scan meditaties. Jij combineert vast yoga en meditatie?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5) // 5 uur geleden
      }
    ]
  }
];

const sampleGroups = [
  {
    name: 'Mindfulness Beginners Nederland',
    description: 'Een welkomende groep voor mensen die net beginnen met mindfulness en meditatie in Nederland.',
    privacy: 'open',
    tags: ['mindfulness', 'beginners', 'nederland', 'meditatie'],
    createdBy: 'zen_sarah',
    members: ['zen_sarah', 'testgebruiker1', 'peaceful_anna', 'mindful_mike']
  },
  {
    name: 'Herstel & Wellness Ondersteuning',
    description: 'Veilige ruimte voor mensen die werken aan herstel van burn-out, verslaving, of andere uitdagingen.',
    privacy: 'closed',
    tags: ['herstel', 'burn-out', 'verslaving', 'ondersteuning'],
    createdBy: 'mindful_mike',
    members: ['mindful_mike', 'rustige_robin', 'testgebruiker1']
  },
  {
    name: 'Amsterdam Meditatie Meetups',
    description: 'Voor mensen in en rond Amsterdam die samen willen mediteren en lokale events organiseren.',
    privacy: 'open',
    tags: ['amsterdam', 'meetups', 'lokaal', 'groepsmeditatie'],
    createdBy: 'testgebruiker1',
    members: ['testgebruiker1', 'calm_carlos', 'serene_sophie']
  },
  {
    name: 'Ouders & Mindfulness',
    description: 'Speciaal voor ouders die mindfulness willen toepassen in het drukke gezinsleven.',
    privacy: 'invite_only',
    tags: ['ouders', 'gezin', 'balans', 'kinderen'],
    createdBy: 'calm_carlos',
    members: ['calm_carlos', 'serene_sophie', 'balanced_ben']
  }
];

async function createTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');

    // Clear existing test users
    await User.deleteMany({ username: { $in: testUsers.map(u => u.username) } });
    console.log('🗑️ Cleared existing test users');

    // Create test users
    const createdUsers = [];
    for (const userData of testUsers) {
      const user = new User(userData);
      
      // Calculate age
      if (userData.birthDate) {
        const age = Math.floor((Date.now() - userData.birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        user.age = age;
      }
      
      // Add some random meditation activity
      user.meditations = [];
      user.credits = Math.floor(Math.random() * 50) + 10; // 10-60 credits
      
      await user.save();
      await user.initializeCredits();
      
      createdUsers.push(user);
      console.log(`👤 Created user: ${user.username}`);
    }

    // Create some connections between users
    const connections = [
      { requester: 'testgebruiker1', recipient: 'mindful_mike', status: 'accepted' },
      { requester: 'testgebruiker1', recipient: 'zen_sarah', status: 'accepted' },
      { requester: 'mindful_mike', recipient: 'rustige_robin', status: 'accepted' },
      { requester: 'zen_sarah', recipient: 'peaceful_anna', status: 'pending' },
      { requester: 'calm_carlos', recipient: 'serene_sophie', status: 'accepted' },
      { requester: 'balanced_ben', recipient: 'calm_carlos', status: 'accepted' }
    ];

    for (const conn of connections) {
      const requesterUser = createdUsers.find(u => u.username === conn.requester);
      const recipientUser = createdUsers.find(u => u.username === conn.recipient);
      
      if (requesterUser && recipientUser) {
        const connection = await UserConnection.create({
          requester: requesterUser._id,
          recipient: recipientUser._id,
          status: conn.status,
          connectionReason: 'discovery'
        });
        
        if (conn.status === 'accepted') {
          await connection.accept();
        }
        
        console.log(`🤝 Created connection: ${conn.requester} -> ${conn.recipient} (${conn.status})`);
      }
    }

    // Create sample conversations with messages
    for (const convData of sampleConversations) {
      const participants = convData.participants.map(username => 
        createdUsers.find(u => u.username === username)._id
      );
      
      const conversation = await Conversation.create({
        participants,
        type: 'direct',
        createdBy: participants[0]
      });
      
      // Create messages
      for (const msgData of convData.messages) {
        const senderUser = createdUsers.find(u => u.username === msgData.sender);
        
        const message = await Message.create({
          conversation: conversation._id,
          sender: senderUser._id,
          content: {
            text: msgData.text,
            type: 'text'
          },
          createdAt: msgData.timestamp
        });
        
        // Update conversation's last message
        await conversation.updateLastMessage({
          text: msgData.text,
          sender: senderUser._id,
          timestamp: msgData.timestamp
        });
      }
      
      console.log(`💬 Created conversation between ${convData.participants.join(' & ')}`);
    }

    // Create sample groups
    for (const groupData of sampleGroups) {
      const creatorUser = createdUsers.find(u => u.username === groupData.createdBy);
      const memberUsers = groupData.members.map(username => 
        createdUsers.find(u => u.username === username)
      );
      
      const group = await Conversation.create({
        name: groupData.name,
        description: groupData.description,
        type: 'group',
        privacy: groupData.privacy,
        tags: groupData.tags,
        participants: memberUsers.map(u => u._id),
        admins: [creatorUser._id],
        createdBy: creatorUser._id
      });
      
      // Add some sample group messages
      const groupMessages = [
        {
          sender: creatorUser,
          text: `Welkom in ${groupData.name}! Laten we ons kort voorstellen.`,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 dag geleden
        },
        {
          sender: memberUsers[1] || memberUsers[0],
          text: 'Hoi iedereen! Leuk om hier te zijn. Ik ben blij dat ik een groep heb gevonden voor ondersteuning.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20) // 20 uur geleden
        }
      ];
      
      for (const msgData of groupMessages) {
        await Message.create({
          conversation: group._id,
          sender: msgData.sender._id,
          content: {
            text: msgData.text,
            type: 'text'
          },
          createdAt: msgData.timestamp
        });
      }
      
      console.log(`👥 Created group: ${groupData.name} with ${memberUsers.length} members`);
    }

    console.log('\n🎉 Test data creation completed!');
    console.log('\n📋 Test Users Created:');
    testUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.location.city})`);
    });
    
    console.log('\n💡 You can now login as any of these users to test the Meet functionality:');
    console.log('   Username: testgebruiker1 (or any other username above)');
    console.log('   Password: [any password - authentication is simplified for testing]');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 MongoDB disconnected');
  }
}

// Run the script
createTestUsers();