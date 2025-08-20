const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Import models
const User = require('../models/User');
const Activity = require('../models/Activity');
const JournalEntry = require('../models/JournalEntry');
const Addiction = require('../models/Addiction');
const Meditation = require('../models/Meditation');
const ActivityCategory = require('../models/ActivityCategory');

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Use same database as server - meditation-app
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/meditation-app');
    console.log('✅ MongoDB connected successfully to meditation-app database');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test data templates
const countries = [
  { name: 'Netherlands', code: 'NL', cities: ['Amsterdam', 'Rotterdam', 'Utrecht', 'Den Haag', 'Eindhoven'] },
  { name: 'Germany', code: 'DE', cities: ['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Frankfurt'] },
  { name: 'France', code: 'FR', cities: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'] },
  { name: 'Spain', code: 'ES', cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao'] },
  { name: 'Italy', code: 'IT', cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Florence'] },
  { name: 'United Kingdom', code: 'GB', cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool'] }
];

const interests = [
  'meditation', 'yoga', 'mindfulness', 'fitness', 'nature', 'reading', 'music', 'art', 
  'cooking', 'travel', 'photography', 'hiking', 'cycling', 'swimming', 'dancing',
  'volunteering', 'gardening', 'writing', 'languages', 'technology'
];

const addictionTypes = [
  { type: 'smoking', name: 'Smoking', severity: 5 },
  { type: 'alcohol', name: 'Alcohol', severity: 8 },
  { type: 'social_media', name: 'Social Media', severity: 3 },
  { type: 'caffeine', name: 'Caffeine', severity: 2 },
  { type: 'sugar', name: 'Sugar', severity: 4 },
  { type: 'shopping', name: 'Shopping', severity: 6 },
  { type: 'gaming', name: 'Gaming', severity: 5 }
];

const firstNames = {
  NL: ['Emma', 'Noah', 'Olivia', 'Liam', 'Ava', 'Lucas', 'Sophie', 'Daan', 'Mila', 'Sem'],
  DE: ['Emma', 'Noah', 'Hannah', 'Ben', 'Sophia', 'Paul', 'Emilia', 'Leon', 'Lina', 'Finn'],
  FR: ['Louise', 'Gabriel', 'Emma', 'Raphaël', 'Alice', 'Arthur', 'Chloé', 'Louis', 'Inès', 'Lucas'],
  ES: ['Lucia', 'Hugo', 'Maria', 'Martin', 'Paula', 'Daniel', 'Julia', 'Pablo', 'Valeria', 'Alejandro'],
  IT: ['Sofia', 'Leonardo', 'Giulia', 'Francesco', 'Aurora', 'Lorenzo', 'Alice', 'Mattia', 'Ginevra', 'Andrea'],
  GB: ['Olivia', 'Oliver', 'Amelia', 'George', 'Isla', 'Noah', 'Ava', 'Arthur', 'Mia', 'Muhammad']
};

const lastNames = {
  NL: ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Janssen', 'Visser', 'Smit', 'Meijer'],
  DE: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann'],
  FR: ['Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent'],
  ES: ['García', 'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín'],
  IT: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco'],
  GB: ['Smith', 'Jones', 'Taylor', 'Williams', 'Brown', 'Davies', 'Evans', 'Wilson', 'Thomas', 'Roberts']
};

const activityCategories = [
  { name: { nl: 'Sport & Fitness', en: 'Sports & Fitness', de: 'Sport & Fitness' }, emoji: '🏃‍♂️', color: '#FF6B6B' },
  { name: { nl: 'Mindfulness', en: 'Mindfulness', de: 'Achtsamkeit' }, emoji: '🧘‍♀️', color: '#4ECDC4' },
  { name: { nl: 'Natuur', en: 'Nature', de: 'Natur' }, emoji: '🌿', color: '#45B7D1' },
  { name: { nl: 'Cultuur', en: 'Culture', de: 'Kultur' }, emoji: '🎭', color: '#96CEB4' },
  { name: { nl: 'Eten & Drinken', en: 'Food & Drink', de: 'Essen & Trinken' }, emoji: '🍽️', color: '#FFEAA7' },
  { name: { nl: 'Sociaal', en: 'Social', de: 'Sozial' }, emoji: '👥', color: '#DDA0DD' },
  { name: { nl: 'Leren', en: 'Learning', de: 'Lernen' }, emoji: '📚', color: '#98D8C8' }
];

// Activity templates
const activityTemplates = [
  { title: 'Morning Yoga in the Park', category: 'Mindfulness', duration: 60, description: 'Start your day with energizing yoga practice surrounded by nature.' },
  { title: 'Hiking Adventure', category: 'Natuur', duration: 180, description: 'Explore beautiful trails and connect with fellow nature lovers.' },
  { title: 'Cooking Workshop', category: 'Eten & Drinken', duration: 120, description: 'Learn to prepare healthy, delicious meals together.' },
  { title: 'Book Club Meeting', category: 'Leren', duration: 90, description: 'Discuss inspiring books about personal growth and mindfulness.' },
  { title: 'Beach Volleyball', category: 'Sport & Fitness', duration: 120, description: 'Fun and energetic beach volleyball session for all skill levels.' },
  { title: 'Art Gallery Visit', category: 'Cultuur', duration: 90, description: 'Explore contemporary art and share insights with art enthusiasts.' },
  { title: 'Meditation Circle', category: 'Mindfulness', duration: 45, description: 'Group meditation session to find inner peace and clarity.' },
  { title: 'Running Group', category: 'Sport & Fitness', duration: 60, description: 'Weekly running session for fitness and friendship.' },
  { title: 'Photography Walk', category: 'Cultuur', duration: 120, description: 'Capture the beauty of the city through photography.' },
  { title: 'Healthy Cooking Class', category: 'Eten & Drinken', duration: 150, description: 'Learn nutritious recipes to support your wellness journey.' }
];

// Journal templates
const journalTemplates = [
  "Today I felt really grateful for the small moments of peace I found during my morning meditation. It's amazing how 10 minutes of silence can change my entire day.",
  "Had a challenging day at work but managed to stay centered. I'm learning to respond rather than react to stress. Progress, not perfection!",
  "Spent time in nature today and felt so connected to everything around me. There's something magical about being outdoors that always lifts my spirits.",
  "Practiced some breathing exercises when I felt anxious about an upcoming presentation. It really helped me feel more grounded and confident.",
  "Feeling proud of myself for choosing a healthy lunch instead of stress eating. These small choices really do add up over time.",
  "Had a wonderful conversation with a friend about our personal growth journeys. It's so inspiring to connect with like-minded people.",
  "Today was tough - felt overwhelmed and stressed. But I'm learning to be kind to myself on difficult days. Tomorrow is a new opportunity.",
  "Tried a new meditation technique today. It felt different but in a good way. I'm excited to explore different approaches to mindfulness.",
  "Grateful for this community and the support I've found here. Knowing I'm not alone in this journey makes all the difference.",
  "Reflection on my week: I notice I'm becoming more patient with myself and others. This inner work is slowly but surely paying off."
];

// Utility functions
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomElements = (arr, count) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};
const getRandomFutureDate = (daysFromNow = 30) => {
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + daysFromNow);
  return getRandomDate(start, end);
};

// Ensure activity categories exist
const ensureActivityCategories = async () => {
  console.log('🔄 Ensuring activity categories exist...');
  
  // Use the model's built-in seed method
  await ActivityCategory.seedCategories();
  
  // Fetch all categories
  const categories = await ActivityCategory.find({});
  console.log(`✅ Found ${categories.length} activity categories`);
  return categories;
};

// Generate test users
const generateTestUsers = async (count = 20) => {
  console.log(`🔄 Generating ${count} test users...`);
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const country = getRandomElement(countries);
    const city = getRandomElement(country.cities);
    const firstName = getRandomElement(firstNames[country.code]);
    const lastName = getRandomElement(lastNames[country.code]);
    // Create shorter username to fit maxLength: 20 constraint
    const firstNameShort = firstName.toLowerCase().substring(0, 8);
    const lastNameShort = lastName.toLowerCase().replace(/\s/g, '').substring(0, 6);
    const randomNum = Math.floor(Math.random() * 99) + 1; // 1-99
    const username = `${firstNameShort}${lastNameShort}${randomNum}`.substring(0, 20);
    
    // Generate random coordinates around the city (approximate)
    const baseCoords = {
      Amsterdam: [4.9041, 52.3676], Rotterdam: [4.4777, 51.9244], Utrecht: [5.1214, 52.0907],
      Berlin: [13.4050, 52.5200], Munich: [11.5820, 48.1351], Hamburg: [9.9937, 53.5511],
      Paris: [2.3522, 48.8566], Lyon: [4.8357, 45.7640], Marseille: [5.3698, 43.2965],
      Madrid: [-3.7038, 40.4168], Barcelona: [2.1734, 41.3851], Valencia: [-0.3774, 39.4699],
      Rome: [12.4964, 41.9028], Milan: [9.1900, 45.4642], Naples: [14.2681, 40.8518],
      London: [-0.1276, 51.5074], Manchester: [-2.2426, 53.4808], Birmingham: [-1.8904, 52.4862]
    };
    
    const baseCoord = baseCoords[city] || [4.9041, 52.3676]; // Default to Amsterdam
    const longitude = baseCoord[0] + (Math.random() - 0.5) * 0.1; // ±0.05 degrees
    const latitude = baseCoord[1] + (Math.random() - 0.5) * 0.1;
    
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    
    // Map country codes to valid language codes
    const languageMap = {
      'NL': 'nl', 'DE': 'de', 'FR': 'fr', 'ES': 'es', 'IT': 'it', 'GB': 'en'
    };
    
    const user = new User({
      username,
      email: `${username}@example.com`,
      password: hashedPassword,
      preferredLanguage: languageMap[country.code] || 'en',
      location: {
        city,
        country: country.name,
        coordinates: {
          latitude,
          longitude
        }
      },
      interests: getRandomElements(interests, Math.floor(Math.random() * 5) + 2),
      age: Math.floor(Math.random() * 40) + 20, // Age 20-60
      credits: Math.floor(Math.random() * 100) + 50, // 50-150 credits
      isVerified: Math.random() > 0.7, // 30% chance of being verified
      trustScore: Math.floor(Math.random() * 30) + 70, // 70-100 trust score
      bio: `Hello! I'm ${firstName} from ${city}. I love ${getRandomElements(interests, 2).join(' and ')} and I'm here to connect with like-minded people on this wellness journey.`,
      createdAt: getRandomDate(new Date('2024-01-01'), new Date()),
      meditations: []
    });
    
    users.push(user);
  }
  
  await User.insertMany(users);
  console.log(`✅ Created ${users.length} test users`);
  return users;
};

// Generate test activities
const generateTestActivities = async (users, categories, count = 30) => {
  console.log(`🔄 Generating ${count} test activities...`);
  const activities = [];
  
  for (let i = 0; i < count; i++) {
    const organizer = getRandomElement(users);
    const template = getRandomElement(activityTemplates);
    
    // Map template categories to database categories
    const categoryMapping = {
      'Sport & Fitness': 'sports',
      'Mindfulness': 'wellness', 
      'Natuur': 'walking',
      'Cultuur': 'culture',
      'Eten & Drinken': 'dining',
      'Sociaal': 'coffee',
      'Leren': 'learning'
    };
    
    const categorySlug = categoryMapping[template.category] || 'other';
    const category = categories.find(cat => cat.slug === categorySlug) || categories[0];
    
    const activityDate = getRandomFutureDate(60); // Next 60 days
    const startHour = Math.floor(Math.random() * 12) + 8; // 8 AM - 8 PM
    const startMinute = Math.random() > 0.5 ? '00' : '30';
    
    // Select random participants (0-8 people, excluding organizer)
    const otherUsers = users.filter(u => u._id.toString() !== organizer._id.toString());
    const participantCount = Math.floor(Math.random() * 8);
    const selectedParticipants = getRandomElements(otherUsers, participantCount);
    
    const participants = selectedParticipants.map(user => ({
      user: user._id,
      status: Math.random() > 0.1 ? 'confirmed' : 'maybe', // 90% confirmed, 10% maybe
      joinedAt: getRandomDate(new Date('2024-01-01'), new Date())
    }));
    
    const activity = new Activity({
      title: template.title,
      description: template.description,
      organizer: organizer._id,
      category: category._id,
      date: activityDate,
      startTime: `${startHour}:${startMinute}`,
      duration: template.duration,
      location: {
        name: `${getRandomElement(['Community Center', 'Local Park', 'Beach', 'Sports Club', 'Wellness Studio'])} ${organizer.location.city}`,
        address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${organizer.location.city}`,
        city: organizer.location.city,
        country: organizer.location.country,
        coordinates: {
          type: 'Point',
          coordinates: organizer.location.coordinates.coordinates || [4.9041, 52.3676]
        }
      },
      maxParticipants: Math.floor(Math.random() * 8) + 4, // 4-12 max participants
      minParticipants: Math.floor(Math.random() * 3) + 2, // 2-4 min participants
      participants,
      status: 'published',
      privacy: Math.random() > 0.8 ? 'invite_only' : 'public', // 20% invite only
      tags: getRandomElements(['wellness', 'community', 'fitness', 'mindfulness', 'social', 'outdoor', 'beginner-friendly'], Math.floor(Math.random() * 3) + 1),
      cost: {
        amount: Math.random() > 0.7 ? Math.floor(Math.random() * 20) + 5 : 0, // 30% paid activities
        description: 'Ieder betaalt zelf',
        splitMethod: 'pay_own'
      },
      language: organizer.preferredLanguage || 'en',
      ageRange: {
        min: 18,
        max: Math.floor(Math.random() * 30) + 50 // Up to 80
      },
      genderPreference: getRandomElement(['any', 'male', 'female']),
      createdAt: getRandomDate(new Date('2024-01-01'), new Date()),
      viewCount: Math.floor(Math.random() * 50)
    });
    
    activities.push(activity);
  }
  
  await Activity.insertMany(activities);
  console.log(`✅ Created ${activities.length} test activities`);
  return activities;
};

// Generate test journal entries
const generateTestJournalEntries = async (users, count = 100) => {
  console.log(`🔄 Generating ${count} test journal entries...`);
  const entries = [];
  
  const moods = ['happy', 'calm', 'stressed', 'anxious', 'energetic', 'peaceful', 'grateful', 'reflective', 'sad', 'angry', 'frustrated', 'confused', 'lonely', 'mixed', 'neutral'];
  const triggers = ['stress', 'loneliness', 'boredom', 'social_pressure', 'emotions'];
  
  for (let i = 0; i < count; i++) {
    const user = getRandomElement(users);
    const template = getRandomElement(journalTemplates);
    
    const titles = [
      'Daily Reflection', 'Morning Thoughts', 'Evening Gratitude', 'Mindful Moments',
      'Today\'s Journey', 'Inner Peace', 'Growth Notes', 'Wellness Check',
      'Recovery Progress', 'Self-Care Time', 'Life Insights', 'Personal Growth'
    ];
    
    const entry = new JournalEntry({
      user: user._id,
      title: getRandomElement(titles) + ' - ' + new Date(getRandomDate(new Date('2024-01-01'), new Date())).toLocaleDateString(),
      content: template,
      mood: getRandomElement(moods),
      triggers: Math.random() > 0.7 ? getRandomElements(triggers, Math.floor(Math.random() * 2) + 1) : [],
      date: getRandomDate(new Date('2024-01-01'), new Date()),
      isPrivate: Math.random() > 0.8, // 20% private
      aiAnalysis: {
        detectedMood: getRandomElement(moods),
        confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
        triggers: Math.random() > 0.5 ? getRandomElements(triggers, 1) : [],
        suggestedActions: ['practice_breathing', 'take_a_walk', 'meditate']
      },
      createdAt: getRandomDate(new Date('2024-01-01'), new Date())
    });
    
    entries.push(entry);
  }
  
  await JournalEntry.insertMany(entries);
  console.log(`✅ Created ${entries.length} test journal entries`);
  return entries;
};

// Generate test addictions
const generateTestAddictions = async (users, count = 40) => {
  console.log(`🔄 Generating ${count} test addiction tracking records...`);
  const addictions = [];
  
  for (let i = 0; i < count; i++) {
    const user = getRandomElement(users);
    const addictionType = getRandomElement(addictionTypes);
    
    // Generate some lapses (relapses)
    const lapseCount = Math.floor(Math.random() * 5);
    const lapses = [];
    for (let j = 0; j < lapseCount; j++) {
      lapses.push({
        date: getRandomDate(new Date('2024-01-01'), new Date()),
        trigger: getRandomElement(['stress', 'social_pressure', 'boredom', 'emotions', 'habit']),
        notes: 'Had a challenging moment but learned from it.',
        severity: Math.floor(Math.random() * 5) + 1
      });
    }
    
    const startDate = getRandomDate(new Date('2024-01-01'), new Date());
    const daysSinceStart = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
    const currentStreak = Math.floor(Math.random() * Math.min(daysSinceStart, 90));
    
    const addiction = new Addiction({
      user: user._id,
      type: addictionType.type,
      name: addictionType.name,
      severity: addictionType.severity,
      startDate,
      currentStreak,
      longestStreak: Math.max(currentStreak, Math.floor(Math.random() * 120) + currentStreak),
      lapses,
      goals: {
        daily: `Avoid ${addictionType.name} for today`,
        weekly: `Stay clean for the entire week`,
        monthly: `Complete 30 days without ${addictionType.name}`
      },
      isActive: Math.random() > 0.1, // 90% active
      createdAt: startDate
    });
    
    addictions.push(addiction);
  }
  
  await Addiction.insertMany(addictions);
  console.log(`✅ Created ${addictions.length} test addiction tracking records`);
  return addictions;
};

// Generate test meditations
const generateTestMeditations = async (users, count = 50) => {
  console.log(`🔄 Generating ${count} test meditations...`);
  const meditations = [];
  
  const meditationTypes = ['sleep', 'stress', 'focus', 'anxiety', 'energy'];
  const languages = ['nl', 'en', 'de', 'fr', 'es', 'it'];
  
  for (let i = 0; i < count; i++) {
    const user = getRandomElement(users);
    const type = getRandomElement(meditationTypes);
    const language = user.preferredLanguage || getRandomElement(languages);
    
    const meditationText = `This is a sample ${type} meditation text generated for testing purposes - #${i + 1} - ${user.username}. It contains mindful guidance and peaceful instructions for ${type} meditation practice. Created at ${new Date().toISOString()}.`;
    
    const meditation = new Meditation({
      user: user._id,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Meditation ${i + 1}`,
      meditationType: type,
      text: meditationText,
      originalText: meditationText,
      language,
      originalLanguage: language,
      duration: Math.floor(Math.random() * 20) + 5, // 5-25 minutes
      audioFile: null, // We won't generate actual audio files for testing
      backgroundMusic: getRandomElement(['ocean', 'forest', 'rain', 'birds', 'custom']),
      isPublic: Math.random() > 0.6, // 40% public
      likes: Math.floor(Math.random() * 20),
      playCount: Math.floor(Math.random() * 50),
      textHash: require('crypto').createHash('md5').update(meditationText).digest('hex'),
      createdAt: getRandomDate(new Date('2024-01-01'), new Date())
    });
    
    meditations.push(meditation);
    
    // Add meditation ID to user's meditations array (simplified structure)
    user.meditations.push(meditation._id);
  }
  
  await Meditation.insertMany(meditations);
  
  // Update users with their meditations
  for (const user of users) {
    if (user.meditations.length > 0) {
      await User.findByIdAndUpdate(user._id, { meditations: user.meditations });
    }
  }
  
  console.log(`✅ Created ${meditations.length} test meditations`);
  return meditations;
};

// Main population function
const populateTestData = async () => {
  try {
    console.log('🚀 Starting test data population...\n');
    
    // Connect to database
    await connectDB();
    
    // Clear existing test data (optional - be careful with this!)
    const clearExisting = process.argv.includes('--clear');
    if (clearExisting) {
      console.log('🗑️  Clearing existing data...');
      await User.deleteMany({ email: { $regex: '@example\.com$' } });
      await Activity.deleteMany({});
      await JournalEntry.deleteMany({});
      await Addiction.deleteMany({});
      await Meditation.deleteMany({});
      console.log('✅ Existing test data cleared\n');
    }
    
    // Generate test data
    const categories = await ensureActivityCategories();
    const users = await generateTestUsers(25);
    const activities = await generateTestActivities(users, categories, 40);
    const journalEntries = await generateTestJournalEntries(users, 150);
    const addictions = await generateTestAddictions(users, 50);
    const meditations = await generateTestMeditations(users, 80);
    
    console.log('\n🎉 Test data population completed successfully!');
    console.log('📊 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   🏃‍♂️ Activities: ${activities.length}`);
    console.log(`   📔 Journal Entries: ${journalEntries.length}`);
    console.log(`   🚫 Addiction Records: ${addictions.length}`);
    console.log(`   🧘‍♀️ Meditations: ${meditations.length}`);
    
    console.log('\n🔐 Login credentials for testing:');
    console.log('   Email: [any_username]@example.com');
    console.log('   Password: testpassword123');
    
  } catch (error) {
    console.error('❌ Error populating test data:', error);
  } finally {
    mongoose.disconnect();
    console.log('\n👋 Database connection closed');
  }
};

// Run the script
if (require.main === module) {
  populateTestData();
}

module.exports = { populateTestData };