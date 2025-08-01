import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './i18n';
import './styles/globals.css';
import './styles/wizard.css';
import Auth from './components/Auth';
import BottomNavigation from './components/BottomNavigation';
import MyAudio from './components/MyAudio';
import ProfileContainer from './components/ProfileContainer';
import CommunityHub from './components/CommunityHub';
import AdminDashboard from './components/AdminDashboard';
import Inbox from './components/Inbox';
import Journal from './components/Journal';
import JournalHub from './components/JournalHub';
import PageHeader from './components/PageHeader';
import VoiceSlider from './components/VoiceSlider';
import MeditationTypeSlider from './components/MeditationTypeSlider';
import BackgroundSlider from './components/BackgroundSlider';
import WizardContainer from './components/WizardContainer';
import ReviewStep from './components/ReviewStep';
import { getFullUrl, getAssetUrl, API_ENDPOINTS } from './config/api';
import { isPiBrowser } from './utils/piDetection';
import piAuthService from './services/piAuth';

const App = () => {
  const [text, setText] = useState("");
  const [meditationType, setMeditationType] = useState("sleep");
  const [background, setBackground] = useState("ocean");
  const [voiceId, setVoiceId] = useState("EXAVITQu4vr4xnSDxMaL");
  const [useBackgroundMusic, setUseBackgroundMusic] = useState(false);
  const [customBackgroundFile, setCustomBackgroundFile] = useState(null);
  const [customBackgroundName, setCustomBackgroundName] = useState('');
  const [customBackgroundDescription, setCustomBackgroundDescription] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [savedCustomBackgrounds, setSavedCustomBackgrounds] = useState([]);
  const [backgroundsLoading, setBackgroundsLoading] = useState(true);
  const [showSavedBackgrounds, setShowSavedBackgrounds] = useState(false);
  const [voices, setVoices] = useState([]);
  const [speechTempo, setSpeechTempo] = useState(1.00); // Default meditation tempo
  const [genderFilter, setGenderFilter] = useState('all'); // Gender filter state
  const [audioUrl, setAudioUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [error, setError] = useState("");
  
  // Dropdown states
  const [languageOpen, setLanguageOpen] = useState(false);
  
  const { t, i18n } = useTranslation();
  
  // Use UI language only for audio generation
  const [generatedText, setGeneratedText] = useState('');
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [showBackgroundOptions, setShowBackgroundOptions] = useState(false);
  const [audioFiles, setAudioFiles] = useState([]);
  const [generationProgress, setGenerationProgress] = useState([]);
  
  // User authentication state
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('create');
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileSection, setProfileSection] = useState('profile');
  const [isPiEnvironment, setIsPiEnvironment] = useState(false);
  const [piAuthInitialized, setPiAuthInitialized] = useState(false);
  
  // Credits state
  const [userCredits, setUserCredits] = useState(null);
  const [elevenlabsCredits, setElevenlabsCredits] = useState(null);
  
  // Draft and text editing state
  const [originalGeneratedText, setOriginalGeneratedText] = useState('');
  const [isTextModified, setIsTextModified] = useState(false);
  const [currentMeditationId, setCurrentMeditationId] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaveMessage, setDraftSaveMessage] = useState('');
  
  // Wizard state management
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    meditationType: 'sleep',
    text: '',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    background: 'ocean',
    useBackgroundMusic: true,
    speechTempo: 1.00,
    genderFilter: 'all'
  });
  
  // User saved meditations
  const [userMeditations, setUserMeditations] = useState([]);
  const [showSavedMeditations, setShowSavedMeditations] = useState(false);
  
  // Saved texts integration in main textbox
  const [savedTexts, setSavedTexts] = useState([]);
  const [currentSavedIndex, setCurrentSavedIndex] = useState(0);
  const [showingSavedTexts, setShowingSavedTexts] = useState(false);
  
  // Background audio cleanup ref
  const backgroundSliderRef = useRef(null);

  // Auto-load appropriate text when wizard meditation type changes
  useEffect(() => {
    if (user && wizardData.meditationType && userMeditations.length > 0) {
      const filteredSavedTexts = userMeditations
        .filter(m => m.meditationType === wizardData.meditationType && m.language === i18n.language)
        .sort((a, b) => {
          const aIsModified = a.isModified || (a.updatedAt && a.createdAt && a.updatedAt !== a.createdAt);
          const bIsModified = b.isModified || (b.updatedAt && b.createdAt && b.updatedAt !== b.createdAt);
          if (aIsModified !== bIsModified) {
            return bIsModified - aIsModified;
          }
          const aDate = new Date(a.updatedAt || a.createdAt);
          const bDate = new Date(b.updatedAt || b.createdAt);
          return bDate - aDate;
        });
      
      if (filteredSavedTexts.length > 0) {
        const firstSavedText = filteredSavedTexts[0];
        updateWizardData('text', firstSavedText.text);
      } else {
        // Clear text if no saved texts for this type
        updateWizardData('text', '');
      }
    } else if (!user) {
      // Clear text for non-logged in users
      updateWizardData('text', '');
    }
  }, [wizardData.meditationType, userMeditations, user, i18n.language]);

  // Global function to stop all background audio
  const stopAllBackgroundAudio = () => {
    console.log('stopAllBackgroundAudio called');
    
    // Method 1: Try using the ref if available
    if (backgroundSliderRef.current && backgroundSliderRef.current.stopBackgroundSound) {
      console.log('Calling stopBackgroundSound via ref');
      backgroundSliderRef.current.stopBackgroundSound();
    } else {
      console.log('backgroundSliderRef not available, trying alternative method');
    }
    
    // Method 2: Force stop all audio elements (backup method)
    try {
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        if (!audio.paused) {
          console.log('Force stopping audio element:', audio);
          audio.pause();
        }
      });
    } catch (error) {
      console.error('Error stopping audio elements:', error);
    }
  };

  // Tab change handler that stops background audio
  const handleTabChange = (newTab) => {
    stopAllBackgroundAudio();
    setActiveTab(newTab);
  };

  // Background music toggle handler that stops audio first
  const handleBackgroundMusicToggle = (checked) => {
    if (!checked) {
      // If turning off background music, stop any playing audio
      stopAllBackgroundAudio();
    }
    setUseBackgroundMusic(checked);
  };

  const generateAIMeditationText = async (type, currentLanguage) => {
    try {
      const response = await axios.post(getFullUrl(API_ENDPOINTS.GENERATE_TEXT), {
        type,
        language: currentLanguage
      });
      
      return response.data.text;
    } catch (error) {
      console.error('Error calling meditation text API:', error);
      // Fallback to a simple default text if API is completely unavailable
      return t('fallbackMeditationText', 'Take a deep breath and relax. Focus on your breathing and let go of any tension. You are at peace and in control.');
    }
  };

  const generateTextPreview = async () => {
    console.log('Starting text generation...');
    setIsGeneratingText(true);
    setError('');
    try {
      // Add a small delay to ensure spinner is visible (templates are very fast)
      await new Promise(resolve => setTimeout(resolve, 500));
      const generated = await generateAIMeditationText(meditationType, i18n.language);
      setGeneratedText(generated);
      setText(generated);
      setOriginalGeneratedText(generated);
      setIsTextModified(false);
      setError('');
    } catch (error) {
      console.error('Error generating text preview:', error);
      setError(error.response?.data?.error || 'Failed to generate meditation text. Please check your Claude API configuration.');
      setText('');
      setGeneratedText('');
    } finally {
      console.log('Text generation finished');
      setIsGeneratingText(false);
    }
  };

  const selectMeditationType = (type) => {
    setMeditationType(type);
    // Reset saved texts mode when changing meditation type
    setShowingSavedTexts(false);
    setSavedTexts([]);
    setCurrentSavedIndex(0);
  };
  
  const saveDraft = async () => {
    setIsSavingDraft(true);
    setDraftSaveMessage('');
    
    try {
      const response = await axios.post(getFullUrl('/api/user-meditations/save'), {
        userId: user?.id,
        meditationId: currentMeditationId,
        text: text,
        language: i18n.language,
        meditationType: meditationType,
        isModified: isTextModified // Send whether this is user-modified text
      });
      
      if (response.data.success) {
        setCurrentMeditationId(response.data.meditationId);
        setDraftSaveMessage(t('draftSaved'));
        setOriginalGeneratedText(text); // Update original to mark as saved
        setIsTextModified(false);
        
        // Reload user meditations
        await loadUserMeditations();
        
        // Clear message after 3 seconds
        setTimeout(() => {
          setDraftSaveMessage('');
        }, 3000);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      setError(t('errorSavingDraft', 'Error saving draft'));
    } finally {
      setIsSavingDraft(false);
    }
  };
  
  const regenerateText = async () => {
    setShowingSavedTexts(false); // Switch back to generated text mode
    setShowTextPreview(true);
    await generateTextPreview();
  };
  
  const clearText = () => {
    updateWizardData('text', '');
    setText("");
    setGeneratedText("");
    setOriginalGeneratedText("");
    setIsTextModified(false);
  };

  // Word count function
  const countWords = (text) => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };

  // Validate text length
  const validateTextLength = (text) => {
    const wordCount = countWords(text);
    if (wordCount < 50) return { valid: false, message: t('textTooShort', 'Tekst te kort (minimaal 50 woorden)') };
    if (wordCount > 10000) return { valid: false, message: t('textTooLong', 'Tekst te lang (maximaal 10.000 woorden)') };
    return { valid: true, wordCount };
  };
  
  // Auto-load appropriate text: saved texts first, then empty text as fallback
  const autoLoadAppropriateText = async (savedMeditations = userMeditations) => {
    if (!user?.id) {
      // No user logged in, show empty text with placeholder
      setText("");
      setGeneratedText("");
      setOriginalGeneratedText("");
      setIsTextModified(false);
      setShowTextPreview(false);
      setShowingSavedTexts(false);
      return;
    }
    
    // Check if there are saved texts for current type and language
    const filteredSavedTexts = savedMeditations
      .filter(m => m.meditationType === meditationType && m.language === i18n.language)
      .sort((a, b) => {
        const aIsModified = a.isModified || (a.updatedAt && a.createdAt && a.updatedAt !== a.createdAt);
        const bIsModified = b.isModified || (b.updatedAt && b.createdAt && b.updatedAt !== b.createdAt);
        if (aIsModified !== bIsModified) {
          return bIsModified - aIsModified;
        }
        const aDate = new Date(a.updatedAt || a.createdAt);
        const bDate = new Date(b.updatedAt || b.createdAt);
        return bDate - aDate;
      });
    
    if (filteredSavedTexts.length > 0) {
      // Found saved texts - load them automatically
      setSavedTexts(filteredSavedTexts);
      setCurrentSavedIndex(0);
      setShowingSavedTexts(true);
      setShowSavedMeditations(false);
      
      // Load first saved text
      const firstSavedText = filteredSavedTexts[0];
      setText(firstSavedText.text);
      setGeneratedText(firstSavedText.text);
      setOriginalGeneratedText(firstSavedText.text);
      setIsTextModified(false);
      setCurrentMeditationId(firstSavedText.id);
      setShowTextPreview(true);
    } else {
      // No saved texts found - show empty text with placeholder
      setText("");
      setGeneratedText("");
      setOriginalGeneratedText("");
      setIsTextModified(false);
      setShowTextPreview(false);
      setShowingSavedTexts(false);
    }
  };

  // Wizard navigation functions
  const nextStep = () => {
    stopAllBackgroundAudio(); // Stop any playing background audio
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    stopAllBackgroundAudio(); // Stop any playing background audio
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step) => {
    stopAllBackgroundAudio(); // Stop any playing background audio
    if (step >= 1 && step <= 5) {
      setCurrentStep(step);
    }
  };

  const updateWizardData = (key, value) => {
    setWizardData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const isStepValid = (step) => {
    switch (step) {
      case 1:
        return wizardData.meditationType !== '';
      case 2:
        return wizardData.text.trim() !== '' && validateTextLength(wizardData.text).valid;
      case 3:
        return wizardData.voiceId !== '';
      case 4:
        return !wizardData.useBackgroundMusic || wizardData.background !== '';
      case 5:
        return true; // Review step is always valid
      default:
        return false;
    }
  };

  // Render wizard step content
  const renderWizardStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <MeditationTypeSlider 
            selectedType={wizardData.meditationType}
            onTypeSelect={(type) => updateWizardData('meditationType', type)}
          />
        );
      
      case 2:
        return (
          <div className="text-step">
            <div className="text-actions">
              <button
                onClick={async () => {
                  console.log('Starting wizard text generation...');
                  setIsGeneratingText(true);
                  setError('');
                  try {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const generated = await generateAIMeditationText(wizardData.meditationType, i18n.language);
                    updateWizardData('text', generated);
                    setError('');
                  } catch (error) {
                    console.error('Error generating wizard text:', error);
                    setError(error.response?.data?.error || 'Failed to generate meditation text. Please check your Claude API configuration.');
                  } finally {
                    setIsGeneratingText(false);
                  }
                }}
                className="generate-text-btn"
                disabled={isGeneratingText}
              >
                {isGeneratingText ? t('generating', 'Genereren...') : `🔄 ${t('regenerate', 'Voorbeeld tekst')}`}
              </button>
              <button
                onClick={clearText}
                className="clear-text-btn"
                disabled={isGeneratingText || !wizardData.text.trim()}
              >
                🗑️ {t('clearText', 'Leeg maken')}
              </button>
            </div>
            
            <div className="text-input-section">
              <textarea
                value={wizardData.text}
                onChange={(e) => updateWizardData('text', e.target.value)}
                placeholder={t('textPlaceholder', 'Type hier je meditatie tekst in om een audio van te maken')}
                className="meditation-text-input"
                rows={10}
              />
              <div className="text-validation">
                {(() => {
                  const validation = validateTextLength(wizardData.text);
                  const wordCount = countWords(wizardData.text);
                  
                  if (wordCount === 0) {
                    return (
                      <div className="word-count-info">
                        <span className="word-count-hint">
                          {t('wordCountMin', 'Minimaal 50 woorden vereist')}
                        </span>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="word-count-info">
                      <span className={`word-count ${validation.valid ? 'valid' : 'invalid'}`}>
                        {t('wordCount', '{{count}} woorden', { count: wordCount })}
                      </span>
                      {!validation.valid && (
                        <span className="validation-error">
                          - {validation.message}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <VoiceSlider
            voices={voices}
            selectedVoiceId={wizardData.voiceId}
            onVoiceSelect={(voiceId) => updateWizardData('voiceId', voiceId)}
            voiceProvider="elevenlabs"
            currentMeditationType={wizardData.meditationType}
            speechTempo={wizardData.speechTempo}
            onTempoChange={(tempo) => updateWizardData('speechTempo', tempo)}
            isGeneratingAudio={isLoading}
            genderFilter={wizardData.genderFilter}
            onGenderFilterChange={(filter) => updateWizardData('genderFilter', filter)}
          />
        );
      
      case 4:
        return (
          <div className="background-step">
            <div className="background-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={wizardData.useBackgroundMusic}
                  onChange={(e) => updateWizardData('useBackgroundMusic', e.target.checked)}
                />
                <span>{t('useBackgroundMusic', 'Achtergrondmuziek gebruiken')}</span>
              </label>
            </div>
            
            {wizardData.useBackgroundMusic && (
              <BackgroundSlider
                ref={backgroundSliderRef}
                selectedBackground={wizardData.background}
                onBackgroundSelect={(bg) => updateWizardData('background', bg)}
                meditationType={wizardData.meditationType}
                customBackground={customBackgroundFile}
                customBackgroundFile={customBackgroundFile}
                savedCustomBackgrounds={savedCustomBackgrounds}
                backgroundsLoading={backgroundsLoading}
                onCustomBackgroundUpload={handleCustomBackgroundUpload}
                onStopAllAudio={stopAllBackgroundAudio}
              />
            )}
          </div>
        );
      
      case 5:
        return (
          <ReviewStep
            key={`review-${JSON.stringify(wizardData)}`}
            wizardData={wizardData}
            voices={voices}
            savedCustomBackgrounds={savedCustomBackgrounds}
          />
        );
      
      default:
        return null;
    }
  };

  // Wizard handlers
  const handleWizardSave = async () => {
    // Save current wizard data as draft
    try {
      setIsSavingDraft(true);
      // Use existing saveDraft functionality but with wizard data
      const response = await axios.post(getFullUrl('/api/user-meditations/save'), {
        text: wizardData.text,
        meditationType: wizardData.meditationType,
        language: i18n.language,
        userId: user.id,
        isModified: true
      });
      
      setDraftSaveMessage(t('draftSaved', 'Draft saved'));
      setTimeout(() => setDraftSaveMessage(''), 2000);
    } catch (error) {
      console.error('Error saving wizard draft:', error);
      setDraftSaveMessage(t('errorSavingDraft', 'Error saving draft'));
      setTimeout(() => setDraftSaveMessage(''), 3000);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleWizardGenerate = async () => {
    // Copy wizard data to main state and generate
    setText(wizardData.text);
    setMeditationType(wizardData.meditationType);
    setVoiceId(wizardData.voiceId);
    setBackground(wizardData.background);
    setUseBackgroundMusic(wizardData.useBackgroundMusic);
    setSpeechTempo(wizardData.speechTempo);
    setGenderFilter(wizardData.genderFilter);
    
    // Generate audio using existing function
    await generateAudio();
  };
  
  // Load saved texts into main textbox
  const loadSavedTextsIntoTextbox = () => {
    const filteredSavedTexts = userMeditations
      .filter(m => m.meditationType === meditationType && m.language === i18n.language)
      .sort((a, b) => {
        // Same sorting logic as before
        const aIsModified = a.isModified || (a.updatedAt && a.createdAt && a.updatedAt !== a.createdAt);
        const bIsModified = b.isModified || (b.updatedAt && b.createdAt && b.updatedAt !== b.createdAt);
        if (aIsModified !== bIsModified) {
          return bIsModified - aIsModified;
        }
        const aDate = new Date(a.updatedAt || a.createdAt);
        const bDate = new Date(b.updatedAt || b.createdAt);
        return bDate - aDate;
      });
    
    if (filteredSavedTexts.length === 0) return;
    
    setSavedTexts(filteredSavedTexts);
    setCurrentSavedIndex(0);
    setShowingSavedTexts(true);
    setShowSavedMeditations(false);
    
    // Load first saved text
    const firstSavedText = filteredSavedTexts[0];
    setText(firstSavedText.text);
    setGeneratedText(firstSavedText.text);
    setOriginalGeneratedText(firstSavedText.text);
    setIsTextModified(false);
    setCurrentMeditationId(firstSavedText.id);
    setShowTextPreview(true);
  };
  
  // Navigate through saved texts
  const navigateSavedText = (direction) => {
    if (!showingSavedTexts || savedTexts.length === 0) return;
    
    let newIndex = currentSavedIndex;
    if (direction === 'next' && newIndex < savedTexts.length - 1) {
      newIndex++;
    } else if (direction === 'prev' && newIndex > 0) {
      newIndex--;
    }
    
    if (newIndex !== currentSavedIndex) {
      setCurrentSavedIndex(newIndex);
      const selectedText = savedTexts[newIndex];
      setText(selectedText.text);
      setGeneratedText(selectedText.text);
      setOriginalGeneratedText(selectedText.text);
      setIsTextModified(false);
      setCurrentMeditationId(selectedText.id);
    }
  };
  
  // Load user's saved meditations
  const loadUserMeditations = async () => {
    if (!user?.id) return;
    
    try {
      const response = await axios.get(
        getFullUrl(`/api/user-meditations/list/${user.id}`)
      );
      const meditations = response.data.meditations || [];
      setUserMeditations(meditations);
      
      // Auto-load appropriate text after loading meditations
      if (meditationType && !text.trim()) {
        await autoLoadAppropriateText(meditations);
      }
    } catch (error) {
      console.error('Error loading user meditations:', error);
    }
  };
  
  // Load specific saved meditation
  const loadSavedMeditation = async (meditation) => {
    setText(meditation.text);
    setMeditationType(meditation.meditationType);
    setCurrentMeditationId(meditation.id);
    setOriginalGeneratedText(meditation.text);
    setIsTextModified(false);
    setShowTextPreview(true);
    setShowSavedMeditations(false);
    
    // Change language if different
    if (meditation.language !== i18n.language) {
      i18n.changeLanguage(meditation.language);
    }
  };
  
  // Delete saved meditation
  const deleteSavedMeditation = async (meditationId) => {
    if (!user?.id) return;
    
    try {
      await axios.delete(
        getFullUrl(`/api/user-meditations/${user.id}/${meditationId}`)
      );
      // Reload list
      await loadUserMeditations();
    } catch (error) {
      console.error('Error deleting meditation:', error);
      setError(t('errorDeletingMeditation', 'Error deleting meditation'));
    }
  };

  // Auto-load appropriate text when meditation type changes
  useEffect(() => {
    if (meditationType) {
      setText('');
      setGeneratedText('');
      setOriginalGeneratedText('');
      setIsTextModified(false);
      setShowVoiceSelector(false); // Hide voice selector on type/language change
      setShowBackgroundOptions(false); // Hide background options on type/language change
      setCustomBackgroundFile(null); // Clear custom background file
      setCustomBackgroundName(''); // Clear custom background name
      setCustomBackgroundDescription(''); // Clear custom background description
      setShowNameInput(false); // Hide name input
      // Auto-load appropriate text (saved first, then sample)
      autoLoadAppropriateText();
    }
  }, [meditationType, i18n.language]);
  
  // Auto-load appropriate text when user meditations change
  useEffect(() => {
    if (userMeditations.length > 0 && meditationType && user?.id) {
      // Only auto-load if we're not already showing saved texts and no text is currently loaded
      if (!showingSavedTexts && !text.trim()) {
        autoLoadAppropriateText();
      }
    }
  }, [userMeditations]);
  
  // Track text modifications
  useEffect(() => {
    if (originalGeneratedText && text) {
      setIsTextModified(text !== originalGeneratedText);
    }
  }, [text, originalGeneratedText]);

  // Initialize Pi authentication and check for existing user session
  useEffect(() => {
    const initializeApp = async () => {
      // Always attempt to initialize Pi authentication
      setIsPiEnvironment(false); // Pi browser detection disabled
      
      console.log('Initializing Pi authentication service...');
      try {
        const initialized = await piAuthService.initialize();
        setPiAuthInitialized(initialized);
        
        if (initialized) {
            console.log('Pi authentication service initialized successfully');
            
            // Check if user was previously authenticated with Pi
            const authMethod = localStorage.getItem('authMethod');
            if (authMethod === 'pi') {
              console.log('Previous Pi authentication detected - attempting auto-login...');
              try {
                const result = await piAuthService.autoAuthenticate();
                if (result.success) {
                  console.log('Pi auto-authentication successful');
                  setUser(result.user);
                  if (result.user.preferredLanguage) {
                    i18n.changeLanguage(result.user.preferredLanguage);
                    localStorage.setItem('selectedLanguage', result.user.preferredLanguage);
                  }
                  return; // Exit early since we've authenticated
                }
              } catch (error) {
                console.log('Pi auto-authentication failed:', error.message);
                // Clear Pi auth data and fall through to traditional auth check
                localStorage.removeItem('authMethod');
              }
            }
          }
        } catch (error) {
          console.error('Error initializing Pi authentication:', error);
          setPiAuthInitialized(false);
        }
      
      // Check for existing traditional user session
      const storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        try {
          const userData = JSON.parse(storedUser);
          const authMethod = localStorage.getItem('authMethod');
          
          // Only auto-login traditional users, Pi users are handled above
          if (authMethod !== 'pi') {
            setUser(userData);
            
            if (userData && userData.preferredLanguage) {
              i18n.changeLanguage(userData.preferredLanguage);
              localStorage.setItem('selectedLanguage', userData.preferredLanguage);
            }
          }
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('authMethod');
        }
      } else {
        // Fallback: Load saved language preference from localStorage if no user preferred language
        const savedLanguage = localStorage.getItem('selectedLanguage');
        if (savedLanguage) {
          i18n.changeLanguage(savedLanguage);
        }
      }
    };
    
    initializeApp();
  }, [i18n]);
  
  // Fetch unread notifications count
  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    
    try {
      const response = await axios.get(
        getFullUrl(`/api/notifications/user/${user.id}`),
        { params: { unreadOnly: true } }
      );
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Load user meditations and credits when user changes
  useEffect(() => {
    if (user?.id) {
      loadUserMeditations();
      fetchUserCredits();
      fetchElevenlabsCredits();
      fetchUnreadCount();
      fetchSavedCustomBackgrounds();
    }
  }, [user]);

  // Refresh unread count periodically
  useEffect(() => {
    if (!user?.id) return;
    
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    
    // Set UI language to user's preferred language if available
    if (userData && userData.preferredLanguage) {
      i18n.changeLanguage(userData.preferredLanguage);
      localStorage.setItem('selectedLanguage', userData.preferredLanguage);
    }
    
    console.log('User logged in:', userData.authMethod || 'traditional', userData.username);
    handleTabChange('create');
  };

  const handleLogout = () => {
    // Check if user was authenticated with Pi and logout from Pi service
    const authMethod = localStorage.getItem('authMethod');
    if (authMethod === 'pi' && piAuthService.isAuthenticated()) {
      console.log('Logging out Pi user...');
      piAuthService.logout();
    }
    
    // Clear all authentication data
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authMethod');
    setUser(null);
    setUserCredits(null);
    handleTabChange('create');
    console.log('User logged out');
    // Note: We keep the language preference even after logout
  };

  const fetchUserCredits = async () => {
    if (!user?.id) return;
    
    try {
      const response = await axios.get(getFullUrl(`/api/auth/user/${user.id}/credits`));
      setUserCredits(response.data);
    } catch (error) {
      console.error('Error fetching user credits:', error);
    }
  };

  const fetchElevenlabsCredits = async () => {
    if (!user?.id) return;
    
    try {
      const response = await axios.get(getFullUrl(`/api/auth/user/${user.id}/elevenlabs-stats`));
      setElevenlabsCredits(response.data);
    } catch (error) {
      console.error('Error fetching ElevenLabs credits:', error);
    }
  };

  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('selectedLanguage', languageCode);
  };

  const generateAudio = async () => {
    stopAllBackgroundAudio(); // Stop any playing background audio
    setIsLoading(true);
    setError("");
    setAudioFiles([]);
    handleTabChange('myAudio'); // Switch to My Audio tab when generation starts
    
    try {
      // Prepare form data for file upload if custom background is used
      const formData = new FormData();
      formData.append('text', wizardData.text);
      formData.append('background', wizardData.background);
      formData.append('language', i18n.language);
      formData.append('audioLanguage', i18n.language);
      formData.append('voiceId', wizardData.voiceId);
      formData.append('meditationType', wizardData.meditationType);
      formData.append('userId', user?.id);
      formData.append('useBackgroundMusic', wizardData.useBackgroundMusic);
      formData.append('speechTempo', wizardData.speechTempo);
      
      // Add custom background file if selected
      if (customBackgroundFile) {
        if (customBackgroundFile.savedBackground) {
          // This is a saved background - create a reference to the server file
          const savedBg = customBackgroundFile.savedBackground;
          formData.append('savedBackgroundId', savedBg.id);
          formData.append('savedBackgroundUserId', savedBg.userId);
          formData.append('savedBackgroundFilename', savedBg.filename);
          console.log('Frontend: Using saved background:', savedBg);
        } else {
          // This should not happen anymore since we upload immediately
          console.warn('Frontend: Unexpected - using non-saved background file');
          formData.append('customBackground', customBackgroundFile);
        }
      }

      const res = await axios.post(getFullUrl(API_ENDPOINTS.GENERATE_MEDITATION), formData, { 
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      setAudioUrl(url);
      setAudioFiles([{
        language: i18n.language,
        url: url,
        label: audioLanguages.find(lang => lang.value === i18n.language)?.label || i18n.language
      }]);
      
      // Refresh credits after successful generation
      if (user?.id) {
        fetchUserCredits();
        fetchElevenlabsCredits();
        // Refresh saved backgrounds if a custom background was used
        if (customBackgroundFile && customBackgroundName) {
          fetchSavedCustomBackgrounds();
        }
      }
      
      // Reset all values on create page after successful generation
      setText("");
      setGeneratedText("");
      setOriginalGeneratedText("");
      setIsTextModified(false);
      setCurrentMeditationId(null);
      setDraftSaveMessage('');
      
      // Reset UI states
      setShowTextPreview(false);
      setShowVoiceSelector(false);
      setShowBackgroundOptions(false);
      setShowNameInput(false);
      setShowSavedMeditations(false);
      setLanguageOpen(false);
      
      // Reset meditation settings to defaults
      setMeditationType("sleep");
      setBackground("ocean");
      setVoiceId(voices.length > 0 ? voices[0].voice_id : "EXAVITQu4vr4xnSDxMaL");
      handleBackgroundMusicToggle(false);
      setSpeechTempo(1.00);
      setGenderFilter('all');
      
      // Clear custom background data
      setCustomBackgroundFile(null);
      setCustomBackgroundName('');
      setCustomBackgroundDescription('');
      
      // Clear other states
      setAudioUrl("");
      setError("");
    } catch (error) {
      console.error("Error generating meditation:", error);
      setError(t('errorGenerating') || "Failed to generate meditation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateClick = async () => {
    setShowTextPreview(true);
    await generateTextPreview();
  };

  const handleTextApproved = () => {
    // Check credits before showing voice selector
    if (user && userCredits && userCredits.credits < 1) {
      setError(t('insufficientCredits', 'Insufficient credits. You need 1 credit to generate audio.'));
      return;
    }
    
    // Show voice selector instead of immediately generating audio
    setShowVoiceSelector(true);
    setShowBackgroundOptions(false); // Reset background options
  };

  const handleCustomBackgroundUpload = async (data) => {
    // Handle both old event-based calls and new object-based calls
    let file, name, description;
    
    if (data && data.target && data.target.files) {
      // Old style: event object
      file = data.target.files[0];
      name = null;
      description = null;
    } else if (data && data.file) {
      // New style: object with file, name, description
      file = data.file;
      name = data.name;
      description = data.description;
    } else {
      console.error('Invalid upload data:', data);
      return { success: false, error: 'Invalid upload data' };
    }
    
    if (file) {
      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setError(t('fileTooLarge', `File is too large (${fileSizeMB}MB). Maximum size is 50MB.`));
        if (data.target) data.target.value = ''; // Clear the input for event-based calls
        return { success: false, error: 'File too large' };
      }
      
      // Check if it's a supported audio file (MP3, M4A, AAC, AMR, AIFF, CAF)
      const supportedTypes = [
        'audio/mpeg',     // MP3
        'audio/mp4',      // M4A
        'audio/m4a',      // M4A
        'audio/x-m4a',    // M4A (alternative)
        'audio/aac',      // AAC
        'audio/amr',      // AMR
        'audio/3gpp',     // 3GA/AMR
        'audio/aiff',     // AIFF (iPhone)
        'audio/x-aiff',   // AIFF (alternative)
        'audio/x-caf'     // CAF (Core Audio Format - iPhone)
      ];
      
      const supportedExtensions = ['.mp3', '.m4a', '.aac', '.amr', '.3ga', '.aiff', '.caf'];
      const fileName = file.name.toLowerCase();
      
      const isValidType = supportedTypes.includes(file.type) || 
                         supportedExtensions.some(ext => fileName.endsWith(ext));
      
      if (isValidType) {
        // If we have name and description, upload immediately
        if (name && description !== undefined && user?.id) {
          try {
            // Upload and save the background immediately
            const formData = new FormData();
            formData.append('customBackground', file);
            formData.append('userId', user.id);
            formData.append('customName', name);
            formData.append('customDescription', description);

            console.log('Frontend: Uploading background with name:', name);
            
            const response = await axios.post(getFullUrl('/api/meditation/custom-background/upload'), formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });

            if (response.data.success) {
              // Update the custom background file to include the server response
              setCustomBackgroundFile({
                name: response.data.filename,
                savedBackground: {
                  id: response.data.backgroundId,
                  filename: response.data.filename,
                  customName: name,
                  userId: user.id
                }
              });

              setBackground('custom');
              
              // Refresh the list of saved backgrounds
              fetchSavedCustomBackgrounds();
              
              console.log('Background uploaded successfully:', response.data);
              return { success: true, backgroundId: response.data.backgroundId };
            }
          } catch (error) {
            console.error('Error uploading custom background:', error);
            setError(t('uploadError', 'Failed to upload background. Please try again.'));
            return { success: false, error: 'Upload failed' };
          }
        } else {
          // For old-style calls, just set the file and show name input
          setCustomBackgroundFile(file);
          setShowNameInput(true); // Show name input after file selection
          setError(''); // Clear any previous errors
          return { success: true };
        }
      } else {
        setError(t('invalidFileType', 'Please select a valid audio file (MP3, M4A, AAC, AMR, AIFF).'));
        if (data.target) data.target.value = ''; // Clear the input for event-based calls
        return { success: false, error: 'Invalid file type' };
      }
    }
    // Reset file input value to allow re-selecting the same file
    if (data.target) data.target.value = '';
    return { success: false, error: 'No file provided' };
  };

  const handleCustomBackgroundNameSubmit = async () => {
    if (customBackgroundName.trim() && customBackgroundFile && user?.id) {
      try {
        // Upload and save the background immediately
        const formData = new FormData();
        formData.append('customBackground', customBackgroundFile);
        formData.append('userId', user.id);
        formData.append('customName', customBackgroundName);
        formData.append('customDescription', customBackgroundDescription);

        console.log('Frontend: Uploading background with name:', customBackgroundName);
        
        const response = await axios.post(getFullUrl('/api/meditation/custom-background/upload'), formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (response.data.success) {
          // Update the custom background file to include the server response
          setCustomBackgroundFile({
            name: response.data.filename,
            savedBackground: {
              id: response.data.backgroundId,
              filename: response.data.filename,
              customName: customBackgroundName,
              userId: user.id
            }
          });

          setBackground('custom');
          setShowNameInput(false);
          
          // Refresh the list of saved backgrounds
          fetchSavedCustomBackgrounds();
          
          console.log('Background uploaded successfully:', response.data);
        }
      } catch (error) {
        console.error('Error uploading custom background:', error);
        setError(t('uploadError', 'Failed to upload background. Please try again.'));
      }
    }
  };

  const handleRemoveCustomBackground = () => {
    setCustomBackgroundFile(null);
    setCustomBackgroundName('');
    setCustomBackgroundDescription('');
    setShowNameInput(false);
    setBackground('ocean'); // Reset to default
  };

  const handleBackgroundUploadFromSlider = async ({ file, name, description }) => {
    if (!user?.id) {
      throw new Error(t('loginRequired', 'Please login to upload custom backgrounds'));
    }

    try {
      // Upload and save the background
      const formData = new FormData();
      formData.append('customBackground', file);
      formData.append('userId', user.id);
      formData.append('customName', name);
      formData.append('customDescription', description);

      console.log('Frontend: Uploading background with name:', name);
      
      const response = await axios.post(getFullUrl('/api/meditation/custom-background/upload'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        console.log('Upload response.data:', response.data);
        
        // Clear the temporary custom background state since it's now saved
        setCustomBackgroundFile(null);
        setCustomBackgroundName('');
        setCustomBackgroundDescription('');
        setShowNameInput(false);
        
        // Refresh the list of saved backgrounds first
        await fetchSavedCustomBackgrounds();
        
        // Then set the background to the new saved background ID (longer delay for state stability)
        setTimeout(() => {
          setBackground(`saved-${response.data.backgroundId}`);
        }, 500);
        
        console.log('Background uploaded successfully:', response.data);
      }
    } catch (error) {
      console.error('Error uploading custom background:', error);
      throw error;
    }
  };

  const fetchSavedCustomBackgrounds = async () => {
    if (!user?.id) {
      console.log('fetchSavedCustomBackgrounds: No user ID');
      setBackgroundsLoading(false);
      return;
    }
    
    console.log('fetchSavedCustomBackgrounds: Fetching for user', user.id);
    setBackgroundsLoading(true);
    
    try {
      const url = getFullUrl(`/api/meditation/custom-backgrounds/${user.id}`);
      console.log('fetchSavedCustomBackgrounds: URL:', url);
      
      const response = await axios.get(url);
      console.log('fetchSavedCustomBackgrounds: Response:', response.data);
      
      setSavedCustomBackgrounds(response.data.backgrounds || []);
      console.log('fetchSavedCustomBackgrounds: Set backgrounds count:', response.data.backgrounds?.length || 0);
    } catch (error) {
      console.error('Error fetching saved custom backgrounds:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set empty array on error to prevent infinite loading
      setSavedCustomBackgrounds([]);
    } finally {
      setBackgroundsLoading(false);
    }
  };

  const handleSelectSavedBackground = (savedBackground) => {
    // Create a mock file object for the saved background
    setCustomBackgroundFile(null); // Clear current file
    setCustomBackgroundName(savedBackground.customName);
    setBackground('custom');
    setShowSavedBackgrounds(false);
    
    // We'll need to handle this differently since we can't recreate the File object
    // For now, we'll store the background metadata
    setCustomBackgroundFile({
      name: savedBackground.filename,
      savedBackground: savedBackground // Store the full metadata
    });
  };

  const deleteSavedBackground = async (backgroundId) => {
    if (!user?.id) return;
    
    try {
      await axios.delete(getFullUrl(`/api/meditation/custom-background/${user.id}/${backgroundId}`));
      fetchSavedCustomBackgrounds(); // Refresh the list
    } catch (error) {
      console.error('Error deleting saved background:', error);
    }
  };

  const handleBackgroundSelection = (backgroundValue, savedBackgroundData) => {
    console.log('App handleBackgroundSelection:', backgroundValue, savedBackgroundData?.customName);
    
    if (backgroundValue.startsWith('saved-') && savedBackgroundData) {
      // Handle saved background selection - use the specific backgroundValue, not 'custom'
      setBackground(backgroundValue); // This is crucial - use the specific saved ID
      setCustomBackgroundName(savedBackgroundData.customName);
      setCustomBackgroundFile({
        name: savedBackgroundData.filename,
        savedBackground: savedBackgroundData
      });
      console.log('Selected saved background:', backgroundValue, savedBackgroundData);
    } else if (backgroundValue === 'custom' && savedBackgroundData) {
      // Handle current upload session
      setBackground('custom');
      setCustomBackgroundName(savedBackgroundData.customName);
      setCustomBackgroundFile({
        name: savedBackgroundData.filename,
        savedBackground: savedBackgroundData
      });
    } else {
      // Handle regular background selection (system backgrounds)
      setBackground(backgroundValue);
      setCustomBackgroundFile(null);
      setCustomBackgroundName('');
    }
  };


  const fetchVoices = async () => {
    try {
      const res = await axios.get(getFullUrl(API_ENDPOINTS.GET_VOICES));
      setVoices(res.data);
    } catch (error) {
      console.error("Error fetching voices:", error);
    }
  };


  useEffect(() => {
    fetchVoices();
  }, []);

  // Update voice selection when language changes
  useEffect(() => {
    if (voices.length > 0) {
      setVoiceId(voices[0].voice_id);
    }
  }, [voices]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.custom-select')) {
        setLanguageOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const uiLanguages = [
    { value: 'en', label: '🇬🇧 English' },
    { value: 'es', label: '🇪🇸 Español' },
    { value: 'fr', label: '🇫🇷 Français' },
    { value: 'de', label: '🇩🇪 Deutsch' },
    { value: 'nl', label: '🇳🇱 Nederlands' },
    { value: 'zh', label: '🇨🇳 中文' },
    { value: 'hi', label: '🇮🇳 हिन्दी' },
    { value: 'ar', label: '🇸🇦 العربية' },
    { value: 'pt', label: '🇵🇹 Português' },
    { value: 'ru', label: '🇷🇺 Русский' },
    { value: 'ja', label: '🇯🇵 日本語' },
    { value: 'ko', label: '🇰🇷 한국어' },
    { value: 'it', label: '🇮🇹 Italiano' },
  ];

  const audioLanguages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'nl', label: 'Nederlands' },
    { value: 'zh', label: '中文' },
    { value: 'hi', label: 'हिन्दी' },
    { value: 'ar', label: 'العربية' },
    { value: 'pt', label: 'Português' },
    { value: 'ru', label: 'Русский' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'it', label: 'Italiano' },
  ];

  // Create animated stars background
  const createStars = () => {
    const starsContainer = document.getElementById('stars');
    if (!starsContainer || starsContainer.children.length > 0) return; // Prevent duplicates
    
    const numberOfStars = 100;

    for (let i = 0; i < numberOfStars; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      
      const size = Math.random() * 3 + 1;
      star.style.width = size + 'px';
      star.style.height = size + 'px';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = Math.random() * 3 + 's';
      
      starsContainer.appendChild(star);
    }
  };

  // Initialize stars on component mount - MUST be before any conditional returns
  useEffect(() => {
    createStars();
  }, []);

  // Show auth screen if no user is logged in
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'myAudio':
        return <MyAudio user={user} userCredits={userCredits} isGenerating={isLoading} onCreditsUpdate={fetchUserCredits} onProfileClick={(section = 'profile') => { setActiveTab('profile'); setProfileSection(section); }} unreadCount={unreadCount} onInboxClick={() => handleTabChange('inbox')} onCreateClick={() => handleTabChange('create')} />;
      case 'journal':
        return <Journal user={user} userCredits={userCredits} onCreditsUpdate={fetchUserCredits} onProfileClick={(section = 'profile') => { setActiveTab('profile'); setProfileSection(section); }} unreadCount={unreadCount} onInboxClick={() => handleTabChange('inbox')} onCreateClick={() => handleTabChange('create')} />;
      case 'community':
        return <CommunityHub user={user} onProfileClick={(section = 'profile') => { setActiveTab('profile'); setProfileSection(section); }} unreadCount={unreadCount} onInboxClick={() => handleTabChange('inbox')} onCreateClick={() => handleTabChange('create')} />;
      case 'journalHub':
        return <JournalHub user={user} />;
      case 'admin':
        return <AdminDashboard user={user} onLogout={handleLogout} onProfileClick={(section = 'profile') => { setActiveTab('profile'); setProfileSection(section); }} unreadCount={unreadCount} onInboxClick={() => handleTabChange('inbox')} onCreateClick={() => handleTabChange('create')} />;
      case 'inbox':
        return <Inbox user={user} onUnreadCountChange={setUnreadCount} onProfileClick={(section = 'profile') => { setActiveTab('profile'); setProfileSection(section); }} headerUnreadCount={unreadCount} onInboxClick={() => handleTabChange('inbox')} onCreateClick={() => handleTabChange('create')} />;
      case 'profile':
        return <ProfileContainer user={user} onLogout={handleLogout} onBackToCreate={() => handleTabChange('create')} selectedSection={profileSection} onUserUpdate={setUser} />;
      default:
        return (
          <div className="create-content">
            <div className="create-language-header">
              <PageHeader 
                user={user}
                unreadCount={unreadCount}
                onProfileClick={(section = 'profile') => {
                  setActiveTab('profile');
                  // Pass the section to ProfileContainer somehow
                  setProfileSection(section);
                }}
                onInboxClick={() => handleTabChange('inbox')}
                onCreateClick={() => handleTabChange('create')}
              />
            </div>

            <WizardContainer
              currentStep={currentStep}
              totalSteps={5}
              onNext={nextStep}
              onPrev={prevStep}
              onGoToStep={goToStep}
              isStepValid={isStepValid}
              onSave={handleWizardSave}
              onGenerate={handleWizardGenerate}
              isGenerating={isLoading}
            >
              {renderWizardStep()}
            </WizardContainer>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <div className="stars" id="stars"></div>
      <div className="main-content">
        {renderContent()}
      </div>
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        user={user}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default App;