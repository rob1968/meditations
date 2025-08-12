#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const localesDir = './frontend/src/locales';

// Essential translations that should be in all languages
const essentialTranslations = {
  // Language names
  chinese: {
    en: 'Chinese',
    nl: 'Chinees',
    de: 'Chinesisch',
    fr: 'Chinois',
    es: 'Chino',
    it: 'Cinese',
    ja: '中国語',
    ko: '중국어',
    pt: 'Chinês',
    ru: 'Китайский',
    zh: '中文',
    ar: 'الصينية',
    hi: 'चीनी'
  },
  japanese: {
    en: 'Japanese',
    nl: 'Japans',
    de: 'Japanisch',
    fr: 'Japonais',
    es: 'Japonés',
    it: 'Giapponese',
    ja: '日本語',
    ko: '일본어',
    pt: 'Japonês',
    ru: 'Японский',
    zh: '日语',
    ar: 'اليابانية',
    hi: 'जापानी'
  },
  korean: {
    en: 'Korean',
    nl: 'Koreaans',
    de: 'Koreanisch',
    fr: 'Coréen',
    es: 'Coreano',
    it: 'Coreano',
    ja: '韓国語',
    ko: '한국어',
    pt: 'Coreano',
    ru: 'Корейский',
    zh: '韩语',
    ar: 'الكورية',
    hi: 'कोरियाई'
  },
  arabic: {
    en: 'Arabic',
    nl: 'Arabisch',
    de: 'Arabisch',
    fr: 'Arabe',
    es: 'Árabe',
    it: 'Arabo',
    ja: 'アラビア語',
    ko: '아랍어',
    pt: 'Árabe',
    ru: 'Арабский',
    zh: '阿拉伯语',
    ar: 'العربية',
    hi: 'अरबी'
  },
  hindi: {
    en: 'Hindi',
    nl: 'Hindi',
    de: 'Hindi',
    fr: 'Hindi',
    es: 'Hindi',
    it: 'Hindi',
    ja: 'ヒンディー語',
    ko: '힌디어',
    pt: 'Hindi',
    ru: 'Хинди',
    zh: '印地语',
    ar: 'الهندية',
    hi: 'हिंदी'
  },
  portuguese: {
    en: 'Portuguese',
    nl: 'Portugees',
    de: 'Portugiesisch',
    fr: 'Portugais',
    es: 'Portugués',
    it: 'Portoghese',
    ja: 'ポルトガル語',
    ko: '포르투갈어',
    pt: 'Português',
    ru: 'Португальский',
    zh: '葡萄牙语',
    ar: 'البرتغالية',
    hi: 'पुर्तगाली'
  },
  russian: {
    en: 'Russian',
    nl: 'Russisch',
    de: 'Russisch',
    fr: 'Russe',
    es: 'Ruso',
    it: 'Russo',
    ja: 'ロシア語',
    ko: '러시아어',
    pt: 'Russo',
    ru: 'Русский',
    zh: '俄语',
    ar: 'الروسية',
    hi: 'रूसी'
  },
  italian: {
    en: 'Italian',
    nl: 'Italiaans',
    de: 'Italienisch',
    fr: 'Italien',
    es: 'Italiano',
    it: 'Italiano',
    ja: 'イタリア語',
    ko: '이탈리아어',
    pt: 'Italiano',
    ru: 'Итальянский',
    zh: '意大利语',
    ar: 'الإيطالية',
    hi: 'इतालवी'
  },
  
  // Common UI elements
  saving: {
    en: 'Saving...',
    nl: 'Opslaan...',
    de: 'Speichern...',
    fr: 'Enregistrement...',
    es: 'Guardando...',
    it: 'Salvataggio...',
    ja: '保存中...',
    ko: '저장 중...',
    pt: 'Salvando...',
    ru: 'Сохранение...',
    zh: '保存中...',
    ar: 'جاري الحفظ...',
    hi: 'सेव हो रहा है...'
  },
  calculating: {
    en: 'Calculating...',
    nl: 'Berekenen...',
    de: 'Berechnen...',
    fr: 'Calcul en cours...',
    es: 'Calculando...',
    it: 'Calcolo...',
    ja: '計算中...',
    ko: '계산 중...',
    pt: 'Calculando...',
    ru: 'Вычисление...',
    zh: '计算中...',
    ar: 'جاري الحساب...',
    hi: 'गणना कर रहा है...'
  },
  settings: {
    en: 'Settings',
    nl: 'Instellingen',
    de: 'Einstellungen',
    fr: 'Paramètres',
    es: 'Configuración',
    it: 'Impostazioni',
    ja: '設定',
    ko: '설정',
    pt: 'Configurações',
    ru: 'Настройки',
    zh: '设置',
    ar: 'الإعدادات',
    hi: 'सेटिंग्स'
  },
  statistics: {
    en: 'Statistics',
    nl: 'Statistieken',
    de: 'Statistiken',
    fr: 'Statistiques',
    es: 'Estadísticas',
    it: 'Statistiche',
    ja: '統計',
    ko: '통계',
    pt: 'Estatísticas',
    ru: 'Статистика',
    zh: '统计',
    ar: 'الإحصائيات',
    hi: 'आंकड़े'
  },
  admin: {
    en: 'Admin',
    nl: 'Beheerder',
    de: 'Admin',
    fr: 'Admin',
    es: 'Admin',
    it: 'Admin',
    ja: '管理者',
    ko: '관리자',
    pt: 'Admin',
    ru: 'Админ',
    zh: '管理员',
    ar: 'المدير',
    hi: 'व्यवस्थापक'
  },
  inbox: {
    en: 'Inbox',
    nl: 'Inbox',
    de: 'Posteingang',
    fr: 'Boîte de réception',
    es: 'Bandeja de entrada',
    it: 'Posta in arrivo',
    ja: '受信箱',
    ko: '받은편지함',
    pt: 'Caixa de entrada',
    ru: 'Входящие',
    zh: '收件箱',
    ar: 'صندوق الوارد',
    hi: 'इनबॉक्स'
  },
  email: {
    en: 'Email',
    nl: 'E-mail',
    de: 'E-Mail',
    fr: 'Email',
    es: 'Correo electrónico',
    it: 'Email',
    ja: 'メール',
    ko: '이메일',
    pt: 'Email',
    ru: 'Электронная почта',
    zh: '邮箱',
    ar: 'البريد الإلكتروني',
    hi: 'ईमेल'
  },
  password: {
    en: 'Password',
    nl: 'Wachtwoord',
    de: 'Passwort',
    fr: 'Mot de passe',
    es: 'Contraseña',
    it: 'Password',
    ja: 'パスワード',
    ko: '비밀번호',
    pt: 'Senha',
    ru: 'Пароль',
    zh: '密码',
    ar: 'كلمة المرور',
    hi: 'पासवर्ड'
  }
};

const languages = ['en', 'nl', 'de', 'fr', 'es', 'it', 'ja', 'ko', 'pt', 'ru', 'zh', 'ar', 'hi'];

function loadTranslation(lang) {
  try {
    const filePath = path.join(localesDir, lang, 'translation.json');
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${lang}:`, error.message);
    return {};
  }
}

function saveTranslation(lang, translations) {
  try {
    const filePath = path.join(localesDir, lang, 'translation.json');
    fs.writeFileSync(filePath, JSON.stringify(translations, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving ${lang}:`, error.message);
    return false;
  }
}

function addEssentialTranslations() {
  languages.forEach(lang => {
    console.log(`\n🔧 Processing ${lang.toUpperCase()}...`);
    
    const translations = loadTranslation(lang);
    let addedCount = 0;
    
    Object.entries(essentialTranslations).forEach(([key, langTranslations]) => {
      if (!(key in translations) && langTranslations[lang]) {
        translations[key] = langTranslations[lang];
        addedCount++;
        console.log(`  + Added "${key}": "${langTranslations[lang]}"`);
      }
    });
    
    if (addedCount > 0) {
      saveTranslation(lang, translations);
      console.log(`✅ Added ${addedCount} translations to ${lang}`);
    } else {
      console.log(`ℹ️  No new translations needed for ${lang}`);
    }
  });
}

console.log('🚀 Adding essential translations to all languages...');
addEssentialTranslations();
console.log('\n✨ Essential translations update complete!');