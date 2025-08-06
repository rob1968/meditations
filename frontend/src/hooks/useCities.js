import { useState, useEffect, useCallback, useRef } from 'react';
import citiesService from '../services/citiesService';

/**
 * Custom hook for managing cities data with search functionality
 * @param {string} countryName - The country name to fetch cities for
 * @param {object} options - Configuration options
 * @returns {object} Cities data and management functions
 */
const useCities = (countryName, options = {}) => {
  const {
    enabled = true,
    searchDebounceMs = 300,
    preloadPopular = true,
    autoSearch = true
  } = options;

  // State management
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Refs for cleanup and debouncing
  const abortControllerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Load cities for the specified country
   */
  const loadCities = useCallback(async (country) => {
    if (!country || !enabled) {
      setCities([]);
      setFilteredCities([]);
      setError(null);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsLoading(true);
    setError(null);

    try {
      const citiesData = await citiesService.getCitiesByCountry(country);
      
      if (!mountedRef.current) return;

      setCities(citiesData);
      setFilteredCities(citiesData);
      
      // Preload popular cities if enabled
      if (preloadPopular && citiesData.length > 10) {
        const popularCities = citiesData.slice(0, 10);
        setFilteredCities(popularCities);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error('Failed to load cities:', err);
      setError(err.message || 'Failed to load cities');
      setCities([]);
      setFilteredCities([]);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, preloadPopular]);

  /**
   * Search cities with debouncing
   */
  const searchCities = useCallback(async (country, term) => {
    if (!country || !autoSearch) return;

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);

    // Debounce the search
    searchTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;

      try {
        const results = await citiesService.searchCities(country, term);
        
        if (!mountedRef.current) return;
        
        setFilteredCities(results);
      } catch (err) {
        console.error('Search failed:', err);
        // On search error, show all cities
        setFilteredCities(cities);
      } finally {
        if (mountedRef.current) {
          setIsSearching(false);
        }
      }
    }, searchDebounceMs);
  }, [cities, autoSearch, searchDebounceMs]);

  /**
   * Handle search term change
   */
  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      // Show all cities or popular cities when search is empty
      if (preloadPopular && cities.length > 10) {
        setFilteredCities(cities.slice(0, 10));
      } else {
        setFilteredCities(cities);
      }
      setIsSearching(false);
      return;
    }

    // Perform local search first for immediate feedback
    const localResults = cities.filter(city => 
      city.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredCities(localResults);

    // Then perform server search if enabled
    if (countryName && autoSearch) {
      searchCities(countryName, term);
    }
  }, [cities, countryName, preloadPopular, autoSearch, searchCities]);

  /**
   * Clear search and reset to all/popular cities
   */
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    if (preloadPopular && cities.length > 10) {
      setFilteredCities(cities.slice(0, 10));
    } else {
      setFilteredCities(cities);
    }
    setIsSearching(false);
  }, [cities, preloadPopular]);

  /**
   * Manually refresh cities data
   */
  const refresh = useCallback(() => {
    if (countryName) {
      loadCities(countryName);
    }
  }, [countryName, loadCities]);

  /**
   * Get popular cities (first 10)
   */
  const getPopularCities = useCallback(() => {
    return cities.slice(0, 10);
  }, [cities]);

  /**
   * Check if a city exists in the current country
   */
  const isCityValid = useCallback((cityName) => {
    if (!cityName) return false;
    const normalizedCity = cityName.toLowerCase().trim();
    return cities.some(city => city.toLowerCase() === normalizedCity);
  }, [cities]);

  // Effect to load cities when country changes
  useEffect(() => {
    if (countryName && enabled) {
      loadCities(countryName);
    }
  }, [countryName, enabled, loadCities]);

  // Effect to handle search term changes
  useEffect(() => {
    handleSearchChange(searchTerm);
  }, [searchTerm, handleSearchChange]);

  return {
    // Data
    cities: filteredCities,
    allCities: cities,
    
    // State
    isLoading,
    error,
    searchTerm,
    isSearching,
    
    // Actions
    setSearchTerm: handleSearchChange,
    clearSearch,
    refresh,
    
    // Utilities
    getPopularCities,
    isCityValid,
    
    // Meta
    hasData: cities.length > 0,
    isEmpty: filteredCities.length === 0 && !isLoading,
    isFiltered: searchTerm.length > 0
  };
};

export default useCities;