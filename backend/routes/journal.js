const express = require('express');
const router = express.Router();
const JournalEntry = require('../models/JournalEntry');
const User = require('../models/User');
const auth = require('../middleware/auth');
const aiCoachService = require('../services/aiCoachService');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

// Create journals audio directory if it doesn't exist
const journalsDir = path.join(__dirname, '../../assets/audio/journals');
if (!fs.existsSync(journalsDir)) {
  fs.mkdirSync(journalsDir, { recursive: true });
}

// Helper function for automatic AI Coach analysis with relapse detection
const triggerAICoachAnalysis = async (journalEntry) => {
  try {
    console.log(`🔍 Analyzing journal entry ${journalEntry._id} for triggers and relapse detection...`);
    
    // Try AI analysis first
    const analysis = await aiCoachService.analyzeJournalEntry(journalEntry.userId, journalEntry);
    
    // If AI analysis works, use it
    if (analysis && analysis.triggersDetected && analysis.triggersDetected.length > 0) {
      console.log(`⚠️  Triggers detected in journal entry:`, analysis.triggersDetected);
      
      // Check if any triggers indicate actual relapse (not just thoughts)
      const relapseIndicators = analysis.triggersDetected.filter(trigger => 
        trigger.confidence > 0.6 && 
        (trigger.isActualRelapse === true || 
         (trigger.context && (
           trigger.context.toLowerCase().includes('actual relapse') ||
           trigger.context.toLowerCase().includes('used') || 
           trigger.context.toLowerCase().includes('drank') || 
           trigger.context.toLowerCase().includes('gedronken') ||
           trigger.context.toLowerCase().includes('heb gedronken') ||
           trigger.context.toLowerCase().includes('wijn gedronken') ||
           trigger.context.toLowerCase().includes('alcohol gedronken') ||
           trigger.context.toLowerCase().includes('smoked') ||
           trigger.context.toLowerCase().includes('gerookt') ||
           trigger.context.toLowerCase().includes('heb gerookt') ||
           trigger.context.toLowerCase().includes('gambled') ||
           trigger.context.toLowerCase().includes('gegokt') ||
           trigger.context.toLowerCase().includes('bought') ||
           trigger.context.toLowerCase().includes('gekocht') ||
           trigger.context.toLowerCase().includes('relapsed') ||
           trigger.context.toLowerCase().includes('teruggevallen') ||
           trigger.context.toLowerCase().includes('gave in') ||
           trigger.context.toLowerCase().includes('toegegeven') ||
           trigger.context.toLowerCase().includes('bezweken')
         )))
      );
      
      if (relapseIndicators.length > 0) {
        console.log(`🚨 Relapse indicators found:`, relapseIndicators);
        await handleAutomaticRelapseDetection(journalEntry.userId, relapseIndicators, journalEntry);
      }
    } else {
      console.log('⚠️  No AI triggers detected or AI unavailable, falling back to keyword-based detection...');
      
      // Fallback: Keyword-based relapse detection
      const keywordRelapseIndicators = await performKeywordBasedRelapseDetection(journalEntry);
      
      if (keywordRelapseIndicators.length > 0) {
        console.log(`🚨 Keyword-based relapse indicators found:`, keywordRelapseIndicators);
        await handleAutomaticRelapseDetection(journalEntry.userId, keywordRelapseIndicators, journalEntry);
      }
    }
  } catch (error) {
    console.error('Error in automatic AI Coach analysis:', error);
    
    // Even if AI fails, try keyword fallback
    try {
      console.log('🔄 AI failed, attempting keyword-based detection...');
      const keywordRelapseIndicators = await performKeywordBasedRelapseDetection(journalEntry);
      
      if (keywordRelapseIndicators.length > 0) {
        console.log(`🚨 Keyword-based relapse indicators found:`, keywordRelapseIndicators);
        await handleAutomaticRelapseDetection(journalEntry.userId, keywordRelapseIndicators, journalEntry);
      }
    } catch (keywordError) {
      console.error('Error in keyword-based relapse detection:', keywordError);
    }
  }
};

// Keyword-based relapse detection fallback when AI is unavailable
const performKeywordBasedRelapseDetection = async (journalEntry) => {
  try {
    const Addiction = require('../models/Addiction');
    
    // Get user's addictions to know what to look for (include all statuses that could relapse)
    const addictions = await Addiction.find({ 
      userId: journalEntry.userId, 
      status: { $in: ['active', 'recovering', 'clean'] } 
    });
    
    const relapseIndicators = [];
    const content = (journalEntry.content + ' ' + journalEntry.title).toLowerCase();
    
    // Define comprehensive relapse keywords by addiction type and language
    const addictionKeywords = {
      alcohol: {
        keywords: {
          'en': ['drank', 'drunk', 'wine', 'beer', 'alcohol', 'whisky', 'vodka', 'gin', 'champagne', 'cocktail', 'had drinks', 'drinking'],
          'nl': ['gedronken', 'heb gedronken', 'wijn gedronken', 'alcohol gedronken', 'bier gedronken', 'wodka', 'gin', 'alcohol'],
          'de': ['getrunken', 'hab getrunken', 'wein getrunken', 'bier getrunken', 'alkohol', 'whisky', 'wodka'],
          'fr': ['bu', 'j\'ai bu', 'vin bu', 'bière bu', 'alcool', 'whisky', 'vodka', 'champagne'],
          'es': ['bebido', 'he bebido', 'vino bebido', 'cerveza bebida', 'alcohol', 'whisky', 'vodka'],
          'it': ['bevuto', 'ho bevuto', 'vino bevuto', 'birra bevuta', 'alcol', 'whisky', 'vodka'],
          'pt': ['bebi', 'bebido', 'vinho bebido', 'cerveja bebida', 'álcool', 'whisky', 'vodka'],
          'ru': ['пил', 'выпил', 'пьян', 'алкоголь', 'водка', 'пиво', 'вино', 'виски']
        },
        contextPhrases: {
          'en': ['had alcohol', 'drank too much', 'got drunk', 'drinking again'],
          'nl': ['heb alcohol', 'veel gedronken', 'weer gedronken', 'dronken geworden', 'te veel gedronken'],
          'de': ['hab alkohol', 'viel getrunken', 'wieder getrunken', 'betrunken geworden'],
          'fr': ['j\'ai de l\'alcool', 'trop bu', 'encore bu', 'saoul'],
          'es': ['he bebido alcohol', 'bebido demasiado', 'bebido otra vez', 'borracho'],
          'it': ['ho bevuto alcol', 'bevuto troppo', 'bevuto ancora', 'ubriaco'],
          'pt': ['bebi álcool', 'bebi demais', 'bebi novamente', 'bêbado'],
          'ru': ['выпил алкоголь', 'много выпил', 'снова пил', 'пьян']
        }
      },
      smoking: {
        keywords: {
          'en': ['smoked', 'cigarette', 'tobacco', 'vaping', 'e-cigarette', 'nicotine', 'lighter'],
          'nl': ['gerookt', 'heb gerookt', 'sigaret gerookt', 'sigaretten gekocht', 'sigaret', 'tabak', 'roken'],
          'de': ['geraucht', 'hab geraucht', 'zigarette', 'tabak', 'rauchen', 'nikotine'],
          'fr': ['fumé', 'j\'ai fumé', 'cigarette', 'tabac', 'fumer', 'nicotine'],
          'es': ['fumado', 'he fumado', 'cigarrillo', 'tabaco', 'fumar', 'nicotina'],
          'it': ['fumato', 'ho fumato', 'sigaretta', 'tabacco', 'fumare', 'nicotina'],
          'pt': ['fumei', 'fumado', 'cigarro', 'tabaco', 'fumar', 'nicotina'],
          'ru': ['курил', 'покурил', 'сигарета', 'табак', 'никотин']
        },
        contextPhrases: {
          'en': ['smoked again', 'bought cigarettes', 'lit cigarette', 'smoking break'],
          'nl': ['heb gerookt', 'weer gerookt', 'sigaret opgestoken', 'pakje gekocht'],
          'de': ['wieder geraucht', 'zigaretten gekauft', 'zigarette angezündet'],
          'fr': ['fumé encore', 'acheté cigarettes', 'allumé cigarette'],
          'es': ['fumado otra vez', 'comprado cigarrillos', 'encendido cigarrillo'],
          'it': ['fumato ancora', 'comprato sigarette', 'acceso sigaretta'],
          'pt': ['fumei novamente', 'comprei cigarros', 'acendi cigarro'],
          'ru': ['снова курил', 'купил сигареты', 'закурил']
        }
      },
      gambling: {
        keywords: {
          'en': ['gambled', 'casino', 'lottery', 'poker', 'bet', 'betting', 'slot machine'],
          'nl': ['gegokt', 'heb gegokt', 'casino bezocht', 'geld verloren aan gokken', 'weddenschap', 'pokeren'],
          'de': ['gespielt', 'hab gespielt', 'kasino', 'lotterie', 'poker', 'wette'],
          'fr': ['joué', 'j\'ai joué', 'casino', 'loterie', 'poker', 'pari'],
          'es': ['apostado', 'he apostado', 'casino', 'lotería', 'póker', 'apuesta'],
          'it': ['scommesso', 'ho scommesso', 'casinò', 'lotteria', 'poker', 'scommessa'],
          'pt': ['apostei', 'apostado', 'casino', 'loteria', 'poker', 'aposta'],
          'ru': ['играл', 'сыграл', 'казино', 'лотерея', 'покер', 'ставка']
        },
        contextPhrases: {
          'en': ['lost money gambling', 'went to casino', 'placed bet', 'gambling again'],
          'nl': ['heb gegokt', 'geld verspeeld', 'weer gegokt', 'casino gegaan'],
          'de': ['geld verspielt', 'wieder gespielt', 'kasino gegangen'],
          'fr': ['perdu argent', 'encore joué', 'casino allé'],
          'es': ['perdido dinero', 'apostado otra vez', 'casino ido'],
          'it': ['perso soldi', 'scommesso ancora', 'casinò andato'],
          'pt': ['perdi dinheiro', 'apostei novamente', 'casino fui'],
          'ru': ['потерял деньги', 'снова играл', 'в казино ходил']
        }
      },
      shopping: {
        keywords: {
          'en': ['bought', 'shopping spree', 'impulse buy', 'purchased', 'credit card', 'spent money'],
          'nl': ['gekocht', 'teveel gekocht', 'shopping gedaan', 'geld uitgegeven', 'winkelen'],
          'de': ['gekauft', 'zu viel gekauft', 'shopping gemacht', 'geld ausgegeben'],
          'fr': ['acheté', 'trop acheté', 'shopping fait', 'argent dépensé'],
          'es': ['comprado', 'demasiado comprado', 'shopping hecho', 'dinero gastado'],
          'it': ['comprato', 'troppo comprato', 'shopping fatto', 'soldi spesi'],
          'pt': ['comprei', 'comprado demais', 'shopping feito', 'dinheiro gasto'],
          'ru': ['купил', 'много купил', 'шоппинг', 'потратил деньги']
        },
        contextPhrases: {
          'en': ['impulse bought', 'shopping addiction', 'spent too much', 'maxed credit card'],
          'nl': ['teveel gekocht', 'geld weggegooid', 'impulsief gekocht', 'weer winkelen'],
          'de': ['zu viel gekauft', 'geld verschwendet', 'impulsiv gekauft'],
          'fr': ['trop acheté', 'argent gaspillé', 'acheté impulsivement'],
          'es': ['comprado demasiado', 'dinero desperdiciado', 'comprado impulsivamente'],
          'it': ['comprato troppo', 'soldi sprecati', 'comprato impulsivamente'],
          'pt': ['comprei demais', 'dinheiro desperdiçado', 'comprei impulsivamente'],
          'ru': ['купил много', 'потратил деньги', 'импульсивно купил']
        }
      },
      drugs: {
        keywords: {
          'en': ['used drugs', 'cocaine', 'marijuana', 'weed', 'pills', 'heroin', 'meth', 'high'],
          'nl': ['drugs gebruikt', 'cocaïne', 'marihuana', 'wiet', 'pillen', 'heroïne', 'high'],
          'de': ['drogen genommen', 'kokain', 'marihuana', 'pillen', 'heroin', 'high'],
          'fr': ['drogues pris', 'cocaïne', 'marijuana', 'pilules', 'héroïne', 'high'],
          'es': ['drogas usado', 'cocaína', 'marihuana', 'pastillas', 'heroína', 'high'],
          'it': ['droghe usato', 'cocaina', 'marijuana', 'pillole', 'eroina', 'high'],
          'pt': ['drogas usei', 'cocaína', 'maconha', 'pílulas', 'heroína', 'chapado'],
          'ru': ['наркотики', 'кокаин', 'марихуана', 'таблетки', 'героин', 'кайф']
        },
        contextPhrases: {
          'en': ['used again', 'got high', 'relapsed drugs', 'bought drugs'],
          'nl': ['weer gebruikt', 'high geworden', 'terugval drugs', 'drugs gekocht'],
          'de': ['wieder genommen', 'high geworden', 'rückfall drogen'],
          'fr': ['pris encore', 'high devenu', 'rechute drogues'],
          'es': ['usado otra vez', 'high quedado', 'recaída drogas'],
          'it': ['usato ancora', 'high diventato', 'ricaduta droghe'],
          'pt': ['usei novamente', 'chapei', 'recaída drogas'],
          'ru': ['снова употребил', 'накурился', 'рецидив наркотики']
        }
      },
      social_media: {
        keywords: {
          'en': ['scrolled', 'instagram', 'facebook', 'tiktok', 'twitter', 'social media', 'phone addiction'],
          'nl': ['gescrold', 'instagram', 'facebook', 'tiktok', 'twitter', 'sociale media', 'telefoon verslaving'],
          'de': ['gescrollt', 'instagram', 'facebook', 'tiktok', 'twitter', 'soziale medien'],
          'fr': ['scrollé', 'instagram', 'facebook', 'tiktok', 'twitter', 'médias sociaux'],
          'es': ['navegado', 'instagram', 'facebook', 'tiktok', 'twitter', 'redes sociales'],
          'it': ['scrollato', 'instagram', 'facebook', 'tiktok', 'twitter', 'social media'],
          'pt': ['rolei', 'instagram', 'facebook', 'tiktok', 'twitter', 'redes sociais'],
          'ru': ['скроллил', 'инстаграм', 'фейсбук', 'тикток', 'твиттер', 'соц сети']
        },
        contextPhrases: {
          'en': ['scrolled for hours', 'endless scrolling', 'social media binge', 'phone all day'],
          'nl': ['uren gescrold', 'eindeloos scrollen', 'sociale media binge', 'hele dag telefoon'],
          'de': ['stunden gescrollt', 'endlos gescrollt', 'soziale medien sucht'],
          'fr': ['scrollé heures', 'scroll infini', 'binge médias sociaux'],
          'es': ['navegado horas', 'scroll infinito', 'atracón redes sociales'],
          'it': ['scrollato ore', 'scroll infinito', 'binge social media'],
          'pt': ['rolei horas', 'scroll infinito', 'vício redes sociais'],
          'ru': ['скроллил часы', 'бесконечный скролл', 'зависание в соцсетях']
        }
      },
      gaming: {
        keywords: {
          'en': ['played games', 'gaming', 'xbox', 'playstation', 'computer games', 'video games', 'online gaming'],
          'nl': ['games gespeeld', 'gamen', 'xbox', 'playstation', 'computergames', 'videogames', 'online gamen'],
          'de': ['spiele gespielt', 'gaming', 'xbox', 'playstation', 'computerspiele', 'videospiele'],
          'fr': ['joué jeux', 'gaming', 'xbox', 'playstation', 'jeux ordinateur', 'jeux vidéo'],
          'es': ['jugado juegos', 'gaming', 'xbox', 'playstation', 'juegos ordenador', 'videojuegos'],
          'it': ['giocato giochi', 'gaming', 'xbox', 'playstation', 'giochi computer', 'videogame'],
          'pt': ['joguei jogos', 'gaming', 'xbox', 'playstation', 'jogos computador', 'videogame'],
          'ru': ['играл игры', 'гейминг', 'иксбокс', 'плейстейшн', 'компьютерные игры', 'видеоигры']
        },
        contextPhrases: {
          'en': ['gamed all night', 'gaming binge', 'played for hours', 'gaming relapse'],
          'nl': ['hele nacht gamed', 'gaming binge', 'uren gespeeld', 'game terugval'],
          'de': ['ganze nacht gespielt', 'gaming binge', 'stunden gespielt'],
          'fr': ['joué toute nuit', 'gaming binge', 'joué heures'],
          'es': ['jugado toda noche', 'gaming atracón', 'jugado horas'],
          'it': ['giocato tutta notte', 'gaming binge', 'giocato ore'],
          'pt': ['joguei toda noite', 'gaming vício', 'joguei horas'],
          'ru': ['играл всю ночь', 'игровой запой', 'играл часами']
        }
      },
      food: {
        keywords: {
          'en': ['overate', 'binge eating', 'fast food', 'junk food', 'emotional eating', 'food addiction'],
          'nl': ['teveel gegeten', 'binge eten', 'fastfood', 'junkfood', 'emotioneel eten', 'eetverslaving'],
          'de': ['zu viel gegessen', 'binge essen', 'fastfood', 'junkfood', 'emotional essen'],
          'fr': ['trop mangé', 'binge alimentaire', 'fastfood', 'junkfood', 'manger émotionnel'],
          'es': ['comido demasiado', 'atracón comida', 'comida rápida', 'comida basura', 'comer emocional'],
          'it': ['mangiato troppo', 'binge alimentare', 'fastfood', 'junkfood', 'mangiare emotivo'],
          'pt': ['comi demais', 'compulsão alimentar', 'fastfood', 'junkfood', 'comer emocional'],
          'ru': ['переел', 'пищевой запой', 'фастфуд', 'вредная еда', 'эмоциональное питание']
        },
        contextPhrases: {
          'en': ['ate too much', 'food binge', 'comfort eating', 'emotional eating episode'],
          'nl': ['te veel gegeten', 'eet binge', 'troost eten', 'emotioneel eet episode'],
          'de': ['zu viel gegessen', 'ess binge', 'trost essen'],
          'fr': ['trop mangé', 'binge alimentaire', 'manger réconfort'],
          'es': ['comido mucho', 'atracón comida', 'comer consuelo'],
          'it': ['mangiato molto', 'binge cibo', 'mangiare conforto'],
          'pt': ['comi muito', 'compulsão comer', 'comer consolação'],
          'ru': ['много ел', 'пищевой срыв', 'заедание стресса']
        }
      },
      caffeine: {
        keywords: {
          'en': ['coffee', 'caffeine', 'energy drinks', 'red bull', 'monster', 'espresso', 'latte', 'cappuccino', 'cola', 'tea'],
          'nl': ['koffie', 'cafeïne', 'energiedranken', 'red bull', 'monster', 'espresso', 'latte', 'cappuccino', 'cola', 'thee'],
          'de': ['kaffee', 'koffein', 'energydrinks', 'red bull', 'monster', 'espresso', 'latte', 'cappuccino', 'cola', 'tee'],
          'fr': ['café', 'caféine', 'boissons énergisantes', 'red bull', 'monster', 'espresso', 'latte', 'cappuccino', 'cola', 'thé'],
          'es': ['café', 'cafeína', 'bebidas energéticas', 'red bull', 'monster', 'espresso', 'latte', 'cappuccino', 'cola', 'té'],
          'it': ['caffè', 'caffeina', 'energy drink', 'red bull', 'monster', 'espresso', 'latte', 'cappuccino', 'cola', 'tè'],
          'pt': ['café', 'cafeína', 'energéticos', 'red bull', 'monster', 'espresso', 'latte', 'cappuccino', 'cola', 'chá'],
          'ru': ['кофе', 'кофеин', 'энергетики', 'ред булл', 'монстер', 'эспрессо', 'латте', 'капучино', 'кола', 'чай'],
          'ja': ['コーヒー', 'カフェイン', 'エナジードリンク', 'レッドブル', 'モンスター', 'エスプレッソ', 'ラテ', 'カプチーノ', 'コーラ', '茶'],
          'ko': ['커피', '카페인', '에너지드링크', '레드불', '몬스터', '에스프레소', '라테', '카푸치노', '콜라', '차'],
          'zh': ['咖啡', '咖啡因', '能量饮料', '红牛', '怪物', '意式浓缩', '拿铁', '卡布奇诺', '可乐', '茶'],
          'ar': ['قهوة', 'كافيين', 'مشروبات الطاقة', 'ريد بول', 'مونستر', 'إسبريسو', 'لاتيه', 'كابتشينو', 'كولا', 'شاي'],
          'hi': ['कॉफी', 'कैफीन', 'एनर्जी ड्रिंक', 'रेड बुल', 'मॉन्स्टर', 'एस्प्रेसो', 'लट्टे', 'कैप्पुचिनो', 'कोला', 'चाय']
        },
        contextPhrases: {
          'en': ['too much coffee', 'caffeine overdose', 'can\'t function without coffee', 'coffee addiction', 'multiple cups', 'caffeine crash'],
          'nl': ['te veel koffie', 'cafeïne overdosis', 'kan niet functioneren zonder koffie', 'koffie verslaving', 'meerdere kopjes', 'cafeïne crash'],
          'de': ['zu viel kaffee', 'koffein überdosis', 'kann nicht ohne kaffee funktionieren', 'kaffee sucht', 'mehrere tassen', 'koffein crash'],
          'fr': ['trop de café', 'overdose caféine', 'ne peux pas fonctionner sans café', 'addiction café', 'plusieurs tasses', 'crash caféine'],
          'es': ['demasiado café', 'sobredosis cafeína', 'no puedo funcionar sin café', 'adicción café', 'múltiples tazas', 'bajón cafeína'],
          'it': ['troppo caffè', 'overdose caffeina', 'non posso funzionare senza caffè', 'dipendenza caffè', 'multiple tazze', 'crash caffeina'],
          'pt': ['muito café', 'overdose cafeína', 'não consigo funcionar sem café', 'vício café', 'múltiplas xícaras', 'crash cafeína'],
          'ru': ['слишком много кофе', 'передозировка кофеина', 'не могу без кофе', 'кофейная зависимость', 'много чашек', 'кофейный краш'],
          'ja': ['コーヒー飲み過ぎ', 'カフェイン過剰摂取', 'コーヒーなしでは機能できない', 'コーヒー依存症', '何杯も', 'カフェインクラッシュ'],
          'ko': ['커피 너무 많이', '카페인 과다복용', '커피 없으면 안 됨', '커피 중독', '여러 잔', '카페인 크래시'],
          'zh': ['咖啡喝太多', '咖啡因过量', '没咖啡无法工作', '咖啡成瘾', '多杯', '咖啡因崩溃'],
          'ar': ['قهوة كثيرة جداً', 'جرعة زائدة كافيين', 'لا أستطيع العمل بدون قهوة', 'إدمان القهوة', 'عدة أكواب', 'انهيار الكافيين'],
          'hi': ['बहुत कॉफी', 'कैफीन ओवरडोज़', 'कॉफी के बिना काम नहीं कर सकता', 'कॉफी की लत', 'कई कप', 'कैफीन क्रैश']
        }
      },
      sugar: {
        keywords: {
          'en': ['sugar', 'candy', 'chocolate', 'sweets', 'dessert', 'cake', 'cookies', 'ice cream', 'donuts', 'soda'],
          'nl': ['suiker', 'snoep', 'chocolade', 'zoetigheden', 'dessert', 'taart', 'koekjes', 'ijs', 'donuts', 'frisdrank'],
          'de': ['zucker', 'süßigkeiten', 'schokolade', 'süßes', 'nachtisch', 'kuchen', 'kekse', 'eis', 'donuts', 'limonade'],
          'fr': ['sucre', 'bonbons', 'chocolat', 'sucreries', 'dessert', 'gâteau', 'biscuits', 'glace', 'donuts', 'soda'],
          'es': ['azúcar', 'dulces', 'chocolate', 'golosinas', 'postre', 'pastel', 'galletas', 'helado', 'rosquillas', 'refresco'],
          'it': ['zucchero', 'caramelle', 'cioccolato', 'dolci', 'dessert', 'torta', 'biscotti', 'gelato', 'ciambelle', 'bibita'],
          'pt': ['açúcar', 'doces', 'chocolate', 'guloseimas', 'sobremesa', 'bolo', 'biscoitos', 'sorvete', 'rosquinhas', 'refrigerante'],
          'ru': ['сахар', 'конфеты', 'шоколад', 'сладости', 'десерт', 'торт', 'печенье', 'мороженое', 'пончики', 'газировка'],
          'ja': ['砂糖', 'お菓子', 'チョコレート', 'スイーツ', 'デザート', 'ケーキ', 'クッキー', 'アイスクリーム', 'ドーナツ', 'ソーダ'],
          'ko': ['설탕', '사탕', '초콜릿', '단것', '디저트', '케이크', '쿠키', '아이스크림', '도넛', '탄산음료'],
          'zh': ['糖', '糖果', '巧克力', '甜食', '甜点', '蛋糕', '饼干', '冰淇淋', '甜甜圈', '汽水'],
          'ar': ['سكر', 'حلويات', 'شوكولاتة', 'حلوى', 'حلى', 'كعكة', 'بسكويت', 'آيس كريم', 'دونات', 'صودا'],
          'hi': ['चीनी', 'कैंडी', 'चॉकलेट', 'मिठाई', 'डेसर्ट', 'केक', 'कुकीज़', 'आइसक्रीम', 'डोनट्स', 'सोडा']
        },
        contextPhrases: {
          'en': ['sugar craving', 'ate too much sugar', 'sugar binge', 'couldn\'t resist sweets', 'sugar addiction', 'sugar rush'],
          'nl': ['suiker trek', 'te veel suiker gegeten', 'suiker binge', 'kon zoetigheden niet weerstaan', 'suiker verslaving', 'suiker rush'],
          'de': ['zucker verlangen', 'zu viel zucker gegessen', 'zucker binge', 'konnte süßem nicht widerstehen', 'zucker sucht', 'zucker rausch'],
          'fr': ['envie de sucre', 'trop de sucre mangé', 'binge sucre', 'n\'ai pas pu résister aux sucreries', 'addiction sucre', 'rush sucre'],
          'es': ['antojo azúcar', 'comido mucho azúcar', 'atracón azúcar', 'no pude resistir dulces', 'adicción azúcar', 'subidón azúcar'],
          'it': ['voglia zucchero', 'mangiato troppo zucchero', 'binge zucchero', 'non ho resistito ai dolci', 'dipendenza zucchero', 'rush zucchero'],
          'pt': ['vontade açúcar', 'comi muito açúcar', 'compulsão açúcar', 'não resisti aos doces', 'vício açúcar', 'rush açúcar'],
          'ru': ['тяга к сахару', 'съел много сахара', 'сахарный запой', 'не смог устоять перед сладким', 'сахарная зависимость', 'сахарный рывок'],
          'ja': ['砂糖への渇望', '砂糖摂り過ぎ', 'シュガーバイニング', '甘いものに抵抗できなかった', '砂糖依存症', 'シュガーラッシュ'],
          'ko': ['설탕 갈망', '설탕 너무 많이 먹음', '설탕 폭식', '단것을 참을 수 없었다', '설탕 중독', '슈가러시'],
          'zh': ['糖瘾发作', '吃太多糖', '糖分暴食', '无法抗拒甜食', '糖分成瘾', '糖分激增'],
          'ar': ['رغبة في السكر', 'أكلت سكر كثير', 'نهم السكر', 'لم أستطع مقاومة الحلويات', 'إدمان السكر', 'نشوة السكر'],
          'hi': ['चीनी की लालसा', 'बहुत चीनी खाई', 'शुगर बिंज', 'मिठाई का विरोध नहीं कर सका', 'चीनी की लत', 'शुगर रश']
        }
      },
      porn: {
        keywords: {
          'en': ['porn', 'pornography', 'adult content', 'explicit material', 'xxx', 'sexual content', 'adult videos', 'watched porn'],
          'nl': ['porno', 'pornografie', 'volwassen inhoud', 'expliciet materiaal', 'xxx', 'seksuele inhoud', 'volwassen video\'s', 'porno gekeken'],
          'de': ['porno', 'pornografie', 'erwachseneninhalt', 'explizites material', 'xxx', 'sexueller inhalt', 'erwachsenenvideos', 'porno geschaut'],
          'fr': ['porno', 'pornographie', 'contenu adulte', 'matériel explicite', 'xxx', 'contenu sexuel', 'vidéos adultes', 'regardé porno'],
          'es': ['porno', 'pornografía', 'contenido adulto', 'material explícito', 'xxx', 'contenido sexual', 'videos adultos', 'visto porno'],
          'it': ['porno', 'pornografia', 'contenuto adulto', 'materiale esplicito', 'xxx', 'contenuto sessuale', 'video adulti', 'guardato porno'],
          'pt': ['porno', 'pornografia', 'conteúdo adulto', 'material explícito', 'xxx', 'conteúdo sexual', 'vídeos adultos', 'assistiu porno'],
          'ru': ['порно', 'порнография', 'контент для взрослых', 'откровенный материал', 'xxx', 'сексуальный контент', 'видео для взрослых', 'смотрел порно'],
          'ja': ['ポルノ', 'ポルノグラフィー', 'アダルトコンテンツ', '露骨な素材', 'xxx', '性的コンテンツ', 'アダルトビデオ', 'ポルノ見た'],
          'ko': ['포르노', '포르노그래피', '성인 콘텐츠', '노골적 자료', 'xxx', '성적 콘텐츠', '성인 비디오', '포르노 봤다'],
          'zh': ['色情', '色情作品', '成人内容', '露骨材料', 'xxx', '性内容', '成人视频', '看色情'],
          'ar': ['إباحية', 'مواد إباحية', 'محتوى للبالغين', 'مواد صريحة', 'xxx', 'محتوى جنسي', 'فيديوهات للبالغين', 'شاهد إباحية'],
          'hi': ['पोर्न', 'अश्लीलता', 'वयस्क सामग्री', 'स्पष्ट सामग्री', 'xxx', 'यौन सामग्री', 'वयस्क वीडियो', 'पोर्न देखा']
        },
        contextPhrases: {
          'en': ['watched pornography', 'adult content relapse', 'couldn\'t resist porn', 'porn addiction relapse', 'explicit material'],
          'nl': ['pornografie gekeken', 'volwassen inhoud terugval', 'kon porno niet weerstaan', 'porno verslaving terugval', 'expliciet materiaal'],
          'de': ['pornografie geschaut', 'erwachseneninhalt rückfall', 'konnte porno nicht widerstehen', 'porno sucht rückfall', 'explizites material'],
          'fr': ['regardé pornographie', 'rechute contenu adulte', 'n\'ai pas pu résister porno', 'rechute addiction porno', 'matériel explicite'],
          'es': ['visto pornografía', 'recaída contenido adulto', 'no pude resistir porno', 'recaída adicción porno', 'material explícito'],
          'it': ['guardato pornografia', 'ricaduta contenuto adulto', 'non ho resistito porno', 'ricaduta dipendenza porno', 'materiale esplicito'],
          'pt': ['assistiu pornografia', 'recaída conteúdo adulto', 'não resisti porno', 'recaída vício porno', 'material explícito'],
          'ru': ['смотрел порнографию', 'рецидив контента для взрослых', 'не смог устоять перед порно', 'рецидив порно зависимости', 'откровенный материал'],
          'ja': ['ポルノ見た', 'アダルトコンテンツ再発', 'ポルノに抵抗できなかった', 'ポルノ依存症再発', '露骨な素材'],
          'ko': ['포르노 봤다', '성인 콘텐츠 재발', '포르노를 참을 수 없었다', '포르노 중독 재발', '노골적 자료'],
          'zh': ['看了色情', '成人内容复发', '无法抗拒色情', '色情成瘾复发', '露骨材料'],
          'ar': ['شاهد إباحية', 'انتكاس المحتوى للبالغين', 'لم أستطع مقاومة الإباحية', 'انتكاس إدمان الإباحية', 'مواد صريحة'],
          'hi': ['पोर्न देखा', 'वयस्क सामग्री रिलैप्स', 'पोर्न का विरोध नहीं कर सका', 'पोर्न एडिक्शन रिलैप्स', 'स्पष्ट सामग्री']
        }
      },
      sex: {
        keywords: {
          'en': ['sex addiction', 'sexual behavior', 'hookup', 'sexual urges', 'sexual compulsion', 'sexual acting out'],
          'nl': ['seks verslaving', 'seksueel gedrag', 'hookup', 'seksuele drang', 'seksuele dwang', 'seksueel uitageren'],
          'de': ['sex sucht', 'sexuelles verhalten', 'hookup', 'sexuelle triebe', 'sexueller zwang', 'sexuelles ausagieren'],
          'fr': ['addiction sexuelle', 'comportement sexuel', 'plan cul', 'pulsions sexuelles', 'compulsion sexuelle', 'passage à l\'acte sexuel'],
          'es': ['adicción sexual', 'comportamiento sexual', 'ligue', 'impulsos sexuales', 'compulsión sexual', 'actuación sexual'],
          'it': ['dipendenza sessuale', 'comportamento sessuale', 'avventura', 'impulsi sessuali', 'compulsione sessuale', 'acting out sessuale'],
          'pt': ['vício sexual', 'comportamento sexual', 'caso', 'impulsos sexuais', 'compulsão sexual', 'atuação sexual'],
          'ru': ['сексуальная зависимость', 'сексуальное поведение', 'случайная связь', 'сексуальные влечения', 'сексуальная компульсия', 'сексуальное отыгрывание'],
          'ja': ['性依存症', '性的行動', 'ワンナイトスタンド', '性的衝動', '性的強迫', '性的逸脱行為'],
          'ko': ['성중독', '성적 행동', '원나잇', '성적 충동', '성적 강박', '성적 일탈'],
          'zh': ['性瘾', '性行为', '一夜情', '性冲动', '性强迫', '性行为失控'],
          'ar': ['إدمان جنسي', 'سلوك جنسي', 'علاقة عابرة', 'دوافع جنسية', 'إجبار جنسي', 'تصرف جنسي'],
          'hi': ['यौन लत', 'यौन व्यवहार', 'हुकअप', 'यौन इच्छाएं', 'यौन बाध्यता', 'यौन अभिनय']
        },
        contextPhrases: {
          'en': ['sexual relapse', 'acting out sexually', 'compulsive sexual behavior', 'sexual addiction episode', 'inappropriate sexual contact'],
          'nl': ['seksuele terugval', 'seksueel uitageren', 'dwangmatig seksueel gedrag', 'seksuele verslaving episode', 'ongepast seksueel contact'],
          'de': ['sexueller rückfall', 'sexuell ausagieren', 'zwanghaftes sexuelles verhalten', 'sexuelle sucht episode', 'unangemessener sexueller kontakt'],
          'fr': ['rechute sexuelle', 'passage à l\'acte sexuel', 'comportement sexuel compulsif', 'épisode addiction sexuelle', 'contact sexuel inapproprié'],
          'es': ['recaída sexual', 'actuación sexual', 'comportamiento sexual compulsivo', 'episodio adicción sexual', 'contacto sexual inapropiado'],
          'it': ['ricaduta sessuale', 'acting out sessuale', 'comportamento sessuale compulsivo', 'episodio dipendenza sessuale', 'contatto sessuale inappropriato'],
          'pt': ['recaída sexual', 'atuação sexual', 'comportamento sexual compulsivo', 'episódio vício sexual', 'contato sexual inadequado'],
          'ru': ['сексуальный рецидив', 'сексуальное отыгрывание', 'компульсивное сексуальное поведение', 'эпизод сексуальной зависимости', 'неподобающий сексуальный контакт'],
          'ja': ['性的再発', '性的逸脱行為', '強迫的性行動', '性依存症エピソード', '不適切な性的接触'],
          'ko': ['성적 재발', '성적 일탈', '강박적 성행동', '성중독 에피소드', '부적절한 성적 접촉'],
          'zh': ['性行为复发', '性行为失控', '强迫性行为', '性瘾发作', '不当性接触'],
          'ar': ['انتكاس جنسي', 'تصرف جنسي', 'سلوك جنسي قهري', 'نوبة إدمان جنسي', 'اتصال جنسي غير مناسب'],
          'hi': ['यौन रिलैप्स', 'यौन अभिनय', 'बाध्यकारी यौन व्यवहार', 'यौन लत एपिसोड', 'अनुचित यौन संपर्क']
        }
      },
      work: {
        keywords: {
          'en': ['workaholic', 'overwork', 'work addiction', 'can\'t stop working', 'work obsession', 'burnout'],
          'nl': ['workaholic', 'overwerken', 'werk verslaving', 'kan niet stoppen met werken', 'werk obsessie', 'burn-out'],
          'de': ['workaholic', 'überarbeitung', 'arbeits sucht', 'kann nicht aufhören zu arbeiten', 'arbeits obsession', 'burnout'],
          'fr': ['workaholic', 'surmenage', 'addiction travail', 'ne peux pas arrêter travailler', 'obsession travail', 'burnout'],
          'es': ['workaholic', 'exceso trabajo', 'adicción trabajo', 'no puedo parar trabajar', 'obsesión trabajo', 'burnout'],
          'it': ['workaholic', 'superlavoro', 'dipendenza lavoro', 'non riesco smettere lavorare', 'ossessione lavoro', 'burnout'],
          'pt': ['workaholic', 'excesso trabalho', 'vício trabalho', 'não consigo parar trabalhar', 'obsessão trabalho', 'burnout'],
          'ru': ['трудоголик', 'переработка', 'трудовая зависимость', 'не могу перестать работать', 'одержимость работой', 'выгорание'],
          'ja': ['ワーカホリック', '過労', '仕事中毒', '働くのをやめられない', '仕事への執着', '燃え尽き症候群'],
          'ko': ['워커홀릭', '과로', '일 중독', '일을 멈출 수 없다', '일 강박', '번아웃'],
          'zh': ['工作狂', '过度工作', '工作成瘾', '停不下来工作', '工作强迫症', '职业倦怠'],
          'ar': ['مدمن عمل', 'إفراط عمل', 'إدمان العمل', 'لا أستطيع التوقف عن العمل', 'هوس العمل', 'احتراق وظيفي'],
          'hi': ['वर्कहॉलिक', 'अधिक काम', 'काम की लत', 'काम बंद नहीं कर सकता', 'काम का जुनून', 'बर्नआउट']
        },
        contextPhrases: {
          'en': ['worked too much', 'couldn\'t stop working', 'work addiction relapse', 'overworking again', 'work obsession episode'],
          'nl': ['te veel gewerkt', 'kon niet stoppen met werken', 'werk verslaving terugval', 'weer overwerken', 'werk obsessie episode'],
          'de': ['zu viel gearbeitet', 'konnte nicht aufhören zu arbeiten', 'arbeits sucht rückfall', 'wieder überarbeitung', 'arbeits obsession episode'],
          'fr': ['trop travaillé', 'n\'ai pas pu arrêter travailler', 'rechute addiction travail', 'surmenage encore', 'épisode obsession travail'],
          'es': ['trabajado demasiado', 'no pude parar trabajar', 'recaída adicción trabajo', 'exceso trabajo otra vez', 'episodio obsesión trabajo'],
          'it': ['lavorato troppo', 'non riuscivo smettere lavorare', 'ricaduta dipendenza lavoro', 'superlavoro ancora', 'episodio ossessione lavoro'],
          'pt': ['trabalhei demais', 'não consegui parar trabalhar', 'recaída vício trabalho', 'excesso trabalho novamente', 'episódio obsessão trabalho'],
          'ru': ['слишком много работал', 'не мог перестать работать', 'рецидив трудовой зависимости', 'снова переработка', 'эпизод одержимости работой'],
          'ja': ['働き過ぎた', '働くのをやめられなかった', '仕事中毒再発', 'また過労', '仕事への執着エピソード'],
          'ko': ['너무 많이 일했다', '일을 멈출 수 없었다', '일 중독 재발', '다시 과로', '일 강박 에피소드'],
          'zh': ['工作太多', '停不下来工作', '工作成瘾复发', '又过度工作', '工作强迫症发作'],
          'ar': ['عملت كثيراً', 'لم أستطع التوقف عن العمل', 'انتكاس إدمان العمل', 'إفراط عمل مرة أخرى', 'نوبة هوس العمل'],
          'hi': ['बहुत काम किया', 'काम बंद नहीं कर सका', 'काम की लत रिलैप्स', 'फिर से अधिक काम', 'काम के जुनून का एपिसोड']
        }
      },
      exercise: {
        keywords: {
          'en': ['exercise addiction', 'overtraining', 'compulsive exercise', 'gym addiction', 'workout obsession', 'fitness obsession'],
          'nl': ['sport verslaving', 'overtraining', 'dwangmatige sport', 'gym verslaving', 'workout obsessie', 'fitness obsessie'],
          'de': ['sport sucht', 'übertraining', 'zwanghafter sport', 'fitnessstudio sucht', 'workout obsession', 'fitness obsession'],
          'fr': ['addiction exercice', 'surentraînement', 'exercice compulsif', 'addiction gym', 'obsession entraînement', 'obsession fitness'],
          'es': ['adicción ejercicio', 'sobreentrenamiento', 'ejercicio compulsivo', 'adicción gym', 'obsesión entrenamiento', 'obsesión fitness'],
          'it': ['dipendenza esercizio', 'sovrallenamento', 'esercizio compulsivo', 'dipendenza palestra', 'ossessione allenamento', 'ossessione fitness'],
          'pt': ['vício exercício', 'overtraining', 'exercício compulsivo', 'vício academia', 'obsessão treino', 'obsessão fitness'],
          'ru': ['зависимость от упражнений', 'перетренированность', 'компульсивные упражнения', 'зависимость от спортзала', 'одержимость тренировками', 'одержимость фитнесом'],
          'ja': ['運動依存症', 'オーバートレーニング', '強迫的運動', 'ジム依存症', 'ワークアウト依存', 'フィットネス依存'],
          'ko': ['운동 중독', '과훈련', '강박적 운동', '헬스장 중독', '운동 강박', '피트니스 강박'],
          'zh': ['运动成瘾', '过度训练', '强迫性运动', '健身房成瘾', '锻炼强迫症', '健身强迫症'],
          'ar': ['إدمان التمارين', 'إفراط تدريب', 'تمارين قهرية', 'إدمان الجيم', 'هوس التدريب', 'هوس اللياقة'],
          'hi': ['व्यायाम की लत', 'अधिक प्रशिक्षण', 'बाध्यकारी व्यायाम', 'जिम की लत', 'वर्कआउट का जुनून', 'फिटनेस का जुनून']
        },
        contextPhrases: {
          'en': ['exercised excessively', 'couldn\'t skip workout', 'exercise addiction relapse', 'overtraining episode', 'compulsive gym session'],
          'nl': ['excessief gesport', 'kon training niet overslaan', 'sport verslaving terugval', 'overtraining episode', 'dwangmatige gym sessie'],
          'de': ['excessiv trainiert', 'konnte training nicht auslassen', 'sport sucht rückfall', 'übertraining episode', 'zwanghafte gym session'],
          'fr': ['exercice excessif', 'n\'ai pas pu rater entraînement', 'rechute addiction exercice', 'épisode surentraînement', 'séance gym compulsive'],
          'es': ['ejercicio excesivo', 'no pude faltar entrenamiento', 'recaída adicción ejercicio', 'episodio sobreentrenamiento', 'sesión gym compulsiva'],
          'it': ['esercizio eccessivo', 'non potevo saltare allenamento', 'ricaduta dipendenza esercizio', 'episodio sovrallenamento', 'sessione palestra compulsiva'],
          'pt': ['exercício excessivo', 'não pude pular treino', 'recaída vício exercício', 'episódio overtraining', 'sessão academia compulsiva'],
          'ru': ['чрезмерные упражнения', 'не мог пропустить тренировку', 'рецидив зависимости от упражнений', 'эпизод перетренированности', 'компульсивная тренировка'],
          'ja': ['過度な運動', 'ワークアウトをスキップできなかった', '運動依存症再発', 'オーバートレーニングエピソード', '強迫的ジムセッション'],
          'ko': ['과도한 운동', '운동을 빼먹을 수 없었다', '운동 중독 재발', '과훈련 에피소드', '강박적 헬스장 세션'],
          'zh': ['过度运动', '不能跳过锻炼', '运动成瘾复发', '过度训练发作', '强迫性健身房训练'],
          'ar': ['تمارين مفرطة', 'لم أستطع تفويت التمرين', 'انتكاس إدمان التمارين', 'نوبة إفراط تدريب', 'جلسة جيم قهرية'],
          'hi': ['अत्यधिक व्यायाम', 'वर्कआउट नहीं छोड़ सकता था', 'व्यायाम की लत रिलैप्स', 'अधिक प्रशिक्षण एपिसोड', 'बाध्यकारी जिम सेशन']
        }
      },
      phone: {
        keywords: {
          'en': ['phone addiction', 'smartphone', 'screen time', 'mobile addiction', 'can\'t put phone down', 'phone checking'],
          'nl': ['telefoon verslaving', 'smartphone', 'schermtijd', 'mobiele verslaving', 'kan telefoon niet wegleggen', 'telefoon checken'],
          'de': ['handy sucht', 'smartphone', 'bildschirmzeit', 'mobile sucht', 'kann handy nicht weglegen', 'handy checken'],
          'fr': ['addiction téléphone', 'smartphone', 'temps écran', 'addiction mobile', 'ne peux pas lâcher téléphone', 'vérifier téléphone'],
          'es': ['adicción teléfono', 'smartphone', 'tiempo pantalla', 'adicción móvil', 'no puedo soltar teléfono', 'revisar teléfono'],
          'it': ['dipendenza telefono', 'smartphone', 'tempo schermo', 'dipendenza mobile', 'non riesco lasciare telefono', 'controllare telefono'],
          'pt': ['vício telefone', 'smartphone', 'tempo tela', 'vício móvel', 'não consigo largar telefone', 'checar telefone'],
          'ru': ['зависимость от телефона', 'смартфон', 'экранное время', 'мобильная зависимость', 'не могу отложить телефон', 'проверка телефона'],
          'ja': ['スマホ依存症', 'スマートフォン', 'スクリーンタイム', 'モバイル依存症', 'スマホを手放せない', 'スマホチェック'],
          'ko': ['폰 중독', '스마트폰', '화면 시간', '모바일 중독', '폰을 내려놓을 수 없다', '폰 체크'],
          'zh': ['手机成瘾', '智能手机', '屏幕时间', '移动设备成瘾', '放不下手机', '检查手机'],
          'ar': ['إدمان الهاتف', 'هاتف ذكي', 'وقت الشاشة', 'إدمان الجوال', 'لا أستطيع ترك الهاتف', 'فحص الهاتف'],
          'hi': ['फोन की लत', 'स्मार्टफोन', 'स्क्रीन टाइम', 'मोबाइल लत', 'फोन नहीं छोड़ सकता', 'फोन चेकिंग']
        },
        contextPhrases: {
          'en': ['hours on phone', 'couldn\'t put phone down', 'phone addiction relapse', 'excessive screen time', 'compulsive phone checking'],
          'nl': ['uren op telefoon', 'kon telefoon niet wegleggen', 'telefoon verslaving terugval', 'excessieve schermtijd', 'dwangmatig telefoon checken'],
          'de': ['stunden am handy', 'konnte handy nicht weglegen', 'handy sucht rückfall', 'exzessive bildschirmzeit', 'zwanghaftes handy checken'],
          'fr': ['heures sur téléphone', 'n\'ai pas pu lâcher téléphone', 'rechute addiction téléphone', 'temps écran excessif', 'vérification téléphone compulsive'],
          'es': ['horas en teléfono', 'no pude soltar teléfono', 'recaída adicción teléfono', 'tiempo pantalla excesivo', 'revisión teléfono compulsiva'],
          'it': ['ore al telefono', 'non riuscivo lasciare telefono', 'ricaduta dipendenza telefono', 'tempo schermo eccessivo', 'controllo telefono compulsivo'],
          'pt': ['horas no telefone', 'não consegui largar telefone', 'recaída vício telefone', 'tempo tela excessivo', 'checagem telefone compulsiva'],
          'ru': ['часы в телефоне', 'не мог отложить телефон', 'рецидив зависимости от телефона', 'чрезмерное экранное время', 'компульсивная проверка телефона'],
          'ja': ['何時間もスマホ', 'スマホを手放せなかった', 'スマホ依存症再発', '過度なスクリーンタイム', '強迫的スマホチェック'],
          'ko': ['몇 시간 폰 사용', '폰을 내려놓을 수 없었다', '폰 중독 재발', '과도한 화면 시간', '강박적 폰 체크'],
          'zh': ['几小时玩手机', '放不下手机', '手机成瘾复发', '过度屏幕时间', '强迫性检查手机'],
          'ar': ['ساعات على الهاتف', 'لم أستطع ترك الهاتف', 'انتكاس إدمان الهاتف', 'وقت شاشة مفرط', 'فحص الهاتف القهري'],
          'hi': ['घंटों फोन पर', 'फोन नहीं छोड़ सका', 'फोन की लत रिलैप्स', 'अत्यधिक स्क्रीन टाइम', 'बाध्यकारी फोन चेकिंग']
        }
      },
      internet: {
        keywords: {
          'en': ['internet addiction', 'endless browsing', 'web surfing', 'online obsession', 'can\'t stop browsing', 'internet binge'],
          'nl': ['internet verslaving', 'eindeloos browsen', 'web surfen', 'online obsessie', 'kan niet stoppen browsen', 'internet binge'],
          'de': ['internet sucht', 'endloses browsen', 'web surfen', 'online obsession', 'kann nicht aufhören browsen', 'internet binge'],
          'fr': ['addiction internet', 'navigation infinie', 'surf web', 'obsession en ligne', 'ne peux pas arrêter naviguer', 'binge internet'],
          'es': ['adicción internet', 'navegación infinita', 'surf web', 'obsesión online', 'no puedo parar navegar', 'atracón internet'],
          'it': ['dipendenza internet', 'navigazione infinita', 'surf web', 'ossessione online', 'non riesco smettere navigare', 'binge internet'],
          'pt': ['vício internet', 'navegação infinita', 'surf web', 'obsessão online', 'não consigo parar navegar', 'compulsão internet'],
          'ru': ['интернет-зависимость', 'бесконечный браузинг', 'веб-серфинг', 'онлайн-одержимость', 'не могу перестать браузить', 'интернет-запой'],
          'ja': ['ネット依存症', '無限ブラウジング', 'ウェブサーフィン', 'オンライン依存', 'ブラウジングをやめられない', 'ネット依存'],
          'ko': ['인터넷 중독', '무한 브라우징', '웹 서핑', '온라인 강박', '브라우징을 멈출 수 없다', '인터넷 폭식'],
          'zh': ['网络成瘾', '无限浏览', '网上冲浪', '在线强迫症', '停不下来浏览', '网络暴食'],
          'ar': ['إدمان الإنترنت', 'تصفح لا نهائي', 'تصفح الويب', 'هوس أونلاين', 'لا أستطيع التوقف عن التصفح', 'نهم إنترنت'],
          'hi': ['इंटरनेट की लत', 'अंतहीन ब्राउज़िंग', 'वेब सर्फिंग', 'ऑनलाइन जुनून', 'ब्राउज़िंग बंद नहीं कर सकता', 'इंटरनेट बिंज']
        },
        contextPhrases: {
          'en': ['browsed for hours', 'internet addiction relapse', 'couldn\'t stop browsing', 'endless web surfing', 'online binge session'],
          'nl': ['uren gebrowst', 'internet verslaving terugval', 'kon niet stoppen browsen', 'eindeloos web surfen', 'online binge sessie'],
          'de': ['stunden gebrowst', 'internet sucht rückfall', 'konnte nicht aufhören browsen', 'endloses web surfen', 'online binge session'],
          'fr': ['navigué heures', 'rechute addiction internet', 'n\'ai pas pu arrêter naviguer', 'surf web sans fin', 'session binge en ligne'],
          'es': ['navegado horas', 'recaída adicción internet', 'no pude parar navegar', 'surf web infinito', 'sesión atracón online'],
          'it': ['navigato ore', 'ricaduta dipendenza internet', 'non riuscivo smettere navigare', 'surf web infinito', 'sessione binge online'],
          'pt': ['naveguei horas', 'recaída vício internet', 'não consegui parar navegar', 'surf web infinito', 'sessão compulsão online'],
          'ru': ['браузил часами', 'рецидив интернет-зависимости', 'не мог перестать браузить', 'бесконечный веб-серфинг', 'сеанс интернет-запоя'],
          'ja': ['何時間もブラウジング', 'ネット依存症再発', 'ブラウジングをやめられなかった', '無限ウェブサーフィン', 'オンライン依存セッション'],
          'ko': ['몇 시간 브라우징', '인터넷 중독 재발', '브라우징을 멈출 수 없었다', '무한 웹 서핑', '온라인 폭식 세션'],
          'zh': ['浏览了几个小时', '网络成瘾复发', '停不下来浏览', '无限网上冲浪', '在线暴食会话'],
          'ar': ['تصفحت ساعات', 'انتكاس إدمان الإنترنت', 'لم أستطع التوقف عن التصفح', 'تصفح ويب لا نهائي', 'جلسة نهم أونلاين'],
          'hi': ['घंटों ब्राउज़िंग', 'इंटरनेट की लत रिलैप्स', 'ब्राउज़िंग बंद नहीं कर सका', 'अनंत वेब सर्फिंग', 'ऑनलाइन बिंज सेशन']
        }
      },
      other: {
        keywords: {
          'en': ['addiction', 'compulsive behavior', 'can\'t stop', 'addicted to', 'relapse', 'craving', 'urge', 'compulsion'],
          'nl': ['verslaving', 'dwangmatig gedrag', 'kan niet stoppen', 'verslaafd aan', 'terugval', 'trek', 'drang', 'dwang'],
          'de': ['sucht', 'zwanghaftes verhalten', 'kann nicht aufhören', 'süchtig nach', 'rückfall', 'verlangen', 'drang', 'zwang'],
          'fr': ['addiction', 'comportement compulsif', 'ne peux pas arrêter', 'accro à', 'rechute', 'envie', 'pulsion', 'compulsion'],
          'es': ['adicción', 'comportamiento compulsivo', 'no puedo parar', 'adicto a', 'recaída', 'antojo', 'impulso', 'compulsión'],
          'it': ['dipendenza', 'comportamento compulsivo', 'non riesco smettere', 'dipendente da', 'ricaduta', 'voglia', 'impulso', 'compulsione'],
          'pt': ['vício', 'comportamento compulsivo', 'não consigo parar', 'viciado em', 'recaída', 'vontade', 'impulso', 'compulsão'],
          'ru': ['зависимость', 'компульсивное поведение', 'не могу остановиться', 'зависим от', 'рецидив', 'тяга', 'влечение', 'компульсия'],
          'ja': ['依存症', '強迫的行動', 'やめられない', '依存している', '再発', '渇望', '衝動', '強迫'],
          'ko': ['중독', '강박적 행동', '멈출 수 없다', '중독된', '재발', '갈망', '충동', '강박'],
          'zh': ['成瘾', '强迫行为', '停不下来', '上瘾了', '复发', '渴望', '冲动', '强迫'],
          'ar': ['إدمان', 'سلوك قهري', 'لا أستطيع التوقف', 'مدمن على', 'انتكاس', 'رغبة شديدة', 'دافع', 'إجبار'],
          'hi': ['लत', 'बाध्यकारी व्यवहार', 'रोक नहीं सकता', 'आदी', 'फिर से शुरुआत', 'लालसा', 'इच्छा', 'बाध्यता']
        },
        contextPhrases: {
          'en': ['addiction relapse', 'compulsive behavior episode', 'couldn\'t control urge', 'gave in to craving', 'lost control'],
          'nl': ['verslaving terugval', 'dwangmatig gedrag episode', 'kon drang niet controleren', 'bezweken voor trek', 'controle verloren'],
          'de': ['sucht rückfall', 'zwanghaftes verhalten episode', 'konnte drang nicht kontrollieren', 'dem verlangen nachgegeben', 'kontrolle verloren'],
          'fr': ['rechute addiction', 'épisode comportement compulsif', 'n\'ai pas pu contrôler pulsion', 'cédé à l\'envie', 'perdu contrôle'],
          'es': ['recaída adicción', 'episodio comportamiento compulsivo', 'no pude controlar impulso', 'cedí al antojo', 'perdí control'],
          'it': ['ricaduta dipendenza', 'episodio comportamento compulsivo', 'non riuscivo controllare impulso', 'ceduto alla voglia', 'perso controllo'],
          'pt': ['recaída vício', 'episódio comportamento compulsivo', 'não consegui controlar impulso', 'cedi à vontade', 'perdi controle'],
          'ru': ['рецидив зависимости', 'эпизод компульсивного поведения', 'не мог контролировать влечение', 'поддался тяге', 'потерял контроль'],
          'ja': ['依存症再発', '強迫的行動エピソード', '衝動をコントロールできなかった', '渇望に屈した', 'コントロールを失った'],
          'ko': ['중독 재발', '강박적 행동 에피소드', '충동을 통제할 수 없었다', '갈망에 굴복했다', '통제력을 잃었다'],
          'zh': ['成瘾复发', '强迫行为发作', '无法控制冲动', '屈服于渴望', '失去控制'],
          'ar': ['انتكاس الإدمان', 'نوبة سلوك قهري', 'لم أستطع السيطرة على الدافع', 'استسلمت للرغبة', 'فقدت السيطرة'],
          'hi': ['लत का रिलैप्स', 'बाध्यकारी व्यवहार एपिसोड', 'इच्छा को नियंत्रित नहीं कर सका', 'लालसा के आगे हार गया', 'नियंत्रण खो दिया']
        }
      }
    };
    
    // Check each addiction type
    for (const addiction of addictions) {
      const keywordSet = addictionKeywords[addiction.type];
      if (!keywordSet) continue;
      
      // Get user's preferred language for better keyword matching
      const User = require('../models/User');
      const user = await User.findById(journalEntry.userId);
      const preferredLanguage = user?.preferredLanguage || 'en';
      
      // Check keywords for user's preferred language first, then fallback to all languages
      const languageKeywords = keywordSet.keywords[preferredLanguage] || [];
      const languagePhrases = keywordSet.contextPhrases[preferredLanguage] || [];
      
      // Check for direct keywords in user's language
      let foundKeywords = languageKeywords.filter(keyword => content.includes(keyword));
      
      // Check for context phrases in user's language (stronger indicators)
      let foundPhrases = languagePhrases.filter(phrase => content.includes(phrase));
      
      // If nothing found in preferred language, check all languages
      if (foundKeywords.length === 0 && foundPhrases.length === 0) {
        for (const [lang, keywords] of Object.entries(keywordSet.keywords)) {
          if (lang !== preferredLanguage) {
            const langKeywords = keywords.filter(keyword => content.includes(keyword));
            foundKeywords = foundKeywords.concat(langKeywords);
          }
        }
        
        for (const [lang, phrases] of Object.entries(keywordSet.contextPhrases)) {
          if (lang !== preferredLanguage) {
            const langPhrases = phrases.filter(phrase => content.includes(phrase));
            foundPhrases = foundPhrases.concat(langPhrases);
          }
        }
      }
      
      if (foundKeywords.length > 0 || foundPhrases.length > 0) {
        const trigger = foundPhrases[0] || foundKeywords[0];
        const confidence = foundPhrases.length > 0 ? 0.8 : 0.7; // Higher confidence for phrases
        
        relapseIndicators.push({
          trigger: `Keyword detection: ${trigger}`,
          confidence: confidence,
          context: `Found in journal: "${content.substring(0, 200)}..."`,
          isActualRelapse: true,
          relatedAddiction: addiction.type,
          detectionMethod: 'keyword-based'
        });
        
        console.log(`🔍 Keyword match for ${addiction.type}: "${trigger}" (confidence: ${confidence})`);
      }
    }
    
    return relapseIndicators;
  } catch (error) {
    console.error('Error in keyword-based detection:', error);
    return [];
  }
};

// Handle automatic relapse detection and update addiction status
const handleAutomaticRelapseDetection = async (userId, relapseIndicators, journalEntry) => {
  try {
    const Addiction = require('../models/Addiction');
    
    for (const indicator of relapseIndicators) {
      if (indicator.relatedAddiction) {
        console.log(`🔄 Updating addiction status for ${indicator.relatedAddiction} - detected relapse`);
        
        // Find the user's addiction of this type (include clean status as it can relapse)
        const addiction = await Addiction.findOne({ 
          userId: userId, 
          type: indicator.relatedAddiction,
          status: { $in: ['recovering', 'active', 'clean'] }
        });
        
        if (addiction) {
          // Use the new method to record automatic relapse with journal entry date
          await addiction.recordAutomaticRelapse(indicator.trigger, journalEntry._id, journalEntry.date);
          
          console.log(`✅ Addiction ${indicator.relatedAddiction} status updated to relapsed via automatic detection (date: ${journalEntry.date?.toLocaleDateString('nl-NL') || 'today'})`);
          
          // TODO: Optionally send notification or trigger intervention
        } else {
          console.log(`⚠️  No active addiction found for type ${indicator.relatedAddiction}`);
        }
      }
    }
  } catch (error) {
    console.error('Error handling automatic relapse detection:', error);
  }
};

// Set up multer for file uploads
// Helper function to format transcribed text with proper line breaks
const formatTranscribedText = (text, language = 'nl') => {
  if (!text || typeof text !== 'string') return text;
  
  // Multilingual abbreviations that should NOT be split
  const abbreviationsByLanguage = {
    // Dutch
    'nl': ['bijv', 'etc', 'o.a', 'd.w.z', 'm.b.v', 'b.v', 'n.v', 'v.s', 'p.s', 
           'nr', 'tel', 'fax', 'e.d', 'a.u.b', 'z.o.z', 'v.v', 'o.v.v',
           'dr', 'drs', 'prof', 'ir', 'ing', 'mr', 'mw', 'dhr', 'mevr'],
    
    // English
    'en': ['etc', 'e.g', 'i.e', 'vs', 'p.s', 'a.m', 'p.m', 'st', 'nd', 'rd', 'th',
           'dr', 'prof', 'mr', 'mrs', 'ms', 'jr', 'sr', 'co', 'inc', 'ltd',
           'no', 'vol', 'pp', 'ch', 'fig', 'ref'],
    
    // German  
    'de': ['z.b', 'etc', 'd.h', 'u.a', 'bzw', 'ggf', 'evtl', 'ca', 'max', 'min',
           'dr', 'prof', 'hr', 'fr', 'gmbh', 'ag', 'kg', 'tel', 'fax',
           'nr', 'str', 'plz', 'brd', 'ddr', 'usa', 'eu'],
    
    // French
    'fr': ['etc', 'p.ex', 'c.à.d', 'cf', 'p.s', 'n.b', 'vs', 'av', 'apr',
           'dr', 'prof', 'm', 'mme', 'mlle', 'st', 'ste', 'cie', 's.a', 'sarl',
           'tel', 'fax', 'no', 'vol', 'ch', 'fig', 'ref'],
    
    // Spanish
    'es': ['etc', 'p.ej', 'es.decir', 'cf', 'p.d', 'vs', 'sr', 'sra', 'srta',
           'dr', 'prof', 'ing', 'lic', 'arq', 's.a', 's.l', 'tel', 'fax',
           'no', 'vol', 'cap', 'fig', 'ref', 'pág', 'ej'],
    
    // Italian  
    'it': ['etc', 'ad.es', 'cioè', 'cf', 'p.s', 'vs', 'sig', 'sig.ra', 'sig.na',
           'dr', 'prof', 'ing', 'arch', 'avv', 's.p.a', 's.r.l', 'tel', 'fax',
           'no', 'vol', 'cap', 'fig', 'rif', 'pag'],
    
    // Portuguese
    'pt': ['etc', 'p.ex', 'ou.seja', 'cf', 'p.s', 'vs', 'sr', 'sra', 'srta',
           'dr', 'prof', 'eng', 'arq', 'adv', 's.a', 'ltda', 'tel', 'fax',
           'no', 'vol', 'cap', 'fig', 'ref', 'pág'],
    
    // Russian (using Latin transliteration for speech recognition)
    'ru': ['etc', 'i.t.d', 'i.t.p', 'vs', 'dr', 'prof', 'g', 'tel', 'fax',
           'no', 'str', 'dom', 'kv', 'ooo', 'zao', 'oao'],
    
    // Chinese (using pinyin for speech recognition)
    'zh': ['etc', 'deng.deng', 'ji.qi', 'vs', 'dr', 'prof', 'xian.sheng', 'nu.shi',
           'tel', 'fax', 'no', 'ye', 'zhang'],
    
    // Japanese (using romaji for speech recognition)
    'ja': ['etc', 'nado', 'mata.wa', 'vs', 'dr', 'prof', 'san', 'kun', 'chan',
           'tel', 'fax', 'no', 'kai.sha', 'yu.gen'],
    
    // Korean (using romanization for speech recognition)
    'ko': ['etc', 'deung.deung', 'ttoneun', 'vs', 'dr', 'prof', 'ssi', 'nim',
           'tel', 'fax', 'no', 'hoe.sa', 'yu.han'],
    
    // Arabic (using transliteration for speech recognition)
    'ar': ['etc', 'wa.ghair.ha', 'ay', 'vs', 'dr', 'prof', 'ustaz', 'sayyid',
           'tel', 'fax', 'no', 'shar.ka', 'mu.as.sa.sa'],
    
    // Hindi (using transliteration for speech recognition)
    'hi': ['etc', 'aadi', 'ya', 'vs', 'dr', 'prof', 'ji', 'sahib', 'madam',
           'tel', 'fax', 'no', 'ltd', 'pvt']
  };
  
  // Get abbreviations for the specified language (fallback to Dutch)
  const abbreviations = abbreviationsByLanguage[language] || abbreviationsByLanguage['nl'];
  
  let formatted = text;
  
  // Simple approach: replace '. ' with '.\n' but avoid abbreviations
  // First, protect abbreviations by temporarily replacing them
  const protectedAbbrevs = [];
  abbreviations.forEach((abbr, index) => {
    const placeholder = `__ABBREV_${index}__`;
    const regex = new RegExp(`\\b${abbr.replace(/\./g, '\\.')}\\. `, 'gi');
    formatted = formatted.replace(regex, (match) => {
      protectedAbbrevs.push({placeholder, original: match});
      return placeholder;
    });
  });
  
  // Now replace '. ' with '.\n'
  formatted = formatted.replace(/\.\s+/g, '.\n');
  
  // Restore protected abbreviations
  protectedAbbrevs.forEach(({placeholder, original}) => {
    formatted = formatted.replace(placeholder, original);
  });
  
  // Handle time notations and numbers (restore incorrectly split decimals)
  formatted = formatted.replace(/(\d+)\.\n(\d+)/g, '$1.$2');
  
  // Clean up whitespace but preserve newlines
  formatted = formatted.replace(/[ \t]+/g, ' ').trim();
  formatted = formatted.replace(/\n\s+/g, '\n').replace(/\s+\n/g, '\n');
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  return formatted;
};

const upload = multer({
  dest: path.join(__dirname, '../../temp/'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (Google Speech-to-Text sync max)
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files supported by Google Speech-to-Text
    const allowedMimes = [
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/x-m4a',
      'audio/mp3',
      'audio/flac'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log('Rejected file type:', file.mimetype);
      cb(new Error('Invalid audio format. Supported formats: WebM, MP4, WAV, MP3, OGG, FLAC'), false);
    }
  }
});

// Get today's journal entry for user
router.get('/user/today', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log('Fetching today\'s journal entry for user:', userId);
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    const todayEntry = await JournalEntry.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).populate('userId', 'username');
    
    console.log('Today\'s entry found:', !!todayEntry);
    
    res.json({
      success: true,
      entry: todayEntry,
      hasEntry: !!todayEntry
    });
  } catch (error) {
    console.error('Error fetching today\'s journal entry:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch today\'s journal entry' });
  }
});

// Get user's journal entries
router.get('/user/entries', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, mood, tags, startDate, endDate, searchText } = req.query;
    
    console.log('Fetching journal entries for user:', userId);
    
    // Build filter query
    let filter = { userId };
    
    if (mood && mood !== 'all') {
      filter.mood = mood;
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }
    
    if (searchText && searchText.trim()) {
      // Add text search
      filter.$text = { $search: searchText.trim() };
    }
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    console.log('Filter:', filter);
    
    // Build query
    let query = JournalEntry.find(filter);
    
    // If text search is used, include text score for relevance
    if (searchText && searchText.trim()) {
      query = query.select({ score: { $meta: 'textScore' } });
      // Sort by text relevance score first, then by date
      query = query.sort({ score: { $meta: 'textScore' }, date: -1, createdAt: -1 });
    } else {
      // Regular sort by date
      query = query.sort({ date: -1, createdAt: -1 });
    }
    
    const entries = await query
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'username');
    
    const total = await JournalEntry.countDocuments(filter);
    
    console.log('Found entries:', entries.length);
    
    res.json({
      success: true,
      entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch journal entries' });
  }
});

// Create new journal entry or update existing daily entry
router.post('/create', auth, async (req, res) => {
  try {
    const { title, content, mood, tags, date } = req.body;
    const userId = req.user._id;
    
    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and content are required' 
      });
    }
    
    // Check for nonsense text before processing
    try {
      console.log('🔍 Checking content for nonsense text:', content.substring(0, 50) + '...');
      const aiService = require('../services/aiCoachService');
      const nonsenseCheck = await aiService.checkNonsenseOnly(content);
      if (nonsenseCheck.isNonsense) {
        console.log('❌ Nonsense text detected, rejecting journal entry:', nonsenseCheck.reason);
        return res.status(400).json({
          success: false,
          error: 'De tekst bevat onzin of betekenisloze inhoud en kan niet worden opgeslagen.',
          isNonsense: true,
          reason: nonsenseCheck.reason
        });
      }
      console.log('✅ Content passed nonsense check');
    } catch (error) {
      console.error('Error checking for nonsense text:', error);
      // Continue without blocking if nonsense check fails
    }
    
    const entryDate = date ? new Date(date) : new Date();
    // Normalize to start of day for consistent comparison
    const normalizedDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    
    console.log('Creating/updating journal entry for date:', normalizedDate);
    
    // Analyze mood from content using AI
    const aiCoachService = require('../services/aiCoachService');
    let detectedMood = null;
    
    try {
      console.log('Analyzing mood from journal content...');
      detectedMood = await aiCoachService.analyzeMoodFromText(content, userId);
      console.log('Detected mood:', detectedMood);
    } catch (error) {
      console.error('Error analyzing mood:', error);
      // Continue without mood analysis if it fails
    }
    
    // Check if entry already exists for this date
    const existingEntry = await JournalEntry.findOne({
      userId,
      date: {
        $gte: normalizedDate,
        $lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    if (existingEntry) {
      console.log('Found existing entry for date, updating it');
      
      // Check for nonsense text before appending to existing entry
      try {
        console.log('🔍 Checking new content for nonsense text before appending:', content.substring(0, 50) + '...');
        const aiService = require('../services/aiCoachService');
        const nonsenseCheck = await aiService.checkNonsenseOnly(content);
        if (nonsenseCheck.isNonsense) {
          console.log('❌ Nonsense text detected in append, rejecting:', nonsenseCheck.reason);
          return res.status(400).json({
            success: false,
            error: 'De tekst bevat onzin of betekenisloze inhoud en kan niet worden opgeslagen.',
            isNonsense: true,
            reason: nonsenseCheck.reason
          });
        }
        console.log('✅ Content passed nonsense check for append');
      } catch (error) {
        console.error('Error checking for nonsense text in append:', error);
        // Continue without blocking if nonsense check fails
      }
      
      // Update existing entry - append content
      existingEntry.content = existingEntry.content + '\n\n' + content.trim();
      
      // Use AI-detected mood or fallback to user-provided mood
      if (detectedMood && detectedMood.primaryMood) {
        existingEntry.mood = detectedMood.primaryMood;
        existingEntry.moodScore = detectedMood.moodScore;
        existingEntry.moodAnalysis = {
          aiGenerated: true,
          confidence: detectedMood.confidence,
          emotionalIndicators: detectedMood.emotionalIndicators,
          overallSentiment: detectedMood.overallSentiment,
          description: detectedMood.moodDescription,
          detectedMoods: detectedMood.detectedMoods || [],
          moodCount: detectedMood.moodCount || 1,
          emotionalIntensity: detectedMood.emotionalIntensity || 3,
          emotionalTransition: detectedMood.emotionalTransition || 'stable',
          suggestedFocus: detectedMood.suggestedFocus || null
        };
      } else if (mood && typeof mood === 'string' && mood.trim()) {
        existingEntry.mood = mood.trim();
        existingEntry.moodAnalysis = { aiGenerated: false };
      }
      
      // Merge tags if provided
      if (tags && Array.isArray(tags) && tags.length > 0) {
        const newTags = tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
        const existingTags = existingEntry.tags || [];
        // Combine and deduplicate tags
        existingEntry.tags = [...new Set([...existingTags, ...newTags])];
      }
      
      await existingEntry.save();
      await existingEntry.populate('userId', 'username');
      
      // Trigger AI Coach analysis for updated entry
      triggerAICoachAnalysis(existingEntry);
      
      res.json({
        success: true,
        entry: existingEntry,
        message: 'Journal entry updated successfully',
        wasUpdated: true,
        detectedMood: detectedMood
      });
    } else {
      // Create new entry
      const entryData = {
        userId,
        title: title.trim(),
        content: content.trim(),
        date: normalizedDate
      };

      // Use AI-detected mood or fallback to user-provided mood
      if (detectedMood && detectedMood.primaryMood) {
        entryData.mood = detectedMood.primaryMood;
        entryData.moodScore = detectedMood.moodScore;
        entryData.moodAnalysis = {
          aiGenerated: true,
          confidence: detectedMood.confidence,
          emotionalIndicators: detectedMood.emotionalIndicators,
          overallSentiment: detectedMood.overallSentiment,
          description: detectedMood.moodDescription,
          detectedMoods: detectedMood.detectedMoods || [],
          moodCount: detectedMood.moodCount || 1,
          emotionalIntensity: detectedMood.emotionalIntensity || 3,
          emotionalTransition: detectedMood.emotionalTransition || 'stable',
          suggestedFocus: detectedMood.suggestedFocus || null
        };
      } else if (mood && typeof mood === 'string' && mood.trim()) {
        entryData.mood = mood.trim();
        entryData.moodAnalysis = { aiGenerated: false };
      }

      // Only add tags if they exist
      if (tags && Array.isArray(tags) && tags.length > 0) {
        entryData.tags = tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
      }

      const newEntry = new JournalEntry(entryData);
      
      await newEntry.save();
      await newEntry.populate('userId', 'username');
      
      // Trigger AI Coach analysis for new entry
      triggerAICoachAnalysis(newEntry);
      
      res.json({
        success: true,
        entry: newEntry,
        message: 'Journal entry created successfully',
        wasUpdated: false,
        detectedMood: detectedMood
      });
    }
  } catch (error) {
    console.error('Error creating/updating journal entry:', error);
    res.status(500).json({ success: false, error: 'Failed to create journal entry' });
  }
});

// Update journal entry
router.put('/:entryId', auth, async (req, res) => {
  try {
    const { entryId } = req.params;
    const { title, content, mood, tags } = req.body;
    const userId = req.user._id;
    
    console.log('Updating journal entry:', {
      entryId,
      userId,
      title,
      content: content?.substring(0, 50) + '...',
      mood,
      tags
    });
    
    const entry = await JournalEntry.findById(entryId);
    if (!entry) {
      console.log('Entry not found:', entryId);
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }
    
    // Check if user owns this entry
    if (entry.userId.toString() !== userId) {
      console.log('Unauthorized update attempt:', {
        entryUserId: entry.userId.toString(),
        requestUserId: userId
      });
      return res.status(403).json({ success: false, error: 'Not authorized to update this entry' });
    }
    
    console.log('Before update:', {
      title: entry.title,
      content: entry.content.substring(0, 50) + '...',
      mood: entry.mood,
      tags: entry.tags
    });
    
    // Check for nonsense text before updating content
    if (content !== undefined) {
      try {
        console.log('🔍 Checking updated content for nonsense text:', content.substring(0, 50) + '...');
        const aiCoachService = require('../services/aiCoachService');
        const nonsenseCheck = await aiCoachService.checkNonsenseOnly(content);
        console.log('🔍 Nonsense check result for update:', nonsenseCheck);
        if (nonsenseCheck.isNonsense) {
          console.log('❌ Nonsense text detected in update, rejecting:', nonsenseCheck.reason);
          return res.status(400).json({
            success: false,
            error: 'De tekst bevat onzin of betekenisloze inhoud en kan niet worden opgeslagen.',
            isNonsense: true,
            reason: nonsenseCheck.reason
          });
        }
        console.log('✅ Updated content passed nonsense check');
      } catch (error) {
        console.error('❌ Error checking updated content for nonsense text:', error);
        // Don't continue silently - this might be why updates aren't being blocked
        console.log('⚠️ Nonsense check failed, but continuing with update due to error');
      }
    }

    // Update fields
    if (title !== undefined) entry.title = title.trim();
    if (content !== undefined) {
      entry.content = content.trim();
      
      // Re-analyze mood when content changes
      try {
        console.log('Re-analyzing mood after content update...');
        const aiCoachService = require('../services/aiCoachService');
        const detectedMood = await aiCoachService.analyzeMoodFromText(entry.content, userId);
        
        if (detectedMood && detectedMood.primaryMood) {
          entry.mood = detectedMood.primaryMood;
          entry.moodScore = detectedMood.moodScore;
          entry.moodAnalysis = {
            aiGenerated: true,
            confidence: detectedMood.confidence,
            emotionalIndicators: detectedMood.emotionalIndicators,
            overallSentiment: detectedMood.overallSentiment,
            description: detectedMood.moodDescription,
            detectedMoods: detectedMood.detectedMoods || [],
            moodCount: detectedMood.moodCount || 1
          };
          console.log('Updated mood after content change:', detectedMood.primaryMood);
        }
      } catch (error) {
        console.error('Error re-analyzing mood:', error);
      }
    }
    
    // Handle manual mood override if provided
    if (mood !== undefined) {
      if (mood && typeof mood === 'string' && mood.trim()) {
        entry.mood = mood.trim();
        entry.moodAnalysis = { aiGenerated: false }; // Mark as manually set
      } else {
        entry.mood = undefined; // Remove mood if empty/null
        entry.moodAnalysis = undefined;
      }
    }
    
    // Handle tags update
    if (tags !== undefined) {
      if (Array.isArray(tags) && tags.length > 0) {
        entry.tags = tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else {
        entry.tags = []; // Empty array if no tags
      }
    }
    
    await entry.save();
    await entry.populate('userId', 'username');
    
    console.log('After update:', {
      title: entry.title,
      content: entry.content.substring(0, 50) + '...',
      mood: entry.mood,
      tags: entry.tags
    });
    
    res.json({
      success: true,
      entry,
      message: 'Journal entry updated successfully'
    });
  } catch (error) {
    console.error('Error updating journal entry:', error);
    res.status(500).json({ success: false, error: 'Failed to update journal entry' });
  }
});

// Delete journal entry
router.delete('/:entryId', auth, async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user._id;
    
    const entry = await JournalEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }
    
    // Check if user owns this entry
    if (entry.userId.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this entry' });
    }
    
    // Delete audio file if it exists
    if (entry.audioFile && entry.audioFile.filename) {
      const audioPath = path.join(journalsDir, entry.audioFile.filename);
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    }
    
    await JournalEntry.findByIdAndDelete(entryId);
    
    res.json({
      success: true,
      message: 'Journal entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    res.status(500).json({ success: false, error: 'Failed to delete journal entry' });
  }
});

// Generate audio for journal entry using Eleven Labs
router.post('/:entryId/generate-audio', auth, async (req, res) => {
  try {
    const { entryId } = req.params;
    const { voiceId = 'EXAVITQu4vr4xnSDxMaL' } = req.body;
    const userId = req.user._id;
    
    console.log('Generate audio request received:', { entryId, userId, voiceId });
    
    // Check user credits
    const user = await User.findById(userId);
    console.log('User found:', user ? `${user.username} with ${user.credits} credits` : 'null');
    if (!user || user.credits < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient credits. You need 1 credit to generate audio.' 
      });
    }
    
    const entry = await JournalEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }
    
    // Check if user owns this entry
    if (entry.userId.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to generate audio for this entry' });
    }
    
    // Create journal entry text for TTS
    const journalText = `${entry.title}. ${entry.content}`;
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `journal_${timestamp}_${entryId.slice(-8)}.mp3`;
    const outputPath = path.join(journalsDir, filename);
    
    try {
      // Call Eleven Labs API
      const elevenLabsResponse = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text: journalText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.65,
            similarity_boost: 0.2,
            style: 0.2,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVEN_LABS_API_KEY
          },
          responseType: 'stream'
        }
      );

      // Save the audio file
      const writeStream = fs.createWriteStream(outputPath);
      elevenLabsResponse.data.pipe(writeStream);
      
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      // Get audio duration (approximate based on text length)
      const estimatedDuration = Math.max(30, Math.floor(journalText.length / 10));
      
      // Update journal entry with audio info
      entry.audioFile = {
        filename,
        duration: estimatedDuration,
        language: 'nl',
        voiceId
      };
      await entry.save();
      
      // Deduct credit from user
      await user.spendCredits(1, 'generation', `Journal voice generation for "${entry.title}"`, entryId);
      
      res.json({
        success: true,
        entry,
        audioFile: entry.audioFile,
        message: 'Journal audio generated successfully'
      });
    } catch (ttsError) {
      console.error('Eleven Labs TTS generation error:', ttsError);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate audio. Please check your Eleven Labs API key and try again.' 
      });
    }
  } catch (error) {
    console.error('Error generating journal audio:', error);
    res.status(500).json({ success: false, error: 'Failed to generate journal audio' });
  }
});

// Share journal entry publicly
router.post('/:entryId/share', auth, async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user._id;
    
    const entry = await JournalEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }
    
    // Check if user owns this entry
    if (entry.userId.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to share this entry' });
    }
    
    // Update sharing status
    entry.isShared = true;
    entry.privacy = 'public';
    entry.sharedAt = new Date();
    
    await entry.save();
    await entry.populate('userId', 'username');
    
    res.json({
      success: true,
      entry,
      message: 'Journal entry shared successfully'
    });
  } catch (error) {
    console.error('Error sharing journal entry:', error);
    res.status(500).json({ success: false, error: 'Failed to share journal entry' });
  }
});

// Get shared journal entries (community)
router.get('/shared', async (req, res) => {
  try {
    const { page = 1, limit = 20, mood, tags, language } = req.query;
    
    // Build filter for shared entries
    let filter = { isShared: true, privacy: 'public' };
    
    if (mood && mood !== 'all') {
      filter.mood = mood;
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }
    
    if (language && language !== 'all') {
      filter['audioFile.language'] = language;
    }
    
    const entries = await JournalEntry.find(filter)
      .sort({ sharedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'username')
      .select('-content'); // Don't expose full content in shared view initially
    
    const total = await JournalEntry.countDocuments(filter);
    
    res.json({
      success: true,
      entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching shared journal entries:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch shared journal entries' });
  }
});

// Get full shared journal entry (for reading)
router.get('/shared/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;
    
    const entry = await JournalEntry.findById(entryId)
      .populate('userId', 'username');
    
    if (!entry || !entry.isShared || entry.privacy !== 'public') {
      return res.status(404).json({ success: false, error: 'Shared journal entry not found' });
    }
    
    res.json({
      success: true,
      entry
    });
  } catch (error) {
    console.error('Error fetching shared journal entry:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch shared journal entry' });
  }
});

// Like/unlike journal entry
router.post('/:entryId/like', auth, async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user._id;
    
    const entry = await JournalEntry.findById(entryId);
    if (!entry || !entry.isShared) {
      return res.status(404).json({ success: false, error: 'Shared journal entry not found' });
    }
    
    const result = await entry.toggleLike(userId);
    
    res.json({
      success: true,
      isLiked: result.isLiked,
      likeCount: result.likeCount
    });
  } catch (error) {
    console.error('Error liking journal entry:', error);
    res.status(500).json({ success: false, error: 'Failed to like journal entry' });
  }
});

// Get journal statistics for user
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const totalEntries = await JournalEntry.countDocuments({ userId });
    const sharedEntries = await JournalEntry.countDocuments({ userId, isShared: true });
    const entriesWithAudio = await JournalEntry.countDocuments({ 
      userId, 
      'audioFile.filename': { $exists: true } 
    });
    
    // Get mood distribution
    const moodStats = await JournalEntry.aggregate([
      { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
      { $group: { _id: '$mood', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEntries = await JournalEntry.countDocuments({
      userId,
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    res.json({
      success: true,
      stats: {
        totalEntries,
        sharedEntries,
        entriesWithAudio,
        recentEntries,
        moodStats
      }
    });
  } catch (error) {
    console.error('Error fetching journal stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch journal statistics' });
  }
});

// Transcribe audio to text using Google Speech-to-Text
router.post('/transcribe', auth, upload.single('audio'), async (req, res) => {
  try {
    const { language = 'nl-NL' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    console.log('Transcribing audio file with Google Speech-to-Text:', req.file.path);
    console.log('File details:', {
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname
    });

    // Check file size (max 10MB for Google Speech-to-Text sync)
    if (req.file.size > 10 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Audio file too large. Maximum size is 10MB.' });
    }

    // Check if file exists and has content
    if (!fs.existsSync(req.file.path) || fs.statSync(req.file.path).size === 0) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, error: 'Invalid or empty audio file' });
    }

    // Initialize Google Speech client
    const speech = require('@google-cloud/speech');
    let client;
    
    // Use API key if available, otherwise use default credentials
    if (process.env.GOOGLE_CLOUD_API_KEY) {
      client = new speech.SpeechClient({
        apiKey: process.env.GOOGLE_CLOUD_API_KEY
      });
    } else {
      client = new speech.SpeechClient();
    }

    // Read the audio file
    const audioBytes = fs.readFileSync(req.file.path).toString('base64');

    // Configure the request
    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: 'WEBM_OPUS', // Default for WebM files
        sampleRateHertz: 48000,
        languageCode: language,
        enableAutomaticPunctuation: true,
        model: 'latest_long', // Better for longer audio
      },
    };

    // Handle different audio formats
    if (req.file.mimetype) {
      if (req.file.mimetype.includes('wav')) {
        request.config.encoding = 'LINEAR16';
        request.config.sampleRateHertz = 44100;
      } else if (req.file.mimetype.includes('mp3') || req.file.mimetype.includes('mpeg')) {
        request.config.encoding = 'MP3';
      } else if (req.file.mimetype.includes('mp4')) {
        request.config.encoding = 'MP3';
      } else if (req.file.mimetype.includes('ogg')) {
        request.config.encoding = 'OGG_OPUS';
      }
    }

    console.log('Calling Google Speech-to-Text API with config:', {
      encoding: request.config.encoding,
      sampleRateHertz: request.config.sampleRateHertz,
      languageCode: request.config.languageCode
    });

    // Perform the speech recognition request
    const [response] = await client.recognize(request);
    
    // Clean up temporary file
    fs.unlinkSync(req.file.path);

    console.log('Google Speech-to-Text response received:', {
      hasResults: !!response.results && response.results.length > 0
    });

    if (response.results && response.results.length > 0) {
      // Combine all transcriptions
      let transcription = '';
      response.results.forEach(result => {
        if (result.alternatives && result.alternatives[0]) {
          transcription += result.alternatives[0].transcript + ' ';
        }
      });

      transcription = transcription.trim();
      
      if (transcription) {
        // Convert Google Speech language code to UI language code
        const uiLanguage = language.split('-')[0]; // e.g., 'nl-NL' -> 'nl', 'en-US' -> 'en'
        
        // Apply text formatting to add line breaks after sentences
        const formattedTranscription = formatTranscribedText(transcription, uiLanguage);
        
        // Log language used for debugging (can be removed in production)
        console.log('Speech-to-text formatted for language:', uiLanguage);
        
        res.json({
          success: true,
          transcription: formattedTranscription
        });
      } else {
        res.status(400).json({ success: false, error: 'No speech detected in audio' });
      }
    } else {
      res.status(400).json({ success: false, error: 'No speech detected in audio' });
    }

  } catch (error) {
    console.error('Error transcribing audio with Google Speech-to-Text:', error);
    
    // Clean up temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    let errorMessage = 'Failed to transcribe audio';
    
    if (error.code === 'UNAUTHENTICATED') {
      errorMessage = 'Google Cloud API key not configured or invalid';
    } else if (error.code === 'INVALID_ARGUMENT') {
      errorMessage = 'Invalid audio format or configuration';
    } else if (error.code === 'RESOURCE_EXHAUSTED') {
      errorMessage = 'Google Speech-to-Text quota exceeded';
    } else if (error.message?.includes('not found')) {
      errorMessage = 'Google Speech-to-Text service not available';
    }
    
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Voice Cloning Endpoints

// Upload voice sample for cloning
router.post('/voice-clone/upload', auth, upload.single('audio'), async (req, res) => {
  try {
    const { voiceName } = req.body;
    const userId = req.user._id;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No voice file provided' });
    }
    
    if (!voiceName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Voice name is required' 
      });
    }
    
    // Check user credits (voice cloning costs 2 credits)
    const user = await User.findById(userId);
    if (!user || user.credits < 2) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient credits. Voice cloning costs 2 credits.' 
      });
    }
    
    console.log('Uploading voice sample to ElevenLabs for cloning:', req.file.path);
    console.log('Voice file details:', {
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname
    });
    console.log('Using ElevenLabs API key:', process.env.ELEVEN_API_KEY ? 'Present' : 'Missing');
    
    try {
      // Create FormData for ElevenLabs API
      const formData = new FormData();
      formData.append('name', voiceName.trim());
      formData.append('files', fs.createReadStream(req.file.path), {
        filename: req.file.originalname || 'voice_sample.mp3',
        contentType: req.file.mimetype || 'audio/mpeg'
      });
      formData.append('description', `Custom voice for ${user.username}`);
      
      // Call ElevenLabs Voice Cloning API
      const cloneResponse = await axios.post(
        'https://api.elevenlabs.io/v1/voices/add',
        formData,
        {
          headers: {
            'Accept': 'application/json',
            'xi-api-key': process.env.ELEVEN_LABS_API_KEY,
            ...formData.getHeaders()
          },
          timeout: 60000 // 60 second timeout for voice cloning
        }
      );
      
      const voiceId = cloneResponse.data.voice_id;
      
      if (!voiceId) {
        throw new Error('No voice ID returned from ElevenLabs');
      }
      
      // Save voice to user's custom voices
      await user.addCustomVoice(voiceId, voiceName);
      console.log(`Voice ${voiceId} added to user ${user.username}'s custom voices`);
      
      // Deduct credits
      await user.spendCredits(2, 'generation', `Voice cloning: "${voiceName}"`, voiceId);
      
      // Clean up temporary file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.json({
        success: true,
        voiceId: voiceId,
        voiceName: voiceName,
        message: 'Voice cloned successfully'
      });
      
    } catch (elevenLabsError) {
      console.error('ElevenLabs voice cloning error:', elevenLabsError);
      
      // Clean up temporary file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      let errorMessage = 'Failed to clone voice. Please try again.';
      
      if (elevenLabsError.response?.status === 422) {
        errorMessage = 'Voice sample quality is insufficient. Please record a clearer sample.';
      } else if (elevenLabsError.response?.status === 429) {
        errorMessage = 'ElevenLabs API rate limit exceeded. Please try again later.';
      } else if (elevenLabsError.code === 'ECONNABORTED') {
        errorMessage = 'Voice cloning timed out. Please try with a shorter audio sample.';
      }
      
      res.status(500).json({ 
        success: false, 
        error: errorMessage
      });
    }
    
  } catch (error) {
    console.error('Error in voice cloning upload:', error);
    
    // Clean up temporary file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ success: false, error: 'Failed to process voice cloning request' });
  }
});

// Get user's custom voices
router.get('/voice-clone/list', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const customVoices = user.getCustomVoices();
    console.log(`Found ${customVoices.length} custom voices for user ${user.username}:`, customVoices);
    
    res.json({
      success: true,
      voices: customVoices
    });
    
  } catch (error) {
    console.error('Error fetching custom voices:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch custom voices' });
  }
});

// Delete custom voice
router.delete('/voice-clone/:voiceId', auth, async (req, res) => {
  try {
    const { voiceId } = req.params;
    const userId = req.user._id;
    
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Check if user owns this voice
    const voiceExists = user.customVoices.find(voice => voice.voiceId === voiceId);
    if (!voiceExists) {
      return res.status(404).json({ success: false, error: 'Voice not found' });
    }
    
    try {
      // Delete voice from ElevenLabs
      await axios.delete(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
        headers: {
          'xi-api-key': process.env.ELEVEN_API_KEY
        }
      });
    } catch (elevenLabsError) {
      console.warn('Failed to delete voice from ElevenLabs (continuing anyway):', elevenLabsError.message);
      // Continue with local deletion even if ElevenLabs deletion fails
    }
    
    // Remove voice from user's custom voices
    await user.removeCustomVoice(voiceId);
    
    res.json({
      success: true,
      message: 'Custom voice deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting custom voice:', error);
    res.status(500).json({ success: false, error: 'Failed to delete custom voice' });
  }
});

module.exports = router;