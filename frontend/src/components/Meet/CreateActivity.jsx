import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LocationAutocomplete from './LocationAutocomplete';
import { getAuthHeaders } from '../../utils/userUtils';

const CreateActivity = ({ user, categories, onActivityCreated, editingActivity, onCancel }) => {
  console.log('🏗️ CreateActivity component loaded');
  console.log('👤 User:', user?.username, 'Verified:', user?.isVerified);
  console.log('📦 Categories:', categories?.length || 0);
  
  const { t } = useTranslation();
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
    cost: {
      amount: 0,
      description: t('everyonePaysOwn', 'Ieder betaalt zelf'),
      splitMethod: 'pay_own'
    }
  });
  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!editingActivity;

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
        location: activity.location || {
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
        privacy: activity.privacy || 'public',
        ageRange: activity.ageRange || { min: 18, max: 99 },
        genderPreference: activity.genderPreference || 'any',
        language: activity.language || user?.preferredLanguage || 'nl',
        tags: activity.tags || [],
        cost: activity.cost || {
          amount: 0,
          description: t('everyonePaysOwn', 'Ieder betaalt zelf'),
          splitMethod: 'pay_own'
        }
      });
    }
  }, [editingActivity, user]);

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
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const userId = user?.id || user?._id || '';
    const url = isEditing ? `/api/activities/${editingActivity._id}` : '/api/activities';
    const method = isEditing ? 'PUT' : 'POST';
    
    console.log(`🔧 ${isEditing ? 'Updating' : 'Creating'} activity with user ID:`, userId);
    console.log('🔧 Form data being sent:', JSON.stringify(formData, null, 2));

    try {
      const response = await fetch(url, {
        method: method,
        headers: getAuthHeaders(user),
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Activity ${isEditing ? 'updated' : 'created'} successfully:`, result);
        onActivityCreated(result.activity || result);
      } else {
        let error = 'Unknown error';
        try {
          const errorData = await response.json();
          error = errorData;
          console.error(`❌ Failed to ${isEditing ? 'update' : 'create'} activity:`, errorData);
        } catch (parseError) {
          const errorText = await response.text();
          console.error(`❌ Failed to ${isEditing ? 'update' : 'create'} activity (raw):`, response.status, errorText);
          error = { error: errorText || `HTTP ${response.status}` };
        }
        alert(`Kon activiteit niet ${isEditing ? 'bijwerken' : 'aanmaken'}: ${error.error || JSON.stringify(error)}`);
      }
    } catch (error) {
      console.error(`❌ Error ${isEditing ? 'updating' : 'creating'} activity:`, error);
      alert(`Er ging iets mis bij het ${isEditing ? 'bijwerken' : 'aanmaken'}: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  console.log('🎨 Rendering CreateActivity form');
  
  return (
    <div className="create-activity" style={{background: 'rgba(255,0,0,0.1)', minHeight: '200px', padding: '20px'}}>
      <div style={{background: 'yellow', padding: '10px', marginBottom: '20px', color: 'black'}}>
        🔧 DEBUG: CreateActivity component is rendering! User: {user?.username}
      </div>
      <div className="create-activity-header">
        <h2 className="create-activity-title">
          {isEditing ? t('editActivity', 'Activiteit Bewerken') : t('createNewActivity', 'Nieuwe Activiteit')}
        </h2>
        <p className="create-activity-subtitle">
          {isEditing 
            ? t('editActivityDesc', 'Pas je activiteit aan en beheer de details') 
            : t('createActivityDesc', 'Organiseer een activiteit en ontmoet nieuwe mensen!')
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="create-activity-form">
        {/* Basic Info */}
        <div className="form-section">
          <h3 className="section-title">{t('basicInfo', 'Basis Informatie')}</h3>
          
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📝</span>
              {t('activityTitle', 'Titel')} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder={t('titlePlaceholder', 'Geef je activiteit een catchy titel...')}
              className="form-input"
              maxLength={100}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📄</span>
              {t('description', 'Beschrijving')} *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder={t('descriptionPlaceholder', 'Beschrijf wat je gaat doen, wat deelnemers kunnen verwachten...')}
              className="form-textarea"
              maxLength={1000}
              rows={4}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">🏷️</span>
              {t('category', 'Categorie')} *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="form-select"
              required
            >
              <option value="">{t('selectCategory', 'Kies een categorie...')}</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.emoji} {category.name?.nl || category.name?.en}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date & Time */}
        <div className="form-section">
          <h3 className="section-title">{t('dateTime', 'Datum & Tijd')}</h3>
          
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
                className="form-input"
                required
              />
              <div className="form-help-text">
                {t('sameDayRestrictionHelp', 'Let op: gebruikers kunnen slechts aan één activiteit per dag deelnemen')}
              </div>
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
                className="form-input"
                required
              />
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
              className="form-range"
            />
            <div className="range-labels">
              <span>30min</span>
              <span>8u</span>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="form-section">
          <h3 className="section-title">{t('location', 'Locatie')}</h3>
          
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📍</span>
              {t('locationSearch', 'Zoek locatie')} *
            </label>
            <LocationAutocomplete
              value={formData.location}
              onChange={(locationData) => {
                setFormData(prev => ({
                  ...prev,
                  location: {
                    name: locationData.name || '',
                    address: locationData.address || '',
                    city: locationData.city || prev.location.city,
                    coordinates: locationData.coordinates ? {
                      type: 'Point',
                      coordinates: [locationData.coordinates.longitude, locationData.coordinates.latitude]
                    } : prev.location.coordinates,
                    placeId: locationData.placeId || null,
                    types: locationData.types || []
                  }
                }));
              }}
              placeholder={t('locationPlaceholder', 'Zoek naar restaurants, cafés, parken...')}
              required
              countryCode="NL"
            />
            <div className="location-help-text">
              {t('locationHelp', 'Typ de naam van een restaurant, café, park of ander adres')}
            </div>
          </div>

          {formData.location.address && (
            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">🏠</span>
                {t('selectedLocation', 'Geselecteerde locatie')}
              </label>
              <div className="selected-location-display">
                <div className="location-name">{formData.location.name}</div>
                <div className="location-address">{formData.location.address}</div>
              </div>
            </div>
          )}
        </div>

        {/* Participants */}
        <div className="form-section">
          <h3 className="section-title">{t('participants', 'Deelnemers')}</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">👥</span>
                {t('minParticipants', 'Minimum')}
              </label>
              <select
                value={formData.minParticipants}
                onChange={(e) => handleInputChange('minParticipants', parseInt(e.target.value))}
                className="form-select"
              >
                {[2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">👥</span>
                {t('maxParticipants', 'Maximum')}
              </label>
              <select
                value={formData.maxParticipants}
                onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value))}
                className="form-select"
              >
                {[4, 5, 6, 8, 10, 12, 15, 20].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Age Range */}
        <div className="form-section">
          <h3 className="section-title">{t('ageRange', 'Leeftijdsrange')}</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">👶</span>
                {t('minimumAge', 'Minimumleeftijd')}
              </label>
              <select
                value={formData.ageRange.min}
                onChange={(e) => handleInputChange('ageRange.min', parseInt(e.target.value))}
                className="form-select"
              >
                {[13, 16, 18, 21, 25, 30, 35, 40, 45, 50, 55, 60, 65].map(age => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">👴</span>
                {t('maximumAge', 'Maximumleeftijd')}
              </label>
              <select
                value={formData.ageRange.max}
                onChange={(e) => handleInputChange('ageRange.max', parseInt(e.target.value))}
                className="form-select"
              >
                {[25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 99].map(age => (
                  <option key={age} value={age}>{age === 99 ? '99+' : age}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Gender Preference */}
        <div className="form-section">
          <h3 className="section-title">{t('genderPreference', 'Geslachtsvoorkeur')}</h3>
          
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">⚧️</span>
              {t('genderPreferenceDesc', 'Wie kan deelnemen aan deze activiteit?')}
            </label>
            <select
              value={formData.genderPreference}
              onChange={(e) => handleInputChange('genderPreference', e.target.value)}
              className="form-select"
            >
              <option value="any">{t('anyGender', 'Iedereen welkom')}</option>
              <option value="male">{t('maleOnly', 'Alleen mannen')}</option>
              <option value="female">{t('femaleOnly', 'Alleen vrouwen')}</option>
              <option value="other">{t('otherOnly', 'Non-binair/anders')}</option>
            </select>
            <div className="form-help-text">
              {t('genderHelp', 'Kies "Iedereen welkom" voor gemengde activiteiten')}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="form-section">
          <h3 className="section-title">{t('tags', 'Tags')}</h3>
          
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">🏷️</span>
              {t('addTags', 'Voeg tags toe')}
            </label>
            <div className="tag-input-container">
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                placeholder={t('tagPlaceholder', 'bijv. gezellig, outdoor, beginners...')}
                className="tag-input"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <button
                type="button"
                onClick={addTag}
                className="add-tag-button mobile-touch-target"
              >
                {t('add', 'Toevoegen')}
              </button>
            </div>
          </div>

          {(formData.tags?.length || 0) > 0 && (
            <div className="selected-tags">
              {formData.tags.map(tag => (
                <span key={tag} className="selected-tag">
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="remove-tag mobile-touch-target"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Cost */}
        <div className="form-section">
          <h3 className="section-title">{t('cost', 'Kosten')}</h3>
          
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">💰</span>
              {t('costAmount', 'Geschatte kosten per persoon')}
            </label>
            <div className="cost-input-container">
              <span className="currency-symbol">€</span>
              <input
                type="number"
                min="0"
                step="0.50"
                value={formData.cost.amount}
                onChange={(e) => handleInputChange('cost.amount', parseFloat(e.target.value) || 0)}
                className="cost-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📝</span>
              {t('costDescription', 'Kostenbeschrijving')}
            </label>
            <input
              type="text"
              value={formData.cost.description}
              onChange={(e) => handleInputChange('cost.description', e.target.value)}
              placeholder={t('costPlaceholder', 'bijv. Ieder betaalt zelf, Entree €10, Gratis...')}
              className="form-input"
            />
          </div>
        </div>

        {/* Privacy */}
        <div className="form-section">
          <h3 className="section-title">{t('privacy', 'Privacy')}</h3>
          
          <div className="privacy-options">
            <label className="privacy-option">
              <input
                type="radio"
                value="public"
                checked={formData.privacy === 'public'}
                onChange={(e) => handleInputChange('privacy', e.target.value)}
              />
              <div className="privacy-option-content">
                <span className="privacy-icon">🌐</span>
                <div className="privacy-text">
                  <strong>{t('publicActivity', 'Openbaar')}</strong>
                  <p>{t('publicDesc', 'Iedereen kan deze activiteit zien en deelnemen')}</p>
                </div>
              </div>
            </label>

            <label className="privacy-option">
              <input
                type="radio"
                value="invite_only"
                checked={formData.privacy === 'invite_only'}
                onChange={(e) => handleInputChange('privacy', e.target.value)}
              />
              <div className="privacy-option-content">
                <span className="privacy-icon">🚪</span>
                <div className="privacy-text">
                  <strong>{t('inviteOnly', 'Alleen op uitnodiging')}</strong>
                  <p>{t('inviteDesc', 'Alleen uitgenodigde gebruikers kunnen deelnemen')}</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="form-footer">
          {isEditing && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="cancel-button secondary-button mobile-touch-target"
            >
              <span className="button-icon">❌</span>
              <span className="button-text">{t('cancel', 'Annuleren')}</span>
            </button>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="submit-button primary-button mobile-touch-target"
          >
            {isSubmitting ? (
              <>
                <span className="button-icon">⏳</span>
                <span className="button-text">
                  {isEditing ? t('updating', 'Bijwerken...') : t('creating', 'Aanmaken...')}
                </span>
              </>
            ) : (
              <>
                <span className="button-icon">{isEditing ? '💾' : '✨'}</span>
                <span className="button-text">
                  {isEditing ? t('updateActivity', 'Activiteit Bijwerken') : t('createActivity', 'Activiteit Aanmaken')}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateActivity;