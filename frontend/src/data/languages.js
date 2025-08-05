// Languages data with ISO codes and native names
export const languages = [
  { code: 'en', nativeName: 'English', flag: '🇺🇸', order: 1 },
  { code: 'nl', nativeName: 'Nederlands', flag: '🇳🇱', order: 2 },
  { code: 'de', nativeName: 'Deutsch', flag: '🇩🇪', order: 3 },
  { code: 'fr', nativeName: 'Français', flag: '🇫🇷', order: 4 },
  { code: 'es', nativeName: 'Español', flag: '🇪🇸', order: 5 },
  { code: 'it', nativeName: 'Italiano', flag: '🇮🇹', order: 6 },
  { code: 'pt', nativeName: 'Português', flag: '🇵🇹', order: 7 },
  { code: 'ru', nativeName: 'Русский', flag: '🇷🇺', order: 8 },
  { code: 'ja', nativeName: '日本語', flag: '🇯🇵', order: 9 },
  { code: 'ko', nativeName: '한국어', flag: '🇰🇷', order: 10 },
  { code: 'zh', nativeName: '中文', flag: '🇨🇳', order: 11 },
  { code: 'ar', nativeName: 'العربية', flag: '🇸🇦', order: 12 },
  { code: 'hi', nativeName: 'हिंदी', flag: '🇮🇳', order: 13 }
];

// Get language by code
export const getLanguageByCode = (code) => {
  return languages.find(language => language.code === code);
};

// Get languages sorted by order with localized names using translation function
export const getLocalizedLanguages = (t) => {
  return languages
    .map(lang => ({
      ...lang,
      localizedName: t(`language_${lang.code}`, lang.nativeName),
      flag: lang.flag || '🌐'
    }))
    .sort((a, b) => a.order - b.order);
};

// Get languages with native names (fallback when translation not available)
export const getLanguagesWithNativeNames = () => {
  return [...languages].sort((a, b) => a.order - b.order);
};

// Get language display name with fallback logic
export const getLanguageDisplayName = (code, t = null) => {
  const language = getLanguageByCode(code);
  if (!language) return code;
  
  // If translation function is provided, try to get localized name
  if (t) {
    const localizedName = t(`language_${code}`, language.nativeName);
    // Only return localized name if it's different from the key (meaning translation exists)
    if (localizedName !== `language_${code}`) {
      return localizedName;
    }
  }
  
  // Fallback to native name
  return language.nativeName;
};