import React, { useState, useEffect, useRef } from 'react';
import googlePlacesService from '../services/googlePlacesService';
import { useTranslation } from 'react-i18next';
// CSS styles are now in the global app.css

const LocationPickerModal = ({ 
  value, // Expected format: { city: "Amsterdam", country: "Netherlands", countryCode: "NL" }
  onChange, 
  disabled = false,
  placeholder = 'Select your location...',
  required = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  
  const { t } = useTranslation();


  // Search for locations with debounce and Chrome compatibility
  const searchLocations = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Chrome-specific: Add retry mechanism for failed requests
      const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
      
      const options = {
        types: ['(cities)'], // Focus on cities and administrative areas
        // No country restriction - allow global search
      };

      let predictions;
      let retryCount = 0;
      const maxRetries = isChrome ? 2 : 1;

      while (retryCount <= maxRetries) {
        try {
          predictions = await googlePlacesService.getPlacePredictions(query, options);
          break; // Success, exit retry loop
        } catch (retryError) {
          retryCount++;
          console.warn(`[LocationPickerModal] Retry ${retryCount}/${maxRetries} for query "${query}":`, retryError);
          
          if (retryCount <= maxRetries) {
            // Wait before retry (Chrome-specific delay)
            await new Promise(resolve => setTimeout(resolve, isChrome ? 1000 : 500));
          } else {
            throw retryError; // Final attempt failed
          }
        }
      }
      
      // Process predictions to extract location data
      const processedSuggestions = predictions.map(prediction => {
        const parts = prediction.description.split(', ');
        const city = parts[0];
        const country = parts[parts.length - 1];
        
        // Try to extract country code from terms
        let countryCode = '';
        if (prediction.terms && prediction.terms.length > 0) {
          const lastTerm = prediction.terms[prediction.terms.length - 1];
          // Comprehensive country code mapping for CRUKS and other location-based features
          const countryCodeMap = {
            'Netherlands': 'NL',
            'Nederland': 'NL', // Dutch name for Netherlands
            'United States': 'US',
            'United Kingdom': 'GB',
            'France': 'FR',
            'Germany': 'DE',
            'Deutschland': 'DE', // German name
            'Spain': 'ES',
            'España': 'ES', // Spanish name
            'Italy': 'IT',
            'Italia': 'IT', // Italian name
            'Japan': 'JP',
            'Australia': 'AU',
            'Canada': 'CA',
            'Belgium': 'BE',
            'België': 'BE', // Dutch name for Belgium
            'Belgique': 'BE', // French name for Belgium
            'Portugal': 'PT',
            'Russia': 'RU',
            'China': 'CN',
            'India': 'IN',
            'Brazil': 'BR',
            'Argentina': 'AR',
            'Mexico': 'MX',
            'South Korea': 'KR',
            'Norway': 'NO',
            'Sweden': 'SE',
            'Denmark': 'DK',
            'Finland': 'FI',
            'Austria': 'AT',
            'Switzerland': 'CH',
            'Poland': 'PL',
            'Czech Republic': 'CZ',
            'Hungary': 'HU',
            'Romania': 'RO',
            'Greece': 'GR',
            'Turkey': 'TR',
            'South Africa': 'ZA',
            'Israel': 'IL',
            'Thailand': 'TH',
            'Indonesia': 'ID',
            'Malaysia': 'MY',
            'Singapore': 'SG',
            'Philippines': 'PH',
            'Vietnam': 'VN',
            'New Zealand': 'NZ',
            'Ireland': 'IE',
            'Luxembourg': 'LU',
            'Ukraine': 'UA',
            'Slovakia': 'SK',
            'Slovenia': 'SI',
            'Croatia': 'HR',
            'Serbia': 'RS',
            'Bulgaria': 'BG',
            'Lithuania': 'LT',
            'Latvia': 'LV',
            'Estonia': 'EE'
          };
          // Try exact match first, then try case-insensitive match
          countryCode = countryCodeMap[country] || 
                       countryCodeMap[Object.keys(countryCodeMap).find(key => 
                         key.toLowerCase() === country.toLowerCase()
                       )] || '';
                       
          // Additional fallback for common variations
          if (!countryCode) {
            if (country.toLowerCase().includes('netherland') || country.toLowerCase().includes('nederland')) {
              countryCode = 'NL';
            } else if (country.toLowerCase().includes('united states') || country.toLowerCase().includes('usa')) {
              countryCode = 'US';
            } else if (country.toLowerCase().includes('united kingdom') || country.toLowerCase().includes('uk')) {
              countryCode = 'GB';
            }
          }
        }

        return {
          ...prediction,
          city: googlePlacesService.cleanCityName(city),
          country: country,
          countryCode: countryCode,
          fullName: prediction.description
        };
      });
      
      setSuggestions(processedSuggestions);
    } catch (error) {
      console.error('[LocationPickerModal] Search error:', error);
      
      // Chrome-specific: Provide more helpful error messages
      const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
      let errorMessage = t('searchError', 'Error searching for locations');
      
      if (isChrome) {
        if (error.message?.includes('ZERO_RESULTS')) {
          errorMessage = t('noResultsChrome', 'No locations found. Try a different search term.');
        } else if (error.message?.includes('OVER_QUERY_LIMIT') || error.message?.includes('REQUEST_DENIED')) {
          errorMessage = t('rateLimitChrome', 'Search temporarily unavailable. Please try again in a moment.');
        } else if (error.message?.includes('INVALID_REQUEST')) {
          errorMessage = t('invalidSearchChrome', 'Please enter a valid location name.');
        } else {
          errorMessage = t('chromeSearchError', 'Location search failed. Please try typing more of the location name.');
        }
      }
      
      setError(errorMessage);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input change with Chrome compatibility
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Chrome-specific: Use longer debounce for Chrome to prevent rate limiting
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
    const debounceTime = isChrome ? 500 : 300;

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(query);
    }, debounceTime);
  };

  // Handle location selection
  const handleLocationSelect = (location) => {
    const locationData = {
      city: location.city,
      country: location.country,
      countryCode: location.countryCode,
      fullName: location.fullName
    };
    
    console.log('Location selected:', locationData); // Debug log
    onChange(locationData);
    closeModal(); // Use closeModal instead of direct setIsOpen to restore scroll
  };

  // Open modal and focus search with Chrome compatibility
  const openModal = () => {
    if (disabled) return;
    setIsOpen(true);
    setSearchQuery('');
    setSuggestions([]);
    setError('');
    document.body.style.overflow = 'hidden';
    
    // Chrome-specific: Use longer timeout for focus and add fallback
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
    const focusDelay = isChrome ? 200 : 100;
    
    setTimeout(() => {
      if (searchInputRef.current) {
        try {
          searchInputRef.current.focus();
          // Chrome-specific: Ensure input is ready for typing
          if (isChrome) {
            searchInputRef.current.click();
          }
        } catch (focusError) {
          console.warn('[LocationPickerModal] Focus error:', focusError);
        }
      }
    }, focusDelay);
  };

  // Close modal
  const closeModal = () => {
    setIsOpen(false);
    setSearchQuery('');
    setSuggestions([]);
    setError('');
    document.body.style.overflow = '';
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

  // Cleanup scroll lock on component unmount
  useEffect(() => {
    return () => {
      // Restore scroll when component unmounts
      document.body.style.overflow = '';
    };
  }, []);

  // Get display value
  const getDisplayValue = () => {
    if (value && value.city && value.country) {
      return `${value.city}, ${value.country}`;
    }
    return placeholder;
  };

  const hasValue = Boolean(value && value.city && value.country);

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        className={`location-picker-trigger ${hasValue ? 'has-value' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={openModal}
        disabled={disabled}
      >
        <span className="location-picker-value">
          {getDisplayValue()}
        </span>
        <svg className="location-picker-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="location-picker-modal-overlay" onClick={handleBackdropClick}>
          <div className="location-picker-modal">
            {/* Header */}
            <div className="location-picker-header">
              <h3 className="location-picker-title">{t('selectLocation', 'Select your location')}</h3>
              <button
                type="button"
                className="location-picker-close"
                onClick={closeModal}
                aria-label={t('close', 'Close')}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Search Section */}
            <div className="location-picker-search-section">
              <div className="search-input-container">
                <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={t('searchLocations', 'Search for a city or location...')}
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
            <div className="location-picker-content">
              {searchQuery.length === 0 ? (
                // Search Instructions
                <div className="search-instructions">
                  <div className="instruction-icon">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h4 className="instruction-title">{t('searchForLocation', 'Search for your location')}</h4>
                  <p className="instruction-text">
                    {t('searchLocationInstructions', 'Type in the search box above to find your city and country. For example: "Amsterdam", "New York", or "London".')}
                  </p>
                </div>
              ) : (
                // Search Results Section
                <div className="search-results-section">
                  <h4 className="section-title">{t('searchResults', 'Search results')}</h4>
                  {suggestions.length > 0 ? (
                    <div className="search-results-list">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion.place_id}
                          type="button"
                          className="location-result-item"
                          onClick={() => handleLocationSelect(suggestion)}
                        >
                          <div className="location-result-main">{suggestion.city}</div>
                          <div className="location-result-secondary">{suggestion.fullName}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    !isLoading && (
                      <div className="no-results">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                        <span>{t('noLocationsFound', 'No locations found.')}</span>
                        <small>{t('tryDifferentSearch', 'Try a different search term.')}</small>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="location-picker-footer">
              <button
                type="button"
                className="manual-entry-btn"
                onClick={() => {
                  const manualLocation = prompt(t('enterLocationManually', 'Enter your location (City, Country):'));
                  if (manualLocation && manualLocation.trim() && manualLocation.includes(',')) {
                    const parts = manualLocation.split(',').map(p => p.trim());
                    if (parts.length >= 2) {
                      const locationData = {
                        city: parts[0],
                        country: parts[1],
                        countryCode: '', // Will be empty for manual entry
                        fullName: manualLocation.trim()
                      };
                      handleLocationSelect(locationData);
                    }
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

export default LocationPickerModal;