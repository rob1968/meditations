const mongoose = require('mongoose');

const activityCategorySchema = new mongoose.Schema({
  name: {
    nl: { type: String, required: true },
    en: { type: String, required: true },
    de: String,
    fr: String,
    es: String
  },
  icon: {
    type: String,
    required: true
  },
  emoji: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#6B46C1'
  },
  description: {
    nl: { type: String, required: true },
    en: { type: String, required: true },
    de: String,
    fr: String,
    es: String
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  popularTags: [String],
  suggestedDuration: {
    type: Number, // in minutes
    default: 120
  },
  suggestedGroupSize: {
    min: {
      type: Number,
      default: 3
    },
    max: {
      type: Number,
      default: 8
    }
  },
  activityCount: {
    type: Number,
    default: 0
  }
});

// Static method to seed default categories
activityCategorySchema.statics.seedCategories = async function() {
  const categories = [
    {
      name: { 
        nl: 'Uit Eten', 
        en: 'Dining Out',
        de: 'Essen gehen',
        fr: 'Dîner',
        es: 'Cenar'
      },
      icon: 'restaurant',
      emoji: '🍽️',
      color: '#FF6B6B',
      description: {
        nl: 'Samen genieten van lekker eten in restaurants of cafés',
        en: 'Enjoy good food together at restaurants or cafes',
        de: 'Gemeinsam gutes Essen in Restaurants oder Cafés genießen',
        fr: 'Profitez de bons repas ensemble dans des restaurants ou des cafés',
        es: 'Disfruta de buena comida juntos en restaurantes o cafés'
      },
      slug: 'dining',
      order: 1,
      popularTags: ['restaurant', 'lunch', 'dinner', 'brunch', 'food'],
      suggestedDuration: 120,
      suggestedGroupSize: { min: 3, max: 6 }
    },
    {
      name: { 
        nl: 'Wandelen', 
        en: 'Walking',
        de: 'Spazieren',
        fr: 'Marche',
        es: 'Caminar'
      },
      icon: 'hiking',
      emoji: '🚶',
      color: '#4ECDC4',
      description: {
        nl: 'Actief bezig zijn met wandelen in de natuur of stad',
        en: 'Active walking in nature or the city',
        de: 'Aktives Wandern in der Natur oder Stadt',
        fr: 'Marche active dans la nature ou en ville',
        es: 'Caminar activamente en la naturaleza o la ciudad'
      },
      slug: 'walking',
      order: 2,
      popularTags: ['nature', 'park', 'hiking', 'outdoor', 'exercise'],
      suggestedDuration: 90,
      suggestedGroupSize: { min: 2, max: 10 }
    },
    {
      name: { 
        nl: 'Koffie', 
        en: 'Coffee',
        de: 'Kaffee',
        fr: 'Café',
        es: 'Café'
      },
      icon: 'coffee',
      emoji: '☕',
      color: '#8B4513',
      description: {
        nl: 'Gezellig koffie drinken en bijpraten',
        en: 'Cozy coffee and conversation',
        de: 'Gemütlich Kaffee trinken und plaudern',
        fr: 'Café convivial et conversation',
        es: 'Café acogedor y conversación'
      },
      slug: 'coffee',
      order: 3,
      popularTags: ['cafe', 'tea', 'conversation', 'morning', 'afternoon'],
      suggestedDuration: 60,
      suggestedGroupSize: { min: 2, max: 5 }
    },
    {
      name: { 
        nl: 'Sport', 
        en: 'Sports',
        de: 'Sport',
        fr: 'Sport',
        es: 'Deportes'
      },
      icon: 'sports',
      emoji: '⚽',
      color: '#FF9F1C',
      description: {
        nl: 'Samen sporten en actief bezig zijn',
        en: 'Exercise and be active together',
        de: 'Gemeinsam Sport treiben und aktiv sein',
        fr: 'Faire du sport et être actif ensemble',
        es: 'Hacer ejercicio y estar activo juntos'
      },
      slug: 'sports',
      order: 4,
      popularTags: ['fitness', 'gym', 'running', 'yoga', 'team'],
      suggestedDuration: 90,
      suggestedGroupSize: { min: 2, max: 12 }
    },
    {
      name: { 
        nl: 'Cultuur', 
        en: 'Culture',
        de: 'Kultur',
        fr: 'Culture',
        es: 'Cultura'
      },
      icon: 'museum',
      emoji: '🎭',
      color: '#9B59B6',
      description: {
        nl: 'Musea, theater, concerten en culturele evenementen',
        en: 'Museums, theater, concerts and cultural events',
        de: 'Museen, Theater, Konzerte und kulturelle Veranstaltungen',
        fr: 'Musées, théâtre, concerts et événements culturels',
        es: 'Museos, teatro, conciertos y eventos culturales'
      },
      slug: 'culture',
      order: 5,
      popularTags: ['museum', 'art', 'theater', 'concert', 'exhibition'],
      suggestedDuration: 150,
      suggestedGroupSize: { min: 2, max: 8 }
    },
    {
      name: { 
        nl: 'Uitgaan', 
        en: 'Going Out',
        de: 'Ausgehen',
        fr: 'Sortir',
        es: 'Salir'
      },
      icon: 'nightlife',
      emoji: '🎉',
      color: '#E91E63',
      description: {
        nl: 'Feesten, dansen en uitgaan',
        en: 'Parties, dancing and nightlife',
        de: 'Feiern, tanzen und ausgehen',
        fr: 'Fêtes, danse et vie nocturne',
        es: 'Fiestas, baile y vida nocturna'
      },
      slug: 'nightlife',
      order: 6,
      popularTags: ['party', 'dancing', 'bar', 'club', 'music'],
      suggestedDuration: 180,
      suggestedGroupSize: { min: 3, max: 10 }
    },
    {
      name: { 
        nl: 'Games', 
        en: 'Games',
        de: 'Spiele',
        fr: 'Jeux',
        es: 'Juegos'
      },
      icon: 'games',
      emoji: '🎮',
      color: '#00BCD4',
      description: {
        nl: 'Bordspellen, kaarten, pool of videogames',
        en: 'Board games, cards, pool or video games',
        de: 'Brettspiele, Karten, Billard oder Videospiele',
        fr: 'Jeux de société, cartes, billard ou jeux vidéo',
        es: 'Juegos de mesa, cartas, billar o videojuegos'
      },
      slug: 'games',
      order: 7,
      popularTags: ['boardgames', 'cards', 'pool', 'bowling', 'arcade'],
      suggestedDuration: 120,
      suggestedGroupSize: { min: 2, max: 6 }
    },
    {
      name: { 
        nl: 'Wellness', 
        en: 'Wellness',
        de: 'Wellness',
        fr: 'Bien-être',
        es: 'Bienestar'
      },
      icon: 'spa',
      emoji: '🧘',
      color: '#4CAF50',
      description: {
        nl: 'Meditatie, yoga, spa en ontspanning',
        en: 'Meditation, yoga, spa and relaxation',
        de: 'Meditation, Yoga, Spa und Entspannung',
        fr: 'Méditation, yoga, spa et relaxation',
        es: 'Meditación, yoga, spa y relajación'
      },
      slug: 'wellness',
      order: 8,
      popularTags: ['meditation', 'yoga', 'spa', 'relaxation', 'mindfulness'],
      suggestedDuration: 90,
      suggestedGroupSize: { min: 2, max: 8 }
    },
    {
      name: { 
        nl: 'Creatief', 
        en: 'Creative',
        de: 'Kreativ',
        fr: 'Créatif',
        es: 'Creativo'
      },
      icon: 'palette',
      emoji: '🎨',
      color: '#FF5722',
      description: {
        nl: 'Workshops, schilderen, knutselen en creatieve activiteiten',
        en: 'Workshops, painting, crafts and creative activities',
        de: 'Workshops, Malen, Basteln und kreative Aktivitäten',
        fr: 'Ateliers, peinture, artisanat et activités créatives',
        es: 'Talleres, pintura, manualidades y actividades creativas'
      },
      slug: 'creative',
      order: 9,
      popularTags: ['workshop', 'painting', 'crafts', 'diy', 'art'],
      suggestedDuration: 120,
      suggestedGroupSize: { min: 2, max: 8 }
    },
    {
      name: { 
        nl: 'Shoppen', 
        en: 'Shopping',
        de: 'Einkaufen',
        fr: 'Shopping',
        es: 'Compras'
      },
      icon: 'shopping',
      emoji: '🛍️',
      color: '#FF69B4',
      description: {
        nl: 'Samen winkelen en gezellig rondkijken',
        en: 'Shopping and browsing together',
        de: 'Gemeinsam einkaufen und stöbern',
        fr: 'Shopping et navigation ensemble',
        es: 'Compras y navegación juntos'
      },
      slug: 'shopping',
      order: 10,
      popularTags: ['shopping', 'market', 'mall', 'vintage', 'fashion'],
      suggestedDuration: 120,
      suggestedGroupSize: { min: 2, max: 5 }
    },
    {
      name: { 
        nl: 'Film & TV', 
        en: 'Film & TV',
        de: 'Film & TV',
        fr: 'Film & TV',
        es: 'Cine y TV'
      },
      icon: 'movie',
      emoji: '🎬',
      color: '#3F51B5',
      description: {
        nl: 'Bioscoop, films kijken of series marathons',
        en: 'Cinema, movie watching or series marathons',
        de: 'Kino, Filme schauen oder Serien-Marathons',
        fr: 'Cinéma, visionnage de films ou marathons de séries',
        es: 'Cine, ver películas o maratones de series'
      },
      slug: 'movies',
      order: 11,
      popularTags: ['cinema', 'movie', 'netflix', 'series', 'film'],
      suggestedDuration: 150,
      suggestedGroupSize: { min: 2, max: 6 }
    },
    {
      name: { 
        nl: 'Reizen', 
        en: 'Travel',
        de: 'Reisen',
        fr: 'Voyage',
        es: 'Viajes'
      },
      icon: 'travel',
      emoji: '✈️',
      color: '#009688',
      description: {
        nl: 'Dagtrips, weekendjes weg of langere reizen',
        en: 'Day trips, weekends away or longer travels',
        de: 'Tagesausflüge, Wochenendausflüge oder längere Reisen',
        fr: 'Excursions d\'une journée, week-ends ou voyages plus longs',
        es: 'Excursiones de un día, fines de semana o viajes más largos'
      },
      slug: 'travel',
      order: 12,
      popularTags: ['daytrip', 'weekend', 'adventure', 'explore', 'sightseeing'],
      suggestedDuration: 480,
      suggestedGroupSize: { min: 2, max: 8 }
    },
    {
      name: { 
        nl: 'Ondersteuning', 
        en: 'Support',
        de: 'Unterstützung',
        fr: 'Soutien',
        es: 'Apoyo'
      },
      icon: 'support',
      emoji: '🤝',
      color: '#795548',
      description: {
        nl: 'Steungroepen voor verslavingen, rouw, stress of andere uitdagingen',
        en: 'Support groups for addictions, grief, stress or other challenges',
        de: 'Selbsthilfegruppen für Sucht, Trauer, Stress oder andere Herausforderungen',
        fr: 'Groupes de soutien pour les addictions, le deuil, le stress ou d\'autres défis',
        es: 'Grupos de apoyo para adicciones, duelo, estrés u otros desafíos'
      },
      slug: 'support',
      order: 13,
      popularTags: ['recovery', 'addiction', 'mental-health', 'support', 'healing'],
      suggestedDuration: 90,
      suggestedGroupSize: { min: 3, max: 12 }
    },
    {
      name: { 
        nl: 'Leren', 
        en: 'Learning',
        de: 'Lernen',
        fr: 'Apprentissage',
        es: 'Aprendizaje'
      },
      icon: 'school',
      emoji: '📚',
      color: '#607D8B',
      description: {
        nl: 'Taaluitwisseling, studie groepen of nieuwe vaardigheden leren',
        en: 'Language exchange, study groups or learning new skills',
        de: 'Sprachaustausch, Lerngruppen oder neue Fähigkeiten lernen',
        fr: 'Échange linguistique, groupes d\'étude ou apprentissage de nouvelles compétences',
        es: 'Intercambio de idiomas, grupos de estudio o aprender nuevas habilidades'
      },
      slug: 'learning',
      order: 14,
      popularTags: ['language', 'study', 'skills', 'education', 'workshop'],
      suggestedDuration: 90,
      suggestedGroupSize: { min: 2, max: 10 }
    },
    {
      name: { 
        nl: 'Overig', 
        en: 'Other',
        de: 'Sonstiges',
        fr: 'Autre',
        es: 'Otro'
      },
      icon: 'more',
      emoji: '✨',
      color: '#9E9E9E',
      description: {
        nl: 'Andere activiteiten die niet in een categorie passen',
        en: 'Other activities that don\'t fit a category',
        de: 'Andere Aktivitäten, die in keine Kategorie passen',
        fr: 'Autres activités qui ne correspondent à aucune catégorie',
        es: 'Otras actividades que no encajan en una categoría'
      },
      slug: 'other',
      order: 15,
      popularTags: ['misc', 'various', 'special', 'unique', 'other'],
      suggestedDuration: 120,
      suggestedGroupSize: { min: 2, max: 10 }
    }
  ];
  
  // Only seed if collection is empty
  const count = await this.countDocuments();
  if (count === 0) {
    await this.insertMany(categories);
    console.log('✅ Activity categories seeded successfully');
  }
  
  return categories;
};

// Instance method to increment activity count
activityCategorySchema.methods.incrementActivityCount = async function() {
  this.activityCount += 1;
  await this.save();
};

module.exports = mongoose.model('ActivityCategory', activityCategorySchema);