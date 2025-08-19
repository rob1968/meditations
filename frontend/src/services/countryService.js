/**
 * Country Detection and Regional Configuration Service
 * Provides country detection, regional settings, and localization support
 */

// Regional configurations for different countries
export const REGIONAL_CONFIGS = {
  // United States
  'US': {
    emergencyNumber: '911',
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    firstDayOfWeek: 0, // Sunday
    measurementSystem: 'imperial',
    timezone: 'America/New_York',
    gdprRequired: false,
    ageOfConsent: 13,
    piNetworkAvailable: true
  },
  // United Kingdom  
  'GB': {
    emergencyNumber: '999',
    currency: 'GBP',
    currencySymbol: '£',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    firstDayOfWeek: 1, // Monday
    measurementSystem: 'imperial',
    timezone: 'Europe/London',
    gdprRequired: true,
    ageOfConsent: 13,
    piNetworkAvailable: true
  },
  // Netherlands
  'NL': {
    emergencyNumber: '112',
    currency: 'EUR',
    currencySymbol: '€',
    dateFormat: 'dd-MM-yyyy',
    timeFormat: '24h',
    firstDayOfWeek: 1, // Monday
    measurementSystem: 'metric',
    timezone: 'Europe/Amsterdam',
    gdprRequired: true,
    ageOfConsent: 16,
    piNetworkAvailable: true
  },
  // Germany
  'DE': {
    emergencyNumber: '112',
    currency: 'EUR',
    currencySymbol: '€',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: '24h',
    firstDayOfWeek: 1, // Monday
    measurementSystem: 'metric',
    timezone: 'Europe/Berlin',
    gdprRequired: true,
    ageOfConsent: 16,
    piNetworkAvailable: true
  },
  // France
  'FR': {
    emergencyNumber: '112',
    currency: 'EUR',
    currencySymbol: '€',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    firstDayOfWeek: 1, // Monday
    measurementSystem: 'metric',
    timezone: 'Europe/Paris',
    gdprRequired: true,
    ageOfConsent: 16,
    piNetworkAvailable: true
  },
  // Spain
  'ES': {
    emergencyNumber: '112',
    currency: 'EUR',
    currencySymbol: '€',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    firstDayOfWeek: 1, // Monday
    measurementSystem: 'metric',
    timezone: 'Europe/Madrid',
    gdprRequired: true,
    ageOfConsent: 16,
    piNetworkAvailable: true
  },
  // Italy
  'IT': {
    emergencyNumber: '112',
    currency: 'EUR',
    currencySymbol: '€',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    firstDayOfWeek: 1, // Monday
    measurementSystem: 'metric',
    timezone: 'Europe/Rome',
    gdprRequired: true,
    ageOfConsent: 16,
    piNetworkAvailable: true
  },
  // Portugal
  'PT': {
    emergencyNumber: '112',
    currency: 'EUR',
    currencySymbol: '€',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    firstDayOfWeek: 1, // Monday
    measurementSystem: 'metric',
    timezone: 'Europe/Lisbon',
    gdprRequired: true,
    ageOfConsent: 16,
    piNetworkAvailable: true
  },
  // Brazil
  'BR': {
    emergencyNumber: '190',
    currency: 'BRL',
    currencySymbol: 'R$',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    firstDayOfWeek: 0, // Sunday
    measurementSystem: 'metric',
    timezone: 'America/Sao_Paulo',
    gdprRequired: false,
    ageOfConsent: 13,
    piNetworkAvailable: false // Pi Network restrictions
  },
  // Russia
  'RU': {
    emergencyNumber: '112',
    currency: 'RUB',
    currencySymbol: '₽',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: '24h',
    firstDayOfWeek: 1, // Monday
    measurementSystem: 'metric',
    timezone: 'Europe/Moscow',
    gdprRequired: false,
    ageOfConsent: 14,
    piNetworkAvailable: false // Sanctions restrictions
  },
  // Japan
  'JP': {
    emergencyNumber: '110',
    currency: 'JPY',
    currencySymbol: '¥',
    dateFormat: 'yyyy/MM/dd',
    timeFormat: '24h',
    firstDayOfWeek: 0, // Sunday
    measurementSystem: 'metric',
    timezone: 'Asia/Tokyo',
    gdprRequired: false,
    ageOfConsent: 13,
    piNetworkAvailable: true
  },
  // South Korea
  'KR': {
    emergencyNumber: '112',
    currency: 'KRW',
    currencySymbol: '₩',
    dateFormat: 'yyyy.MM.dd',
    timeFormat: '12h',
    firstDayOfWeek: 0, // Sunday
    measurementSystem: 'metric',
    timezone: 'Asia/Seoul',
    gdprRequired: false,
    ageOfConsent: 14,
    piNetworkAvailable: true
  },
  // China
  'CN': {
    emergencyNumber: '110',
    currency: 'CNY',
    currencySymbol: '¥',
    dateFormat: 'yyyy/MM/dd',
    timeFormat: '24h',
    firstDayOfWeek: 1, // Monday
    measurementSystem: 'metric',
    timezone: 'Asia/Shanghai',
    gdprRequired: false,
    ageOfConsent: 14,
    piNetworkAvailable: false // Government restrictions
  },
  // India
  'IN': {
    emergencyNumber: '100',
    currency: 'INR',
    currencySymbol: '₹',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    firstDayOfWeek: 0, // Sunday
    measurementSystem: 'metric',
    timezone: 'Asia/Kolkata',
    gdprRequired: false,
    ageOfConsent: 18,
    piNetworkAvailable: true
  },
  // Default fallback
  'DEFAULT': {
    emergencyNumber: '112',
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '24h',
    firstDayOfWeek: 1, // Monday
    measurementSystem: 'metric',
    timezone: 'UTC',
    gdprRequired: false,
    ageOfConsent: 13,
    piNetworkAvailable: true
  }
};

/**
 * Detect user's country using multiple methods
 */
export const detectUserCountry = async () => {
  try {
    // Method 1: Check localStorage for user preference
    const savedCountry = localStorage.getItem('userCountry');
    if (savedCountry && REGIONAL_CONFIGS[savedCountry]) {
      return savedCountry;
    }

    // Method 2: Browser language/locale detection
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang) {
      const countryFromLang = browserLang.split('-')[1];
      if (countryFromLang && REGIONAL_CONFIGS[countryFromLang]) {
        return countryFromLang;
      }
    }

    // Method 3: Timezone-based detection
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const countryFromTimezone = getCountryFromTimezone(timezone);
    if (countryFromTimezone) {
      return countryFromTimezone;
    }

    // Method 4: IP-based detection (optional, requires external service)
    // This could be implemented with a free service like ipapi.co
    // For now, we'll skip this to avoid external dependencies

    // Fallback: Return default
    return 'DEFAULT';
  } catch (error) {
    console.warn('Country detection failed:', error);
    return 'DEFAULT';
  }
};

/**
 * Get country code from timezone
 */
const getCountryFromTimezone = (timezone) => {
  const timezoneToCountry = {
    'America/New_York': 'US',
    'America/Chicago': 'US',
    'America/Denver': 'US',
    'America/Los_Angeles': 'US',
    'Europe/London': 'GB',
    'Europe/Amsterdam': 'NL',
    'Europe/Berlin': 'DE',
    'Europe/Paris': 'FR',
    'Europe/Madrid': 'ES',
    'Europe/Rome': 'IT',
    'Europe/Lisbon': 'PT',
    'America/Sao_Paulo': 'BR',
    'Europe/Moscow': 'RU',
    'Asia/Tokyo': 'JP',
    'Asia/Seoul': 'KR',
    'Asia/Shanghai': 'CN',
    'Asia/Kolkata': 'IN'
  };
  
  return timezoneToCountry[timezone] || null;
};

/**
 * Get regional configuration for a country
 */
export const getRegionalConfig = (countryCode = null) => {
  if (!countryCode) {
    // Use async detection if no country code provided
    return REGIONAL_CONFIGS['DEFAULT'];
  }
  
  return REGIONAL_CONFIGS[countryCode] || REGIONAL_CONFIGS['DEFAULT'];
};

/**
 * Set user's country preference
 */
export const setUserCountry = (countryCode) => {
  if (REGIONAL_CONFIGS[countryCode]) {
    localStorage.setItem('userCountry', countryCode);
    return true;
  }
  return false;
};

/**
 * Format date according to regional preferences
 */
export const formatDate = (date, countryCode = null) => {
  const config = getRegionalConfig(countryCode);
  const locale = getLocaleFromCountry(countryCode);
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

/**
 * Format time according to regional preferences
 */
export const formatTime = (date, countryCode = null) => {
  const config = getRegionalConfig(countryCode);
  const locale = getLocaleFromCountry(countryCode);
  const hour12 = config.timeFormat === '12h';
  
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: hour12
  }).format(date);
};

/**
 * Format currency according to regional preferences
 */
export const formatCurrency = (amount, countryCode = null) => {
  const config = getRegionalConfig(countryCode);
  const locale = getLocaleFromCountry(countryCode);
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: config.currency
  }).format(amount);
};

/**
 * Get locale string from country code
 */
const getLocaleFromCountry = (countryCode) => {
  const countryToLocale = {
    'US': 'en-US',
    'GB': 'en-GB',
    'NL': 'nl-NL',
    'DE': 'de-DE',
    'FR': 'fr-FR',
    'ES': 'es-ES',
    'IT': 'it-IT',
    'PT': 'pt-PT',
    'BR': 'pt-BR',
    'RU': 'ru-RU',
    'JP': 'ja-JP',
    'KR': 'ko-KR',
    'CN': 'zh-CN',
    'IN': 'hi-IN'
  };
  
  return countryToLocale[countryCode] || 'en-US';
};

/**
 * Check if GDPR compliance is required
 */
export const isGDPRRequired = (countryCode = null) => {
  const config = getRegionalConfig(countryCode);
  return config.gdprRequired;
};

/**
 * Check if Pi Network is available in the country
 */
export const isPiNetworkAvailable = (countryCode = null) => {
  const config = getRegionalConfig(countryCode);
  return config.piNetworkAvailable;
};

/**
 * Get age of consent for the country
 */
export const getAgeOfConsent = (countryCode = null) => {
  const config = getRegionalConfig(countryCode);
  return config.ageOfConsent;
};

/**
 * Get emergency number for the country
 */
export const getEmergencyNumber = (countryCode = null) => {
  const config = getRegionalConfig(countryCode);
  return config.emergencyNumber;
};

export default {
  detectUserCountry,
  getRegionalConfig,
  setUserCountry,
  formatDate,
  formatTime,
  formatCurrency,
  isGDPRRequired,
  isPiNetworkAvailable,
  getAgeOfConsent,
  getEmergencyNumber,
  REGIONAL_CONFIGS
};