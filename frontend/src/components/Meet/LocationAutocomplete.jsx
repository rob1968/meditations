import React, { useState, useEffect, useRef, useCallback } from 'react';
import googlePlacesService from '../../services/googlePlacesService';
import { useTranslation } from 'react-i18next';

const LocationAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = 'Zoek naar een locatie...', 
  required = false,
  countryCode = 'NL',
  className = ''
}) => {
  const [inputValue, setInputValue] = useState(value?.name || '');
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
    setInputValue(value?.name || '');
  }, [value]);

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

  // Search for places (POIs, establishments, etc.)
  const searchPlaces = useCallback(async (searchText) => {
    if (!searchText || searchText.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Search for establishments (restaurants, cafes, etc.) first
      const establishmentOptions = {
        types: ['establishment'],
        componentRestrictions: { country: countryCode }
      };

      const establishmentPredictions = await googlePlacesService.getPlacePredictions(searchText, establishmentOptions);

      // Also search for points of interest
      const poiOptions = {
        types: ['point_of_interest'],
        componentRestrictions: { country: countryCode }
      };

      const poiPredictions = await googlePlacesService.getPlacePredictions(searchText, poiOptions);

      // Search for general locations if needed
      const generalOptions = {
        componentRestrictions: { country: countryCode }
      };

      const generalPredictions = await googlePlacesService.getPlacePredictions(searchText, generalOptions);

      // Combine and deduplicate results
      const allPredictions = new Map();
      
      // Prioritize establishments
      establishmentPredictions.forEach(prediction => {
        allPredictions.set(prediction.place_id, { ...prediction, priority: 1 });
      });
      
      // Add POIs
      poiPredictions.forEach(prediction => {
        if (!allPredictions.has(prediction.place_id)) {
          allPredictions.set(prediction.place_id, { ...prediction, priority: 2 });
        }
      });
      
      // Add general results
      generalPredictions.forEach(prediction => {
        if (!allPredictions.has(prediction.place_id)) {
          allPredictions.set(prediction.place_id, { ...prediction, priority: 3 });
        }
      });

      // Convert to array and sort by priority and relevance
      const sortedPredictions = Array.from(allPredictions.values())
        .sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return a.description.localeCompare(b.description);
        })
        .slice(0, 8); // Limit to 8 results

      setSuggestions(sortedPredictions);
      setShowSuggestions(true);
      
    } catch (error) {
      console.error('[LocationAutocomplete] Search error:', error);
      setError(t('searchError', 'Error zoeken naar locaties'));
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [countryCode, t]);

  // Handle input change with debounce
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Update parent with text value when typing
    onChange({
      name: newValue,
      address: newValue,
      coordinates: null,
      placeId: null
    });
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(newValue);
    }, 300); // 300ms debounce
  };

  // Handle suggestion selection
  const handleSelectSuggestion = async (suggestion) => {
    const locationName = suggestion.structured_formatting?.main_text || 
                        suggestion.description.split(',')[0];
    
    setInputValue(locationName);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);

    // Try to get detailed place information
    try {
      const placeDetails = await googlePlacesService.getPlaceDetails(
        suggestion.place_id,
        ['name', 'formatted_address', 'address_components', 'geometry', 'types']
      );

      const locationData = googlePlacesService.parseLocationData(placeDetails);
      
      onChange({
        name: locationName,
        address: placeDetails.formatted_address || suggestion.description,
        coordinates: locationData.coordinates ? {
          latitude: locationData.coordinates.lat,
          longitude: locationData.coordinates.lng
        } : null,
        placeId: suggestion.place_id,
        city: locationData.city,
        country: locationData.country,
        types: placeDetails.types || []
      });
      
    } catch (error) {
      console.error('[LocationAutocomplete] Error getting place details:', error);
      
      // Fallback to basic information
      onChange({
        name: locationName,
        address: suggestion.description,
        coordinates: null,
        placeId: suggestion.place_id
      });
    }
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

  // Get icon for place type
  const getPlaceIcon = (types) => {
    if (!types) return '📍';
    
    if (types.includes('restaurant') || types.includes('food')) return '🍽️';
    if (types.includes('cafe') || types.includes('bakery')) return '☕';
    if (types.includes('bar') || types.includes('night_club')) return '🍺';
    if (types.includes('park')) return '🌳';
    if (types.includes('gym') || types.includes('spa')) return '💪';
    if (types.includes('museum') || types.includes('tourist_attraction')) return '🏛️';
    if (types.includes('shopping_mall') || types.includes('store')) return '🛍️';
    if (types.includes('movie_theater')) return '🎬';
    if (types.includes('library')) return '📚';
    if (types.includes('hospital') || types.includes('pharmacy')) return '🏥';
    if (types.includes('church') || types.includes('place_of_worship')) return '⛪';
    if (types.includes('school') || types.includes('university')) return '🎓';
    if (types.includes('lodging')) return '🏨';
    
    return '📍';
  };

  return (
    <div className={`location-autocomplete ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        required={required}
        className="form-input"
        autoComplete="off"
      />
      
      {isLoading && (
        <div className="location-autocomplete-loading">
          <div className="loading-spinner-small"></div>
        </div>
      )}
      
      {error && (
        <div className="location-autocomplete-error">
          {error}
        </div>
      )}
      
      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="location-autocomplete-suggestions">
          {suggestions.map((suggestion, index) => {
            const placeName = suggestion.structured_formatting?.main_text || 
                              suggestion.description.split(',')[0];
            const placeAddress = suggestion.structured_formatting?.secondary_text || 
                                suggestion.description.split(',').slice(1).join(',').trim();
            
            return (
              <div
                key={suggestion.place_id}
                className={`location-autocomplete-suggestion ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="suggestion-content">
                  <div className="suggestion-icon">
                    {getPlaceIcon(suggestion.types)}
                  </div>
                  <div className="suggestion-text">
                    <div className="suggestion-main">{placeName}</div>
                    {placeAddress && (
                      <div className="suggestion-secondary">{placeAddress}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {showSuggestions && suggestions.length === 0 && inputValue.length >= 2 && !isLoading && (
        <div className="location-autocomplete-no-results">
          {t('noLocationsFound', 'Geen locaties gevonden. Probeer een andere zoekterm.')}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;