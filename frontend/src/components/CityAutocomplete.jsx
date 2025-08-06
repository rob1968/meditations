import React, { useState, useEffect, useRef, useCallback } from 'react';
import googlePlacesService from '../services/googlePlacesService';
import { useTranslation } from 'react-i18next';
import '../styles/CityAutocomplete.css';

const CityAutocomplete = ({ 
  countryCode, 
  value, 
  onChange, 
  disabled = false,
  placeholder = 'Type to search for a city...',
  required = false 
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState('');
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  
  const { t } = useTranslation();

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Reset when country changes
  useEffect(() => {
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    setError('');
    onChange('');
  }, [countryCode]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target) &&
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for cities
  const searchCities = useCallback(async (searchText) => {
    if (!countryCode || !searchText || searchText.length < 2) {
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

      const predictions = await googlePlacesService.getPlacePredictions(searchText, options);

      // If no predictions with (cities), try without type restriction
      if (predictions.length === 0) {
        const optionsNoType = {
          componentRestrictions: { country: countryCode }
        };
        const predictionsNoType = await googlePlacesService.getPlacePredictions(searchText, optionsNoType);
        
        // Filter to only show locality-type results
        const filteredPredictions = predictionsNoType.filter(p => 
          p.types && (p.types.includes('locality') || p.types.includes('administrative_area_level_2'))
        );
        
        setSuggestions(filteredPredictions);
      } else {
        setSuggestions(predictions);
      }
      
      setShowSuggestions(true);
    } catch (error) {
      console.error('[CityAutocomplete] Search error:', error);
      setError(t('searchError', 'Error searching for cities'));
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [countryCode, t]);

  // Handle input change with debounce
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchCities(newValue);
    }, 300); // 300ms debounce
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion) => {
    const cityName = googlePlacesService.cleanCityName(
      suggestion.structured_formatting?.main_text || 
      suggestion.description.split(',')[0]
    );
    
    setInputValue(cityName);
    onChange(cityName);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle input focus
  const handleFocus = () => {
    if (inputValue.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="city-autocomplete">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={disabled ? t('selectCountryFirst', 'Select country first') : placeholder}
        disabled={disabled || !countryCode}
        required={required}
        className="auth-input city-autocomplete-input"
        autoComplete="off"
      />
      
      {isLoading && (
        <div className="city-autocomplete-loading">
          <div className="spinner-small"></div>
        </div>
      )}
      
      {error && (
        <div className="city-autocomplete-error">
          {error}
        </div>
      )}
      
      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="city-autocomplete-suggestions">
          {suggestions.map((suggestion, index) => {
            const cityName = googlePlacesService.cleanCityName(
              suggestion.structured_formatting?.main_text || 
              suggestion.description.split(',')[0]
            );
            
            return (
              <div
                key={suggestion.place_id}
                className={`city-autocomplete-suggestion ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="suggestion-main">{cityName}</div>
                <div className="suggestion-secondary">
                  {suggestion.description}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {showSuggestions && suggestions.length === 0 && inputValue.length >= 2 && !isLoading && (
        <div className="city-autocomplete-no-results">
          {t('noCitiesFound', 'No cities found. Keep typing or check spelling.')}
        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;