const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const UserConnection = require('../models/UserConnection');
const JournalEntry = require('../models/JournalEntry');

const diverseTestUsers = [
  // Nederlandse gebruikers (bestaande + uitgebreid)
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
    authMethod: 'traditional',
    addictionStatus: null
  },
  {
    username: 'clean_marco',
    birthDate: new Date('1985-11-22'),
    location: {
      city: 'Utrecht',
      country: 'Nederland',
      formattedAddress: 'Utrecht, Nederland'
    },
    gender: 'male',
    preferredLanguage: 'nl',
    bio: '5 jaar clean van alcohol. Meditatie en mindfulness zijn mijn dagelijkse ankers. Help graag anderen op hun pad.',
    authMethod: 'traditional',
    addictionStatus: 'long_term_recovery', // 5+ jaar clean
    sobrietyDate: new Date('2019-03-15')
  },
  {
    username: 'healing_lisa',
    birthDate: new Date('1992-03-08'),
    location: {
      city: 'Rotterdam',
      country: 'Nederland',
      formattedAddress: 'Rotterdam, Nederland'
    },
    gender: 'female',
    preferredLanguage: 'nl',
    bio: '8 maanden clean van drugs. Elke dag is een overwinning. Meditatie geeft me rust en kracht.',
    authMethod: 'traditional',
    addictionStatus: 'early_recovery', // <1 jaar clean
    sobrietyDate: new Date('2024-01-20')
  },
  {
    username: 'fighting_tom',
    birthDate: new Date('1988-07-30'),
    location: {
      city: 'Den Haag',
      country: 'Nederland',
      formattedAddress: 'Den Haag, Nederland'
    },
    gender: 'male',
    preferredLanguage: 'nl',
    bio: 'Nog steeds worsteling met gokverslaving. Goede en slechte dagen. Meditatie helpt om bij mezelf te blijven.',
    authMethod: 'traditional',
    addictionStatus: 'active_struggle', // Nog actief bezig
    lastRelapseDate: new Date('2024-08-10')
  },

  // Duitse gebruikers
  {
    username: 'mindful_anna_de',
    birthDate: new Date('1987-09-12'),
    location: {
      city: 'Berlin',
      country: 'Deutschland',
      formattedAddress: 'Berlin, Deutschland'
    },
    gender: 'female',
    preferredLanguage: 'de',
    bio: '2 Jahre sauber von Alkohol. Meditation hat mein Leben gerettet. Ich teile gerne meine Erfahrungen.',
    authMethod: 'traditional',
    addictionStatus: 'stable_recovery', // 1-5 jaar clean
    sobrietyDate: new Date('2022-06-10')
  },
  {
    username: 'struggling_max',
    birthDate: new Date('1994-12-03'),
    location: {
      city: 'München',
      country: 'Deutschland',
      formattedAddress: 'München, Deutschland'
    },
    gender: 'male',
    preferredLanguage: 'de',
    bio: 'Kämpfe noch mit Cannabis-Abhängigkeit. Achtsamkeit hilft mir durch schwere Momente.',
    authMethod: 'traditional',
    addictionStatus: 'active_struggle',
    lastRelapseDate: new Date('2024-07-25')
  },

  // Franse gebruikers
  {
    username: 'sereine_marie',
    birthDate: new Date('1983-04-18'),
    location: {
      city: 'Paris',
      country: 'France',
      formattedAddress: 'Paris, France'
    },
    gender: 'female',
    preferredLanguage: 'fr',
    bio: '7 ans sobre d\'alcool. La méditation m\'a aidée à reconstruire ma vie. Je suis là pour soutenir.',
    authMethod: 'traditional',
    addictionStatus: 'long_term_recovery',
    sobrietyDate: new Date('2017-08-20')
  },
  {
    username: 'nouveau_paul',
    birthDate: new Date('1991-01-25'),
    location: {
      city: 'Lyon',
      country: 'France',
      formattedAddress: 'Lyon, France'
    },
    gender: 'male',
    preferredLanguage: 'fr',
    bio: '6 mois sobre de cocaïne. Chaque jour est un combat que je remporte avec la méditation.',
    authMethod: 'traditional',
    addictionStatus: 'early_recovery',
    sobrietyDate: new Date('2024-02-15')
  },

  // Engelse gebruikers
  {
    username: 'sober_sarah_uk',
    birthDate: new Date('1989-06-22'),
    location: {
      city: 'London',
      country: 'United Kingdom',
      formattedAddress: 'London, UK'
    },
    gender: 'female',
    preferredLanguage: 'en',
    bio: '3 years sober from alcohol. Meditation keeps me grounded. Always here to chat and support others.',
    authMethod: 'traditional',
    addictionStatus: 'stable_recovery',
    sobrietyDate: new Date('2021-09-30')
  },
  {
    username: 'recovering_mike_us',
    birthDate: new Date('1986-11-14'),
    location: {
      city: 'New York',
      country: 'United States',
      formattedAddress: 'New York, NY, USA'
    },
    gender: 'male',
    preferredLanguage: 'en',
    bio: '10 years clean from heroin. Meditation saved my life. Sponsor and guide for newcomers.',
    authMethod: 'traditional',
    addictionStatus: 'long_term_recovery',
    sobrietyDate: new Date('2014-05-12')
  },
  {
    username: 'day_by_day_jen',
    birthDate: new Date('1993-08-07'),
    location: {
      city: 'Toronto',
      country: 'Canada',
      formattedAddress: 'Toronto, ON, Canada'
    },
    gender: 'female',
    preferredLanguage: 'en',
    bio: 'Day 45 without alcohol. Taking it one breath at a time. Meditation is my new high.',
    authMethod: 'traditional',
    addictionStatus: 'early_recovery',
    sobrietyDate: new Date('2024-07-02')
  },

  // Spaanse gebruikers
  {
    username: 'tranquilo_carlos',
    birthDate: new Date('1984-03-30'),
    location: {
      city: 'Madrid',
      country: 'España',
      formattedAddress: 'Madrid, España'
    },
    gender: 'male',
    preferredLanguage: 'es',
    bio: '4 años limpio de drogas. La meditación me dio una nueva vida. Comparto mi experiencia con amor.',
    authMethod: 'traditional',
    addictionStatus: 'stable_recovery',
    sobrietyDate: new Date('2020-12-01')
  },
  {
    username: 'luchando_sofia',
    birthDate: new Date('1990-10-15'),
    location: {
      city: 'Barcelona',
      country: 'España',
      formattedAddress: 'Barcelona, España'
    },
    gender: 'female',
    preferredLanguage: 'es',
    bio: 'Aún luchando con adicción al juego. Algunos días son duros, pero la meditación me da esperanza.',
    authMethod: 'traditional',
    addictionStatus: 'active_struggle',
    lastRelapseDate: new Date('2024-08-05')
  },

  // Italiaanse gebruikers
  {
    username: 'pacifico_giovanni',
    birthDate: new Date('1982-07-08'),
    location: {
      city: 'Roma',
      country: 'Italia',
      formattedAddress: 'Roma, Italia'
    },
    gender: 'male',
    preferredLanguage: 'it',
    bio: '6 anni sobrio dall\'alcol. La meditazione è la mia medicina quotidiana. Aiuto chi ne ha bisogno.',
    authMethod: 'traditional',
    addictionStatus: 'long_term_recovery',
    sobrietyDate: new Date('2018-04-22')
  },

  // Russische gebruikers
  {
    username: 'spokoynyy_ivan',
    birthDate: new Date('1988-12-11'),
    location: {
      city: 'Москва',
      country: 'Россия',
      formattedAddress: 'Москва, Россия'
    },
    gender: 'male',
    preferredLanguage: 'ru',
    bio: '2 года трезвости от алкоголя. Медитация помогает мне каждый день. Готов поделиться опытом.',
    authMethod: 'traditional',
    addictionStatus: 'stable_recovery',
    sobrietyDate: new Date('2022-08-15')
  },

  // Chinese gebruikers
  {
    username: 'peaceful_li',
    birthDate: new Date('1991-05-28'),
    location: {
      city: '北京',
      country: '中国',
      formattedAddress: '北京, 中国'
    },
    gender: 'female',
    preferredLanguage: 'zh',
    bio: '从网络成瘾中恢复了1年。冥想帮助我找回内心平静。愿意与他人分享经验。',
    authMethod: 'traditional',
    addictionStatus: 'stable_recovery',
    sobrietyDate: new Date('2023-08-20')
  }
];

const internationalGroups = [
  {
    name: 'Global Recovery Support 🌍',
    description: 'International support group for people in recovery from various addictions. All languages welcome.',
    privacy: 'open',
    tags: ['recovery', 'international', 'support', 'addiction'],
    createdBy: 'recovering_mike_us',
    members: ['recovering_mike_us', 'clean_marco', 'sereine_marie', 'sober_sarah_uk', 'tranquilo_carlos', 'pacifico_giovanni']
  },
  {
    name: 'Early Recovery Warriors 💪',
    description: 'For those in their first year of recovery. We understand the daily struggle.',
    privacy: 'closed',
    tags: ['early-recovery', 'support', 'newcomers'],
    createdBy: 'healing_lisa',
    members: ['healing_lisa', 'nouveau_paul', 'day_by_day_jen']
  },
  {
    name: 'Active Struggle Support 🤝',
    description: 'Safe space for those still fighting active addiction. No judgment, only support.',
    privacy: 'closed',
    tags: ['active-addiction', 'struggle', 'support', 'crisis'],
    createdBy: 'fighting_tom',
    members: ['fighting_tom', 'struggling_max', 'luchando_sofia']
  },
  {
    name: 'Long-term Recovery Mentors 🌟',
    description: 'For those with 5+ years of recovery who want to mentor and guide newcomers.',
    privacy: 'invite_only',
    tags: ['long-term', 'mentorship', 'sponsors', 'guidance'],
    createdBy: 'recovering_mike_us',
    members: ['recovering_mike_us', 'clean_marco', 'sereine_marie', 'pacifico_giovanni']
  },
  {
    name: 'European Recovery Network 🇪🇺',
    description: 'Connecting people in recovery across Europe. Multiple languages supported.',
    privacy: 'open',
    tags: ['europe', 'multilingual', 'recovery', 'network'],
    createdBy: 'mindful_anna_de',
    members: ['mindful_anna_de', 'clean_marco', 'healing_lisa', 'sereine_marie', 'nouveau_paul', 'sober_sarah_uk']
  }
];

const recoveryConversations = [
  {
    participants: ['clean_marco', 'healing_lisa'],
    messages: [
      {
        sender: 'clean_marco',
        text: 'Hey Lisa, hoe gaat het vandaag? Ik zag dat je 8 maanden clean bent - dat is echt geweldig!',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3)
      },
      {
        sender: 'healing_lisa',
        text: 'Dank je Marco! Sommige dagen zijn zwaar, maar meditatie helpt enorm. Hoe doe jij dat na 5 jaar?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
      },
      {
        sender: 'clean_marco',
        text: 'Het wordt echt makkelijker, maar waakzaamheid blijft belangrijk. Meditatie is mijn anker geworden.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30)
      }
    ]
  },
  {
    participants: ['recovering_mike_us', 'day_by_day_jen'],
    messages: [
      {
        sender: 'recovering_mike_us',
        text: 'Hi Jen, congrats on 45 days! I remember those early days. How are you holding up?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4)
      },
      {
        sender: 'day_by_day_jen',
        text: 'Thank you Mike! It\'s tough but I\'m taking it one day at a time. Your story gives me hope.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3.5)
      }
    ]
  },
  {
    participants: ['fighting_tom', 'struggling_max'],
    messages: [
      {
        sender: 'fighting_tom',
        text: 'Max, ik had gisteren weer een terugval. Voel me zo schuldig...',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12)
      },
      {
        sender: 'struggling_max',
        text: 'Tom, keine Schuldgefühle. Ich verstehe das so gut. Wir kämpfen weiter zusammen, ja?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 11)
      },
      {
        sender: 'fighting_tom',
        text: 'Dankje man. Het is fijn om iemand te hebben die het begrijpt. Morgen is een nieuwe dag.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10)
      }
    ]
  }
];

async function createDiverseTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');

    // Clear existing test users
    await User.deleteMany({ username: { $in: diverseTestUsers.map(u => u.username) } });
    console.log('🗑️ Cleared existing test users');

    // Create diverse test users
    const createdUsers = [];
    for (const userData of diverseTestUsers) {
      const user = new User(userData);
      
      // Calculate age
      if (userData.birthDate) {
        const age = Math.floor((Date.now() - userData.birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        user.age = age;
      }
      
      // Add some random meditation activity
      user.meditations = [];
      user.credits = Math.floor(Math.random() * 50) + 10;
      
      await user.save();
      await user.initializeCredits();
      
      createdUsers.push(user);
      
      const statusEmoji = {
        'long_term_recovery': '🌟',
        'stable_recovery': '💪',
        'early_recovery': '🌱',
        'active_struggle': '🤝'
      };
      
      const emoji = userData.addictionStatus ? statusEmoji[userData.addictionStatus] || '👤' : '👤';
      console.log(`${emoji} Created user: ${user.username} (${user.location.city}, ${user.location.country})`);
      
      if (userData.addictionStatus) {
        const days = userData.sobrietyDate 
          ? Math.floor((Date.now() - userData.sobrietyDate) / (1000 * 60 * 60 * 24))
          : 'active struggle';
        console.log(`   Recovery status: ${userData.addictionStatus} ${days !== 'active struggle' ? `(${days} days)` : ''}`);
      }
    }

    // Create connections between recovery buddies
    const recoveryConnections = [
      // Recovery mentors connected to newcomers
      { requester: 'recovering_mike_us', recipient: 'day_by_day_jen', status: 'accepted' },
      { requester: 'clean_marco', recipient: 'healing_lisa', status: 'accepted' },
      { requester: 'sereine_marie', recipient: 'nouveau_paul', status: 'accepted' },
      
      // People in similar recovery stages
      { requester: 'healing_lisa', recipient: 'day_by_day_jen', status: 'accepted' },
      { requester: 'fighting_tom', recipient: 'struggling_max', status: 'accepted' },
      { requester: 'fighting_tom', recipient: 'luchando_sofia', status: 'accepted' },
      
      // International connections
      { requester: 'sober_sarah_uk', recipient: 'mindful_anna_de', status: 'accepted' },
      { requester: 'tranquilo_carlos', recipient: 'pacifico_giovanni', status: 'accepted' },
      
      // Cross-recovery stage mentorship
      { requester: 'pacifico_giovanni', recipient: 'struggling_max', status: 'pending' },
      { requester: 'clean_marco', recipient: 'testgebruiker1', status: 'accepted' }
    ];

    for (const conn of recoveryConnections) {
      const requesterUser = createdUsers.find(u => u.username === conn.requester);
      const recipientUser = createdUsers.find(u => u.username === conn.recipient);
      
      if (requesterUser && recipientUser) {
        const connection = await UserConnection.create({
          requester: requesterUser._id,
          recipient: recipientUser._id,
          status: conn.status,
          connectionReason: 'recovery_support'
        });
        
        if (conn.status === 'accepted') {
          await connection.accept();
        }
        
        console.log(`🤝 Created connection: ${conn.requester} -> ${conn.recipient} (${conn.status})`);
      }
    }

    // Create recovery-focused conversations
    for (const convData of recoveryConversations) {
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
        
        await conversation.updateLastMessage({
          text: msgData.text,
          sender: senderUser._id,
          timestamp: msgData.timestamp
        });
      }
      
      console.log(`💬 Created recovery conversation between ${convData.participants.join(' & ')}`);
    }

    // Create international recovery groups
    for (const groupData of internationalGroups) {
      const creatorUser = createdUsers.find(u => u.username === groupData.createdBy);
      const memberUsers = groupData.members.map(username => 
        createdUsers.find(u => u.username === username)
      ).filter(Boolean);
      
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
      
      // Add sample group messages
      const groupMessages = [
        {
          sender: creatorUser,
          text: `Welcome to ${groupData.name}! This is a safe space for everyone on their recovery journey.`,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48)
        },
        {
          sender: memberUsers[1] || memberUsers[0],
          text: 'Thank you for creating this space. It means so much to have support from people who understand.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36)
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
      
      console.log(`🌍 Created recovery group: ${groupData.name} with ${memberUsers.length} members`);
    }

    console.log('\n🎉 Diverse recovery test data creation completed!');
    
    console.log('\n📊 Recovery Status Summary:');
    console.log('🌟 Long-term Recovery (5+ years): recovering_mike_us, clean_marco, sereine_marie, pacifico_giovanni');
    console.log('💪 Stable Recovery (1-5 years): mindful_anna_de, sober_sarah_uk, tranquilo_carlos, spokoynyy_ivan, peaceful_li');
    console.log('🌱 Early Recovery (<1 year): healing_lisa, nouveau_paul, day_by_day_jen');
    console.log('🤝 Active Struggle: fighting_tom, struggling_max, luchando_sofia');
    
    console.log('\n🌍 Countries Represented:');
    console.log('🇳🇱 Nederland, 🇩🇪 Deutschland, 🇫🇷 France, 🇬🇧 UK, 🇺🇸 USA, 🇨🇦 Canada');
    console.log('🇪🇸 España, 🇮🇹 Italia, 🇷🇺 Россия, 🇨🇳 中国');
    
    console.log('\n💡 Test different recovery perspectives:');
    console.log('   - Long-term: clean_marco, recovering_mike_us');
    console.log('   - Early recovery: healing_lisa, day_by_day_jen');  
    console.log('   - Active struggle: fighting_tom, struggling_max');
    
  } catch (error) {
    console.error('❌ Error creating diverse test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 MongoDB disconnected');
  }
}

// Run the script
createDiverseTestUsers();