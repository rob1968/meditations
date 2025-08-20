import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LocationAutocomplete from './LocationAutocomplete';
import ImageUpload from './ImageUpload';
import { getAuthHeaders } from '../../utils/userUtils';
import '../../styles/create-activity-wizard.css';

const CreateActivityWizard = ({ user, categories, onActivityCreated, editingActivity, onCancel }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    date: '',
    startTime: '',
    duration: 120,
    minParticipants: 3,
    maxParticipants: 8,
    location: {
      name: '',
      address: '',
      city: user?.location?.city || '',
      coordinates: {
        type: 'Point',
        coordinates: [
          user?.location?.coordinates?.longitude || 4.9041,
          user?.location?.coordinates?.latitude || 52.3676
        ]
      }
    },
    privacy: 'public',
    ageRange: {
      min: 18,
      max: 99
    },
    genderPreference: 'any',
    language: user?.preferredLanguage || 'nl',
    tags: [],
    coverPhoto: '',
    cost: {
      amount: 0,
      description: t('everyonePaysOwn', 'Ieder betaalt zelf'),
      splitMethod: 'pay_own'
    }
  });

  const [currentTag, setCurrentTag] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Smart templates based on categories
  const activityTemplates = {
    'wandelen': {
      title: 'Ontspannende wandeling',
      description: 'Een mooie wandeling om samen te ontspannen en nieuwe mensen te ontmoeten. We gaan een rustige route lopen en genieten van de natuur.',
      duration: 120,
      minParticipants: 3,
      maxParticipants: 8,
      tags: ['natuur', 'ontspanning', 'sociaal'],
      ageRange: { min: 18, max: 65 },
      defaultTime: '10:00'
    },
    'yoga': {
      title: 'Yoga sessie',
      description: 'Een rustige yoga sessie voor alle niveaus. Breng je eigen mat mee. We doen verschillende poses en adem oefeningen.',
      duration: 90,
      minParticipants: 4,
      maxParticipants: 12,
      tags: ['yoga', 'wellness', 'mindfulness'],
      ageRange: { min: 16, max: 99 },
      defaultTime: '18:30'
    },
    'koffie': {
      title: 'Koffie & gesprek',
      description: 'Gezellig samenkomen voor een kop koffie en een goed gesprek. Perfecte kans om nieuwe mensen te ontmoeten in een relaxte sfeer.',
      duration: 90,
      minParticipants: 2,
      maxParticipants: 6,
      tags: ['sociaal', 'gesprek', 'ontmoeting'],
      ageRange: { min: 18, max: 99 },
      defaultTime: '14:00'
    },
    'sport': {
      title: 'Sport activiteit',
      description: 'Een leuke sport activiteit voor iedereen. Geen ervaring nodig, gewoon zin om te bewegen en plezier te hebben!',
      duration: 120,
      minParticipants: 4,
      maxParticipants: 16,
      tags: ['sport', 'actief', 'fitness'],
      ageRange: { min: 16, max: 55 },
      defaultTime: '19:00'
    },
    'kunst': {
      title: 'Creatieve workshop',
      description: 'Een creatieve workshop waar we samen iets moois maken. Alle materialen worden verschaft.',
      duration: 150,
      minParticipants: 4,
      maxParticipants: 10,
      tags: ['kunst', 'creativiteit', 'workshop'],
      ageRange: { min: 18, max: 99 },
      defaultTime: '14:30'
    },
    'eten': {
      title: 'Samen koken & eten',
      description: 'We bereiden samen een heerlijke maaltijd en genieten van elkaars gezelschap. Ingrediënten worden gedeeld.',
      duration: 180,
      minParticipants: 4,
      maxParticipants: 8,
      tags: ['koken', 'eten', 'sociaal'],
      ageRange: { min: 18, max: 99 },
      defaultTime: '17:00'
    },
    'muziek': {
      title: 'Muziek sessie',
      description: 'Samen muziek maken of luisteren. Breng je instrument mee of kom gewoon genieten van de muziek!',
      duration: 120,
      minParticipants: 3,
      maxParticipants: 12,
      tags: ['muziek', 'jam', 'creatief'],
      ageRange: { min: 16, max: 99 },
      defaultTime: '20:00'
    },
    'leren': {
      title: 'Leer workshop',
      description: 'Een educatieve workshop waar we samen nieuwe vaardigheden leren. Interactief en leerzaam!',
      duration: 120,
      minParticipants: 5,
      maxParticipants: 15,
      tags: ['leren', 'workshop', 'educatie'],
      ageRange: { min: 18, max: 99 },
      defaultTime: '19:30'
    }
  };

  // Get smart default time based on day of week
  const getSmartDefaultTime = (category) => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = now.getHours();
    
    // Weekend suggestions
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (category === 'koffie') return '10:30';
      if (category === 'wandelen') return '10:00';
      if (category === 'sport') return '10:30';
      return '14:00';
    }
    
    // Weekday suggestions
    if (hour < 12) return '19:00'; // Morning -> evening activity
    if (hour < 17) return '19:30'; // Afternoon -> evening activity
    return '20:00'; // Evening -> later evening
  };

  // Populate form when editing
  useEffect(() => {
    if (editingActivity) {
      const activity = editingActivity;
      setFormData({
        title: activity.title || '',
        description: activity.description || '',
        category: activity.category?._id || activity.category || '',
        date: activity.date ? new Date(activity.date).toISOString().split('T')[0] : '',
        startTime: activity.startTime || '',
        duration: activity.duration || 120,
        minParticipants: activity.minParticipants || 3,
        maxParticipants: activity.maxParticipants || 8,
        location: activity.location || formData.location,
        privacy: activity.privacy || 'public',
        ageRange: activity.ageRange || { min: 18, max: 99 },
        genderPreference: activity.genderPreference || 'any',
        language: activity.language || user?.preferredLanguage || 'nl',
        tags: activity.tags || [],
        coverPhoto: activity.coverPhoto || '',
        cost: activity.cost || formData.cost
      });
    }
  }, [editingActivity, user]);

  // Smart defaults based on category selection
  useEffect(() => {
    if (formData.category && !selectedTemplate) {
      const selectedCategory = categories.find(cat => cat._id === formData.category);
      const categoryName = selectedCategory?.name?.nl?.toLowerCase();
      
      if (categoryName && activityTemplates[categoryName]) {
        const template = activityTemplates[categoryName];
        setSelectedTemplate(template);
        
        // Apply template if fields are empty
        if (!formData.title) {
          setFormData(prev => ({ ...prev, title: template.title }));
        }
        if (!formData.description) {
          setFormData(prev => ({ ...prev, description: template.description }));
        }
        setFormData(prev => ({
          ...prev,
          duration: template.duration,
          minParticipants: template.minParticipants,
          maxParticipants: template.maxParticipants,
          tags: template.tags,
          ageRange: template.ageRange,
          startTime: prev.startTime || template.defaultTime || getSmartDefaultTime(categoryName)
        }));
      }
    }
  }, [formData.category, categories, selectedTemplate]);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear validation error when field is updated
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step) => {
    const errors = {};
    
    switch (step) {
      case 1:
        // Title validation
        if (!formData.title.trim()) {
          errors.title = t('titleRequired', 'Titel is verplicht');
        } else if (formData.title.trim().length < 5) {
          errors.title = t('titleTooShort', 'Titel moet minimaal 5 karakters zijn');
        } else if (formData.title.trim().length > 100) {
          errors.title = t('titleTooLong', 'Titel mag maximaal 100 karakters zijn');
        }

        // Description validation
        if (!formData.description.trim()) {
          errors.description = t('descriptionRequired', 'Beschrijving is verplicht');
        } else if (formData.description.trim().length < 20) {
          errors.description = t('descriptionTooShort', 'Beschrijving moet minimaal 20 karakters zijn');
        } else if (formData.description.trim().length > 1000) {
          errors.description = t('descriptionTooLong', 'Beschrijving mag maximaal 1000 karakters zijn');
        }

        // Category validation
        if (!formData.category) {
          errors.category = t('categoryRequired', 'Categorie is verplicht');
        }

        // Date validation
        if (!formData.date) {
          errors.date = t('dateRequired', 'Datum is verplicht');
        } else {
          const selectedDate = new Date(formData.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (selectedDate < today) {
            errors.date = t('dateInPast', 'Datum kan niet in het verleden zijn');
          }
          
          const maxDate = new Date();
          maxDate.setFullYear(maxDate.getFullYear() + 1);
          if (selectedDate > maxDate) {
            errors.date = t('dateTooFar', 'Datum kan niet meer dan een jaar vooruit zijn');
          }
        }

        // Time validation
        if (!formData.startTime) {
          errors.startTime = t('startTimeRequired', 'Starttijd is verplicht');
        } else if (formData.date) {
          const selectedDateTime = new Date(`${formData.date}T${formData.startTime}`);
          const now = new Date();
          
          if (selectedDateTime <= now) {
            errors.startTime = t('timeInPast', 'Activiteit kan niet in het verleden gepland worden');
          }
        }

        // Duration validation
        if (formData.duration < 30) {
          errors.duration = t('durationTooShort', 'Duur moet minimaal 30 minuten zijn');
        } else if (formData.duration > 480) {
          errors.duration = t('durationTooLong', 'Duur mag maximaal 8 uur zijn');
        }
        break;

      case 2:
        // Location validation
        if (!formData.location.name || !formData.location.name.trim()) {
          errors.location = t('locationRequired', 'Locatie is verplicht');
        } else if (formData.location.name.trim().length < 3) {
          errors.location = t('locationTooShort', 'Locatie naam moet minimaal 3 karakters zijn');
        }

        // Participants validation
        if (formData.minParticipants < 2) {
          errors.minParticipants = t('minParticipantsTooLow', 'Minimum 2 deelnemers vereist');
        } else if (formData.minParticipants > 50) {
          errors.minParticipants = t('minParticipantsTooHigh', 'Maximum 50 deelnemers toegestaan');
        }

        if (formData.maxParticipants < formData.minParticipants) {
          errors.maxParticipants = t('maxLessThanMin', 'Maximum moet groter zijn dan minimum');
        } else if (formData.maxParticipants > 50) {
          errors.maxParticipants = t('maxParticipantsTooHigh', 'Maximum 50 deelnemers toegestaan');
        }

        // Age range validation
        if (formData.ageRange.min < 16) {
          errors.ageRangeMin = t('ageTooLow', 'Minimum leeftijd is 16 jaar');
        } else if (formData.ageRange.min > 99) {
          errors.ageRangeMin = t('ageTooHigh', 'Maximum leeftijd is 99 jaar');
        }

        if (formData.ageRange.max < formData.ageRange.min) {
          errors.ageRangeMax = t('maxAgeLessThanMin', 'Maximum leeftijd moet groter zijn dan minimum');
        } else if (formData.ageRange.max > 99) {
          errors.ageRangeMax = t('maxAgeTooHigh', 'Maximum leeftijd is 99 jaar');
        }
        break;

      case 3:
        // Image validation (optional but if provided, validate URL format)
        if (formData.coverPhoto && formData.coverPhoto.trim()) {
          try {
            new URL(formData.coverPhoto);
          } catch {
            errors.coverPhoto = t('invalidImageUrl', 'Ongeldige afbeelding URL');
          }
        }

        // Tags validation
        if (formData.tags.length > 10) {
          errors.tags = t('tooManyTags', 'Maximum 10 tags toegestaan');
        }

        // Cost validation
        if (formData.cost.amount < 0) {
          errors.cost = t('negativeCost', 'Kosten kunnen niet negatief zijn');
        } else if (formData.cost.amount > 500) {
          errors.cost = t('costTooHigh', 'Kosten mogen niet hoger zijn dan €500');
        }
        break;

      case 4:
        // Final validations - check all critical fields again
        if (!formData.title.trim() || !formData.description.trim() || !formData.category || 
            !formData.date || !formData.startTime || !formData.location.name) {
          errors.finalCheck = t('missingRequiredFields', 'Controleer alle verplichte velden');
        }
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      handleInputChange('tags', [...formData.tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const handleLocationSelect = (location) => {
    handleInputChange('location', location);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    
    setIsSubmitting(true);
    
    try {
      const submitData = { ...formData };
      
      const response = await fetch('/api/activities', {
        method: editingActivity ? 'PUT' : 'POST',
        headers: {
          ...getAuthHeaders(user),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('submitError', 'Er ging iets mis bij het opslaan'));
      }

      const result = await response.json();
      
      if (onActivityCreated) {
        onActivityCreated(result.activity);
      }
    } catch (error) {
      console.error('Error submitting activity:', error);
      setValidationErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderWhatAndWhen();
      case 2:
        return renderWhereAndWho();
      case 3:
        return renderDetailsAndMedia();
      case 4:
        return renderFinalReview();
      default:
        return null;
    }
  };

  const renderWhatAndWhen = () => (
    <div className="wizard-step">
      <div className="step-header">
        <h3 className="step-title">
          <span className="step-icon">📝</span>
          {t('whatAndWhen', 'Wat & Wanneer')}
        </h3>
        <p className="step-description">{t('whatAndWhenDesc', 'Vertel ons over je activiteit')}</p>
      </div>

      <div className="form-group">
        <label className="form-label">
          <span className="label-icon">🎯</span>
          {t('activityTitle', 'Titel')} *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder={t('titlePlaceholder', 'Geef je activiteit een catchy titel...')}
          className={`form-input ${validationErrors.title ? 'error' : ''}`}
          maxLength={100}
        />
        {validationErrors.title && <div className="error-message">{validationErrors.title}</div>}
      </div>

      <div className="form-group">
        <label className="form-label">
          <span className="label-icon">🏷️</span>
          {t('category', 'Categorie')} *
        </label>
        <select
          value={formData.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
          className={`form-select ${validationErrors.category ? 'error' : ''}`}
        >
          <option value="">{t('selectCategory', 'Kies een categorie...')}</option>
          {categories.map(category => (
            <option key={category._id} value={category._id}>
              {category.emoji} {category.name?.nl || category.name?.en}
            </option>
          ))}
        </select>
        {validationErrors.category && <div className="error-message">{validationErrors.category}</div>}
      </div>

      {selectedTemplate && (
        <div className="template-suggestion">
          <div className="template-header">
            <span className="template-icon">💡</span>
            <span className="template-text">{t('smartSuggestion', 'Slimme suggestie')}</span>
          </div>
          <p className="template-description">{t('templateApplied', 'We hebben enkele suggesties toegepast op basis van je categorie. Je kunt alles nog aanpassen!')}</p>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">
          <span className="label-icon">📄</span>
          {t('description', 'Beschrijving')} *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder={t('descriptionPlaceholder', 'Beschrijf wat je gaat doen, wat deelnemers kunnen verwachten...')}
          className={`form-textarea ${validationErrors.description ? 'error' : ''}`}
          maxLength={1000}
          rows={4}
        />
        {validationErrors.description && <div className="error-message">{validationErrors.description}</div>}
        <div className="char-count">{formData.description.length}/1000</div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            <span className="label-icon">📅</span>
            {t('date', 'Datum')} *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            min={getMinDate()}
            className={`form-input ${validationErrors.date ? 'error' : ''}`}
          />
          {validationErrors.date && <div className="error-message">{validationErrors.date}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">
            <span className="label-icon">🕐</span>
            {t('startTime', 'Starttijd')} *
          </label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => handleInputChange('startTime', e.target.value)}
            className={`form-input ${validationErrors.startTime ? 'error' : ''}`}
          />
          {validationErrors.startTime && <div className="error-message">{validationErrors.startTime}</div>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          <span className="label-icon">⏱️</span>
          {t('duration', 'Duur')}: {formData.duration} {t('minutes', 'minuten')}
        </label>
        <input
          type="range"
          min="30"
          max="480"
          step="30"
          value={formData.duration}
          onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
          className={`form-range ${validationErrors.duration ? 'error' : ''}`}
        />
        <div className="range-labels">
          <span>30 min</span>
          <span>8 uur</span>
        </div>
        {validationErrors.duration && <div className="error-message">{validationErrors.duration}</div>}
      </div>
    </div>
  );

  const renderWhereAndWho = () => (
    <div className="wizard-step">
      <div className="step-header">
        <h3 className="step-title">
          <span className="step-icon">📍</span>
          {t('whereAndWho', 'Waar & Wie')}
        </h3>
        <p className="step-description">{t('whereAndWhoDesc', 'Kies de locatie en deelnemers')}</p>
      </div>

      <div className="form-group">
        <label className="form-label">
          <span className="label-icon">📍</span>
          {t('location', 'Locatie')} *
        </label>
        <LocationAutocomplete
          value={formData.location}
          onChange={handleLocationSelect}
          placeholder={t('locationPlaceholder', 'Zoek naar een locatie...')}
          className={validationErrors.location ? 'error' : ''}
        />
        {validationErrors.location && <div className="error-message">{validationErrors.location}</div>}
      </div>

      <div className="form-group">
        <label className="form-label">
          <span className="label-icon">👥</span>
          {t('participants', 'Aantal deelnemers')}
        </label>
        <div className="form-row">
          <div className="form-group">
            <label className="form-sublabel">{t('minimum', 'Minimum')}</label>
            <input
              type="number"
              min="2"
              max="50"
              value={formData.minParticipants}
              onChange={(e) => handleInputChange('minParticipants', parseInt(e.target.value) || 2)}
              className={`form-input ${validationErrors.minParticipants ? 'error' : ''}`}
            />
            {validationErrors.minParticipants && <div className="error-message">{validationErrors.minParticipants}</div>}
          </div>
          <div className="form-group">
            <label className="form-sublabel">{t('maximum', 'Maximum')}</label>
            <input
              type="number"
              min={formData.minParticipants}
              max="50"
              value={formData.maxParticipants}
              onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value) || formData.minParticipants)}
              className={`form-input ${validationErrors.maxParticipants ? 'error' : ''}`}
            />
            {validationErrors.maxParticipants && <div className="error-message">{validationErrors.maxParticipants}</div>}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          <span className="label-icon">🎂</span>
          {t('ageRange', 'Leeftijdsrange')}
        </label>
        <div className="form-row">
          <div className="form-group">
            <label className="form-sublabel">{t('minAge', 'Minimum leeftijd')}</label>
            <input
              type="number"
              min="16"
              max="99"
              value={formData.ageRange.min}
              onChange={(e) => handleInputChange('ageRange.min', parseInt(e.target.value) || 18)}
              className={`form-input ${validationErrors.ageRangeMin ? 'error' : ''}`}
            />
            {validationErrors.ageRangeMin && <div className="error-message">{validationErrors.ageRangeMin}</div>}
          </div>
          <div className="form-group">
            <label className="form-sublabel">{t('maxAge', 'Maximum leeftijd')}</label>
            <input
              type="number"
              min={formData.ageRange.min}
              max="99"
              value={formData.ageRange.max}
              onChange={(e) => handleInputChange('ageRange.max', parseInt(e.target.value) || 99)}
              className={`form-input ${validationErrors.ageRangeMax ? 'error' : ''}`}
            />
            {validationErrors.ageRangeMax && <div className="error-message">{validationErrors.ageRangeMax}</div>}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          <span className="label-icon">⚧️</span>
          {t('genderPreference', 'Geslachtsvoorkeur')}
        </label>
        <select
          value={formData.genderPreference}
          onChange={(e) => handleInputChange('genderPreference', e.target.value)}
          className="form-select"
        >
          <option value="any">{t('anyGender', 'Alle geslachten welkom')}</option>
          <option value="male">{t('maleOnly', 'Alleen mannen')}</option>
          <option value="female">{t('femaleOnly', 'Alleen vrouwen')}</option>
          <option value="other">{t('otherGender', 'Niet-binair/anders')}</option>
        </select>
      </div>
    </div>
  );

  const renderDetailsAndMedia = () => (
    <div className="wizard-step">
      <div className="step-header">
        <h3 className="step-title">
          <span className="step-icon">🎨</span>
          {t('detailsAndMedia', 'Details & Media')}
        </h3>
        <p className="step-description">{t('detailsAndMediaDesc', 'Voeg extra details en afbeeldingen toe')}</p>
      </div>

      <div className="form-group">
        <label className="form-label">
          <span className="label-icon">📷</span>
          {t('coverPhoto', 'Cover foto')}
        </label>
        <ImageUpload
          value={formData.coverPhoto}
          onChange={(imageUrl) => handleInputChange('coverPhoto', imageUrl)}
          className={`wizard-image-upload ${validationErrors.coverPhoto ? 'error' : ''}`}
        />
        {validationErrors.coverPhoto && <div className="error-message">{validationErrors.coverPhoto}</div>}
      </div>

      <div className="form-group">
        <label className="form-label">
          <span className="label-icon">🏷️</span>
          {t('tags', 'Tags')}
        </label>
        <div className="tags-input">
          <input
            type="text"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder={t('addTag', 'Voeg een tag toe...')}
            className="form-input"
          />
          <button type="button" onClick={addTag} className="add-tag-btn">
            {t('add', 'Toevoegen')}
          </button>
        </div>
        
        <div className="tags-display">
          {formData.tags.map((tag, index) => (
            <span key={index} className="tag">
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="remove-tag"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {validationErrors.tags && <div className="error-message">{validationErrors.tags}</div>}
      </div>

      <div className="form-group">
        <label className="form-label">
          <span className="label-icon">💰</span>
          {t('cost', 'Kosten')}
        </label>
        <div className="cost-options">
          <div className="cost-option">
            <input
              type="radio"
              id="free"
              name="costType"
              value="free"
              checked={formData.cost.amount === 0}
              onChange={() => handleInputChange('cost', { amount: 0, description: t('free', 'Gratis'), splitMethod: 'free' })}
            />
            <label htmlFor="free">{t('free', 'Gratis')}</label>
          </div>
          <div className="cost-option">
            <input
              type="radio"
              id="payOwn"
              name="costType"
              value="pay_own"
              checked={formData.cost.splitMethod === 'pay_own'}
              onChange={() => handleInputChange('cost', { ...formData.cost, splitMethod: 'pay_own', description: t('everyonePaysOwn', 'Ieder betaalt zelf') })}
            />
            <label htmlFor="payOwn">{t('everyonePaysOwn', 'Ieder betaalt zelf')}</label>
          </div>
          <div className="cost-option">
            <input
              type="radio"
              id="setAmount"
              name="costType"
              value="set_amount"
              checked={formData.cost.amount > 0}
              onChange={() => handleInputChange('cost', { ...formData.cost, amount: 10 })}
            />
            <label htmlFor="setAmount">{t('setAmount', 'Vaste prijs')}</label>
          </div>
        </div>
        
        {formData.cost.amount > 0 && (
          <div className="cost-details">
            <input
              type="number"
              min="0"
              step="0.50"
              value={formData.cost.amount}
              onChange={(e) => handleInputChange('cost.amount', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className={`form-input cost-input ${validationErrors.cost ? 'error' : ''}`}
            />
            <span className="currency">€</span>
          </div>
        )}
        {validationErrors.cost && <div className="error-message">{validationErrors.cost}</div>}
      </div>
    </div>
  );

  const renderFinalReview = () => (
    <div className="wizard-step">
      <div className="step-header">
        <h3 className="step-title">
          <span className="step-icon">✅</span>
          {t('finalReview', 'Laatste controle')}
        </h3>
        <p className="step-description">{t('finalReviewDesc', 'Controleer je activiteit voordat je deze publiceert')}</p>
      </div>

      <div className="activity-preview">
        <div className="preview-header">
          {formData.coverPhoto && (
            <div className="preview-image">
              <img src={formData.coverPhoto} alt={formData.title} />
            </div>
          )}
          <div className="preview-content">
            <div className="preview-category">
              {categories.find(cat => cat._id === formData.category)?.emoji} {categories.find(cat => cat._id === formData.category)?.name?.nl}
            </div>
            <h4 className="preview-title">{formData.title}</h4>
            <p className="preview-description">{formData.description}</p>
          </div>
        </div>

        <div className="preview-details">
          <div className="preview-detail">
            <span className="detail-icon">📅</span>
            <span className="detail-text">{formData.date} om {formData.startTime}</span>
          </div>
          <div className="preview-detail">
            <span className="detail-icon">⏱️</span>
            <span className="detail-text">{formData.duration} minuten</span>
          </div>
          <div className="preview-detail">
            <span className="detail-icon">📍</span>
            <span className="detail-text">{formData.location.name}</span>
          </div>
          <div className="preview-detail">
            <span className="detail-icon">👥</span>
            <span className="detail-text">{formData.minParticipants}-{formData.maxParticipants} deelnemers</span>
          </div>
          <div className="preview-detail">
            <span className="detail-icon">💰</span>
            <span className="detail-text">
              {formData.cost.amount === 0 ? t('free', 'Gratis') : `€${formData.cost.amount}`}
            </span>
          </div>
        </div>

        {formData.tags.length > 0 && (
          <div className="preview-tags">
            {formData.tags.map((tag, index) => (
              <span key={index} className="preview-tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {validationErrors.finalCheck && (
        <div className="error-message submit-error">
          {validationErrors.finalCheck}
        </div>
      )}

      {validationErrors.submit && (
        <div className="error-message submit-error">
          {validationErrors.submit}
        </div>
      )}
    </div>
  );

  return (
    <div className="create-activity-wizard">
      {/* Progress Bar */}
      <div className="wizard-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(currentStep / 4) * 100}%` }}
          ></div>
        </div>
        <div className="progress-steps">
          {[1, 2, 3, 4].map(step => (
            <div 
              key={step} 
              className={`progress-step ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}
            >
              <div className="step-number">{step}</div>
              <div className="step-label">
                {step === 1 && t('whatWhen', 'Wat & Wanneer')}
                {step === 2 && t('whereWho', 'Waar & Wie')}
                {step === 3 && t('detailsMedia', 'Details & Media')}
                {step === 4 && t('review', 'Controle')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="wizard-content">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="wizard-navigation">
        <button
          type="button"
          onClick={onCancel}
          className="wizard-btn cancel-btn"
        >
          {t('cancel', 'Annuleren')}
        </button>

        <div className="nav-buttons">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="wizard-btn prev-btn"
            >
              ← {t('previous', 'Vorige')}
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="wizard-btn next-btn"
            >
              {t('next', 'Volgende')} →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="wizard-btn submit-btn"
            >
              {isSubmitting 
                ? t('creating', 'Aanmaken...')
                : editingActivity 
                  ? t('updateActivity', 'Activiteit bijwerken')
                  : t('createActivity', 'Activiteit aanmaken')
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateActivityWizard;