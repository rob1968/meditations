import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const ActivityFilters = ({ filters, categories, onFilterChange, onClose }) => {
  const { t } = useTranslation();
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterUpdate = (key, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
    onClose();
  };

  const clearFilters = () => {
    const clearedFilters = {
      category: '',
      date: '',
      city: '',
      maxDistance: 25,
      language: 'nl'
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const getDateOptions = () => {
    const options = [];
    const today = new Date();
    
    // Today
    options.push({
      value: today.toISOString().split('T')[0],
      label: t('today', 'Vandaag')
    });
    
    // Tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    options.push({
      value: tomorrow.toISOString().split('T')[0],
      label: t('tomorrow', 'Morgen')
    });
    
    // This weekend
    const friday = new Date(today);
    const daysUntilFriday = (5 - today.getDay() + 7) % 7;
    friday.setDate(today.getDate() + daysUntilFriday);
    options.push({
      value: friday.toISOString().split('T')[0],
      label: t('thisWeekend', 'Dit weekend')
    });
    
    // Next week
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    options.push({
      value: nextWeek.toISOString().split('T')[0],
      label: t('nextWeek', 'Volgende week')
    });
    
    return options;
  };

  return (
    <div className="activity-filters-overlay">
      <div className="activity-filters">
        <div className="filters-header">
          <h3 className="filters-title">{t('filterActivities', 'Filter Activiteiten')}</h3>
          <button className="close-filters" onClick={onClose}>
            <span>✕</span>
          </button>
        </div>
        
        <div className="filters-content">
          {/* Category Filter */}
          <div className="filter-group">
            <label className="filter-label">
              <span className="filter-icon">🏷️</span>
              {t('category', 'Categorie')}
            </label>
            <select
              value={localFilters.category}
              onChange={(e) => handleFilterUpdate('category', e.target.value)}
              className="filter-select"
            >
              <option value="">{t('allCategories', 'Alle categorieën')}</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.emoji} {category.name?.nl || category.name?.en}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="filter-group">
            <label className="filter-label">
              <span className="filter-icon">📅</span>
              {t('date', 'Datum')}
            </label>
            <select
              value={localFilters.date}
              onChange={(e) => handleFilterUpdate('date', e.target.value)}
              className="filter-select"
            >
              <option value="">{t('allDates', 'Alle datums')}</option>
              {getDateOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div className="filter-group">
            <label className="filter-label">
              <span className="filter-icon">📍</span>
              {t('location', 'Locatie')}
            </label>
            <input
              type="text"
              value={localFilters.city}
              onChange={(e) => handleFilterUpdate('city', e.target.value)}
              placeholder={t('enterCity', 'Voer stad in...')}
              className="filter-input"
            />
          </div>

          {/* Distance Filter */}
          <div className="filter-group">
            <label className="filter-label">
              <span className="filter-icon">📏</span>
              {t('maxDistance', 'Max afstand')}: {localFilters.maxDistance}km
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={localFilters.maxDistance}
              onChange={(e) => handleFilterUpdate('maxDistance', parseInt(e.target.value))}
              className="filter-range"
            />
            <div className="range-labels">
              <span>1km</span>
              <span>100km</span>
            </div>
          </div>

          {/* Language Filter */}
          <div className="filter-group">
            <label className="filter-label">
              <span className="filter-icon">🗣️</span>
              {t('language', 'Taal')}
            </label>
            <select
              value={localFilters.language}
              onChange={(e) => handleFilterUpdate('language', e.target.value)}
              className="filter-select"
            >
              <option value="">{t('allLanguages', 'Alle talen')}</option>
              <option value="nl">Nederlands</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
          </div>

          {/* Quick Filters */}
          <div className="filter-group">
            <label className="filter-label">
              <span className="filter-icon">⚡</span>
              {t('quickFilters', 'Snelle filters')}
            </label>
            <div className="quick-filters">
              <button
                className={`quick-filter ${localFilters.date === new Date().toISOString().split('T')[0] ? 'active' : ''}`}
                onClick={() => handleFilterUpdate('date', new Date().toISOString().split('T')[0])}
              >
                {t('today', 'Vandaag')}
              </button>
              <button
                className={`quick-filter ${localFilters.category === categories.find(c => c.slug === 'dining')?._id ? 'active' : ''}`}
                onClick={() => {
                  const diningCategory = categories.find(c => c.slug === 'dining');
                  if (diningCategory) handleFilterUpdate('category', diningCategory._id);
                }}
              >
                🍽️ {t('dining', 'Uit eten')}
              </button>
              <button
                className={`quick-filter ${localFilters.category === categories.find(c => c.slug === 'walking')?._id ? 'active' : ''}`}
                onClick={() => {
                  const walkingCategory = categories.find(c => c.slug === 'walking');
                  if (walkingCategory) handleFilterUpdate('category', walkingCategory._id);
                }}
              >
                🚶 {t('walking', 'Wandelen')}
              </button>
              <button
                className={`quick-filter ${localFilters.category === categories.find(c => c.slug === 'coffee')?._id ? 'active' : ''}`}
                onClick={() => {
                  const coffeeCategory = categories.find(c => c.slug === 'coffee');
                  if (coffeeCategory) handleFilterUpdate('category', coffeeCategory._id);
                }}
              >
                ☕ {t('coffee', 'Koffie')}
              </button>
            </div>
          </div>
        </div>

        <div className="filters-footer">
          <button 
            className="clear-filters-button secondary-button"
            onClick={clearFilters}
          >
            <span className="button-icon">🗑️</span>
            <span className="button-text">{t('clearFilters', 'Wis filters')}</span>
          </button>
          
          <button 
            className="apply-filters-button primary-button"
            onClick={applyFilters}
          >
            <span className="button-icon">✓</span>
            <span className="button-text">{t('applyFilters', 'Toepassen')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityFilters;