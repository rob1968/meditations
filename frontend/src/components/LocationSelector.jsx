import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import googlePlacesService from '../services/googlePlacesService';
// CSS styles are now in the global app.css

const LocationSelector = ({ 
  value, 
  onChange, 
  placeholder,
  disabled = false,
  required = false,
  className = '',
  type = 'city', // 'city', 'country', or 'both'
  countryFilter = null, // ISO country code to filter cities
  onLocationData = null, // Callback with full location data
  allowManualInput = true,
  showCoordinates = false
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [useManualInput, setUseManualInput] = useState(false);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '');
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Helper function to clean up Dutch municipality names
  const cleanCityName = (cityName) => {
    if (!cityName) return cityName;
    
    // Remove "gemeente " prefix (case insensitive)
    if (cityName.toLowerCase().startsWith('gemeente ')) {
      return cityName.substring(9);
    }
    return cityName;
  };

  // Search for places
  const searchPlaces = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2 || useManualInput) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let results = [];

      switch (type) {
        case 'country':
          results = await googlePlacesService.searchCountries(searchTerm);
          break;
        case 'city':
          if (countryFilter) {
            results = await googlePlacesService.searchCitiesInCountry(searchTerm, countryFilter);
          } else {
            results = await googlePlacesService.getPlacePredictions(searchTerm, { types: ['(cities)'] });
          }
          break;
        case 'both':
        default:
          results = await googlePlacesService.getLocationSuggestions(searchTerm);
          break;
      }

      setPredictions(results);
      setHighlightedIndex(-1);
    } catch (err) {
      console.error('Places search error:', err);
      setError(err.message);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [type, countryFilter, useManualInput]);

  // Debounced search
  const debouncedSearch = useCallback((searchTerm) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(searchTerm);
    }, 300);
  }, [searchPlaces]);

  // Handle input changes
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (onChange) {
      onChange(newValue);
    }

    if (!useManualInput && newValue.trim()) {
      setIsOpen(true);
      debouncedSearch(newValue);
    } else {
      setPredictions([]);
      setIsOpen(false);
    }

    // Clear selected place when typing
    if (selectedPlace) {
      setSelectedPlace(null);
      if (onLocationData) {
        onLocationData(null);
      }
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (useManualInput || disabled) return;

    if (inputValue && !isOpen) {
      setIsOpen(true);
      debouncedSearch(inputValue);
    }
  };

  // Handle place selection
  const handlePlaceSelect = async (prediction) => {
    try {
      setIsLoading(true);
      
      // Get place details
      const placeDetails = await googlePlacesService.getPlaceDetails(prediction.place_id);
      const locationData = googlePlacesService.parseLocationData(placeDetails);
      
      // Set the display value based on type
      let displayValue = '';
      if (type === 'country') {
        displayValue = locationData.country;
      } else if (type === 'city') {
        const rawDisplayValue = locationData.city || prediction.structured_formatting?.main_text || prediction.description;
        displayValue = cleanCityName(rawDisplayValue);
      } else {
        // For 'both', prefer city, fallback to country
        const rawDisplayValue = locationData.city || locationData.country || prediction.structured_formatting?.main_text || prediction.description;
        displayValue = cleanCityName(rawDisplayValue);
      }

      setInputValue(displayValue);
      setSelectedPlace(locationData);
      setIsOpen(false);
      setPredictions([]);
      setHighlightedIndex(-1);

      if (onChange) {
        onChange(displayValue);
      }

      if (onLocationData) {
        onLocationData(locationData);
      }

    } catch (err) {
      console.error('Error getting place details:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || predictions.length === 0) {
      if (e.key === 'ArrowDown' && !useManualInput) {
        e.preventDefault();
        setIsOpen(true);
        if (inputValue) {
          debouncedSearch(inputValue);
        }
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && predictions[highlightedIndex]) {
          handlePlaceSelect(predictions[highlightedIndex]);
        }
        break;
        
      case 'Escape':
        setIsOpen(false);
        setPredictions([]);
        setHighlightedIndex(-1);
        if (inputRef.current) {
          inputRef.current.blur();
        }
        break;
        
      default:
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  // Toggle manual input mode
  const toggleManualInput = () => {
    setUseManualInput(!useManualInput);
    setIsOpen(false);
    setPredictions([]);
    setSelectedPlace(null);
    
    if (onLocationData) {
      onLocationData(null);
    }
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Get placeholder text
  const getPlaceholder = () => {
    if (useManualInput) {
      switch (type) {
        case 'country':
          return placeholder || t('enterCountryManually', 'Enter country name');
        case 'city':
          return placeholder || t('enterCityManually', 'Enter city name');
        default:
          return placeholder || t('enterLocationManually', 'Enter location');
      }
    }

    switch (type) {
      case 'country':
        return placeholder || t('searchCountries', 'Search countries...');
      case 'city':
        return placeholder || t('searchCities', 'Search cities...');
      default:
        return placeholder || t('searchLocations', 'Search locations...');
    }
  };

  // Render prediction item
  const renderPredictionItem = (prediction, index) => {
    const isHighlighted = index === highlightedIndex;
    const rawMainText = prediction.structured_formatting?.main_text || prediction.description;
    const mainText = cleanCityName(rawMainText);
    const secondaryText = prediction.structured_formatting?.secondary_text;

    return (
      <li
        key={prediction.place_id}
        className={`location-selector-item ${isHighlighted ? 'highlighted' : ''}`}
        onClick={() => handlePlaceSelect(prediction)}
        onMouseEnter={() => setHighlightedIndex(index)}
      >
        <div className="prediction-main-text">{mainText}</div>
        {secondaryText && (
          <div className="prediction-secondary-text">{secondaryText}</div>
        )}
        {prediction.types && (
          <div className="prediction-types">
            {prediction.types.includes('country') && '🌍'}
            {prediction.types.includes('locality') && '🏙️'}
            {prediction.types.includes('administrative_area_level_1') && '📍'}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className={`location-selector ${className}`} ref={dropdownRef}>
      <div className="location-selector-input-container">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          disabled={disabled}
          required={required}
          className={`location-selector-input ${error ? 'error' : ''} ${selectedPlace ? 'has-selection' : ''}`}
          autoComplete="off"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
        
        {/* Manual input toggle */}
        {allowManualInput && !disabled && (
          <button
            type="button"
            onClick={toggleManualInput}
            className="manual-input-toggle"
            title={useManualInput ? 
              t('useAutocomplete', 'Use autocomplete') : 
              t('typeManually', 'Type manually')
            }
          >
            {useManualInput ? '🔍' : '✏️'}
          </button>
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="location-selector-input-loading">
            <div className="loading-spinner-small"></div>
          </div>
        )}

        {/* Selection indicator */}
        {selectedPlace && !useManualInput && (
          <div className="selection-indicator" title={t('locationSelected', 'Location selected')}>
            ✓
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !useManualInput && (
        <div className="location-selector-dropdown">
          {isLoading && (
            <div className="location-selector-loading">
              <div className="loading-spinner-small"></div>
              <span>{t('searchingLocations', 'Searching locations...')}</span>
            </div>
          )}
          
          {error && (
            <div className="location-selector-error">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}
          
          {!isLoading && !error && predictions.length === 0 && inputValue.trim() && (
            <div className="location-selector-empty">
              <span>{t('noLocationsFound', 'No locations found')}</span>
            </div>
          )}
          
          {!isLoading && !error && predictions.length > 0 && (
            <ul className="location-selector-list" ref={listRef}>
              {predictions.map((prediction, index) => 
                renderPredictionItem(prediction, index)
              )}
            </ul>
          )}
        </div>
      )}

      {/* Selected location details */}
      {selectedPlace && showCoordinates && selectedPlace.coordinates && (
        <div className="location-details">
          <div className="coordinates">
            📍 {selectedPlace.coordinates.lat.toFixed(6)}, {selectedPlace.coordinates.lng.toFixed(6)}
          </div>
          {selectedPlace.formattedAddress && (
            <div className="formatted-address">
              {selectedPlace.formattedAddress}
            </div>
          )}
        </div>
      )}

      {/* Help text */}
      {!useManualInput && !disabled && (
        <div className="location-selector-help">
          {type === 'country' ? 
            t('countrySearchHelp', 'Start typing to search countries') :
            type === 'city' ?
            t('citySearchHelp', 'Start typing to search cities') :
            t('locationSearchHelp', 'Start typing to search locations')
          }
        </div>
      )}
      
      {useManualInput && (
        <div className="location-selector-help">
          {t('manualLocationHelp', 'Enter location manually (autocomplete disabled)')}
        </div>
      )}
    </div>
  );
};

export default LocationSelector;