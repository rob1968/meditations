import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import axios from 'axios';
import { getFullUrl, getAssetUrl, API_ENDPOINTS, API_BASE_URL, apiRequest } from '../config/api';
import { getAuthHeaders } from '../utils/userUtils';
import { loadJournalTab, saveJournalTab } from '../utils/statePersistence';
import PageHeader from './PageHeader';
import Alert from './Alert';
import ConfirmDialog from './ConfirmDialog';
import AICoachChat from './AICoachChat';
import TriggerAlert from './TriggerAlert';
import SpellingChecker from './GrammarChecker';
import TriggerPatternChart from './TriggerPatternChart';
import SimpleCalendar from './SimpleCalendar';

const Journal = ({ user, userCredits, onCreditsUpdate, onProfileClick, unreadCount, onInboxClick, onCreateClick }) => {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [playingEntryId, setPlayingEntryId] = useState(null);
  const [generatingAudio, setGeneratingAudio] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [audioSupported, setAudioSupported] = useState(true);
  const [recordingState, setRecordingState] = useState('idle'); // 'idle', 'recording', 'processing'
  const [todaysEntry, setTodaysEntry] = useState(null);
  const [hasTodaysEntry, setHasTodaysEntry] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false); // Track saving/mood generation state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDateEntry, setSelectedDateEntry] = useState(null);
  
  // Voice cloning states
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecorder, setVoiceRecorder] = useState(null);
  const [voiceRecordingTime, setVoiceRecordingTime] = useState(0);
  const [voiceRecordingState, setVoiceRecordingState] = useState('idle'); // 'idle', 'recording', 'processing', 'preview'
  const [recordedVoiceBlob, setRecordedVoiceBlob] = useState(null);
  const [userCustomVoices, setUserCustomVoices] = useState([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('default');
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  
  // Addictions state
  const [addictions, setAddictions] = useState([]);
  const [showAddictionForm, setShowAddictionForm] = useState(false);
  const [editingAddiction, setEditingAddiction] = useState(null);
  
  // AI Coach state
  const [showCoachChat, setShowCoachChat] = useState(false);
  const [coachInitialMessage, setCoachInitialMessage] = useState(null);
  const [coachInitialTab, setCoachInitialTab] = useState('chat');
  
  // Trigger Alert state
  const [activeTrigger, setActiveTrigger] = useState(null);
  const [showTriggerAlert, setShowTriggerAlert] = useState(false);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [selectedMoodForDescription, setSelectedMoodForDescription] = useState(null);
  const [addictionForm, setAddictionForm] = useState({
    type: '',
    description: '',
    startDate: '',
    quitDate: '',
    status: 'active', // 'active', 'recovering', 'relapsed', 'clean'
    cruksRegistration: {
      isRegistered: false,
      registrationDate: ''
    }
  });
  const [expandedMoodId, setExpandedMoodId] = useState(null);
  const [showMoodDescription, setShowMoodDescription] = useState(null);
  const [justSaved, setJustSaved] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState(() => loadJournalTab()); // 'write', 'calendar', 'archive', 'addictions', 'coach'
  
  // Ref to track if calendar has been initialized to prevent re-loading today's entry
  const calendarInitialized = useRef(false);
  
  // Function to highlight search text in content
  const highlightSearchText = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    
    return parts.map((part, index) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? 
        <span key={index} style={{ backgroundColor: '#ffeb3b', color: '#000', fontWeight: 'bold' }}>{part}</span> : 
        part
    );
  };
  
  // Generate automatic voice name based on current date
  const generateVoiceName = () => {
    const currentLanguage = i18n.language || 'nl';
    const today = new Date();
    const dateString = today.toLocaleDateString(currentLanguage === 'nl' ? 'nl-NL' : 'en-US');
    
    if (currentLanguage === 'nl') {
      return `Mijn Stem ${dateString}`;
    } else {
      return `My Voice ${dateString}`;
    }
  };
  const { t } = useTranslation();

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    mood: '', // Empty string, not null
    date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  });
  
  // Track original content to detect changes
  const [originalContent, setOriginalContent] = useState('');
  
  // Grammar checking states
  // Grammar checking state - only for new entries, not updates
  const [enableGrammarCheck, setEnableGrammarCheck] = useState(true); // Always enabled, automatic and silent
  const [isPerformingGrammarCheck, setIsPerformingGrammarCheck] = useState(false);
  const [hasGrammarErrors, setHasGrammarErrors] = useState(false);
  const grammarCheckerRef = useRef(null);
  const quickGrammarCheckerRef = useRef(null);
  const writeTabGrammarCheckerRef = useRef(null); // Separate ref for Write tab quick write area
  
  // Track save success for feedback
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // Alert states for replacing popups
  const [alertState, setAlertState] = useState({ show: false, message: '', type: 'success' });
  const [confirmState, setConfirmState] = useState({ 
    show: false, 
    message: '', 
    onConfirm: null,
    confirmText: t('confirm', 'Bevestigen'),
    cancelText: t('cancel', 'Annuleren')
  });
  
  // Control calendar visibility
  const [showCalendar, setShowCalendar] = useState(true);
  
  // Filter states
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  
  // Textarea ref for auto-scroll functionality
  const textareaRef = useRef(null);
  
  // Check if content has been changed
  const hasContentChanged = () => {
    return formData.content.trim() !== originalContent.trim();
  };
  
  // Helper function to show alerts
  const showAlert = (message, type = 'success') => {
    setAlertState({ show: true, message, type });
  };
  
  // Helper function to show confirmation dialog
  const showConfirmDialog = (message, onConfirm, confirmText = t('confirm', 'Confirm'), cancelText = t('cancel', 'Cancel')) => {
    setConfirmState({
      show: true,
      message,
      onConfirm,
      confirmText,
      cancelText
    });
  };

  // Trigger Alert handler functions
  const handleTriggerDetected = (trigger) => {
    console.log('Trigger detected:', trigger);
    setActiveTrigger(trigger);
    setShowTriggerAlert(true);
  };

  const handleTriggerAlertClose = () => {
    setShowTriggerAlert(false);
    setActiveTrigger(null);
  };

  const handleTriggerGetHelp = (intervention, startChat = false) => {
    console.log('Getting help for trigger:', intervention);
    
    if (startChat) {
      // Start AI Coach chat session
      setCoachInitialMessage(intervention ? intervention.message : t('coachWelcomeMessage', 'Hi! I\'m Alex, your AI recovery coach. I\'m here to support you 24/7. How are you feeling today?'));
      setCoachInitialTab('chat');
      setShowCoachChat(true);
    }
    
    // Close trigger alert
    handleTriggerAlertClose();
  };

  const handleTriggerDismiss = () => {
    console.log('Trigger alert dismissed');
    handleTriggerAlertClose();
  };

  // Filter entries based on selected month and mood
  const getFilteredEntries = () => {
    let filtered = entries;

    // Filter by month
    if (selectedMonth) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date);
        const entryMonth = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
        return entryMonth === selectedMonth;
      });
    }

    // Filter by mood
    if (selectedMood) {
      filtered = filtered.filter(entry => entry.mood === selectedMood);
    }

    return filtered;
  };

  // Generate month options for the last 12 months
  const getMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('nl-NL', { year: 'numeric', month: 'long' });
      months.push({ key: monthKey, label: monthLabel });
    }
    
    return months;
  };

  const moods = [
    { value: 'happy', emoji: '😊', label: t('happy', 'Blij'), description: t('happyDesc', 'Ik voel me vrolijk en optimistisch'), color: '#FFD700', bg: 'linear-gradient(135deg, #FFD700, #FFA500)' },
    { value: 'calm', emoji: '😌', label: t('calm', 'Rustig'), description: t('calmDesc', 'Ik ben ontspannen en vredig'), color: '#87CEEB', bg: 'linear-gradient(135deg, #87CEEB, #4682B4)' },
    { value: 'peaceful', emoji: '😇', label: t('peaceful', 'Vreedzaam'), description: t('peacefulDesc', 'Ik voel innerlijke rust en harmonie'), color: '#98FB98', bg: 'linear-gradient(135deg, #98FB98, #32CD32)' },
    { value: 'grateful', emoji: '🥰', label: t('grateful', 'Dankbaar'), description: t('gratefulDesc', 'Ik ben dankbaar voor wat ik heb'), color: '#DDA0DD', bg: 'linear-gradient(135deg, #DDA0DD, #9370DB)' },
    { value: 'reflective', emoji: '🤔', label: t('reflective', 'Reflectief'), description: t('reflectiveDesc', 'Ik denk na over het leven'), color: '#C0C0C0', bg: 'linear-gradient(135deg, #C0C0C0, #708090)' },
    { value: 'energetic', emoji: '😄', label: t('energetic', 'Energiek'), description: t('energeticDesc', 'Ik voel me vol energie en motivatie'), color: '#FF6347', bg: 'linear-gradient(135deg, #FF6347, #DC143C)' },
    { value: 'stressed', emoji: '😔', label: t('stressed', 'Gestrest'), description: t('stressedDesc', 'Ik voel me onder druk staan'), color: '#FF4500', bg: 'linear-gradient(135deg, #FF4500, #B22222)' },
    { value: 'anxious', emoji: '😟', label: t('anxious', 'Bezorgd'), description: t('anxiousDesc', 'Ik maak me zorgen over dingen'), color: '#708090', bg: 'linear-gradient(135deg, #708090, #2F4F4F)' },
    { value: 'sad', emoji: '😞', label: t('sad', 'Verdrietig'), description: t('sadDesc', 'Ik voel me bedroefd of neerslachtig'), color: '#4682B4', bg: 'linear-gradient(135deg, #4682B4, #2F4F4F)' },
    { value: 'angry', emoji: '😤', label: t('angry', 'Boos'), description: t('angryDesc', 'Ik voel boosheid of irritatie'), color: '#DC143C', bg: 'linear-gradient(135deg, #DC143C, #8B0000)' },
    { value: 'frustrated', emoji: '😮‍💨', label: t('frustrated', 'Gefrustreerd'), description: t('frustratedDesc', 'Ik voel me gefrustreerd door situaties'), color: '#FF8C00', bg: 'linear-gradient(135deg, #FF8C00, #FF4500)' },
    { value: 'confused', emoji: '😕', label: t('confused', 'In de war'), description: t('confusedDesc', 'Ik voel me verward of onzeker'), color: '#9370DB', bg: 'linear-gradient(135deg, #9370DB, #663399)' },
    { value: 'lonely', emoji: '😔', label: t('lonely', 'Eenzaam'), description: t('lonelyDesc', 'Ik voel me alleen of geïsoleerd'), color: '#778899', bg: 'linear-gradient(135deg, #778899, #556B2F)' },
    { value: 'mixed', emoji: '😐', label: t('mixed', 'Gemengd'), description: t('mixedDesc', 'Ik voel verschillende emoties tegelijk'), color: '#A9A9A9', bg: 'linear-gradient(135deg, #A9A9A9, #696969)' },
    { value: 'neutral', emoji: '😶', label: t('neutral', 'Neutraal'), description: t('neutralDesc', 'Ik voel me emotioneel neutraal'), color: '#D3D3D3', bg: 'linear-gradient(135deg, #D3D3D3, #A9A9A9)' }
  ];

  useEffect(() => {
    if (user) {
      fetchEntries();
      fetchTodaysEntry();
      // fetchUserVoices(); // Commented out - voice cloning not implemented yet
    }
  }, [user]);

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    saveJournalTab(activeTab);
    console.log('📍 Saved Journal tab to localStorage:', activeTab);
  }, [activeTab]);

  // Keyboard navigation for slider
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeTab !== 'browse') return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevSlide();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNextSlide();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, currentSlide, entries.length, isSliding]);

  // Reset slide when entries change
  useEffect(() => {
    setCurrentSlide(0);
  }, [entries]);

  // Clear error message on component unmount or navigation
  useEffect(() => {
    return () => {
      // Cleanup function - clear error when component unmounts
      setError('');
    };
  }, []);

  // Clear error message when navigating between tabs
  useEffect(() => {
    setError('');
  }, [activeTab]);


  // Function to load today's entry for calendar
  const loadTodayForCalendar = async () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Always set today as selected date first
    setSelectedDate(today);
    
    // Fetch today's entry directly
    try {
      const response = await axios.get(getFullUrl(`/api/journal/user/today`), {
        headers: getAuthHeaders(user)
      });
      console.log('Calendar: Fetched today\'s entry:', response.data);
      
      if (response.data.hasEntry && response.data.entry) {
        // Load today's existing entry data for calendar view
        const entry = response.data.entry;
        setFormData({
          title: entry.title || '',
          content: entry.content || '',
          mood: entry.mood || '',
          date: today
        });
        setEditingEntry(entry);
        setTodaysEntry(entry);
        setHasTodaysEntry(true);
      } else {
        // Setup for new entry on today's date
        console.log('Calendar: No entry for today, setting up empty form');
        setFormData({
          title: '',
          content: '',
          mood: '',
          date: today
        });
        setEditingEntry(null);
        setTodaysEntry(null);
        setHasTodaysEntry(false);
      }
    } catch (error) {
      console.error('Calendar: Error fetching today\'s entry:', error);
      // Setup empty form on error
      setFormData({
        title: '',
        content: '',
        mood: '',
        date: today
      });
      setEditingEntry(null);
    }
  };

  // Auto-load today's entry for calendar tab
  useEffect(() => {
    if (!user || activeTab !== 'calendar') return;
    
    // Only load if calendar hasn't been initialized yet or if we're returning to calendar
    if (!calendarInitialized.current || !selectedDate) {
      loadTodayForCalendar();
      calendarInitialized.current = true;
    }
  }, [user, activeTab]);

  // Reset selectedDate when switching away from calendar tab
  useEffect(() => {
    if (activeTab !== 'calendar') {
      // Reset calendar state when leaving calendar tab
      setSelectedDate('');
      calendarInitialized.current = false;
    }
  }, [activeTab]);

  // Check audio recording support on component mount
  useEffect(() => {
    const checkAudioSupport = () => {
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasMediaRecorder = !!window.MediaRecorder;
      setAudioSupported(hasGetUserMedia && hasMediaRecorder);
    };
    checkAudioSupport();
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Stop any ongoing recording and cleanup
      if (mediaRecorder) {
        if (mediaRecorder.timer) {
          clearInterval(mediaRecorder.timer);
        }
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }
    };
  }, [mediaRecorder]);

  const fetchEntries = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const params = new URLSearchParams();
      if (searchText) params.append('searchText', searchText);
      
      const response = await axios.get(getFullUrl(`/api/journal/user/entries?${params}`), {
        headers: getAuthHeaders(user)
      });
      // Sort entries from oldest to newest for horizontal scroll (left = old, right = new)
      const sortedEntries = response.data.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEntries(sortedEntries);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      setError(t('failedToLoadEntries', 'Failed to load journal entries'));
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  const fetchTodaysEntry = async () => {
    try {
      const response = await axios.get(getFullUrl(`/api/journal/user/today`), {
        headers: getAuthHeaders(user)
      });
      setTodaysEntry(response.data.entry);
      setHasTodaysEntry(response.data.hasEntry);
    } catch (error) {
      console.error('Error fetching today\'s journal entry:', error);
      // Don't show error for this, just treat as no entry exists
      setTodaysEntry(null);
      setHasTodaysEntry(false);
    }
  };

  const fetchEntryForDate = async (date) => {
    try {
      // Parse the date string properly to avoid timezone issues
      const [year, month, day] = date.split('-');
      const startOfDay = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0);
      const endOfDay = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59, 999);
      
      const response = await axios.get(getFullUrl(`/api/journal/user/entries?startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`), {
        headers: getAuthHeaders(user)
      });
      
      if (response.data.entries && response.data.entries.length > 0) {
        setSelectedDateEntry(response.data.entries[0]);
        return response.data.entries[0];
      } else {
        setSelectedDateEntry(null);
        return null;
      }
    } catch (error) {
      console.error('Error fetching entry for date:', error);
      setSelectedDateEntry(null);
      return null;
    }
  };

  const resetForm = () => {
    console.log('Resetting form...');
    
    // Stop any ongoing recording
    if (mediaRecorder && recordingState === 'recording') {
      console.log('Stopping recording due to form reset');
      stopRecording();
    }
    
    setFormData({
      title: '',
      content: '',
      mood: '', // Empty string, not null
      date: new Date().toISOString().split('T')[0]
    });
    setOriginalContent(''); // Reset original content when resetting form
    setShowCreateForm(false);
    setShowDatePicker(false);
    setEditingEntry(null);
    setSelectedDate('');
    setSelectedDateEntry(null);
    
    // Clear any grammar check state
    setIsPerformingGrammarCheck(false);
    setHasGrammarErrors(false);
    
    // Reset recording state after a small delay to allow stop to complete
    setTimeout(() => {
      setRecordingState('idle');
    }, 100);
  };

  const handleDateSelection = async (date) => {
    console.log('handleDateSelection called with:', date);
    
    // Prevent selection of future dates
    const selectedDate = new Date(date);
    const today = new Date();
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const selectedNormalized = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    
    console.log('Date comparison:', {
      selectedDate: selectedDate.toDateString(),
      today: today.toDateString(),
      selectedNormalized: selectedNormalized.toDateString(),
      todayNormalized: todayNormalized.toDateString(),
      isFuture: selectedNormalized > todayNormalized
    });
    
    if (selectedNormalized > todayNormalized) {
      console.log('Blocking future date selection');
      setError('Je kunt geen toekomstige datums selecteren voor dagboek entries');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    console.log('Date selection allowed, proceeding...');
    
    setSelectedDate(date);
    setShowCalendar(false); // Hide calendar when date is selected
    const entry = await fetchEntryForDate(date);
    
    if (entry) {
      // Edit existing entry for this date - use the selected date, not the entry date
      const content = entry.content || '';
      setFormData({
        title: entry.title,
        content: content,
        mood: entry.mood || '',
        date: date // Use the selected date string directly
      });
      setOriginalContent(content); // Track the original content
      setEditingEntry(entry);
    } else {
      // Create new entry for this date
      setFormData({
        title: '',
        content: '',
        mood: '',
        date: date
      });
      setOriginalContent(''); // Reset original content for new entry
      setEditingEntry(null);
    }
    
    setShowDatePicker(false);
    setShowCreateForm(true); // Open expanded form modal - same as browse page
  };

  const fetchUserVoices = async () => {
    try {
      console.log('Fetching user voices for user:', user.id);
      const response = await axios.get(getFullUrl(`/api/journal/voice-clone/list/${user.id}`), {
        headers: getAuthHeaders(user)
      });
      console.log('Voice list response:', response.data);
      if (response.data.success) {
        const voices = response.data.voices || [];
        console.log('Setting user custom voices:', voices);
        setUserCustomVoices(voices);
      }
    } catch (error) {
      console.error('Error fetching user voices:', error);
      // Don't show error for this, just treat as no custom voices
      setUserCustomVoices([]);
    }
  };

  const startVoiceRecording = async () => {
    try {
      console.log('Starting voice recording...');
      
      if (voiceRecordingState !== 'idle') {
        console.log('Voice recording already in progress, state:', voiceRecordingState);
        return;
      }

      setError('');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(t('getUserMediaNotSupported', 'getUserMedia not supported'));
      }

      if (!window.MediaRecorder) {
        throw new Error(t('mediaRecorderNotSupported', 'MediaRecorder not supported'));
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      if (!stream.getAudioTracks().length) {
        throw new Error(t('noAudioTracks', 'No audio tracks available'));
      }

      // Use MP3 format for better ElevenLabs compatibility
      let mimeType = 'audio/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser decide
          }
        }
      }

      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      const audioChunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        console.log('Voice MediaRecorder stopped, processing audio...');
        
        if (recorder.timer) {
          clearInterval(recorder.timer);
          recorder.timer = null;
        }
        
        setVoiceRecordingState('processing');
        setVoiceRecorder(null);
        setVoiceRecordingTime(0);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: recorder.mimeType || 'audio/mp4' });
          setRecordedVoiceBlob(audioBlob);
          setVoiceRecordingState('preview');
        } else {
          console.warn('No voice audio chunks recorded');
          setVoiceRecordingState('idle');
        }
      };

      // Start recording
      recorder.start(1000);
      setVoiceRecorder(recorder);
      setVoiceRecordingState('recording');
      setVoiceRecordingTime(0);

      // Start timer - target 60-120 seconds for good voice cloning
      const timer = setInterval(() => {
        setVoiceRecordingTime(prev => {
          if (prev >= 180) { // Max 3 minutes (ElevenLabs limit)
            console.log('Auto-stopping voice recording after 3 minutes');
            if (recorder && recorder.state !== 'inactive') {
              recorder.stop();
            }
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      recorder.timer = timer;
      
      console.log('Voice recording started successfully');

    } catch (error) {
      console.error('Error starting voice recording:', error);
      setVoiceRecordingState('idle');
      
      let errorMessage = t('microphoneAccessDenied', 'Microphone access denied. Please allow microphone access.');
      
      if (error.name === 'NotFoundError') {
        errorMessage = t('microphoneNotFound', 'No microphone found. Please check if your device has a microphone.');
      } else if (error.name === 'NotAllowedError') {
        errorMessage = t('microphoneAccessDenied', 'Microfoon toegang geweigerd. Sta microfoon toegang toe in je browser.');
      } else if (error.name === 'NotSupportedError' || error.message.includes('not supported')) {
        errorMessage = t('audioRecordingNotSupported', 'Audio opname wordt niet ondersteund door je browser. Probeer Chrome of Safari.');
      } else if (error.name === 'NotReadableError') {
        errorMessage = t('microphoneInUse', 'Microfoon wordt gebruikt door een andere app. Sluit andere apps die de microfoon gebruiken.');
      }
      
      setError(errorMessage);
    }
  };

  const stopVoiceRecording = () => {
    console.log('Stopping voice recording manually...');
    if (voiceRecorder && voiceRecordingState === 'recording') {
      if (voiceRecorder.timer) {
        clearInterval(voiceRecorder.timer);
        voiceRecorder.timer = null;
      }
      
      if (voiceRecorder.state !== 'inactive') {
        voiceRecorder.stop();
      }
      
      console.log('Voice recording stop requested');
    }
  };

  const playVoicePreview = () => {
    if (recordedVoiceBlob) {
      const audioUrl = URL.createObjectURL(recordedVoiceBlob);
      const audio = new Audio(audioUrl);
      audio.play().catch(err => {
        console.error('Error playing voice preview:', err);
      });
    }
  };

  const cancelVoiceRecording = () => {
    setVoiceRecordingState('idle');
    setRecordedVoiceBlob(null);
    setVoiceRecordingTime(0);
    setShowVoiceRecorder(false);
  };

  const saveCustomVoice = async (voiceName) => {
    if (!recordedVoiceBlob || !voiceName.trim()) {
      setError(t('voiceNameAndRecordingRequired', 'Voice name and recording are required'));
      return;
    }

    try {
      setUploadingVoice(true);
      setError('');

      const formData = new FormData();
      formData.append('audio', recordedVoiceBlob, 'voice_sample.mp3');
      formData.append('voiceName', voiceName.trim());
      formData.append('userId', user.id);

      const response = await axios.post(getFullUrl(API_ENDPOINTS.JOURNAL_VOICE_CLONE_UPLOAD), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-user-id': user.id
        },
        timeout: 60000, // 60 second timeout for voice cloning
      });

      if (response.data.success) {
        console.log('Voice successfully saved, refreshing voices list...');
        
        // Small delay to ensure database is updated
        setTimeout(async () => {
          await fetchUserVoices(); // Refresh voices list
          console.log('Setting selected voice to:', response.data.voiceId);
          setSelectedVoiceId(response.data.voiceId); // Auto-select new voice
        }, 500);
        
        setRecordedVoiceBlob(null);
        setVoiceRecordingState('idle');
        setShowVoiceRecorder(false);
        
        if (onCreditsUpdate) {
          onCreditsUpdate(); // Update credits display
        }
        
        // Success message
        showAlert(t('voiceCloneSuccess', 'Voice successfully cloned! You can now use it to generate audio.'), 'success');
      }
    } catch (error) {
      console.error('Error saving custom voice:', error);
      const errorMessage = error.response?.data?.error || t('failedToSaveVoice', 'Failed to save custom voice');
      setError(errorMessage);
    } finally {
      setUploadingVoice(false);
    }
  };

  const deleteCustomVoice = async (voiceId) => {
    showConfirmDialog(
      t('confirmDeleteVoice', 'Are you sure you want to delete this custom voice?'),
      async () => {
        try {
          await axios.delete(getFullUrl(`/api/journal/voice-clone/${voiceId}?userId=${user.id}`), {
            headers: getAuthHeaders(user)
          });
          await fetchUserVoices(); // Refresh voices list
          
          // If deleted voice was selected, switch back to default
          if (selectedVoiceId === voiceId) {
            setSelectedVoiceId('default');
          }
        } catch (error) {
          console.error('Error deleting custom voice:', error);
          setError(t('failedToDeleteVoice', 'Failed to delete custom voice'));
        }
      }
    );
  };

  // Function to apply grammar corrections to text
  const applyCorrectionsSorted = (text, corrections) => {
    if (!corrections || corrections.length === 0) return text;
    
    // Sort corrections by start position (descending) to maintain positions
    const sortedCorrections = [...corrections].sort((a, b) => b.start - a.start);
    
    let correctedText = text;
    sortedCorrections.forEach((correction) => {
      const before = correctedText.substring(0, correction.start);
      const after = correctedText.substring(correction.end);
      let suggestion = correction.suggestion;
      
      // Preserve spacing
      const originalError = correctedText.substring(correction.start, correction.end);
      if (originalError.startsWith(' ') && !suggestion.startsWith(' ')) {
        suggestion = ' ' + suggestion;
      }
      if (originalError.endsWith(' ') && !suggestion.endsWith(' ')) {
        suggestion = suggestion + ' ';
      }
      
      correctedText = before + suggestion + after;
      console.log(`Applied correction: "${correction.error}" → "${suggestion}"`);
    });
    
    return correctedText;
  };

  // Function to render text with applied corrections highlighted
  const renderCorrectedText = (text, corrections) => {
    if (!corrections || corrections.length === 0) return text;
    
    // Sort corrections by start position for proper rendering
    const sortedCorrections = [...corrections].sort((a, b) => a.start - b.start);
    
    const parts = [];
    let lastIndex = 0;
    
    sortedCorrections.forEach((correction, index) => {
      // Add text before correction
      if (correction.start > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, correction.start)}
          </span>
        );
      }
      
      // Add corrected text with highlighting
      parts.push(
        <span 
          key={`correction-${index}`}
          className="grammar-correction"
          title={`Gecorrigeerd: "${correction.error}" → "${correction.suggestion}"`}
        >
          {correction.suggestion}
        </span>
      );
      
      lastIndex = correction.end;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }
    
    return <span>{parts}</span>;
  };

// Function to perform nonsense text detection using OpenAI backend
const performPreSaveChecks = async () => {
  console.log('=== PERFORMING OPENAI NONSENSE DETECTION ===');
  console.log('Is this an update?', !!editingEntry);
  console.log('Entry being edited:', editingEntry?._id);
  console.log('Form content:', formData.content.substring(0, 100) + '...');
  
  if (!formData.content.trim()) {
    console.log('Empty content, skipping checks');
    return { passed: true };
  }
  
  // Perform OpenAI nonsense detection with timeout
  try {
    setIsPerformingGrammarCheck(true); // Show loading indicator
    setError('');
    setHasGrammarErrors(false);
    
    console.log('Making API call to OpenAI nonsense endpoint...');
    
    // Use axios with timeout for OpenAI nonsense detection
    const response = await axios.post(getFullUrl(API_ENDPOINTS.AI_COACH_CHECK_NONSENSE), {
      text: formData.content.trim()
    }, {
      timeout: 15000, // 15 second timeout
      headers: getAuthHeaders(user)
    });
    
    console.log('API Response status:', response.status);
    console.log('API Response data:', response.data);
    
    const checkResult = response.data;
    console.log('=== OPENAI NONSENSE CHECK RESULT ===');
    console.log('Full result:', JSON.stringify(checkResult, null, 2));
    
    setIsPerformingGrammarCheck(false);
    
    // Check for nonsense text - this blocks saving (for both new and updates)
    if (checkResult && checkResult.isNonsense === true) {
      console.log('=== NONSENSE DETECTED BY OPENAI - BLOCKING SAVE - v2 ===');
      console.log('Is update:', !!editingEntry);
      
      const errorMessage = editingEntry ? 
        t('nonsenseTextDetectedUpdate', 'Onzin tekst gedetecteerd. Wijzig je entry met betekenisvolle content.') :
        t('nonsenseTextDetected', 'Onzin tekst gedetecteerd. Schrijf een echte dagboekentry.');
      
      setError(errorMessage);
      
      // Auto-clear error message after 8 seconds
      setTimeout(() => {
        setError('');
      }, 8000);
      
      return { passed: false, reason: 'nonsense_text' };
    }
    
    console.log('=== OPENAI NONSENSE DETECTION COMPLETED - TEXT IS VALID ===');
    return { passed: true };
    
  } catch (error) {
    console.error('=== OPENAI NONSENSE DETECTION FAILED ===', error);
    setIsPerformingGrammarCheck(false);
    
    // If timeout or network error, still block obvious nonsense patterns
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.log('OpenAI timeout, falling back to basic check');
      
      // Simple fallback for obvious keyboard mashing
      const text = formData.content.trim().toLowerCase();
      const isObviousNonsense = /^[lkjlkj\s]+$|^[asdfgh\s]+$|^[qwerty\s]+$|^[123456\s]+$/.test(text);
      
      if (isObviousNonsense) {
        const errorMessage = t('nonsenseTextDetected', 'Onzin tekst gedetecteerd. Schrijf een echte dagboekentry.');
        setError(errorMessage);
        setTimeout(() => setError(''), 8000);
        return { passed: false, reason: 'nonsense_text' };
      }
    }
    
    // Continue with save if OpenAI check fails completely
    return { passed: true };
  }
};

// No force save allowed for nonsense text - it pollutes journal and AI analysis

// Separate function for the actual save process (used by both normal and force save)
const proceedWithSave = async () => {
    // Stop any ongoing recording before saving
    if (recordingState === 'recording') {
      console.log('Stopping recording before save');
      stopRecording();
      // Give it a moment to stop
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      setError('');
      setIsSavingEntry(true); // Start saving state
      const payload = {
        userId: user.id,
        title: formatDate(formData.date), // Use date as title
        content: formData.content.trim(),
        date: formData.date
      };

      // Only include mood if it has a value
      // Mood is now automatically detected by AI, no need to send manually


      console.log('Saving journal entry:', {
        isEditing: !!editingEntry,
        entryId: editingEntry?._id,
        payload
      });

      let response;
      if (editingEntry && editingEntry._id) {
        // Use PUT for explicit editing
        response = await axios.put(getFullUrl(`/api/journal/${editingEntry._id}`), payload, {
          headers: getAuthHeaders(user)
        });
      } else {
        // Use POST for create/append (will handle one-per-day logic)
        response = await axios.post(getFullUrl(API_ENDPOINTS.JOURNAL_CREATE), payload, {
          headers: getAuthHeaders(user)
        });
      }

      console.log('Save response:', response.data);

      if (response.data.success) {
        setJustSaved(true); // Prevent auto-reopening form
        
        // Update original content to reflect saved state
        setOriginalContent(formData.content);
        
        // Update editingEntry with the latest data (including new mood)
        if (response.data.entry) {
          setEditingEntry(response.data.entry);
          
          // Update todaysEntry if this is today's entry
          const entryDate = new Date(response.data.entry.date);
          const today = new Date();
          const isToday = entryDate.toDateString() === today.toDateString();
          
          if (isToday) {
            setTodaysEntry(response.data.entry);
          }
        }
        
        setError('');
        
        // Show success feedback only for new entries, not updates
        if (!editingEntry) {
          setShowSaveSuccess(true);
          setTimeout(() => {
            setShowSaveSuccess(false);
          }, 2000);
        }
        
        // Refresh data in background without showing loading states
        fetchEntries(false);
        fetchTodaysEntry();
        
        // Force immediate update of todaysEntry if this was today's entry
        const entryDate = new Date(response.data.entry.date);
        const today = new Date();
        const isToday = entryDate.toDateString() === today.toDateString();
        
        if (isToday) {
          console.log('🔄 Updating todaysEntry immediately with new mood data');
          setTodaysEntry(response.data.entry);
          setHasTodaysEntry(true);
        }
        
        // Show calendar again after save to display highlighted date
        setShowCalendar(true);
        
        // Reset justSaved flag after a short delay
        setTimeout(() => {
          setJustSaved(false);
        }, 100);
        
        // Keep the form open so user can see the updated text
        // Don't call resetForm() here anymore
        return true; // Success
      }
      return false; // Server response indicated failure
    } catch (error) {
      console.error('Error saving journal entry:', error);
      
      // Handle specific error codes from backend
      if (error.response?.data?.code === 'FUTURE_DATE_NOT_ALLOWED') {
        setError(error.response.data.error || 'Journal entries kunnen niet worden aangemaakt voor toekomstige datums');
      } else if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError(t('failedToSaveEntry', 'Kon dagboek invoer niet opslaan!'));
      }
      return false; // Error occurred
    } finally {
      setIsSavingEntry(false); // Always reset saving state
    }
};

const handleSaveEntry = async () => {
    console.log('=== HANDLE SAVE ENTRY CALLED ===');
    console.log('Form data content:', formData.content);
    console.log('Is editing entry:', !!editingEntry);
    
    // Clear any existing error messages when save/update button is clicked
    setError('');
    
    if (!formData.content.trim()) {
      console.log('ERROR: Empty content');
      setError(t('contentRequired', 'Content is required'));
      return false;
    }

    // Check minimum word count (10 words)
    const wordCount = formData.content.trim().split(/\s+/).length;
    if (wordCount < 10) {
      setError(t('minimumWords', 'Minimaal 10 woorden nodig voor mood analyse. Je hebt nu {count} woorden.').replace('{count}', wordCount));
      return false;
    }

    // Check maximum word count (250 words)
    if (wordCount > 250) {
      setError(t('maximumWords', 'Maximaal 250 woorden toegestaan. Je hebt nu {count} woorden.').replace('{count}', wordCount));
      return false;
    }

    // Perform nonsense detection
    console.log('=== STARTING NONSENSE DETECTION ===');
    console.log('Current content:', formData.content);
    console.log('Is editing entry?', !!editingEntry);
    console.log('About to call performPreSaveChecks...');
    
    const checksResult = await performPreSaveChecks();
    console.log('=== PRE-SAVE CHECKS COMPLETED ===');
    console.log('Pre-save checks result:', checksResult);
    
    if (!checksResult || checksResult.passed === undefined) {
      console.error('Invalid check result, blocking save for safety');
      setError(t('checkFailed', 'Controle mislukt, probeer opnieuw'));
      return false;
    }
    
    if (!checksResult.passed) {
      console.log('Pre-save checks failed:', checksResult.reason);
      setIsSavingEntry(false); // Make sure to reset saving state
      
      // Auto-clear error message after 5 seconds for nonsense detection
      if (checksResult.reason === 'nonsense_text') {
        setTimeout(() => {
          setError('');
        }, 5000);
      }
      
      return false; // Error already set in performPreSaveChecks
    }
    
    console.log('Pre-save checks passed, proceeding with save');
    const saveSuccess = await proceedWithSave();
    return saveSuccess;
  };

  const handleEditEntry = (entry) => {
    const content = entry.content || '';
    setFormData({
      title: entry.title,
      content: content,
      mood: entry.mood || '',
      date: entry.date ? new Date(entry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setOriginalContent(content); // Track the original content
    setEditingEntry(entry);
    setShowCreateForm(true);
  };

  const handleDeleteEntry = async (entryId) => {
    showConfirmDialog(
      t('confirmDeleteEntry', 'Are you sure you want to delete this journal entry?'),
      async () => {
        try {
          // Immediately remove from local state for instant UI update
          setEntries(prevEntries => prevEntries.filter(entry => entry._id !== entryId));
          
          // Clear states that might still reference the deleted entry
          if (editingEntry && editingEntry._id === entryId) {
            setEditingEntry(null);
            setShowCreateForm(false);
            
            // Reset form data if we were editing this entry
            setFormData({
              title: '',
              content: '',
              mood: '',
              date: new Date().toISOString().split('T')[0]
            });
            setOriginalContent('');
          }
          
          // Clear todaysEntry if it matches the deleted entry
          if (todaysEntry && todaysEntry._id === entryId) {
            setTodaysEntry(null);
            setHasTodaysEntry(false);
          }
          
          // Make the API call to delete from backend
          await axios.delete(getFullUrl(`/api/journal/${entryId}?userId=${user.id}`), {
            headers: getAuthHeaders(user)
          });
          
          // Refresh today's entry to ensure consistency
          await fetchTodaysEntry();
        } catch (error) {
          console.error('Error deleting journal entry:', error);
          setError(t('failedToDeleteEntry', 'Failed to delete journal entry'));
          // If API call failed, restore the entries by refetching
          await fetchEntries();
        }
      }
    );
  };

  const handleGenerateAudio = async (entry) => {
    console.log('Generate audio clicked for entry:', entry._id);
    console.log('User credits:', userCredits);
    console.log('Selected voice ID:', selectedVoiceId);
    
    if (userCredits && userCredits.credits < 1) {
      setError(t('insufficientTokensAudio', 'Insufficient tokens. You need 1 token to generate audio.'));
      return;
    }

    try {
      setGeneratingAudio(entry._id);
      setError('');
      
      const requestData = {
        userId: user.id,
        voiceId: selectedVoiceId === 'default' ? 'pNInz6obpgDQGcFmaJgB' : selectedVoiceId
      };
      
      console.log('Sending audio generation request:', requestData);
      
      const response = await axios.post(getFullUrl(`/api/journal/${entry._id}/generate-audio`), requestData, {
        headers: getAuthHeaders(user)
      });

      console.log('Audio generation response:', response.data);

      if (response.data.success) {
        console.log('Audio generation successful, refreshing entries...');
        await fetchEntries();
        if (onCreditsUpdate) {
          onCreditsUpdate();
        }
        // Show success message
        if (response.data.message) {
          showAlert(response.data.message, 'success');
        }
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || t('failedToGenerateAudio', 'Failed to generate audio');
      setError(errorMessage);
    } finally {
      setGeneratingAudio(null);
    }
  };

  const handleShareEntry = async (entry) => {
    if (!entry.audioFile) {
      setError(t('needAudioToShare', 'You need to generate audio before sharing'));
      return;
    }

    try {
      const response = await axios.post(getFullUrl(`/api/journal/${entry._id}/share`), {
        userId: user.id
      }, {
        headers: getAuthHeaders(user)
      });

      if (response.data.success) {
        await fetchEntries();
        showAlert(t('entrySharedSuccess', 'Journal entry shared successfully!'), 'success');
      }
    } catch (error) {
      console.error('Error sharing entry:', error);
      setError(t('failedToShareEntry', 'Failed to share journal entry'));
    }
  };

  const handlePlayAudio = (entry) => {
    if (!entry.audioFile) return;

    const audio = document.querySelector(`#journal-audio-${entry._id}`);
    if (audio) {
      if (audio.paused) {
        // Pause all other audios first
        document.querySelectorAll('audio').forEach(a => a.pause());
        audio.play()
          .then(() => {
            setPlayingEntryId(entry._id);
          })
          .catch(err => {
            console.error('Error playing audio:', err);
          });
      } else {
        audio.pause();
        setPlayingEntryId(null);
      }
    }
  };

  const formatDate = (dateString) => {
    // Get current language from i18n
    const currentLanguage = i18n.language || 'nl';
    
    // Map language codes to locales
    const localeMap = {
      'nl': 'nl-NL',
      'en': 'en-US',
      'de': 'de-DE',
      'fr': 'fr-FR',
      'es': 'es-ES',
      'it': 'it-IT',
      'pt': 'pt-PT',
      'ru': 'ru-RU',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'zh': 'zh-CN',
      'ar': 'ar-SA',
      'hi': 'hi-IN'
    };
    
    const locale = localeMap[currentLanguage] || 'nl-NL';
    
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to show mood description for 3 seconds
  const handleMoodIconClick = (moodData) => {
    setShowMoodDescription(moodData);
    setTimeout(() => {
      setShowMoodDescription(null);
    }, 3000);
  };


  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      
      // Prevent multiple simultaneous recordings
      if (recordingState !== 'idle') {
        console.log('Recording already in progress, state:', recordingState);
        return;
      }

      setError('');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(t('getUserMediaNotSupported', 'getUserMedia not supported'));
      }

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error(t('mediaRecorderNotSupported', 'MediaRecorder not supported'));
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      // Check if the stream has audio tracks
      if (!stream.getAudioTracks().length) {
        throw new Error(t('noAudioTracks', 'No audio tracks available'));
      }

      // Use supported audio format for mobile
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser decide
          }
        }
      }

      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      const audioChunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        console.log('MediaRecorder stopped, processing audio...');
        
        // Clear timer immediately
        if (recorder.timer) {
          clearInterval(recorder.timer);
          recorder.timer = null;
        }
        
        // Set processing state
        setRecordingState('processing');
        setMediaRecorder(null);
        setRecordingTime(0);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Transcribe the audio if we have data
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: recorder.mimeType || 'audio/webm' });
          await transcribeAudio(audioBlob);
        } else {
          console.warn('No audio chunks recorded');
          setRecordingState('idle');
        }
      };

      // Start recording
      recorder.start(1000);
      setMediaRecorder(recorder);
      setRecordingState('recording');
      setRecordingTime(0);

      // Start timer
      const timer = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) { // Max 5 minutes
            console.log('Auto-stopping recording after 5 minutes');
            if (recorder && recorder.state !== 'inactive') {
              recorder.stop();
            }
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Store timer reference
      recorder.timer = timer;
      
      console.log('Recording started successfully');

    } catch (error) {
      console.error('Error starting recording:', error);
      setRecordingState('idle');
      
      let errorMessage = t('microphoneAccessDenied', 'Microphone access denied. Please allow microphone access.');
      
      if (error.name === 'NotFoundError') {
        errorMessage = t('microphoneNotFound', 'No microphone found. Please check if your device has a microphone.');
      } else if (error.name === 'NotAllowedError') {
        errorMessage = t('microphoneAccessDenied', 'Microfoon toegang geweigerd. Sta microfoon toegang toe in je browser.');
      } else if (error.name === 'NotSupportedError' || error.message.includes('not supported')) {
        errorMessage = t('audioRecordingNotSupported', 'Audio opname wordt niet ondersteund door je browser. Probeer Chrome of Safari.');
      } else if (error.name === 'NotReadableError') {
        errorMessage = t('microphoneInUse', 'Microfoon wordt gebruikt door een andere app. Sluit andere apps die de microfoon gebruiken.');
      }
      
      setError(errorMessage);
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording manually...');
    if (mediaRecorder && recordingState === 'recording') {
      // Clear timer first
      if (mediaRecorder.timer) {
        clearInterval(mediaRecorder.timer);
        mediaRecorder.timer = null;
      }
      
      // Stop recording
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      
      console.log('Recording stop requested');
    }
  };

  const transcribeAudio = async (audioBlob) => {
    console.log('Starting transcription...');
    setTranscribing(true);
    try {
      // Check if the audio blob has content
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error(t('noAudioDataRecorded', 'No audio data recorded'));
      }

      console.log('Audio blob size:', audioBlob.size, 'type:', audioBlob.type);

      // Create FormData to send audio file
      const formData = new FormData();
      
      // Use appropriate file extension based on blob type
      let fileName = 'recording.webm';
      if (audioBlob.type.includes('mp4')) {
        fileName = 'recording.mp4';
      } else if (audioBlob.type.includes('wav')) {
        fileName = 'recording.wav';
      }
      
      formData.append('audio', audioBlob, fileName);
      
      // Use current UI language for speech recognition
      let speechLanguage = 'nl-NL'; // Default to Dutch
      const currentLanguage = i18n.language || 'nl';
      
      // Map UI languages to Google Speech-to-Text language codes
      const languageMap = {
        'nl': 'nl-NL',
        'en': 'en-US', 
        'de': 'de-DE',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'it': 'it-IT',
        'pt': 'pt-PT',
        'ru': 'ru-RU',
        'zh': 'zh-CN',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        'ar': 'ar-SA',
        'hi': 'hi-IN'
      };
      
      speechLanguage = languageMap[currentLanguage] || 'nl-NL';
      console.log('Using speech language:', speechLanguage, 'for UI language:', currentLanguage);
      formData.append('language', speechLanguage);

      const response = await axios.post(getFullUrl(API_ENDPOINTS.JOURNAL_TRANSCRIBE), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-user-id': user.id
        },
        timeout: 45000, // 45 second timeout for Google Speech-to-Text
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      if (response.data.success) {
        // Add transcribed text to existing content
        const transcribedText = response.data.transcription;
        if (transcribedText && transcribedText.trim()) {
          setFormData(prev => ({
            ...prev,
            content: prev.content ? `${prev.content}\n\n${transcribedText}` : transcribedText
          }));
          
          // Auto-scroll to bottom after transcription
          setTimeout(() => {
            // Use the appropriate grammar checker ref based on which form is active
            let activeGrammarRef;
            if (activeTab === 'write' && !showCreateForm) {
              activeGrammarRef = writeTabGrammarCheckerRef;
            } else if (showCreateForm) {
              activeGrammarRef = grammarCheckerRef;
            } else {
              activeGrammarRef = quickGrammarCheckerRef;
            }
            const activeTextareaRef = activeGrammarRef?.current?.textareaRef;
            
            if (activeTextareaRef && activeTextareaRef.current) {
              activeTextareaRef.current.scrollTop = activeTextareaRef.current.scrollHeight;
              activeTextareaRef.current.focus();
              // Set cursor to end of text
              const textLength = activeTextareaRef.current.value.length;
              activeTextareaRef.current.setSelectionRange(textLength, textLength);
            }
          }, 100);
          
          setError('');
        } else {
          setError(t('noSpeechDetectedRetry', 'No speech detected. Please try speaking again.'));
        }
      } else {
        setError(t('transcriptionFailed', 'Speech transcription failed. Please try again.'));
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      let errorMessage = t('transcriptionError', 'Error processing speech. Please try again.');
      
      if (error.response?.status === 400) {
        const apiError = error.response?.data?.error || '';
        if (apiError.includes('No speech detected')) {
          errorMessage = t('noSpeechDetected', 'No speech detected. Please speak more clearly into the microphone.');
        } else if (apiError.includes('too large')) {
          errorMessage = t('audioFileTooLarge', 'Audio file too large. Maximum 10MB allowed.');
        } else if (apiError.includes('Invalid audio format')) {
          errorMessage = t('invalidAudioFormat', 'Invalid audio format. Please try recording again.');
        } else {
          errorMessage = apiError || t('invalidAudioFormatRetry', 'Invalid audio format. Please try again.');
        }
      } else if (error.response?.status === 500) {
        const apiError = error.response?.data?.error || '';
        if (apiError.includes('Google Cloud API key')) {
          errorMessage = t('googleSpeechNotConfigured', 'Google Speech service not configured. Please contact the administrator.');
        } else if (apiError.includes('quota exceeded')) {
          errorMessage = t('googleSpeechQuotaExceeded', 'Google Speech quota exceeded. Please try again later.');
        } else {
          errorMessage = t('transcriptionServiceUnavailable', 'Transcription service temporarily unavailable.');
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = t('transcriptionTimeout', 'Transcription timeout. Audio too long or connection too slow.');
      } else if (error.message?.includes('Network Error')) {
        errorMessage = t('networkError', 'Network error. Please check your internet connection.');
      }
      
      setError(errorMessage);
    } finally {
      console.log('Transcription completed, resetting states...');
      setTranscribing(false);
      // Ensure we're back to idle state
      setRecordingState('idle');
    }
  };


  // Count words in text
  const countWords = (text) => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };

  // Slider navigation functions
  const goToSlide = (slideIndex) => {
    if (!isSliding && slideIndex >= 0 && slideIndex < entries.length) {
      setIsSliding(true);
      setCurrentSlide(slideIndex);
      setTimeout(() => setIsSliding(false), 300);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlide > 0) {
      goToSlide(currentSlide - 1);
    }
  };

  const goToNextSlide = () => {
    if (currentSlide < entries.length - 1) {
      goToSlide(currentSlide + 1);
    }
  };

  // Touch/Swipe handling
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentSlide < entries.length - 1) {
      goToNextSlide();
    }
    if (isRightSwipe && currentSlide > 0) {
      goToPrevSlide();
    }
  };

  // Auto-save functionality - DISABLED to prevent bypassing nonsense detection
  const autoSave = useCallback(async () => {
    // Auto-save is completely disabled to ensure all saves go through proper nonsense detection
    // Users must manually save with the save button which includes all checks
    console.log('Auto-save is disabled - manual save required to ensure nonsense detection');
    return;
  }, []);

  // Auto-save effect - triggers after user stops typing for 2 seconds
  useEffect(() => {
    if (!user || !showCreateForm || !formData.content.trim()) return;

    const timeoutId = setTimeout(() => {
      autoSave();
    }, 2000); // 2 seconds delay

    return () => clearTimeout(timeoutId);
  }, [formData.content, user, showCreateForm, autoSave]);

  // Addictions functions
  const fetchAddictions = async () => {
    try {
      const response = await axios.get(getFullUrl(`/api/addictions/user/${user.id}`), {
        headers: getAuthHeaders(user)
      });
      setAddictions(response.data.addictions);
    } catch (error) {
      console.error('Error fetching addictions:', error);
      setError(t('failedToLoadAddictions', 'Failed to load addictions'));
    }
  };

  const handleSaveAddiction = async (e) => {
    e.preventDefault();
    try {
      setError('');
      
      const requestData = {
        userId: user.id,
        ...addictionForm
      };
      
      let response;
      if (editingAddiction) {
        response = await axios.put(getFullUrl(`/api/addictions/${editingAddiction._id}`), requestData, {
          headers: getAuthHeaders(user)
        });
      } else {
        response = await axios.post(getFullUrl(API_ENDPOINTS.ADDICTIONS_CREATE), requestData, {
          headers: getAuthHeaders(user)
        });
      }
      
      if (response.data.success) {
        await fetchAddictions();
        setShowAddictionForm(false);
        setEditingAddiction(null);
        setAddictionForm({
          type: '',
          description: '',
          startDate: '',
          quitDate: '',
          status: 'active',
          cruksRegistration: {
            isRegistered: false,
            registrationDate: ''
          }
        });
      }
    } catch (error) {
      console.error('Error saving addiction:', error);
      setError(error.response?.data?.error || t('failedToSaveAddiction', 'Failed to save addiction'));
    }
  };

  const handleEditAddiction = (addiction) => {
    setAddictionForm({
      type: addiction.type,
      description: addiction.description || '',
      startDate: addiction.startDate ? new Date(addiction.startDate).toISOString().split('T')[0] : '',
      quitDate: addiction.quitDate ? new Date(addiction.quitDate).toISOString().split('T')[0] : '',
      status: addiction.status,
      cruksRegistration: {
        isRegistered: addiction.cruksRegistration?.isRegistered || false,
        registrationDate: addiction.cruksRegistration?.registrationDate ? 
          new Date(addiction.cruksRegistration.registrationDate).toISOString().split('T')[0] : ''
      }
    });
    setEditingAddiction(addiction);
    setShowAddictionForm(true);
  };

  const handleDeleteAddiction = async (addictionId) => {
    showConfirmDialog(
      t('confirmDeleteAddiction', 'Are you sure you want to delete this addiction tracking?'),
      async () => {
        try {
          await axios.delete(getFullUrl(`/api/addictions/${addictionId}?userId=${user.id}`), {
            headers: getAuthHeaders(user)
          });
          await fetchAddictions();
        } catch (error) {
          console.error('Error deleting addiction:', error);
          setError(t('failedToDeleteAddiction', 'Failed to delete addiction'));
        }
      }
    );
  };

  const getAddictionIcon = (type) => {
    const icons = {
      'smoking': '🚭',
      'alcohol': '🍷',
      'drugs': '💊',
      'gambling': '🎲',
      'shopping': '🛍️',
      'social_media': '📱',
      'gaming': '🎮',
      'food': '🍔',
      'caffeine': '☕',
      'sugar': '🍭',
      'phone': '📱',
      'internet': '🌐',
      'other': '❓'
    };
    return icons[type] || '❓';
  };

  const getAddictionDisplayName = (addiction) => {
    const names = {
      'smoking': t('smoking', 'Smoking'),
      'alcohol': t('alcohol', 'Alcohol'),
      'drugs': t('drugs', 'Drugs'),
      'gambling': t('gambling', 'Gambling'),
      'shopping': t('shopping', 'Shopping'),
      'social_media': t('socialMedia', 'Social Media'),
      'gaming': t('gaming', 'Gaming'),
      'food': t('food', 'Food'),
      'caffeine': t('caffeine', 'Caffeine'),
      'sugar': t('sugar', 'Sugar'),
      'phone': t('phone', 'Phone'),
      'internet': t('internet', 'Internet'),
      'other': t('other', 'Other')
    };
    return names[addiction.type] || addiction.customType || addiction.type;
  };

  // Helper function to get total days of addiction
  const getTotalAddictionDays = (addiction) => {
    if (!addiction.startDate) return 0;
    
    const startDate = new Date(addiction.startDate + 'T00:00:00');
    const endDate = addiction.quitDate ? new Date(addiction.quitDate + 'T00:00:00') : new Date();
    
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return Math.max(0, diffDays);
  };

  const getDaysClean = (addiction) => {
    try {
      if (!addiction.quitDate || addiction.status === 'active' || addiction.status === 'relapsed') {
        return 0;
      }
      
      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Parse quit date - handle different formats
      let quitDate;
      const quitDateValue = addiction.quitDate;
      
      if (!quitDateValue) return 0;
      
      // If it's already a Date object
      if (quitDateValue instanceof Date) {
        quitDate = new Date(quitDateValue);
      }
      // If it's a string
      else if (typeof quitDateValue === 'string') {
        // Try to parse ISO format first
        quitDate = new Date(quitDateValue);
        
        // If that gives invalid date, try manual parsing
        if (isNaN(quitDate.getTime())) {
          // Extract YYYY-MM-DD part
          const match = quitDateValue.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (match) {
            quitDate = new Date(
              parseInt(match[1]), 
              parseInt(match[2]) - 1, 
              parseInt(match[3])
            );
          }
        }
      }
      
      // Validation
      if (!quitDate || isNaN(quitDate.getTime())) {
        return 0;
      }
      
      // Set quit date to midnight
      quitDate.setHours(0, 0, 0, 0);
      
      // Calculate difference in days
      const msPerDay = 24 * 60 * 60 * 1000;
      const diffInMs = today.getTime() - quitDate.getTime();
      const diffInDays = Math.floor(diffInMs / msPerDay);
      
      return Math.max(0, diffInDays);
    } catch (error) {
      console.error('Days calculation error:', error);
      return 0;
    }
  };

  // Fetch addictions when user changes or when addictions tab is active
  useEffect(() => {
    if (user && activeTab === 'addictions') {
      fetchAddictions();
    }
  }, [user, activeTab]);

  // Keyboard shortcuts for calendar navigation
  useEffect(() => {
    const handleKeyPress = (event) => {
      // ESC key to go back to calendar when in calendar tab and calendar is hidden
      if (event.key === 'Escape' && activeTab === 'calendar' && !showCalendar) {
        setShowCalendar(true);
        // Reset form if no changes were made
        if (!hasContentChanged()) {
          setSelectedDate('');
          setFormData({ title: '', content: '', mood: '' });
          setEditingEntry(null);
        }
      }
    };

    // Only add event listener when in calendar tab
    if (activeTab === 'calendar') {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [activeTab, showCalendar, hasContentChanged]);

  // Poll for trigger alerts every 30 seconds
  useEffect(() => {
    if (!user) return;

    let triggerPollingInterval;

    const checkForTriggers = async () => {
      try {
        // Don't check if already showing a trigger alert
        if (showTriggerAlert) return;

        console.log('Checking for trigger alerts...');
        const response = await axios.get(getFullUrl(`/api/ai-coach/check-triggers/${user.id}`), {
          headers: getAuthHeaders(user)
        });
        
        if (response.data.success && response.data.triggers && response.data.triggers.length > 0) {
          const trigger = response.data.triggers[0]; // Show the first (most recent) trigger
          console.log('New trigger detected:', trigger);
          handleTriggerDetected(trigger);
        }
      } catch (error) {
        console.error('Error checking for triggers:', error);
        // Don't show error to user - this is background polling
      }
    };

    // Check immediately on mount
    checkForTriggers();

    // Set up polling interval (every 30 seconds)
    triggerPollingInterval = setInterval(checkForTriggers, 30000);

    return () => {
      if (triggerPollingInterval) {
        clearInterval(triggerPollingInterval);
      }
    };
  }, [user, showTriggerAlert]);

  // Auto-hide error messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="journal-container" data-calendar-version="2025.01.17.2">
        <div className="loading-spinner">
          <div className="spinner"></div>
          {t('loading', 'Loading...')}
        </div>
      </div>
    );
  }

  // Generate calendar days for selected month - COMPLETE GRID
  const generateCalendarDays = () => {
    const today = new Date();
    const todayDateString = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
    
    const currentYear = currentCalendarMonth.getFullYear();
    const currentMonth = currentCalendarMonth.getMonth();
    
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayWeekday; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = currentYear + '-' + 
        String(currentMonth + 1).padStart(2, '0') + '-' + 
        String(day).padStart(2, '0');
      
      const isToday = dateString === todayDateString;
      const dayDate = new Date(currentYear, currentMonth, day);
      const isPast = dayDate < today && !isToday;
      
      // Check if there's an entry for this date and get its mood
      const entryForDate = entries.find(entry => {
        const entryDate = new Date(entry.date);
        const entryDateString = entryDate.getFullYear() + '-' + 
          String(entryDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(entryDate.getDate()).padStart(2, '0');
        return entryDateString === dateString;
      });
      
      const hasEntry = !!entryForDate;
      const entryMood = entryForDate?.mood || null;
      
      days.push({
        day,
        date: dateString,
        isToday,
        isPast,
        hasEntry,
        mood: entryMood,
        isClickable: isPast || isToday
      });
    }
    
    // Fill remaining cells to complete the 6x7 grid (42 total cells)
    const totalCells = 42;
    while (days.length < totalCells) {
      days.push(null);
    }
    
    return days;
  };

  const handleCalendarDateClick = (dateString) => {
    console.log('handleCalendarDateClick called with:', dateString);
    if (dateString) {
      handleDateSelection(dateString);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    const today = new Date();
    const nextMonth = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1);
    // Don't allow navigation beyond current month
    if (nextMonth <= today) {
      setCurrentCalendarMonth(nextMonth);
    }
  };

  const goToCurrentMonth = () => {
    setCurrentCalendarMonth(new Date());
  };

  const formatMonthYear = () => {
    const currentLanguage = i18n.language || 'nl';
    
    const localeMap = {
      'nl': 'nl-NL',
      'en': 'en-US',
      'de': 'de-DE',
      'fr': 'fr-FR',
      'es': 'es-ES',
      'it': 'it-IT',
      'pt': 'pt-PT',
      'ru': 'ru-RU',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'zh': 'zh-CN',
      'ar': 'ar-SA',
      'hi': 'hi-IN'
    };
    
    const locale = localeMap[currentLanguage] || 'nl-NL';
    
    return currentCalendarMonth.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long'
    });
  };

  return (
    <div className="journal-container" data-calendar-version="2025.01.17.2">
      {/* CSS for mood description tooltip */}
      <style>{`
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          10% {
            opacity: 1;
            transform: translateX(-50%) translateY(0px);
          }
          90% {
            opacity: 1;
            transform: translateX(-50%) translateY(0px);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
        }
      `}</style>
      {/* Hover Effects CSS */}
      <style>{`
        .mood-card-hover {
          position: relative;
          overflow: visible;
        }
        
        
        .mood-card-hover:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15) !important;
        }
        
        
        
        @media (max-width: 768px) {
          .mood-card-hover:hover {
            transform: translateY(-2px) !important;
          }
          
        }
      `}</style>
      
      <PageHeader 
        user={user}
        onProfileClick={onProfileClick}
        unreadCount={unreadCount}
        onInboxClick={onInboxClick}
        onCreateClick={onCreateClick}
      />

      {/* Tab Navigation */}
      <div className="journal-tabs">
        <button 
          className={`tab ${activeTab === 'write' ? 'active' : ''}`}
          onClick={() => setActiveTab('write')}
        >
          <span className="tab-icon">✏️</span>
          <span className="tab-label">{t('write', 'Schrijven')}</span>
        </button>
        <button 
          className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <span className="tab-icon">📅</span>
          <span className="tab-label">{t('calendar', 'Kalender')}</span>
        </button>
        <button 
          className={`tab ${activeTab === 'archive' ? 'active' : ''}`}
          onClick={() => setActiveTab('archive')}
        >
          <span className="tab-icon">📚</span>
          <span className="tab-label">{t('archive', 'Archief')}</span>
        </button>
        <button 
          className={`tab ${activeTab === 'addictions' ? 'active' : ''}`}
          onClick={() => setActiveTab('addictions')}
        >
          <span className="tab-icon">🧠</span>
          <span className="tab-label">{t('addictions', 'Addictions')}</span>
        </button>
        <button 
          className={`tab ${activeTab === 'coach' ? 'active' : ''}`}
          onClick={() => setActiveTab('coach')}
        >
          <span className="tab-icon">🤖</span>
          <span className="tab-label">{t('coach', 'Coach')}</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="journal-tab-content">

        {/* Write Tab - New Modern Dashboard */}
        {activeTab === 'write' && (
          <div className="write-tab-content">
            
            {/* Today's Writing Card */}
            <div className="todays-writing-section">
              <div className="writing-card-header-centered">
                <span 
                  className="today-date-styled"
                  onClick={() => setActiveTab('calendar')}
                  style={{ 
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textDecorationStyle: 'dotted',
                    textUnderlineOffset: '3px'
                  }}
                  title={t('openCalendar', 'Open kalender')}
                >
                  📅 {formatDate(new Date().toISOString().split('T')[0])}
                </span>
              </div>

              {/* Quick Write Area */}
              <div className="quick-write-card">
                {todaysEntry ? (
                  // Continue existing entry
                  <div className="existing-entry-preview">
                    <div className="entry-mood-badge">
                      {todaysEntry.mood && moods.find(m => m.value === todaysEntry.mood)?.emoji || '😐'} 
                      <span className="mood-label">
                        {todaysEntry.mood ? moods.find(m => m.value === todaysEntry.mood)?.label || t('neutral', 'Neutraal') : t('detectingMood', 'Stemming detecteren...')}
                      </span>
                    </div>
                    <div className="entry-preview-text">
                      {todaysEntry.content.substring(0, 150)}
                      {todaysEntry.content.length > 150 && '...'}
                    </div>
                    <div className="entry-actions">
                      <button 
                        className="continue-writing-btn"
                        onClick={() => {
                          handleEditEntry(todaysEntry);
                        }}
                      >
                        📝 {t('continueWriting', 'Verder schrijven')}
                      </button>
                    </div>
                  </div>
                ) : (
                  // New entry quick start
                  <div className="new-entry-quick-start">
                    {/* Error Banner */}
                    {error && (
                      <div className="journal-error-message">
                        <span>{error}</span>
                        <button 
                          onClick={() => setError('')}
                          style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            color: 'white',
                            cursor: 'pointer',
                            marginLeft: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 'bold'
                          }}
                        >×</button>
                      </div>
                    )}
                    
                    <SpellingChecker
                      ref={writeTabGrammarCheckerRef}
                      text={formData.content}
                      onTextChange={(newText) => setFormData({...formData, content: newText})}
                      placeholder={voiceRecordingState === 'recording' ? t('voiceRecordingActive', '🎙️ Voice is being recorded...') : 
                                 voiceRecordingState === 'processing' ? t('voiceProcessing', '⏳ Voice is being processed...') :
                                 t('quickWritePlaceholder', 'Start writing here about your day, thoughts or feelings...')}
                      className={`quick-write-textarea ${(voiceRecordingState === 'recording' || voiceRecordingState === 'processing') ? 'voice-active' : ''}`}
                      rows={4}
                      maxLength={200}
                      enabled={voiceRecordingState !== 'recording' && voiceRecordingState !== 'processing'}
                    />
                    <div className="quick-write-actions">
                      <button 
                        className="expand-editor-btn"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            date: new Date().toISOString().split('T')[0]
                          });
                          setShowCreateForm(true);
                        }}
                        disabled={!formData.content.trim()}
                      >
                        ✏️ {t('writeMore', 'Uitgebreid schrijven')}
                      </button>
                      <button 
                        className="quick-save-btn"
                        onClick={async () => {
                          console.log('=== QUICK SAVE BUTTON CLICKED ===');
                          try {
                            setFormData({
                              ...formData,
                              date: new Date().toISOString().split('T')[0]
                            });
                            console.log('About to call handleSaveEntry from quick save...');
                            await handleSaveEntry();
                            console.log('Quick save handleSaveEntry completed');
                          } catch (error) {
                            console.error('=== ERROR IN QUICK SAVE ===', error);
                          }
                        }}
                        disabled={!formData.content.trim() || formData.content.trim().split(/\s+/).length < 10}
                      >
                        💾 {t('quickSave', 'Snel opslaan')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Archive Tab (previously Browse) */}
        {activeTab === 'archive' && (
          <div className="archive-tab-content">
            {/* Entries Slider */}
            <div className="entries-slider-container">
              {entries.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📝</div>
                  <h3>{t('noEntries', 'Nog geen dagboek entries')}</h3>
                  <p>{t('startWritingCalendar', 'Begin met schrijven in de "Kalender" tab')}</p>
                  <button 
                    className="start-writing-btn"
                    onClick={() => setActiveTab('calendar')}
                  >
                    📅 {t('goToCalendar', 'Ga naar Kalender')}
                  </button>
                </div>
              ) : (
                <>
                  {/* Filter Section */}
                  <div className="filter-section">
                    {/* Filter Row - Month and Mood side by side */}
                    <div className="filter-row">
                      {/* Month Filter */}
                      <div className="month-filter">
                        <select 
                          value={selectedMonth} 
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="month-select"
                        >
                          <option value="">{t('allMonths', 'Alle maanden')}</option>
                          {getMonthOptions().map(month => (
                            <option key={month.key} value={month.key}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Mood Dropdown */}
                      <div className="mood-dropdown">
                        <select 
                          value={selectedMood} 
                          onChange={(e) => setSelectedMood(e.target.value)}
                          className="mood-select"
                        >
                          <option value="">{t('allMoods', 'Alle stemmingen')}</option>
                          {moods.map(mood => (
                            <option key={mood.value} value={mood.value}>
                              {mood.emoji} {mood.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                  </div>

                  {/* Mood Grid */}
                  <div className="mood-grid">
                    {getFilteredEntries().map((entry, index) => (
                      <div 
                        key={entry._id} 
                        className="mood-grid-card clickable mood-card-hover"
                        data-mood={entry.mood || 'neutral'}
                        style={{ 
                          '--card-index': index,
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                          backdropFilter: 'blur(25px)',
                          borderRadius: '20px',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          height: '240px',
                          transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onClick={() => handleEditEntry(entry)}
                        title={`${t('openJournalEntry', 'Open journal entry')}: ${entry.title}`}
                      >
                        {/* Mood Badge */}
                        <div 
                          className="mood-badge" 
                          data-mood={entry.mood || 'neutral'}
                          style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            width: '50px',
                            height: '50px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            background: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                        >
                          {moods.find(m => m.value === entry.mood)?.emoji || '😐'}
                        </div>

                        {/* Card Content */}
                        <div className="mood-card-content" style={{ padding: '20px' }}>
                          <div className="mood-card-header">
                            <div className="mood-card-meta">
                              <span title={t('wordCount', 'Word count')} style={{ fontSize: '11px', opacity: '0.7' }}>
                                📝 {countWords(entry.content)}
                              </span>
                              <span title={t('readingTime', 'Reading time')} style={{ fontSize: '11px', opacity: '0.7' }}>
                                ⏱️ {Math.ceil(countWords(entry.content) / 200)}m
                              </span>
                            </div>
                          </div>

                          <h3 className="mood-card-title" style={{ fontSize: '18px', fontWeight: '600', marginTop: '12px', marginBottom: '8px' }}>
                            {entry.title}
                          </h3>

                          <div className="mood-card-preview" style={{ fontSize: '14px', lineHeight: '1.5', opacity: '0.85', marginBottom: '16px' }}>
                            {entry.content.split(' ').slice(0, 12).join(' ')}{entry.content.split(' ').length > 12 ? '...' : ''}
                          </div>

                          <div className="mood-card-actions" style={{ marginTop: 'auto' }}>
                            <button 
                              className="mood-action-btn primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEntry(entry);
                              }}
                            >
                              📖
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>


                </>
              )}
            </div>
          </div>
        )}

        {/* Voice Tab - Removed: Audio functionality integrated into Browse tab */}
        {false && activeTab === 'voice' && (
          <div className="voice-tab-content">
            {/* Journal Audio Generation Section */}
            <div className="journal-audio-section">
              <h3>{t('generateJournalAudio', 'Generate Journal Audio')}</h3>
              
              {/* Voice Selection */}
              <div className="voice-selection-container">
                <label>{t('selectVoice', 'Select Voice')}:</label>
                <select 
                  value={selectedVoiceId} 
                  onChange={(e) => setSelectedVoiceId(e.target.value)}
                  className="voice-select"
                >
                  <option value="default">{t('defaultVoice', 'Default Voice (Sarah)')}</option>
                  <option value="pNInz6obpgDQGcFmaJgB">Sarah - {t('calm', 'Calm')}</option>
                  <option value="pNInz6obpgDQGcFmaJgB">Adam - {t('deep', 'Deep')}</option>
                  <option value="pNInz6obpgDQGcFmaJgB">Rachel - {t('warm', 'Warm')}</option>
                  {userCustomVoices.map(voice => (
                    <option key={voice.voiceId} value={voice.voiceId}>
                      {voice.name} - {t('customVoice', 'Custom')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Journal Entries List */}
              <div className="journal-entries-for-audio">
                <h4>{t('yourJournalEntries', 'Your Journal Entries')}:</h4>
                {entries.length === 0 ? (
                  <p className="no-entries-message">{t('noEntriesForAudio', 'No journal entries found. Write a journal entry first.')}</p>
                ) : (
                  <div className="audio-entries-list">
                    {entries.map(entry => (
                      <div key={entry._id} className="audio-entry-card">
                        <div className="audio-entry-header">
                          <span className="entry-date-audio">{formatDate(entry.date)}</span>
                          {entry.mood && (
                            <span className="entry-mood-audio">
                              {moods.find(m => m.value === entry.mood)?.emoji}
                            </span>
                          )}
                        </div>
                        <h5 className="entry-title-audio">{entry.title}</h5>
                        <p className="entry-preview-audio">
                          {entry.content.length > 100 ? 
                            `${entry.content.substring(0, 100)}...` : 
                            entry.content
                          }
                        </p>
                        <div className="audio-entry-actions">
                          {!entry.audioFile ? (
                            <button 
                              className="generate-audio-btn"
                              onClick={() => handleGenerateAudio(entry)}
                              disabled={generatingAudio === entry._id}
                            >
                              {generatingAudio === entry._id ? (
                                <>{t('generating', 'Generating...')} <span className="spinner-small"></span></>
                              ) : (
                                <>🎙️ {t('generateAudio', 'Generate Audio')}</>
                              )}
                            </button>
                          ) : (
                            <div className="audio-controls">
                              <button 
                                className="play-audio-btn"
                                onClick={() => handlePlayAudio(entry)}
                              >
                                {playingEntryId === entry._id ? '⏸️' : '▶️'} 
                                {playingEntryId === entry._id ? t('pause', 'Pause') : t('playVoice', 'Play')}
                              </button>
                              <button 
                                className="regenerate-audio-btn"
                                onClick={() => handleGenerateAudio(entry)}
                                disabled={generatingAudio === entry._id}
                                title={t('regenerateAudio', 'Regenerate audio')}
                              >
                                🔄
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <hr className="section-divider" />

            {/* Voice Management Section */}
            <div className="voice-management-card">
              <h3>{t('manageVoices', 'Manage Voices')}</h3>
              
              {/* Voice Recording Interface */}
              <div className="voice-recorder-main">
                {/* Idle State */}
                {voiceRecordingState === 'idle' && (
                  <div className="voice-recorder-idle">
                    <div className="voice-recorder-header">
                      <h4>{t('recordYourVoice', 'Record Your Voice')}</h4>
                      <div className="recording-info">
                        <p className="recording-limit">⏱️ {t('targetTime', 'Maximum 1 minute')}</p>
                        <p className="quality-tips">💡 {t('qualityTips', 'Tips: Speak clearly in a quiet room')}</p>
                        <p className="credit-cost">💰 {t('voiceSaveCost', 'Cost: 2 tokens')}</p>
                      </div>
                    </div>
                    
                    <button 
                      className="start-voice-recording-btn recording-idle-btn"
                      onClick={startVoiceRecording}
                      disabled={!audioSupported}
                    >
                      <div className="mic-icon pulse" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>🎙️</div>
                      <span>{t('startRecording', 'Start Recording')}</span>
                    </button>
                    
                    {!audioSupported && (
                      <div className="audio-not-supported">
                        ⚠️ {t('audioNotSupported', 'Audio recording not available on this device')}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Recording State */}
                {voiceRecordingState === 'recording' && (
                  <div className="voice-recorder-recording">
                    <div className="recording-visual">
                      <div className="recording-pulse recordingPulse"></div>
                      <div className="mic-icon-large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>🎙️</div>
                    </div>
                    
                    <div className="recording-timer live-timer">
                      {Math.floor(voiceRecordingTime / 60)}:{(voiceRecordingTime % 60).toString().padStart(2, '0')}
                    </div>
                    
                    <div className="progress-container">
                      <div 
                        className={`progress-bar live-progress ${
                          voiceRecordingTime <= 30 ? 'progress-good' : 
                          voiceRecordingTime <= 45 ? 'progress-warning' : 
                          'progress-danger'
                        }`}
                        style={{ width: `${(voiceRecordingTime / 60) * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="quality-feedback live-feedback">
                      {voiceRecordingTime > 45 && (
                        <p className="warning-text pulse">⚠️ {t('recordingWarning', 'Almost done! Maximum 1 minute')}</p>
                      )}
                      <p className="feedback-text">
                        {voiceRecordingTime < 15 ? `🔵 ${t('keepTalking', 'Keep talking for better quality')}` : 
                         voiceRecordingTime < 30 ? `🟢 ${t('goodLength', 'Good length!')}` : 
                         voiceRecordingTime < 45 ? `🟡 ${t('optimalLength', 'Optimal length reached')}` : 
                         `🟠 ${t('nearMaximum', 'Near maximum reached')}`}
                      </p>
                    </div>
                    
                    <button 
                      className="stop-voice-recording-btn"
                      onClick={stopVoiceRecording}
                    >
                      ⏹️ {t('stopRecording', 'Stop Recording')}
                    </button>
                  </div>
                )}
                
                {/* Processing State */}
                {voiceRecordingState === 'processing' && (
                  <div className="voice-recorder-processing">
                    <div className="wave-animation waveAnimation">
                      <div className="wave"></div>
                      <div className="wave"></div>
                      <div className="wave"></div>
                    </div>
                    <h4>{t('processingVoice', 'Processing voice...')}</h4>
                    <p>{t('processingMessage', 'Please wait, we are preparing your voice')}</p>
                  </div>
                )}
                
                {/* Preview State */}
                {voiceRecordingState === 'preview' && recordedVoiceBlob && (
                  <div className="voice-recorder-preview">
                    <div className="preview-header success-header">
                      <div className="success-icon">✅</div>
                      <h4>{t('recordingComplete', 'Recording Complete!')}</h4>
                      <p>{t('recordingTime', 'Length')}: {Math.floor(voiceRecordingTime / 60)}:{(voiceRecordingTime % 60).toString().padStart(2, '0')}</p>
                    </div>
                    
                    <button 
                      className="play-preview-btn preview-play-btn"
                      onClick={playVoicePreview}
                    >
                      ▶️ {t('playVoicePreview', 'Play Preview')}
                    </button>
                    
                    <div className="voice-save-section enhanced-save-interface">
                      <input 
                        type="text" 
                        placeholder={generateVoiceName()}
                        className="voice-name-input auto-name-input"
                        defaultValue={generateVoiceName()}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            saveCustomVoice(e.target.value);
                          }
                        }}
                      />
                      <div className="save-info">
                        <span className="credit-cost-display">💰 {t('voiceSaveCost', 'Cost: 2 tokens')}</span>
                      </div>
                      <button 
                        className="save-voice-btn enhanced-save-btn"
                        onClick={(e) => {
                          const input = e.target.parentElement.querySelector('.voice-name-input');
                          saveCustomVoice(input.value || generateVoiceName());
                        }}
                        disabled={uploadingVoice}
                      >
                        {uploadingVoice ? (
                          <><div className="spinner"></div> {t('savingVoice', 'Saving...')}</>
                        ) : (
                          `💾 ${t('saveVoice', 'Save Voice')}`
                        )}
                      </button>
                    </div>
                    
                    <button 
                      className="retake-voice-btn retake-recording-btn"
                      onClick={cancelVoiceRecording}
                    >
                      🔄 {t('retakeRecording', 'Record Again')}
                    </button>
                  </div>
                )}
              </div>

              {/* Custom Voice Management */}
              {userCustomVoices.length > 0 && (
                <div className="custom-voices-management">
                  <h4>{t('yourVoices', 'Je Stemmen')}:</h4>
                  <div className="voices-grid">
                    {userCustomVoices.map(voice => (
                      <div key={voice.voiceId} className="voice-card">
                        <div className="voice-info">
                          <span className="voice-name">{voice.name}</span>
                          <span className="voice-id">ID: {voice.voiceId.substring(0, 8)}...</span>
                        </div>
                        <div className="voice-actions">
                          <button 
                            className="test-voice-btn"
                            onClick={() => setSelectedVoiceId(voice.voiceId)}
                          >
                            🔊 {t('test', 'Test')}
                          </button>
                          <button 
                            className="delete-voice-btn"
                            onClick={() => deleteCustomVoice(voice.voiceId)}
                            title={t('deleteVoice', 'Verwijder stem')}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Addictions Tab */}
        {activeTab === 'addictions' && (
          <div className="addictions-tab-content">
            {/* Addictions Overview */}
            <div className="addictions-overview">
              <div className="addictions-header">
                <h2>{t('addictionTracking', 'Verslavingen Bijhouden')}</h2>
                <button 
                  className="add-addiction-btn"
                  onClick={() => {
                    setAddictionForm({
                      type: '',
                      description: '',
                      startDate: '',
                      quitDate: '',
                      status: 'active',
                      cruksRegistration: {
                        isRegistered: false,
                        registrationDate: ''
                      }
                    });
                    setEditingAddiction(null);
                    setShowAddictionForm(true);
                  }}
                >
                  + {t('addAddiction', 'Verslaving Toevoegen')}
                </button>
              </div>
              
              {/* Quick Stats */}
              <div className="addiction-stats">
                <div className="stat-card active">
                  <div className="stat-number">{addictions.filter(a => a.status === 'active').length}</div>
                  <div className="stat-label">{t('active', 'Actief')}</div>
                </div>
                <div className="stat-card recovering">
                  <div className="stat-number">{addictions.filter(a => a.status === 'recovering').length}</div>
                  <div className="stat-label">{t('recovering', 'Herstellende')}</div>
                </div>
                <div className="stat-card clean">
                  <div className="stat-number">{addictions.filter(a => a.status === 'clean').length}</div>
                  <div className="stat-label">{t('clean', 'Schoon')}</div>
                </div>
              </div>
            </div>

            {/* Addiction Form */}
            {showAddictionForm && (
              <div className="addiction-form-overlay">
                <div className="addiction-form-container">
                  <div className="form-header">
                    <h3>{editingAddiction ? t('editAddiction', 'Verslaving Bewerken') : t('addNewAddiction', 'Nieuwe Verslaving Toevoegen')}</h3>
                    <button 
                      className="close-form-btn"
                      onClick={() => setShowAddictionForm(false)}
                    >
                      ×
                    </button>
                  </div>
                  
                  <form className="addiction-form" onSubmit={handleSaveAddiction}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>{t('addictionType', 'Type Verslaving')}:</label>
                        <select 
                          value={addictionForm.type} 
                          onChange={(e) => setAddictionForm({...addictionForm, type: e.target.value})}
                          required
                        >
                          <option value="">{t('selectType', 'Selecteer type')}</option>
                          <option value="smoking">{t('smoking', 'Roken')}</option>
                          <option value="alcohol">{t('alcohol', 'Alcohol')}</option>
                          <option value="drugs">{t('drugs', 'Drugs')}</option>
                          <option value="gambling">{t('gambling', 'Gokken')}</option>
                          <option value="shopping">{t('shopping', 'Winkelen')}</option>
                          <option value="social_media">{t('socialMedia', 'Social Media')}</option>
                          <option value="gaming">{t('gaming', 'Gaming')}</option>
                          <option value="food">{t('food', 'Eten')}</option>
                          <option value="caffeine">{t('caffeine', 'Cafeïne')}</option>
                          <option value="sugar">{t('sugar', 'Suiker')}</option>
                          <option value="phone">{t('phone', 'Telefoon')}</option>
                          <option value="internet">{t('internet', 'Internet')}</option>
                          <option value="other">{t('other', 'Anders')}</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>{t('status', 'Status')}:</label>
                        <select 
                          value={addictionForm.status} 
                          onChange={(e) => setAddictionForm({...addictionForm, status: e.target.value})}
                        >
                          <option value="active">{t('active', 'Actief')}</option>
                          <option value="recovering">{t('recovering', 'Herstellende')}</option>
                          <option value="relapsed">{t('relapsed', 'Teruggevallen')}</option>
                          <option value="clean">{t('clean', 'Schoon')}</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>{t('description', 'Beschrijving')} ({t('optional', 'optioneel')}):</label>
                      <SpellingChecker
                        text={addictionForm.description}
                        onTextChange={(newText) => setAddictionForm({...addictionForm, description: newText})}
                        onTextUpdated={(newText) => {
                          console.log('Grammar suggestion applied in addiction form, forcing state update');
                          setAddictionForm(prev => ({...prev, description: newText}));
                        }}
                        placeholder={voiceRecordingState === 'recording' ? t('voiceRecordingActive', '🎙️ Voice is being recorded...') : 
                                   voiceRecordingState === 'processing' ? t('voiceProcessing', '⏳ Voice is being processed...') :
                                   t('addictionDescription', 'Describe your addiction, triggers, or other details...')}
                        className={`${(voiceRecordingState === 'recording' || voiceRecordingState === 'processing') ? 'voice-active' : ''}`}
                        rows={3}
                        enabled={voiceRecordingState !== 'recording' && voiceRecordingState !== 'processing'}
                        language="auto"
                        debounceMs={2000}
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>{t('startDate', 'Startdatum')}:</label>
                        <input 
                          type="date" 
                          value={addictionForm.startDate}
                          onChange={(e) => setAddictionForm({...addictionForm, startDate: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>{t('quitDate', 'Stopdatum')} ({t('optional', 'optioneel')}):</label>
                        <input 
                          type="date" 
                          value={addictionForm.quitDate}
                          onChange={(e) => setAddictionForm({...addictionForm, quitDate: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    {/* CRUKS Register Section - Only for gambling addiction in Netherlands */}
                    {addictionForm.type === 'gambling' && (user?.location?.countryCode === 'NL' || user?.location?.country === 'Nederland') && (
                      <div className="cruks-section">
                        <div className="cruks-header">
                          <h4>🇳🇱 {t('cruksRegister', 'CRUKS Register')}</h4>
                          <p className="cruks-description">
                            {t('cruksDescription', 'Houd bij wanneer je je hebt ingeschreven bij het CRUKS gokuitsluitingssysteem.')}
                          </p>
                        </div>
                        
                        <div className="cruks-form">
                          <div className="checkbox-group">
                            <label className="checkbox-label">
                              <input 
                                type="checkbox"
                                checked={addictionForm.cruksRegistration?.isRegistered || false}
                                onChange={(e) => setAddictionForm({
                                  ...addictionForm,
                                  cruksRegistration: {
                                    ...(addictionForm.cruksRegistration || {}),
                                    isRegistered: e.target.checked
                                  }
                                })}
                              />
                              <span className="checkmark"></span>
                              {t('isCruksRegistered', 'Ik ben ingeschreven bij CRUKS')}
                            </label>
                          </div>
                          
                          {addictionForm.cruksRegistration?.isRegistered && (
                            <div className="cruks-details">
                              <div className="form-group">
                                <label>{t('cruksRegistrationDate', 'Inschrijfdatum CRUKS')}:</label>
                                <input 
                                  type="date"
                                  value={addictionForm.cruksRegistration?.registrationDate || ''}
                                  onChange={(e) => setAddictionForm({
                                    ...addictionForm,
                                    cruksRegistration: {
                                      ...(addictionForm.cruksRegistration || {}),
                                      registrationDate: e.target.value
                                    }
                                  })}
                                  required
                                />
                              </div>
                              
                              <div className="cruks-reminder">
                                <div className="reminder-icon">⏰</div>
                                <div className="reminder-text">
                                  <strong>{t('cruksReminder', 'Herinnering')}</strong><br/>
                                  {t('cruksReminderText', 'CRUKS registratie moet elke 6 maanden worden vernieuwd')}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="form-actions">
                      <button type="button" onClick={() => setShowAddictionForm(false)}>
                        {t('cancel', 'Annuleren')}
                      </button>
                      <button type="submit" className="save-btn">
                        {editingAddiction ? t('update', 'Bijwerken') : t('save', 'Opslaan')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Addictions List */}
            <div className="addictions-list">
              {addictions.length === 0 ? (
                <div className="no-addictions">
                  <div className="no-addictions-icon">🌱</div>
                  <h3>{t('noAddictions', 'No addictions tracked')}</h3>
                  <p>{t('addFirstAddiction', 'Voeg je eerste verslaving toe om je voortgang bij te houden')}</p>
                </div>
              ) : (
                <div className="addictions-grid">
                  {addictions.map(addiction => (
                    <div key={addiction._id} className={`addiction-card ${addiction.status}`}>
                      <div className="addiction-header">
                        <div className="addiction-type">
                          <span className="addiction-icon">{getAddictionIcon(addiction.type)}</span>
                          <h4>{getAddictionDisplayName(addiction)}</h4>
                        </div>
                        <div className="addiction-status">
                          <span className={`status-badge ${addiction.status}`}>
                            {t(addiction.status, addiction.status)}
                          </span>
                        </div>
                      </div>
                      
                      {addiction.description && (
                        <p className="addiction-description">{addiction.description}</p>
                      )}
                      
                      <div className="addiction-dates">
                        <div className="date-info">
                          <span className="date-label">{t('started', 'Begonnen')}:</span>
                          <span className="date-value">{formatDate(addiction.startDate)}</span>
                        </div>
                        {addiction.quitDate && (
                          <div className="date-info">
                            <span className="date-label">{t('quit', 'Gestopt')}:</span>
                            <span className="date-value">{formatDate(addiction.quitDate)}</span>
                          </div>
                        )}
                        {addiction.lastRelapse && (
                          <div className="date-info">
                            <span className="date-label">{t('lastRelapse', 'Teruggevallen')}:</span>
                            <span className="date-value">{formatDate(addiction.lastRelapse)}</span>
                          </div>
                        )}
                      </div>
                      
                      {(addiction.status === 'recovering' || addiction.status === 'clean') && addiction.quitDate && (
                        <div className="days-clean">
                          <span className="days-number">{addiction.daysClean || 0}</span>
                          <span className="days-label">{t('daysClean', 'dagen schoon')}</span>
                        </div>
                      )}
                      
                      {/* CRUKS Status Display for Dutch gambling addictions */}
                      {addiction.type === 'gambling' && addiction.cruksStatus && (
                        <div className="cruks-status">
                          <div className="cruks-badge">
                            🇳🇱 {t('cruksStatus', 'CRUKS Status')}: 
                            <span className={`cruks-indicator ${addiction.cruksStatus.isActive ? 'active' : 'expired'}`}>
                              {addiction.cruksStatus.isActive ? 
                                t('cruksActive', 'Actief') : 
                                t('cruksExpired', 'Verlopen')
                              }
                            </span>
                          </div>
                          {addiction.cruksStatus.isActive && addiction.cruksStatus.daysRemaining > 0 && (
                            <div className="cruks-remaining">
                              {t('cruksDaysRemaining', 'Nog {{days}} dagen exclusie', { days: addiction.cruksStatus.daysRemaining })}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="addiction-actions">
                        <button 
                          className="edit-btn"
                          onClick={() => handleEditAddiction(addiction)}
                        >
                          ✏️ {t('edit', 'Bewerken')}
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => handleDeleteAddiction(addiction._id)}
                        >
                          🗑️ {t('delete', 'Verwijderen')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Coach Tab */}
        {activeTab === 'coach' && (
          <div className="coach-tab-content">
            <div className="coach-welcome">
              <div className="coach-avatar">
                <span className="coach-icon">🤖</span>
              </div>
              <div className="coach-intro">
                <h2>{t('aiCoachWelcome', 'Meet Alex, Your AI Recovery Coach')}</h2>
                <p>{t('aiCoachDescription', 'I\'m here 24/7 to support you on your recovery journey. I can help you recognize triggers, provide coping strategies, and offer encouragement when you need it most.')}</p>
              </div>
            </div>

            <div className="coach-features">
              <div className="coach-feature">
                <span className="feature-icon">🧠</span>
                <h3>{t('smartAnalysis', 'Smart Analysis')}</h3>
                <p>{t('smartAnalysisDesc', 'I analyze your journal entries to detect potential triggers and emotional patterns.')}</p>
              </div>
              <div className="coach-feature">
                <span className="feature-icon">⚡</span>
                <h3>{t('proactiveSupport', 'Proactive Support')}</h3>
                <p>{t('proactiveSupportDesc', 'I provide timely interventions and coping strategies when you need them most.')}</p>
              </div>
              <div className="coach-feature">
                <span className="feature-icon">📈</span>
                <h3>{t('progressTracking', 'Progress Tracking')}</h3>
                <p>{t('progressTrackingDesc', 'Together we\'ll track your recovery progress and celebrate your achievements.')}</p>
              </div>
            </div>

            {/* Trigger Pattern Analysis */}
            <TriggerPatternChart user={user} addictions={addictions} />

            <div className="coach-cta">
              <button 
                className="start-coaching-btn"
                onClick={() => {
                  setCoachInitialMessage(null);
                  setCoachInitialTab('chat');
                  setShowCoachChat(true);
                }}
              >
                <span className="btn-icon">💬</span>
                {t('startCoaching', 'Start Coaching Session')}
              </button>
              
              <button 
                className="view-insights-btn"
                onClick={() => {
                  console.log('🔍 Bekijk Mijn Inzichten clicked!');
                  setCoachInitialMessage(null);
                  setCoachInitialTab('insights');
                  setShowCoachChat(true);
                  console.log('✅ showCoachChat set to true, initialTab set to insights');
                }}
              >
                <span className="btn-icon">📊</span>
                {t('viewInsights', 'View My Insights')}
              </button>
            </div>

            <div className="coach-status">
              <div className="status-item">
                <span className="status-icon">🟢</span>
                <span className="status-text">{t('coachOnline', 'Alex is online and ready to help')}</span>
              </div>
              <div className="status-item">
                <span className="status-icon">🔒</span>
                <span className="status-text">{t('coachPrivacy', 'Your conversations are private and secure')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="calendar-tab-content">
            <SimpleCalendar
              currentMonth={currentCalendarMonth.getMonth()}
              currentYear={currentCalendarMonth.getFullYear()}
              entries={entries}
              onDateClick={handleCalendarDateClick}
              onPrevMonth={goToPreviousMonth}
              onNextMonth={goToNextMonth}
              t={t}
            />
          </div>
        )}
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="journal-form-overlay">
          <div className="date-picker-modal">
            <div className="form-header">
              <h3>📅 {t('selectDate', 'Choose Date')}</h3>
              <button className="close-btn" onClick={() => setShowDatePicker(false)}>✕</button>
            </div>
            <div className="date-picker-content">
              <p>{t('selectDateHelp', 'Select a date to create or edit a journal entry for that day:')}</p>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]} // Don't allow future dates
                className="date-picker-input"
              />
              <div className="date-picker-actions">
                <button 
                  className="save-btn"
                  onClick={() => handleDateSelection(selectedDate)}
                  disabled={!selectedDate}
                >
                  {t('continue', 'Doorgaan')}
                </button>
                <button 
                  className="cancel-btn"
                  onClick={() => setShowDatePicker(false)}
                >
                  {t('cancel', 'Annuleren')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Writing Form Modal */}
      {showCreateForm && (
        <div className="journal-form-overlay">
          <div className="expanded-journal-form">
            <div className="form-header">
              <div className="date-indicator">
                <span 
                  className="writing-for"
                  onClick={() => {
                    setShowCreateForm(false);
                    setActiveTab('calendar');
                  }}
                  style={{ 
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textDecorationStyle: 'dotted',
                    textUnderlineOffset: '3px'
                  }}
                  title={t('openCalendar', 'Open kalender')}
                >
                  {formatDate(formData.date)}
                </span>
              </div>
              <button className="close-btn" onClick={() => setShowCreateForm(false)}>✕</button>
            </div>

            {/* Full Writing Interface */}
            <div className="expanded-writing-area">
              {/* AI-Detected Mood Display */}
              {(() => {
                const currentEntry = editingEntry || (selectedDate === '' ? todaysEntry : null);
                const entryStillExists = !currentEntry || !currentEntry._id || entries.some(e => e._id === currentEntry._id);
                return currentEntry && entryStillExists && currentEntry.mood && currentEntry.content?.trim() && (
                <div className="quick-mood-bar mood-display-bar" style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                  backdropFilter: 'blur(25px)',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '20px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  margin: '16px 0',
                  maxWidth: '100%',
                  position: 'relative'
                }}>
                  
                  {/* Mood Description Tooltip */}
                  {showMoodDescription && (
                    <div style={{
                      position: 'absolute',
                      top: '-70px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.8) 100%)',
                      color: '#fff',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      maxWidth: '280px',
                      textAlign: 'center',
                      border: '1px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      backdropFilter: 'blur(20px)',
                      zIndex: 1000,
                      animation: 'fadeInOut 3s ease-in-out'
                    }}>
                      <div style={{ fontSize: '12px', opacity: '0.8', marginBottom: '4px' }}>
                        {moods.find(m => m.value === showMoodDescription.mood)?.label || showMoodDescription.mood}
                      </div>
                      <div style={{ lineHeight: '1.4' }}>
                        {showMoodDescription.description || t('noDescription', 'No description available')}
                      </div>
                      <div style={{
                        position: 'absolute',
                        bottom: '-8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '0',
                        height: '0',
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderTop: '8px solid rgba(0,0,0,0.9)'
                      }} />
                    </div>
                  )}
                  <div className="detected-mood-expanded" style={{
                    display: 'block',
                    width: '100%'
                  }}>
                    {/* Prominente hoofdstemming */}
                    {currentEntry?.moodAnalysis?.detectedMoods?.length > 0 && (
                      <div style={{
                        textAlign: 'center',
                        padding: '20px',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        width: '100%',
                        boxSizing: 'border-box',
                        minWidth: '100%',
                        margin: '0',
                        display: 'block'
                      }}>
                        <div 
                          style={{ 
                            fontSize: '32px', 
                            marginBottom: '8px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                          }}
                          onClick={() => handleMoodIconClick({
                            mood: currentEntry.moodAnalysis.detectedMoods[0]?.mood,
                            description: moods.find(m => m.value === currentEntry.moodAnalysis.detectedMoods[0]?.mood)?.description
                          })}
                          onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
                          onMouseOut={(e) => e.target.style.transform = 'scale(1.0)'}
                        >
                          {moods.find(m => m.value === currentEntry.moodAnalysis.detectedMoods[0]?.mood)?.emoji || '😐'}
                        </div>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: '700',
                          color: '#fff',
                          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                          marginBottom: '4px'
                        }}>
                          {moods.find(m => m.value === currentEntry.moodAnalysis.detectedMoods[0]?.mood)?.label || currentEntry.moodAnalysis.detectedMoods[0]?.mood}
                        </div>
                        {/* Overall sentiment */}
                        {currentEntry?.moodAnalysis?.overallSentiment && (
                          <div style={{
                            marginTop: '8px',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            background: currentEntry.moodAnalysis.overallSentiment === 'positive' ? 'rgba(34, 197, 94, 0.2)' :
                                       currentEntry.moodAnalysis.overallSentiment === 'negative' ? 'rgba(239, 68, 68, 0.2)' :
                                       'rgba(156, 163, 175, 0.2)',
                            color: currentEntry.moodAnalysis.overallSentiment === 'positive' ? '#ffffff' :
                                   currentEntry.moodAnalysis.overallSentiment === 'negative' ? '#ffffff' :
                                   '#ffffff',
                            border: `1px solid ${currentEntry.moodAnalysis.overallSentiment === 'positive' ? 'rgba(34, 197, 94, 0.3)' :
                                                 currentEntry.moodAnalysis.overallSentiment === 'negative' ? 'rgba(239, 68, 68, 0.3)' :
                                                 'rgba(156, 163, 175, 0.3)'}`
                          }}>
                            {currentEntry.moodAnalysis.overallSentiment === 'positive' ? 'Positief' :
                             currentEntry.moodAnalysis.overallSentiment === 'negative' ? 'Negatief' :
                             'Neutraal'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Secundaire moods onder hoofdmood card */}
                  {(currentEntry?.moodAnalysis?.detectedMoods?.length > 1) && (
                    <div style={{ 
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      justifyContent: 'space-evenly',
                      alignItems: 'center',
                      width: '100%',
                      marginTop: '16px',
                      padding: '0 8px'
                    }}>
                      {(currentEntry?.moodAnalysis?.detectedMoods || []).slice(1, 5).map((detectedMood, index) => {
                        return (
                          <div 
                            key={index} 
                            className="mood-item-expanded secondary-mood" 
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              borderRadius: '10px',
                              padding: '8px',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              textAlign: 'center',
                              flex: '1 1 0',
                              minWidth: '60px',
                              maxWidth: '80px',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              minHeight: '60px',
                              aspectRatio: '1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onClick={() => {
                              handleMoodIconClick({
                                mood: detectedMood.mood,
                                description: moods.find(m => m.value === detectedMood.mood)?.description
                              });
                            }}
                          >
                            <div className="mood-icon-expanded" style={{
                              fontSize: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: '100%'
                            }}>
                              {moods.find(m => m.value === detectedMood.mood)?.emoji || '😐'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                );
              })()}


              <div className="writing-area" style={{ position: 'relative' }}>
                {/* Processing message - centered over text area */}
                {recordingState === 'processing' && (
                  <div style={{ 
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#ffffff',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    borderRadius: '20px',
                    padding: '12px 16px',
                    backdropFilter: 'blur(15px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                  }}>
                    <div className="spinner"></div>
                    <span style={{ color: '#1f2937', fontSize: '14px', fontWeight: '700', textShadow: 'none' }}>{t('transcribing', 'Transcriberen...')}</span>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="journal-error-message">
                    <span>{error}</span>
                    <button 
                      onClick={() => setError('')}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        color: 'white',
                        cursor: 'pointer',
                        marginLeft: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                    >×</button>
                  </div>
                )}
                
                <SpellingChecker
                  ref={grammarCheckerRef}
                  text={formData.content}
                  onTextChange={(newText) => {
                    setFormData({...formData, content: newText});
                  }}
                  placeholder={voiceRecordingState === 'recording' ? t('voiceRecordingActive', '🎙️ Voice is being recorded...') : 
                             voiceRecordingState === 'processing' ? t('voiceProcessing', '⏳ Voice is being processed...') :
                             isSavingEntry ? t('generatingMoods', 'Mood is being generated...') : 
                             t('startWriting', 'Start writing... What is on your mind today?')}
                  className={`expanded-writing-textarea ${isSavingEntry ? 'processing' : ''} ${(voiceRecordingState === 'recording' || voiceRecordingState === 'processing') ? 'voice-active' : ''}`}
                  rows={7}
                  maxLength={1500}
                  enabled={!isSavingEntry && voiceRecordingState !== 'recording' && voiceRecordingState !== 'processing' && !transcribing && recordingState !== 'processing'}
                  language="auto"
                  debounceMs={1500}
                  autoApplyCorrections={true}
                />
                <div className="word-counter" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Voice Recording Button */}
                  <div>
                    {audioSupported && recordingState === 'idle' && (
                      <button
                        type="button"
                        className="voice-tool-btn"
                        onClick={startRecording}
                        title={t('startVoiceRecording', 'Start spraak opname')}
                        style={{ 
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: '1px solid rgba(255,255,255,0.3)',
                          background: 'rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(10px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          cursor: 'pointer',
                          marginLeft: '8px'
                        }}
                      >
                        🎤
                      </button>
                    )}
                    
                    {recordingState === 'recording' && (
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '20px',
                        padding: '6px 10px',
                        backdropFilter: 'blur(10px)',
                        marginLeft: '8px'
                      }}>
                        <button
                          type="button"
                          className="stop-recording-btn"
                          onClick={stopRecording}
                          style={{ 
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: 'none',
                            background: '#ef4444',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          ⏹
                        </button>
                        <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: '600' }}>
                          🔴 {formatRecordingTime(recordingTime)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    {(() => {
                      const wordCount = formData.content.trim().split(/\s+/).filter(word => word.length > 0).length;
                      const isValidRange = wordCount >= 10 && wordCount <= 250;
                      return (
                        <span className={`word-count ${!isValidRange ? 'warning' : ''}`}>
                          {wordCount}/250 {t('words', 'woorden')}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>


              {/* Action Buttons */}
              <div className="form-actions-expanded">
                <div className="save-options">
                  <button 
                    className="save-btn-primary" 
                    onClick={async () => {
                      console.log('=== REGULAR SAVE BUTTON CLICKED ===');
                      try {
                        console.log('About to call handleSaveEntry from regular save...');
                        await handleSaveEntry();
                        console.log('Regular save handleSaveEntry completed');
                      } catch (error) {
                        console.error('=== ERROR IN REGULAR SAVE ===', error);
                      }
                    }}
                    disabled={!formData.content.trim() || (editingEntry && !hasContentChanged()) || isPerformingGrammarCheck || isSavingEntry || transcribing || recordingState === 'processing'}
                  >
                    {isPerformingGrammarCheck ? 
                      '🔍 ' + t('checking', 'Controleren...') :
                      isSavingEntry ? 
                        '🔄 ' + t('savingAndGeneratingMoods', 'Opslaan & mood genereren...') :
                        '💾 ' + (editingEntry ? t('update', 'Bijwerken') : t('save', 'Opslaan'))
                    }
                  </button>

                  {/* Delete button - only shown when editing existing entry */}
                  {editingEntry && (
                    <>
                      <button 
                        className="delete-btn-expanded" 
                        onClick={() => {
                          handleDeleteEntry(editingEntry._id);
                          setShowCreateForm(false);
                        }}
                        disabled={isPerformingGrammarCheck || isSavingEntry || transcribing || recordingState === 'processing'}
                        title={t('deleteEntry', 'Dagboek entry verwijderen')}
                      >
                        🗑️ {t('delete', 'Verwijderen')}
                      </button>

                      {/* Audio Controls for Detailed Entry */}
                      <div className="journal-audio-section" style={{
                        marginTop: '20px',
                        padding: '20px',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                        backdropFilter: 'blur(25px)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.15)'
                      }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          🎙️ {t('audioVersion', 'Audio Versie')}
                        </h3>

                        {/* Voice Selection */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                          <label style={{ fontSize: '14px', minWidth: '60px' }}>
                            {t('voice', 'Stem')}:
                          </label>
                          <select 
                            value={selectedVoiceId} 
                            onChange={(e) => {
                              if (e.target.value === 'record_new') {
                                setShowVoiceRecorder(!showVoiceRecorder);
                                setSelectedVoiceId('default');
                              } else {
                                setSelectedVoiceId(e.target.value);
                              }
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.15)',
                              border: '1px solid rgba(255,255,255,0.3)',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              color: 'white',
                              fontSize: '14px',
                              flex: 1
                            }}
                          >
                            <option value="default">{t('sarahDefault', 'Sarah (Default)')}</option>
                            <option value="pNInz6obpgDQGcFmaJgB">{t('sarahCalm', 'Sarah - Calm')}</option>
                            <option value="pNInz6obpgDQGcFmaJgB">{t('adamDeep', 'Adam - Deep')}</option>
                            <option value="pNInz6obpgDQGcFmaJgB">{t('rachelWarm', 'Rachel - Warm')}</option>
                            {userCustomVoices.map(voice => (
                              <option key={voice.voiceId} value={voice.voiceId}>
                                {voice.name}
                              </option>
                            ))}
                            <option value="record_new">➕ {t('recordNewVoice', 'Record New Voice')}</option>
                          </select>
                        </div>

                        {/* Audio Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          {!editingEntry.audioFile ? (
                            <button 
                              onClick={() => handleGenerateAudio(editingEntry)}
                              disabled={generatingAudio === editingEntry._id}
                              style={{
                                background: generatingAudio === editingEntry._id ? 'rgba(255,165,0,0.3)' : 'rgba(34,197,94,0.3)',
                                border: generatingAudio === editingEntry._id ? '1px solid rgba(255,165,0,0.5)' : '1px solid rgba(34,197,94,0.5)',
                                borderRadius: '12px',
                                padding: '12px 20px',
                                color: 'white',
                                fontSize: '14px',
                                cursor: generatingAudio === editingEntry._id ? 'not-allowed' : 'pointer',
                                opacity: generatingAudio === editingEntry._id ? 0.7 : 1,
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontWeight: '500'
                              }}
                            >
                              {generatingAudio === editingEntry._id ? (
                                <>⏳ {t('generating', 'Generating...')}</>
                              ) : (
                                <>🎙️ {t('generateAudio', 'Generate Audio')}</>
                              )}
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => handlePlayAudio(editingEntry)}
                                style={{
                                  background: playingEntryId === editingEntry._id ? 'rgba(255,165,0,0.3)' : 'rgba(59,130,246,0.3)',
                                  border: playingEntryId === editingEntry._id ? '1px solid rgba(255,165,0,0.5)' : '1px solid rgba(59,130,246,0.5)',
                                  borderRadius: '12px',
                                  padding: '12px 20px',
                                  color: 'white',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  fontWeight: '500'
                                }}
                              >
                                {playingEntryId === editingEntry._id ? (
                                  <>⏸️ {t('pause', 'Pause')}</>
                                ) : (
                                  <>▶️ {t('playAudio', 'Play Audio')}</>
                                )}
                              </button>
                              <button 
                                onClick={() => handleDeleteAudio(editingEntry)}
                                style={{
                                  background: 'rgba(239,68,68,0.3)',
                                  border: '1px solid rgba(239,68,68,0.5)',
                                  borderRadius: '12px',
                                  padding: '12px 16px',
                                  color: 'white',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title={t('deleteAudio', 'Delete audio')}
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>

                        {/* Voice Recording Section */}
                        {showVoiceRecorder && (
                          <div style={{ 
                            marginTop: '16px', 
                            padding: '16px', 
                            background: 'rgba(255,255,255,0.1)', 
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.2)'
                          }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              🎤 {t('recordCustomVoice', 'Record Custom Voice')}
                            </h4>
                            
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                              {voiceRecordingState === 'idle' && (
                                <button 
                                  onClick={startVoiceRecording}
                                  style={{
                                    background: 'rgba(239,68,68,0.3)',
                                    border: '1px solid rgba(239,68,68,0.5)',
                                    borderRadius: '8px',
                                    padding: '10px 16px',
                                    color: 'white',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                >
                                  🔴 {t('startRecording', 'Start Recording')}
                                </button>
                              )}
                              
                              {voiceRecordingState === 'recording' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <button 
                                    onClick={stopVoiceRecording}
                                    style={{
                                      background: 'rgba(34,197,94,0.3)',
                                      border: '1px solid rgba(34,197,94,0.5)',
                                      borderRadius: '8px',
                                      padding: '10px 16px',
                                      color: 'white',
                                      fontSize: '14px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}
                                  >
                                    ⏹️ {t('stopRecording', 'Stop')} ({voiceRecordingTime}s)
                                  </button>
                                  <div style={{ fontSize: '12px', opacity: '0.8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    🔴 {t('recordingInProgress', 'Recording...')}
                                  </div>
                                </div>
                              )}
                              
                              {voiceRecordingState === 'preview' && recordedVoiceBlob && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                                  <audio 
                                    controls 
                                    src={URL.createObjectURL(recordedVoiceBlob)} 
                                    style={{ 
                                      flex: 1, 
                                      height: '32px'
                                    }} 
                                  />
                                  <input 
                                    type="text"
                                    placeholder={t('voiceName', 'Voice name')}
                                    value={customVoiceName}
                                    onChange={(e) => setCustomVoiceName(e.target.value)}
                                    style={{
                                      background: 'rgba(255,255,255,0.1)',
                                      border: '1px solid rgba(255,255,255,0.3)',
                                      borderRadius: '8px',
                                      padding: '8px 12px',
                                      color: 'white',
                                      fontSize: '14px',
                                      width: '120px'
                                    }}
                                  />
                                  <button 
                                    onClick={saveCustomVoice}
                                    disabled={!customVoiceName.trim() || uploadingCustomVoice}
                                    style={{
                                      background: uploadingCustomVoice ? 'rgba(156,163,175,0.3)' : 'rgba(34,197,94,0.3)',
                                      border: uploadingCustomVoice ? '1px solid rgba(156,163,175,0.5)' : '1px solid rgba(34,197,94,0.5)',
                                      borderRadius: '8px',
                                      padding: '8px 12px',
                                      color: 'white',
                                      fontSize: '14px',
                                      cursor: uploadingCustomVoice ? 'not-allowed' : 'pointer',
                                      opacity: !customVoiceName.trim() || uploadingCustomVoice ? 0.5 : 1
                                    }}
                                  >
                                    {uploadingCustomVoice ? '💾...' : '💾 ' + t('save', 'Save')}
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setVoiceRecordingState('idle');
                                      setRecordedVoiceBlob(null);
                                    }}
                                    style={{
                                      background: 'rgba(156,163,175,0.3)',
                                      border: '1px solid rgba(156,163,175,0.5)',
                                      borderRadius: '8px',
                                      padding: '8px 12px',
                                      color: 'white',
                                      cursor: 'pointer',
                                      fontSize: '14px'
                                    }}
                                  >
                                    🔄
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                {showSaveSuccess && (
                  <span className="save-success-indicator">
                    ✅ {t('saved', 'Opgeslagen!')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audio Elements for playback */}
      {entries.map((entry) => (
        entry.audioFile && (
          <audio 
            key={entry._id}
            id={`journal-audio-${entry._id}`}
            preload="none"
            onEnded={() => setPlayingEntryId(null)}
            onPause={() => {
              if (playingEntryId === entry._id) {
                setPlayingEntryId(null);
              }
            }}
          >
            <source 
              src={getFullUrl(`/assets/audio/journals/${entry.audioFile.filename}`)} 
              type="audio/mpeg" 
            />
          </audio>
        )
      ))}
      
      {/* Alert Component */}
      <Alert 
        message={alertState.message}
        type={alertState.type}
        visible={alertState.show}
        onClose={() => setAlertState({ show: false, message: '', type: 'success' })}
        position="fixed"
      />
      
      {/* Confirm Dialog */}
      <ConfirmDialog
        message={confirmState.message}
        visible={confirmState.show}
        onConfirm={() => {
          if (confirmState.onConfirm) {
            confirmState.onConfirm();
          }
          setConfirmState({ ...confirmState, show: false });
        }}
        onCancel={() => setConfirmState({ ...confirmState, show: false })}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
      />
      
      {/* AI Coach Chat */}
      <AICoachChat
        user={user}
        isVisible={showCoachChat}
        onClose={() => setShowCoachChat(false)}
        initialMessage={coachInitialMessage}
        initialTab={coachInitialTab}
      />
      
      {/* Grammar correction feedback panel removed */}
      
      {/* Trigger Alert */}
      {showTriggerAlert && activeTrigger && (
        <TriggerAlert
          user={user}
          trigger={activeTrigger}
          onClose={handleTriggerAlertClose}
          onGetHelp={handleTriggerGetHelp}
          onDismiss={handleTriggerDismiss}
        />
      )}
    </div>
  );
};

export default Journal;
