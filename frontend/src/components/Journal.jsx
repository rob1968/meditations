import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import axios from 'axios';
import { getFullUrl, getAssetUrl, API_ENDPOINTS } from '../config/api';
import PageHeader from './PageHeader';
import Alert from './Alert';
import ConfirmDialog from './ConfirmDialog';

const Journal = ({ user, userCredits, onCreditsUpdate, onProfileClick, unreadCount, onInboxClick, onCreateClick }) => {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [playingEntryId, setPlayingEntryId] = useState(null);
  const [generatingAudio, setGeneratingAudio] = useState(null);
  const [searchTags, setSearchTags] = useState('');
  const [searchText, setSearchText] = useState('');
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [audioSupported, setAudioSupported] = useState(true);
  const [recordingState, setRecordingState] = useState('idle'); // 'idle', 'recording', 'processing'
  const [todaysEntry, setTodaysEntry] = useState(null);
  const [hasTodaysEntry, setHasTodaysEntry] = useState(false);
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
  const [addictionForm, setAddictionForm] = useState({
    type: '',
    description: '',
    startDate: '',
    quitDate: '',
    status: 'active' // 'active', 'recovering', 'relapsed', 'clean'
  });
  const [expandedMoodId, setExpandedMoodId] = useState(null);
  const [justSaved, setJustSaved] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'browse', 'voice', 'addictions'
  
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
    tags: [], // Empty array, not null
    date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  });
  
  // Track original content to detect changes
  const [originalContent, setOriginalContent] = useState('');
  
  // Track save success for feedback
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // Alert states for replacing popups
  const [alertState, setAlertState] = useState({ show: false, message: '', type: 'success' });
  const [confirmState, setConfirmState] = useState({ 
    show: false, 
    message: '', 
    onConfirm: null,
    confirmText: 'Bevestigen',
    cancelText: 'Annuleren'
  });
  
  // Control calendar visibility
  const [showCalendar, setShowCalendar] = useState(true);
  
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
  const showConfirmDialog = (message, onConfirm, confirmText = t('confirm', 'Bevestigen'), cancelText = t('cancel', 'Annuleren')) => {
    setConfirmState({
      show: true,
      message,
      onConfirm,
      confirmText,
      cancelText
    });
  };

  const moods = [
    { value: 'happy', emoji: '😊', label: t('happy', 'Blij'), description: t('happyDesc', 'Ik voel me vrolijk en optimistisch'), color: '#FFD700', bg: 'linear-gradient(135deg, #FFD700, #FFA500)' },
    { value: 'calm', emoji: '😌', label: t('calm', 'Rustig'), description: t('calmDesc', 'Ik ben ontspannen en vredig'), color: '#87CEEB', bg: 'linear-gradient(135deg, #87CEEB, #4682B4)' },
    { value: 'peaceful', emoji: '😇', label: t('peaceful', 'Vreedzaam'), description: t('peacefulDesc', 'Ik voel innerlijke rust en harmonie'), color: '#98FB98', bg: 'linear-gradient(135deg, #98FB98, #32CD32)' },
    { value: 'grateful', emoji: '🥰', label: t('grateful', 'Dankbaar'), description: t('gratefulDesc', 'Ik ben dankbaar voor wat ik heb'), color: '#DDA0DD', bg: 'linear-gradient(135deg, #DDA0DD, #9370DB)' },
    { value: 'reflective', emoji: '🤔', label: t('reflective', 'Reflectief'), description: t('reflectiveDesc', 'Ik denk na over het leven'), color: '#C0C0C0', bg: 'linear-gradient(135deg, #C0C0C0, #708090)' },
    { value: 'energetic', emoji: '😄', label: t('energetic', 'Energiek'), description: t('energeticDesc', 'Ik voel me vol energie en motivatie'), color: '#FF6347', bg: 'linear-gradient(135deg, #FF6347, #DC143C)' },
    { value: 'stressed', emoji: '😫', label: t('stressed', 'Gestrest'), description: t('stressedDesc', 'Ik voel me onder druk staan'), color: '#FF4500', bg: 'linear-gradient(135deg, #FF4500, #B22222)' },
    { value: 'anxious', emoji: '😰', label: t('anxious', 'Bezorgd'), description: t('anxiousDesc', 'Ik maak me zorgen over dingen'), color: '#708090', bg: 'linear-gradient(135deg, #708090, #2F4F4F)' }
  ];

  useEffect(() => {
    if (user) {
      fetchEntries();
      fetchTodaysEntry();
      fetchUserVoices();
    }
  }, [user, searchTags, searchText]);


  // Function to load today's entry for calendar
  const loadTodayForCalendar = async () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Always set today as selected date first
    setSelectedDate(today);
    
    // Fetch today's entry directly
    try {
      const response = await axios.get(getFullUrl(`/api/journal/user/${user.id}/today`));
      console.log('Calendar: Fetched today\'s entry:', response.data);
      
      if (response.data.hasEntry && response.data.entry) {
        // Load today's existing entry data for calendar view
        const entry = response.data.entry;
        setFormData({
          title: entry.title || '',
          content: entry.content || '',
          mood: entry.mood || '',
          tags: entry.tags || [],
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
          tags: [],
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
        tags: [],
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
      if (searchTags) params.append('tags', searchTags);
      if (searchText) params.append('searchText', searchText);
      
      const response = await axios.get(getFullUrl(`/api/journal/user/${user.id}?${params}`));
      setEntries(response.data.entries);
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
      const response = await axios.get(getFullUrl(`/api/journal/user/${user.id}/today`));
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
      
      const response = await axios.get(getFullUrl(`/api/journal/user/${user.id}?startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`));
      
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
      tags: [], // Empty array, not null
      date: new Date().toISOString().split('T')[0]
    });
    setOriginalContent(''); // Reset original content when resetting form
    setShowCreateForm(false);
    setShowDatePicker(false);
    setEditingEntry(null);
    setSelectedDate('');
    setSelectedDateEntry(null);
    
    // Reset recording state after a small delay to allow stop to complete
    setTimeout(() => {
      setRecordingState('idle');
    }, 100);
  };

  const handleDateSelection = async (date) => {
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
        tags: entry.tags || [],
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
        tags: [],
        date: date
      });
      setOriginalContent(''); // Reset original content for new entry
      setEditingEntry(null);
    }
    
    setShowDatePicker(false);
    // Stay in calendar view with inline writing interface - no need to open expanded form
  };

  const fetchUserVoices = async () => {
    try {
      console.log('Fetching user voices for user:', user.id);
      const response = await axios.get(getFullUrl(`/api/journal/voice-clone/list/${user.id}`));
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
        throw new Error('getUserMedia not supported');
      }

      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported');
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
        throw new Error('No audio tracks available');
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
        errorMessage = t('microphoneNotFound', 'Geen microfoon gevonden. Controleer of je apparaat een microfoon heeft.');
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

      const response = await axios.post(getFullUrl('/api/journal/voice-clone/upload'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
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
          await axios.delete(getFullUrl(`/api/journal/voice-clone/${voiceId}?userId=${user.id}`));
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

  const handleSaveEntry = async () => {
    if (!formData.content.trim()) {
      setError(t('contentRequired', 'Content is required'));
      return;
    }

    // Stop any ongoing recording before saving
    if (recordingState === 'recording') {
      console.log('Stopping recording before save');
      stopRecording();
      // Give it a moment to stop
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      setError('');
      const payload = {
        userId: user.id,
        title: formatDate(formData.date), // Use date as title
        content: formData.content.trim(),
        date: formData.date
      };

      // Only include mood if it has a value
      if (formData.mood && formData.mood.trim()) {
        payload.mood = formData.mood.trim();
      }

      // Only include tags if they exist
      if (formData.tags && formData.tags.length > 0) {
        payload.tags = formData.tags.filter(tag => tag.trim()).map(tag => tag.trim());
      }

      console.log('Saving journal entry:', {
        isEditing: !!editingEntry,
        entryId: editingEntry?._id,
        payload
      });

      let response;
      if (editingEntry && editingEntry._id) {
        // Use PUT for explicit editing
        response = await axios.put(getFullUrl(`/api/journal/${editingEntry._id}`), payload);
      } else {
        // Use POST for create/append (will handle one-per-day logic)
        response = await axios.post(getFullUrl('/api/journal/create'), payload);
      }

      console.log('Save response:', response.data);

      if (response.data.success) {
        setJustSaved(true); // Prevent auto-reopening form
        
        // Update original content to reflect saved state
        setOriginalContent(formData.content);
        
        // Update editingEntry if this was a new entry that got created
        if (!editingEntry && response.data.entry) {
          setEditingEntry(response.data.entry);
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
        
        // Show calendar again after save to display highlighted date
        setShowCalendar(true);
        
        // Reset justSaved flag after a short delay
        setTimeout(() => {
          setJustSaved(false);
        }, 100);
        
        // Keep the form open so user can see the updated text
        // Don't call resetForm() here anymore
      }
    } catch (error) {
      console.error('Error saving journal entry:', error);
      setError(t('failedToSaveEntry', 'Failed to save journal entry'));
    }
  };

  const handleEditEntry = (entry) => {
    const content = entry.content || '';
    setFormData({
      title: entry.title,
      content: content,
      mood: entry.mood || '',
      tags: entry.tags || [],
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
          await axios.delete(getFullUrl(`/api/journal/${entryId}?userId=${user.id}`));
          await fetchEntries();
        } catch (error) {
          console.error('Error deleting journal entry:', error);
          setError(t('failedToDeleteEntry', 'Failed to delete journal entry'));
        }
      }
    );
  };

  const handleGenerateAudio = async (entry) => {
    console.log('Generate audio clicked for entry:', entry._id);
    console.log('User credits:', userCredits);
    console.log('Selected voice ID:', selectedVoiceId);
    
    if (userCredits && userCredits.credits < 1) {
      setError(t('insufficientCreditsAudio', 'Insufficient credits. You need 1 credit to generate audio.'));
      return;
    }

    try {
      setGeneratingAudio(entry._id);
      setError('');
      
      const requestData = {
        userId: user.id,
        voiceId: selectedVoiceId === 'default' ? 'EXAVITQu4vr4xnSDxMaL' : selectedVoiceId
      };
      
      console.log('Sending audio generation request:', requestData);
      
      const response = await axios.post(getFullUrl(`/api/journal/${entry._id}/generate-audio`), requestData);

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
        throw new Error('getUserMedia not supported');
      }

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported');
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
        throw new Error('No audio tracks available');
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
        errorMessage = t('microphoneNotFound', 'Geen microfoon gevonden. Controleer of je apparaat een microfoon heeft.');
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
        throw new Error('No audio data recorded');
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

      const response = await axios.post(getFullUrl('/api/journal/transcribe'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
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
            if (textareaRef.current) {
              textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
              textareaRef.current.focus();
              // Set cursor to end of text
              const textLength = textareaRef.current.value.length;
              textareaRef.current.setSelectionRange(textLength, textLength);
            }
          }, 100);
          
          setError('');
        } else {
          setError(t('noSpeechDetectedRetry', 'Geen spraak gedetecteerd. Probeer opnieuw te spreken.'));
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

  const addTag = (tagInput) => {
    const newTag = tagInput.trim();
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag]
      });
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Count words in text
  const countWords = (text) => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!formData.content.trim() || formData.content === lastSavedContent || autoSaving) {
      return;
    }

    try {
      setAutoSaving(true);
      const payload = {
        userId: user.id,
        title: formatDate(formData.date),
        content: formData.content.trim(),
        date: formData.date
      };

      if (formData.mood && formData.mood.trim()) {
        payload.mood = formData.mood.trim();
      }

      if (formData.tags && formData.tags.length > 0) {
        payload.tags = formData.tags.filter(tag => tag.trim()).map(tag => tag.trim());
      }

      let response;
      if (editingEntry && editingEntry._id) {
        response = await axios.put(getFullUrl(`/api/journal/${editingEntry._id}`), payload);
      } else {
        response = await axios.post(getFullUrl('/api/journal/create'), payload);
      }

      if (response.data.success) {
        setLastSavedContent(formData.content);
        // Update editingEntry if it was a new entry
        if (!editingEntry && response.data.entry) {
          setEditingEntry(response.data.entry);
        }
        // Silently refresh entries in background
        fetchEntries(false);
        fetchTodaysEntry();
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Don't show error for auto-save failures to avoid interrupting user
    } finally {
      setAutoSaving(false);
    }
  }, [formData, editingEntry, user, lastSavedContent, autoSaving]);

  // Auto-save effect - triggers after user stops typing for 2 seconds
  useEffect(() => {
    if (!user || !showCreateForm || !formData.content.trim()) return;

    const timeoutId = setTimeout(() => {
      autoSave();
    }, 2000); // 2 seconds delay

    return () => clearTimeout(timeoutId);
  }, [formData.content, formData.mood, formData.tags, user, showCreateForm, autoSave]);

  // Addictions functions
  const fetchAddictions = async () => {
    try {
      const response = await axios.get(getFullUrl(`/api/addictions/user/${user.id}`));
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
        response = await axios.put(getFullUrl(`/api/addictions/${editingAddiction._id}`), requestData);
      } else {
        response = await axios.post(getFullUrl('/api/addictions/create'), requestData);
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
          status: 'active'
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
      status: addiction.status
    });
    setEditingAddiction(addiction);
    setShowAddictionForm(true);
  };

  const handleDeleteAddiction = async (addictionId) => {
    showConfirmDialog(
      t('confirmDeleteAddiction', 'Are you sure you want to delete this addiction tracking?'),
      async () => {
        try {
          await axios.delete(getFullUrl(`/api/addictions/${addictionId}?userId=${user.id}`));
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
      'smoking': t('smoking', 'Roken'),
      'alcohol': t('alcohol', 'Alcohol'),
      'drugs': t('drugs', 'Drugs'),
      'gambling': t('gambling', 'Gokken'),
      'shopping': t('shopping', 'Winkelen'),
      'social_media': t('socialMedia', 'Social Media'),
      'gaming': t('gaming', 'Gaming'),
      'food': t('food', 'Eten'),
      'caffeine': t('caffeine', 'Cafeïne'),
      'sugar': t('sugar', 'Suiker'),
      'phone': t('phone', 'Telefoon'),
      'internet': t('internet', 'Internet'),
      'other': t('other', 'Anders')
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
    if (!addiction.quitDate || addiction.status === 'active' || addiction.status === 'relapsed') {
      return 0;
    }
    
    const now = new Date();
    // Parse date string correctly - ensure it's treated as local date
    const quitDate = new Date(addiction.quitDate + 'T00:00:00');
    
    // Check if quit date is in the future
    if (quitDate > now) {
      return 0;
    }
    
    // Set both dates to start of day for accurate day comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const quitDay = new Date(quitDate.getFullYear(), quitDate.getMonth(), quitDate.getDate());
    
    // Calculate difference in milliseconds
    const diffTime = today.getTime() - quitDay.getTime();
    
    // Convert to days - person is 1 day clean on quit day, 2 days clean the next day, etc.
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return Math.max(1, diffDays); // Minimum 1 day if we got this far
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
          setFormData({ title: '', content: '', mood: '', tags: '' });
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

  if (isLoading) {
    return (
      <div className="journal-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          {t('loading', 'Loading...')}
        </div>
      </div>
    );
  }

  // Generate calendar days for selected month
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
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayWeekday; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      // Create date string in local timezone format
      const dateString = currentYear + '-' + 
        String(currentMonth + 1).padStart(2, '0') + '-' + 
        String(day).padStart(2, '0');
      
      const isToday = dateString === todayDateString;
      const dayDate = new Date(currentYear, currentMonth, day);
      const isPast = dayDate < today && !isToday;
      
      // Check if there's an entry for this date
      const hasEntry = entries.some(entry => {
        const entryDate = new Date(entry.date);
        const entryDateString = entryDate.getFullYear() + '-' + 
          String(entryDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(entryDate.getDate()).padStart(2, '0');
        return entryDateString === dateString;
      });
      
      days.push({
        day,
        date: dateString,
        isToday,
        isPast,
        hasEntry,
        isClickable: isPast || isToday // Past dates and today are clickable
      });
    }
    
    return days;
  };

  const handleCalendarDateClick = (dateString) => {
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
    <div className="journal-container">
      <PageHeader 
        user={user}
        onProfileClick={onProfileClick}
        title={t('dagboek', 'Dagboek')}
        unreadCount={unreadCount}
        onInboxClick={onInboxClick}
        onCreateClick={onCreateClick}
      />

      {/* Tab Navigation */}
      <div className="journal-tabs">
        <button 
          className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <span className="tab-icon">📅</span>
          <span className="tab-label">{t('calendar', 'Kalender')}</span>
        </button>
        <button 
          className={`tab ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          <span className="tab-icon">📖</span>
          <span className="tab-label">{t('browse', 'Bladeren')}</span>
        </button>
        <button 
          className={`tab ${activeTab === 'voice' ? 'active' : ''}`}
          onClick={() => setActiveTab('voice')}
        >
          <span className="tab-icon">🎵</span>
          <span className="tab-label">{t('audio', 'Audio')}</span>
        </button>
        <button 
          className={`tab ${activeTab === 'addictions' ? 'active' : ''}`}
          onClick={() => setActiveTab('addictions')}
        >
          <span className="tab-icon">🚭</span>
          <span className="tab-label">{t('addictions', 'Verslavingen')}</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="journal-tab-content">

        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <div className="browse-tab-content">
            {/* Search and Filters */}
            <div className="browse-controls">
              <div className="search-bar">
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder={t('searchContent', 'Zoek in tekst...')}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="search-input"
                    style={{ marginBottom: '10px' }}
                  />
                  {searchText && (
                    <button
                      onClick={() => setSearchText('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '18px',
                        color: '#666'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder={t('searchTags', 'Zoek op tags...')}
                    value={searchTags}
                    onChange={(e) => setSearchTags(e.target.value)}
                    className="search-input"
                  />
                  {searchTags && (
                    <button
                      onClick={() => setSearchTags('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '18px',
                        color: '#666'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div className="mood-filters">
                {moods.slice(0, 6).map(mood => (
                  <button
                    key={mood.value}
                    className="mood-filter-btn"
                    onClick={() => setSearchTags(mood.value)}
                    title={mood.label}
                  >
                    {mood.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Entries Timeline */}
            <div className="entries-timeline">
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
                entries.map((entry) => (
                  <div key={entry._id} className="timeline-entry">
                    <div className="entry-date">{formatDate(entry.date)}</div>
                    <div className="entry-card">
                      <div className="entry-header">
                        {entry.mood && (
                          <div className="entry-mood">
                            {moods.find(m => m.value === entry.mood)?.emoji}
                          </div>
                        )}
                        <div className="entry-meta">
                          {entry.audioFile && (
                            <span className="audio-indicator">🎵</span>
                          )}
                          <span className="word-count">{countWords(entry.content)} {t('words', 'woorden')}</span>
                        </div>
                      </div>
                      <h3 className="entry-title" style={{ margin: '10px 0', fontSize: '1.1em', fontWeight: 'bold' }}>
                        {highlightSearchText(entry.title, searchText)}
                      </h3>
                      <div className="entry-preview">
                        {entry.content.length > 150 ? 
                          <>{highlightSearchText(entry.content.substring(0, 150), searchText)}...</> : 
                          highlightSearchText(entry.content, searchText)
                        }
                      </div>
                      <div className="entry-actions-quick">
                        <button 
                          className="read-more-btn"
                          onClick={() => handleEditEntry(entry)}
                        >
                          {t('readMore', 'Lees verder')}
                        </button>
                        {entry.audioFile && (
                          <button 
                            className="play-btn-quick"
                            onClick={() => handlePlayAudio(entry)}
                          >
                            {playingEntryId === entry._id ? '⏸️' : '▶️'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Audio Tab */}
        {activeTab === 'voice' && (
          <div className="voice-tab-content">
            {/* Journal Audio Generation Section */}
            <div className="journal-audio-section">
              <h3>{t('generateJournalAudio', 'Dagboek Audio Genereren')}</h3>
              
              {/* Voice Selection */}
              <div className="voice-selection-container">
                <label>{t('selectVoice', 'Selecteer een stem')}:</label>
                <select 
                  value={selectedVoiceId} 
                  onChange={(e) => setSelectedVoiceId(e.target.value)}
                  className="voice-select"
                >
                  <option value="default">{t('defaultVoice', 'Standaard Stem (Sarah)')}</option>
                  <option value="EXAVITQu4vr4xnSDxMaL">Sarah - {t('calm', 'Kalm')}</option>
                  <option value="pNInz6obpgDQGcFmaJgB">Adam - {t('deep', 'Diep')}</option>
                  <option value="21m00Tcm4TlvDq8ikWAM">Rachel - {t('warm', 'Warm')}</option>
                  {userCustomVoices.map(voice => (
                    <option key={voice.voiceId} value={voice.voiceId}>
                      {voice.name} - {t('custom', 'Aangepast')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Journal Entries List */}
              <div className="journal-entries-for-audio">
                <h4>{t('yourJournalEntries', 'Je dagboekentries')}:</h4>
                {entries.length === 0 ? (
                  <p className="no-entries-message">{t('noEntriesForAudio', 'Geen dagboekentries gevonden. Schrijf eerst een dagboekentry.')}</p>
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
                          {entry.audioFile && (
                            <span className="has-audio-indicator" title={t('hasAudio', 'Heeft audio')}>
                              🎵
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
                                <>{t('generating', 'Genereren...')} <span className="spinner-small"></span></>
                              ) : (
                                <>🎙️ {t('generateAudio', 'Audio Genereren')}</>
                              )}
                            </button>
                          ) : (
                            <div className="audio-controls">
                              <button 
                                className="play-audio-btn"
                                onClick={() => handlePlayAudio(entry)}
                              >
                                {playingEntryId === entry._id ? '⏸️' : '▶️'} 
                                {playingEntryId === entry._id ? t('pause', 'Pauzeer') : t('play', 'Afspelen')}
                              </button>
                              <button 
                                className="regenerate-audio-btn"
                                onClick={() => handleGenerateAudio(entry)}
                                disabled={generatingAudio === entry._id}
                                title={t('regenerateAudio', 'Audio opnieuw genereren')}
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
              <h3>{t('manageVoices', 'Beheer je stemmen')}</h3>
              
              {/* Voice Recording Interface */}
              <div className="voice-recorder-main">
                {/* Idle State */}
                {voiceRecordingState === 'idle' && (
                  <div className="voice-recorder-idle">
                    <div className="voice-recorder-header">
                      <h4>{t('recordYourVoice', 'Neem Je Stem Op')}</h4>
                      <div className="recording-info">
                        <p className="recording-limit">⏱️ {t('maxRecordingTime', 'maximaal 1 minuut')}</p>
                        <p className="quality-tips">💡 {t('qualityTips', 'Tips: Spreek duidelijk in een stille ruimte')}</p>
                        <p className="credit-cost">💰 {t('creditCost', 'Kosten: 2 credits')}</p>
                      </div>
                    </div>
                    
                    <button 
                      className="start-voice-recording-btn recording-idle-btn"
                      onClick={startVoiceRecording}
                      disabled={!audioSupported}
                    >
                      <div className="mic-icon pulse">🎙️</div>
                      <span>{t('startRecording', 'Start Opname')}</span>
                    </button>
                    
                    {!audioSupported && (
                      <div className="audio-not-supported">
                        ⚠️ {t('audioNotSupported', 'Audio opname niet beschikbaar op dit apparaat')}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Recording State */}
                {voiceRecordingState === 'recording' && (
                  <div className="voice-recorder-recording">
                    <div className="recording-visual">
                      <div className="recording-pulse recordingPulse"></div>
                      <div className="mic-icon-large">🎙️</div>
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
                        <p className="warning-text pulse">⚠️ {t('recordingWarning', 'Bijna klaar! Maximum 1 minuut')}</p>
                      )}
                      <p className="feedback-text">
                        {voiceRecordingTime < 15 ? `🔵 ${t('keepTalking', 'Blijf praten voor betere kwaliteit')}` : 
                         voiceRecordingTime < 30 ? `🟢 ${t('goodLength', 'Goede lengte!')}` : 
                         voiceRecordingTime < 45 ? `🟡 ${t('optimalLength', 'Optimale lengte bereikt')}` : 
                         `🟠 ${t('nearMaximum', 'Bijna maximum bereikt')}`}
                      </p>
                    </div>
                    
                    <button 
                      className="stop-voice-recording-btn"
                      onClick={stopVoiceRecording}
                    >
                      ⏹️ {t('stopRecording', 'Stop Opname')}
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
                    <h4>{t('processingVoice', 'Stem wordt verwerkt...')}</h4>
                    <p>{t('processingMessage', 'Even geduld, we bereiden je stem voor')}</p>
                  </div>
                )}
                
                {/* Preview State */}
                {voiceRecordingState === 'preview' && recordedVoiceBlob && (
                  <div className="voice-recorder-preview">
                    <div className="preview-header success-header">
                      <div className="success-icon">✅</div>
                      <h4>{t('recordingComplete', 'Opname Voltooid!')}</h4>
                      <p>{t('recordingLength', 'Lengte')}: {Math.floor(voiceRecordingTime / 60)}:{(voiceRecordingTime % 60).toString().padStart(2, '0')}</p>
                    </div>
                    
                    <button 
                      className="play-preview-btn preview-play-btn"
                      onClick={playVoicePreview}
                    >
                      ▶️ {t('playPreview', 'Beluister Opname')}
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
                        <span className="credit-cost-display">💰 {t('creditCost', 'Kosten: 2 credits')}</span>
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
                          <><div className="spinner"></div> {t('uploading', 'Opslaan...')}</>
                        ) : (
                          `💾 ${t('saveVoice', 'Stem Opslaan')}`
                        )}
                      </button>
                    </div>
                    
                    <button 
                      className="retake-voice-btn retake-recording-btn"
                      onClick={cancelVoiceRecording}
                    >
                      🔄 {t('retakeRecording', 'Opnieuw Opnemen')}
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
                      status: 'active'
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
                      <textarea 
                        value={addictionForm.description}
                        onChange={(e) => setAddictionForm({...addictionForm, description: e.target.value})}
                        placeholder={t('addictionDescription', 'Beschrijf je verslaving, triggers, of andere details...')}
                        rows={3}
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
                  <h3>{t('noAddictions', 'Geen verslavingen bijgehouden')}</h3>
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
                      </div>
                      
                      {(addiction.status === 'recovering' || addiction.status === 'clean') && addiction.quitDate && (
                        <div className="days-clean">
                          <span className="days-number">{getDaysClean(addiction)}</span>
                          <span className="days-label">{t('daysClean', 'dagen schoon')}</span>
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

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="calendar-tab-content">
            {/* Button to show calendar when hidden - fallback if header button is not visible */}
            {!showCalendar && !selectedDate && (
              <div className="show-calendar-section">
                <button 
                  className="show-calendar-btn"
                  onClick={() => setShowCalendar(true)}
                >
                  📅 {t('showCalendar', 'Toon kalender')}
                </button>
                <p className="calendar-help-text">
                  {t('pressEscToReturn', 'Druk op ESC om terug te keren naar de kalender')}
                </p>
              </div>
            )}
            
            {/* Mini Calendar for History */}
            {showCalendar && <div className="journal-calendar">
              <div className="calendar-header">
                <div className="calendar-navigation">
                  <button 
                    className="calendar-nav-btn" 
                    onClick={goToPreviousMonth}
                    title={t('previousMonth', 'Vorige maand')}
                  >
                    ‹
                  </button>
                  <h3 className="calendar-month-year">{formatMonthYear()}</h3>
                  <button 
                    className="calendar-nav-btn" 
                    onClick={goToNextMonth}
                    disabled={currentCalendarMonth.getMonth() === new Date().getMonth() && currentCalendarMonth.getFullYear() === new Date().getFullYear()}
                    title={t('nextMonth', 'Volgende maand')}
                  >
                    ›
                  </button>
                </div>
                <div className="calendar-actions">
                </div>
                <p>{t('selectPastDate', 'Klik op een vorige dag om een dagboek in te vullen')}</p>
              </div>
              <div className="calendar-grid">
                <div className="calendar-weekdays">
                  {['Z', 'M', 'D', 'W', 'D', 'V', 'Z'].map((day, index) => (
                    <div key={index} className="weekday">{day}</div>
                  ))}
                </div>
                <div className="calendar-days">
                  {generateCalendarDays().map((dayObj, index) => (
                    <div 
                      key={index} 
                      className={`calendar-day ${
                        dayObj ? (
                          dayObj.isToday ? 'today' : 
                          dayObj.hasEntry ? 'has-entry' : 
                          dayObj.isClickable ? 'clickable' : 
                          'future'
                        ) : 'empty'
                      }`}
                      onClick={() => (dayObj?.isClickable || dayObj?.hasEntry) && handleCalendarDateClick(dayObj.date)}
                      title={
                        dayObj?.hasEntry ? t('editEntry', 'Bewerk dagboek entry') : 
                        dayObj?.isClickable ? t('clickToEdit', 'Klik om dagboek in te vullen') : ''
                      }
                    >
                      {dayObj ? dayObj.day : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>}
            
            {/* Today's Writing Interface */}
            <div className={`today-writing-section ${!showCalendar && selectedDate ? 'entry-mode' : 'calendar-mode'}`}>
              <div className="today-writing-header">
                <div className="writing-header-content">
                  {/* Back to Calendar button - positioned at top left */}
                  {!showCalendar && (
                    <button 
                      className="back-to-calendar-btn"
                      onClick={() => {
                        setShowCalendar(true);
                        // Optionally reset form if no changes were made
                        if (!hasContentChanged()) {
                          setSelectedDate('');
                          setFormData({ title: '', content: '', mood: '', tags: '' });
                          setEditingEntry(null);
                        }
                      }}
                      title={t('backToCalendar', 'Terug naar kalender')}
                    >
                      ← {t('back', 'Terug')}
                    </button>
                  )}
                  
                  <div className="today-date">
                    {(() => {
                      const displayDate = selectedDate || new Date().toISOString().split('T')[0];
                      return new Date(displayDate).toLocaleDateString('nl-NL', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                    })()}
                  </div>
                  
                </div>
              </div>
              
              <div className="quick-write-interface">
                <div className="quick-write-form">
                  
                  {/* Mood selector moved above textarea */}
                  <div className="mood-quick-select mood-above-text">
                    <span className="mood-label">{t('howDoYouFeelToday', 'Hoe voel je je vandaag?')}</span>
                    <div className="mood-options-inline">
                      {moods.slice(0, 6).map(mood => (
                        <button
                          key={mood.value}
                          className={`mood-option-quick ${formData.mood === mood.value ? 'selected' : ''}`}
                          onClick={async () => {
                            setFormData({...formData, mood: mood.value});
                            // Auto-save mood selection
                            if (formData.content.trim()) {
                              await handleSaveEntry();
                            }
                          }}
                          title={mood.label}
                        >
                          {mood.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="textarea-container">
                    <textarea
                      ref={textareaRef}
                      placeholder={t('writeHere', 'Schrijf hier je gedachten, gevoelens of ervaringen van vandaag...')}
                      value={formData.content}
                      onChange={(e) => {
                        setFormData({...formData, content: e.target.value});
                        if (editingEntry && e.target.value !== lastSavedContent) {
                          // Auto-save logic can be added here
                        }
                      }}
                      className={`quick-content-textarea ${recordingState === 'processing' ? 'processing' : ''}`}
                      rows={6}
                      disabled={recordingState === 'processing'}
                    />
                    
                    {/* Spinner overlay during transcription */}
                    {recordingState === 'processing' && (
                      <div className="textarea-spinner-overlay">
                        <div className="spinner-content">
                          <div className="loading-spinner">
                            <div className="spinner"></div>
                          </div>
                          <span className="processing-text">{t('processing', 'Verwerken...')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="quick-write-actions">
                    {/* Voice Recording Button */}
                    <div className="voice-recording-quick">
                      {audioSupported && recordingState === 'idle' && (
                        <button
                          type="button"
                          className="voice-quick-btn"
                          onClick={startRecording}
                          title={t('voiceToText', 'Spraak naar tekst')}
                        >
                          🎤
                        </button>
                      )}
                      
                      {recordingState === 'recording' && (
                        <div className="recording-indicator-quick">
                          <button
                            type="button"
                            className="stop-recording-btn-quick"
                            onClick={stopRecording}
                            title={t('stopRecording', 'Stop opname')}
                          >
                            ⏹️ {recordingTime}s
                          </button>
                        </div>
                      )}
                      
                      {recordingState === 'processing' && (
                        <div className="processing-indicator-quick">
                          <span className="processing-text">🔄 {t('processing', 'Verwerken...')}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="quick-save-actions">
                      <button
                        className="save-entry-btn"
                        onClick={handleSaveEntry}
                        disabled={!formData.content.trim() || (editingEntry && !hasContentChanged())}
                      >
                        💾 {editingEntry ? t('update', 'Bijwerken') : t('save', 'Opslaan')}
                      </button>
                      
                      {showSaveSuccess && (
                        <span className="save-success-indicator">
                          ✅ {t('saved', 'Opgeslagen!')}
                        </span>
                      )}
                      
                      {editingEntry && (
                        <button
                          className="delete-entry-btn"
                          onClick={() => {
                            showConfirmDialog(
                              t('confirmDeleteJournal', 'Weet je zeker dat je deze dagboek entry wilt verwijderen?'),
                              async () => {
                                try {
                                  await axios.delete(getFullUrl(`/api/journal/${editingEntry._id}?userId=${user.id}`));
                                  // Reset form and refresh
                                  resetForm();
                                  fetchEntries();
                                  const today = new Date().toISOString().split('T')[0];
                                  if (selectedDate === today) {
                                    // If deleting today's entry, refresh today's status
                                    loadTodayForCalendar();
                                  }
                                } catch (error) {
                                  console.error('Error deleting entry:', error);
                                  setError(t('errorDeleting', 'Fout bij verwijderen van entry'));
                                }
                              }
                            );
                          }}
                        >
                          🗑️ {t('delete', 'Verwijderen')}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {formData.content.trim() && (
                    <div className="word-count-display">
                      {countWords(formData.content)} {t('words', 'woorden')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

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
                <span className="writing-for">
                  {editingEntry ? 
                    `📝 ${t('editing', 'Bewerken')}: ${formatDate(formData.date)}` : 
                    `✏️ ${t('writingFor', 'Schrijven voor')}: ${formatDate(formData.date)}`
                  }
                </span>
              </div>
              <button className="close-btn" onClick={() => setShowCreateForm(false)}>✕</button>
            </div>

            {/* Full Writing Interface */}
            <div className="expanded-writing-area">
              {/* Quick Mood Selector */}
              <div className="quick-mood-bar">
                <span className="mood-label">{t('howAreYouFeeling', 'Hoe voel je je?')}</span>
                <div className="mood-quick-selector">
                  {moods.map(mood => (
                    <button
                      key={mood.value}
                      type="button"
                      className={`mood-emoji-btn ${formData.mood === mood.value ? 'active' : ''}`}
                      onClick={() => setFormData({...formData, mood: mood.value})}
                      title={mood.label}
                    >
                      {mood.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Writing Area */}
              <div className="writing-tools-expanded">
                {/* Voice Recording */}
                {audioSupported && recordingState === 'idle' && (
                  <button
                    type="button"
                    className="voice-tool-btn"
                    onClick={startRecording}
                    title={t('startVoiceRecording', 'Start spraak opname')}
                  >
                    🎤
                  </button>
                )}
                
                {recordingState === 'recording' && (
                  <div className="recording-indicator">
                    <button
                      type="button"
                      className="stop-recording-btn"
                      onClick={stopRecording}
                    >
                      ⏹
                    </button>
                    <span className="recording-time">
                      🔴 {formatRecordingTime(recordingTime)}
                    </span>
                  </div>
                )}
                
                {recordingState === 'processing' && (
                  <div className="processing-indicator">
                    <div className="spinner"></div>
                    <span>{t('transcribing', 'Transcriberen...')}</span>
                  </div>
                )}

                {/* Word Count */}
                <div className="word-count">
                  {countWords(formData.content)} {t('words', 'woorden')}
                </div>
              </div>

              <textarea
                ref={(el) => {
                  if (el && showCreateForm) {
                    setTimeout(() => el.focus(), 100);
                  }
                }}
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder={t('startWriting', 'Begin met schrijven... Wat houd je vandaag bezig?')}
                className="expanded-writing-textarea"
                rows="15"
                maxLength="5000"
              />

              {/* Tags Section */}
              <div className="tags-section">
                <label>{t('tags', 'Tags')}:</label>
                <input
                  type="text"
                  placeholder={t('addTag', 'Voeg tag toe...')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                <div className="tags-list">
                  {formData.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      #{tag}
                      <button onClick={() => removeTag(tag)}>×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="form-actions-expanded">
                <button 
                  className="save-btn-primary" 
                  onClick={handleSaveEntry}
                  disabled={!formData.content.trim() || (editingEntry && !hasContentChanged())}
                >
                  💾 {editingEntry ? t('update', 'Bijwerken') : t('save', 'Opslaan')}
                </button>
                
                {showSaveSuccess && (
                  <span className="save-success-indicator">
                    ✅ {t('saved', 'Opgeslagen!')}
                  </span>
                )}
                <button 
                  className="save-and-close-btn" 
                  onClick={async () => {
                    await handleSaveEntry();
                    setShowCreateForm(false);
                  }}
                  disabled={!formData.content.trim() || (editingEntry && !hasContentChanged())}
                >
                  ✅ {t('saveAndClose', 'Opslaan & Sluiten')}
                </button>
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
    </div>
  );
};

export default Journal;
