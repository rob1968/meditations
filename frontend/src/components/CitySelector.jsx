import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useCities from '../hooks/useCities';
import './CitySelector.css';

const CitySelector = ({ 
  countryName, 
  value, 
  onChange, 
  placeholder,
  disabled = false,
  required = false,
  className = '',
  onValidationChange = null,
  allowManualInput = true
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [useManualInput, setUseManualInput] = useState(false);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);

  // Use cities hook with optimized options
  const {
    cities,
    isLoading,
    error,
    setSearchTerm,
    clearSearch,
    isCityValid,
    hasData,
    isEmpty,
    isFiltered
  } = useCities(countryName, {
    enabled: !!countryName && !useManualInput,
    searchDebounceMs: 300,
    preloadPopular: true,
    autoSearch: true
  });

  // Sync external value changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '');
    }
  }, [value]);

  // Handle country change - reset everything
  useEffect(() => {
    if (countryName) {
      setUseManualInput(false);
      setInputValue('');
      setIsOpen(false);
      setHighlightedIndex(-1);
      clearSearch();
      if (onChange) {
        onChange('');
      }
    }
  }, [countryName, clearSearch, onChange]);

  // Validation effect
  useEffect(() => {
    if (onValidationChange && inputValue && countryName && hasData) {
      const isValid = isCityValid(inputValue);
      onValidationChange(isValid);
    }
  }, [inputValue, countryName, hasData, isCityValid, onValidationChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle input changes
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (!useManualInput && countryName) {
      setSearchTerm(newValue);
      setShowDropdown(true);
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
    
    if (onChange) {
      onChange(newValue);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (!countryName) return;
    
    if (useManualInput) {
      return; // Just focus, don't show dropdown
    }

    if (hasData && !error) {
      setIsOpen(true);
      setShowDropdown(true);
      if (!inputValue) {
        setSearchTerm(''); // Show popular cities
      }
    }
  };

  // Handle city selection
  const handleCitySelect = (cityName) => {
    setInputValue(cityName);
    setIsOpen(false);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    
    if (onChange) {
      onChange(cityName);
    }
    
    // Focus back to input
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || cities.length === 0) {
      if (e.key === 'ArrowDown' && countryName && !useManualInput) {
        e.preventDefault();
        setIsOpen(true);
        setShowDropdown(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < cities.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && cities[highlightedIndex]) {
          handleCitySelect(cities[highlightedIndex]);
        }
        break;
        
      case 'Escape':
        setIsOpen(false);
        setShowDropdown(false);
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
    setShowDropdown(false);
    setInputValue('');
    if (onChange) {
      onChange('');
    }
    
    // Focus input after state change
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Render loading state
  const renderLoading = () => (
    <div className="city-selector-loading">
      <div className="loading-spinner-small"></div>
      <span>{t('loadingCities', 'Loading cities...')}</span>
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="city-selector-error">
      <span className="error-icon">⚠️</span>
      <span className="error-text">{error}</span>
      {allowManualInput && (
        <button 
          type="button"
          onClick={toggleManualInput}
          className="manual-input-button"
        >
          {t('enterManually', 'Enter manually')}
        </button>
      )}
    </div>
  );

  // Render empty state
  const renderEmpty = () => (
    <div className="city-selector-empty">
      <span>{t('noCitiesFound', 'No cities found')}</span>
      {isFiltered && (
        <button 
          type="button"
          onClick={() => {
            setSearchTerm('');
            setInputValue('');
            if (onChange) onChange('');
          }}
          className="clear-search-button"
        >
          {t('clearSearch', 'Clear search')}
        </button>
      )}
    </div>
  );

  // Render city list
  const renderCityList = () => (
    <ul className="city-selector-list" ref={listRef}>
      {cities.map((city, index) => (
        <li
          key={`${city}-${index}`}
          className={`city-selector-item ${
            index === highlightedIndex ? 'highlighted' : ''
          }`}
          onClick={() => handleCitySelect(city)}
          onMouseEnter={() => setHighlightedIndex(index)}
        >
          {city}
        </li>
      ))}
    </ul>
  );

  // Get placeholder text
  const getPlaceholder = () => {
    if (!countryName) {
      return t('selectCountryFirst', 'Select a country first');
    }
    
    if (useManualInput) {
      return placeholder || t('enterCityManually', 'Enter your city');
    }
    
    return placeholder || t('searchOrSelectCity', 'Search or select your city');
  };

  return (
    <div className={`city-selector ${className}`} ref={dropdownRef}>
      <div className="city-selector-input-container">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          disabled={disabled || (!countryName && !useManualInput)}
          required={required}
          className={`city-selector-input ${error ? 'error' : ''}`}
          autoComplete="off"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
        
        {/* Toggle manual input button */}
        {allowManualInput && countryName && !disabled && (
          <button
            type="button"
            onClick={toggleManualInput}
            className="manual-input-toggle"
            title={useManualInput ? 
              t('useDropdown', 'Use dropdown') : 
              t('typeManually', 'Type manually')
            }
          >
            {useManualInput ? '📋' : '✏️'}
          </button>
        )}
        
        {/* Loading indicator */}
        {isLoading && !useManualInput && (
          <div className="city-selector-input-loading">
            <div className="loading-spinner-small"></div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && showDropdown && !useManualInput && (
        <div className="city-selector-dropdown">
          {isLoading && renderLoading()}
          {error && renderError()}
          {!isLoading && !error && isEmpty && renderEmpty()}
          {!isLoading && !error && cities.length > 0 && renderCityList()}
        </div>
      )}

      {/* Help text */}
      {!useManualInput && countryName && !error && hasData && (
        <div className="city-selector-help">
          {t('citySelectorHelp', 'Start typing to search cities, or click to browse')}
        </div>
      )}
      
      {/* Manual input help */}
      {useManualInput && (
        <div className="city-selector-help">
          {t('manualInputHelp', 'Type your city name manually')}
        </div>
      )}
    </div>
  );
};

export default CitySelector;