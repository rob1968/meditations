const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const SharedMeditation = require('../models/SharedMeditation');

// Load environment variables
require('dotenv').config();

// Multilingual notification texts (same as in community.js)
const getNotificationTexts = (language, type, meditationType) => {
  const texts = {
    en: {
      approved: {
        title: '✅ Meditation Approved!',
        message: `Your ${meditationType} meditation has been approved and is now live in the community.`
      },
      rejected: {
        title: '❌ Meditation Rejected',
        message: `Your ${meditationType} meditation was not approved for the community.`
      }
    },
    nl: {
      approved: {
        title: '✅ Meditatie Goedgekeurd!',
        message: `Je ${meditationType} meditatie is goedgekeurd en is nu beschikbaar in de community.`
      },
      rejected: {
        title: '❌ Meditatie Afgewezen',
        message: `Je ${meditationType} meditatie is niet goedgekeurd voor de community.`
      }
    },
    de: {
      approved: {
        title: '✅ Meditation Genehmigt!',
        message: `Deine ${meditationType} Meditation wurde genehmigt und ist jetzt in der Community verfügbar.`
      },
      rejected: {
        title: '❌ Meditation Abgelehnt',
        message: `Deine ${meditationType} Meditation wurde nicht für die Community genehmigt.`
      }
    },
    fr: {
      approved: {
        title: '✅ Méditation Approuvée!',
        message: `Votre méditation ${meditationType} a été approuvée et est maintenant disponible dans la communauté.`
      },
      rejected: {
        title: '❌ Méditation Rejetée',
        message: `Votre méditation ${meditationType} n'a pas été approuvée pour la communauté.`
      }
    },
    es: {
      approved: {
        title: '✅ Meditación Aprobada!',
        message: `Tu meditación de ${meditationType} ha sido aprobada y ya está disponible en la comunidad.`
      },
      rejected: {
        title: '❌ Meditación Rechazada',
        message: `Tu meditación de ${meditationType} no fue aprobada para la comunidad.`
      }
    },
    it: {
      approved: {
        title: '✅ Meditazione Approvata!',
        message: `La tua meditazione ${meditationType} è stata approvata ed è ora disponibile nella community.`
      },
      rejected: {
        title: '❌ Meditazione Rifiutata',
        message: `La tua meditazione ${meditationType} non è stata approvata per la community.`
      }
    },
    pt: {
      approved: {
        title: '✅ Meditação Aprovada!',
        message: `Sua meditação ${meditationType} foi aprovada e agora está disponível na comunidade.`
      },
      rejected: {
        title: '❌ Meditação Rejeitada',
        message: `Sua meditação ${meditationType} não foi aprovada para a comunidade.`
      }
    },
    ru: {
      approved: {
        title: '✅ Медитация Одобрена!',
        message: `Ваша медитация ${meditationType} одобрена и теперь доступна в сообществе.`
      },
      rejected: {
        title: '❌ Медитация Отклонена',
        message: `Ваша медитация ${meditationType} не была одобрена для сообщества.`
      }
    },
    zh: {
      approved: {
        title: '✅ 冥想已批准！',
        message: `您的${meditationType}冥想已获批准，现已在社区中上线。`
      },
      rejected: {
        title: '❌ 冥想被拒绝',
        message: `您的${meditationType}冥想未获得社区批准。`
      }
    },
    ja: {
      approved: {
        title: '✅ 瞑想が承認されました！',
        message: `あなたの${meditationType}瞑想が承認され、コミュニティで公開されました。`
      },
      rejected: {
        title: '❌ 瞑想が拒否されました',
        message: `あなたの${meditationType}瞑想はコミュニティで承認されませんでした。`
      }
    },
    ko: {
      approved: {
        title: '✅ 명상 승인됨！',
        message: `당신의 ${meditationType} 명상이 승인되어 커뮤니티에 공개되었습니다.`
      },
      rejected: {
        title: '❌ 명상 거부됨',
        message: `당신의 ${meditationType} 명상이 커뮤니티에서 승인되지 않았습니다.`
      }
    },
    hi: {
      approved: {
        title: '✅ ध्यान स्वीकृत!',
        message: `आपका ${meditationType} ध्यान स्वीकृत हो गया है और अब समुदाय में उपलब्ध है।`
      },
      rejected: {
        title: '❌ ध्यान अस्वीकृत',
        message: `आपका ${meditationType} ध्यान समुदाय के लिए स्वीकृत नहीं हुआ।`
      }
    },
    ar: {
      approved: {
        title: '✅ تمت الموافقة على التأمل!',
        message: `تمت الموافقة على تأمل ${meditationType} الخاص بك وهو الآن متاح في المجتمع.`
      },
      rejected: {
        title: '❌ تم رفض التأمل',
        message: `لم تتم الموافقة على تأمل ${meditationType} الخاص بك للمجتمع.`
      }
    }
  };
  
  return texts[language] ? texts[language][type] : texts.en[type];
};

async function fixNotificationTexts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all notifications with hardcoded English texts
    const englishTitles = [
      '✅ Meditation Approved!',
      '❌ Meditation Rejected'
    ];

    const notifications = await Notification.find({
      title: { $in: englishTitles }
    });

    console.log(`Found ${notifications.length} notifications to update`);

    for (const notification of notifications) {
      try {
        // Get user's language preference
        const user = await User.findById(notification.userId);
        const userLanguage = user?.preferredLanguage || 'en';
        
        // Determine notification type
        const isApproved = notification.title.includes('Approved');
        const type = isApproved ? 'approved' : 'rejected';
        
        // Get meditation type from meditation reference or default
        let meditationType = 'meditation';
        if (notification.meditationId) {
          try {
            const meditation = await SharedMeditation.findById(notification.meditationId);
            meditationType = meditation?.meditationType || 'meditation';
          } catch (error) {
            console.log(`Could not find meditation ${notification.meditationId}, using default type`);
          }
        }
        
        // Get translated texts
        const translatedTexts = getNotificationTexts(userLanguage, type, meditationType);
        
        // Update notification
        notification.title = translatedTexts.title;
        notification.message = translatedTexts.message;
        
        await notification.save();
        console.log(`Updated notification ${notification._id} for user ${notification.userId} (${userLanguage})`);
      } catch (error) {
        console.error(`Error updating notification ${notification._id}:`, error);
      }
    }

    console.log('Finished updating notifications');
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixNotificationTexts();