import React, { useState, useEffect, useRef } from 'react';
import googlePlacesService from '../services/googlePlacesService';
import { useTranslation } from 'react-i18next';
// CSS styles are now in the global app.css

const CityPickerModal = ({ 
  countryCode, 
  value, 
  onChange, 
  disabled = false,
  placeholder = 'Select your city...',
  required = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [popularCities, setPopularCities] = useState([]);
  
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  
  const { t } = useTranslation();

  // Load popular cities when country changes
  useEffect(() => {
    if (countryCode) {
      loadPopularCities();
    }
    setSearchQuery('');
    setSuggestions([]);
    setError('');
  }, [countryCode]);

  // Load popular cities for quick selection
  const loadPopularCities = async () => {
    try {
      const cities = await googlePlacesService.getCitiesForCountry(countryCode);
      setPopularCities(cities.slice(0, 6)); // Top 6 cities for mobile
    } catch (error) {
      console.error('Error loading popular cities:', error);
      setPopularCities([]);
    }
  };

  // Search for cities with debounce
  const searchCities = async (query) => {
    if (!countryCode || !query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const options = {
        types: ['locality'],
        componentRestrictions: { country: countryCode }
      };

      const predictions = await googlePlacesService.getPlacePredictions(query, options);
      
      // If no results with locality, try without type restriction
      if (predictions.length === 0) {
        const optionsNoType = {
          componentRestrictions: { country: countryCode }
        };
        const predictionsNoType = await googlePlacesService.getPlacePredictions(query, optionsNoType);
        const filteredPredictions = predictionsNoType.filter(p => 
          p.types && (p.types.includes('locality') || p.types.includes('administrative_area_level_2'))
        );
        setSuggestions(filteredPredictions);
      } else {
        setSuggestions(predictions);
      }
    } catch (error) {
      console.error('[CityPickerModal] Search error:', error);
      setError(t('searchError', 'Error searching for cities'));
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchCities(query);
    }, 300);
  };

  // Handle city selection
  const handleCitySelect = (cityName) => {
    onChange(cityName);
    setIsOpen(false);
    setSearchQuery('');
    setSuggestions([]);
  };

  // Open modal and focus search
  const openModal = () => {
    if (disabled || !countryCode) return;
    setIsOpen(true);
    setSearchQuery('');
    setSuggestions([]);
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    
    // Focus search input after modal opens
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  // Close modal
  const closeModal = () => {
    setIsOpen(false);
    setSearchQuery('');
    setSuggestions([]);
    setError('');
    document.body.style.overflow = ''; // Restore background scroll
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Get display value
  const displayValue = value || placeholder;
  const hasValue = Boolean(value);

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        className={`city-picker-trigger ${hasValue ? 'has-value' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={openModal}
        disabled={disabled || !countryCode}
      >
        <span className="city-picker-value">
          {hasValue ? value : (disabled || !countryCode ? t('selectCountryFirst', 'Select country first') : placeholder)}
        </span>
        <svg className="city-picker-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.293 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="city-picker-modal-overlay" onClick={handleBackdropClick}>
          <div className="city-picker-modal">
            {/* Header */}
            <div className="city-picker-header">
              <h3 className="city-picker-title">{t('selectCity', 'Select your city')}</h3>
              <button
                type="button"
                className="city-picker-close"
                onClick={closeModal}
                aria-label={t('close', 'Close')}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Search Section */}
            <div className="city-picker-search-section">
              <div className="search-input-container">
                <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={t('searchCities', 'Search for a city...')}
                  className="search-input"
                />
                {isLoading && (
                  <div className="search-loading">
                    <div className="loading-spinner"></div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="error-message">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="city-picker-content">
              {searchQuery.length === 0 ? (
                // Popular Cities Section
                <div className="popular-cities-section">
                  <h4 className="section-title">{t('popularCities', 'Popular cities')}</h4>
                  {popularCities.length > 0 ? (
                    <div className="popular-cities-grid">
                      {popularCities.map((city) => (
                        <button
                          key={city.placeId || city.name}
                          type="button"
                          className="city-card"
                          onClick={() => handleCitySelect(city.name)}
                        >
                          <span className="city-name">{city.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="loading-popular">
                      <div className="loading-spinner"></div>
                      <span>{t('loadingPopularCities', 'Loading popular cities...')}</span>
                    </div>
                  )}
                </div>
              ) : (
                // Search Results Section
                <div className="search-results-section">
                  <h4 className="section-title">{t('searchResults', 'Search results')}</h4>
                  {suggestions.length > 0 ? (
                    <div className="search-results-list">
                      {suggestions.map((suggestion) => {
                        const cityName = googlePlacesService.cleanCityName(
                          suggestion.structured_formatting?.main_text || 
                          suggestion.description.split(',')[0]
                        );
                        
                        return (
                          <button
                            key={suggestion.place_id}
                            type="button"
                            className="city-result-item"
                            onClick={() => handleCitySelect(cityName)}
                          >
                            <div className="city-result-main">{cityName}</div>
                            <div className="city-result-secondary">{suggestion.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    !isLoading && (
                      <div className="no-results">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                        <span>{t('noCitiesFound', 'No cities found.')}</span>
                        <small>{t('tryDifferentSearch', 'Try a different search term.')}</small>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="city-picker-footer">
              <button
                type="button"
                className="manual-entry-btn"
                onClick={() => {
                  const manualCity = prompt(t('enterCityManually', 'Enter your city name:'));
                  if (manualCity && manualCity.trim()) {
                    handleCitySelect(manualCity.trim());
                  }
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                {t('enterManually', 'Enter manually')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CityPickerModal;