// Google Places API service for location autocomplete
// Uses session-based pricing for cost optimization

class GooglePlacesService {
  constructor() {
    this.isLoaded = false;
    this.loadPromise = null;
    this.placesService = null;
    this.autocompleteService = null;
    this.geocoder = null;
    this.sessionToken = null;
  }

  /**
   * Load Google Maps JavaScript API
   */
  async loadGoogleMapsAPI() {
    if (this.isLoaded) {
      return true;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        this.isLoaded = true;
        this.initializeServices();
        resolve(true);
        return;
      }

      // Check for API key
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      console.log('[GooglePlaces] API Key found:', apiKey ? 'Yes' : 'No');
      
      if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE' || apiKey === 'YOUR_ACTUAL_API_KEY_HERE') {
        console.error('[GooglePlaces] API key not configured properly');
        reject(new Error('Google Maps API key not configured'));
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('[GooglePlaces] Script loaded, checking Google API...');
        
        // Wait a bit for Google API to initialize
        setTimeout(() => {
          if (window.google && window.google.maps && window.google.maps.places) {
            console.log('[GooglePlaces] Google Maps API loaded successfully');
            this.isLoaded = true;
            this.initializeServices();
            resolve(true);
          } else {
            console.error('[GooglePlaces] Google Maps API objects not found after load');
            reject(new Error('Google Maps API failed to load properly'));
          }
        }, 100);
      };

      script.onerror = (error) => {
        console.error('[GooglePlaces] Failed to load Google Maps script:', error);
        reject(new Error('Failed to load Google Maps script'));
      };

      // Add script to head
      document.head.appendChild(script);
      console.log('[GooglePlaces] Loading Google Maps API script...');
    });

    return this.loadPromise;
  }

  /**
   * Initialize Google Maps services
   */
  initializeServices() {
    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps API not loaded');
    }

    // Initialize services
    this.autocompleteService = new window.google.maps.places.AutocompleteService();
    this.placesService = new window.google.maps.places.PlacesService(
      document.createElement('div')
    );
    this.geocoder = new window.google.maps.Geocoder();
    
    // Generate new session token
    this.generateNewSessionToken();
  }

  /**
   * Generate new session token for cost optimization
   */
  generateNewSessionToken() {
    if (window.google && window.google.maps && window.google.maps.places) {
      this.sessionToken = new window.google.maps.places.AutocompleteSessionToken();
    }
  }

  /**
   * Get place predictions with autocomplete
   * @param {string} input - Search input
   * @param {object} options - Autocomplete options
   * @returns {Promise<Array>} Array of place predictions
   */
  async getPlacePredictions(input, options = {}) {
    await this.loadGoogleMapsAPI();

    if (!input || input.trim().length < 2) {
      return [];
    }

    const defaultOptions = {
      input: input.trim(),
      sessionToken: this.sessionToken,
      types: ['(cities)'], // Focus on cities by default
      fields: ['place_id', 'name', 'formatted_address', 'types', 'address_components']
    };

    const requestOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      this.autocompleteService.getPlacePredictions(requestOptions, (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(predictions || []);
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          console.error('Places Autocomplete error:', status);
          reject(new Error(`Places API error: ${status}`));
        }
      });
    });
  }

  /**
   * Get place details by place ID
   * @param {string} placeId - Google Place ID
   * @param {Array} fields - Fields to retrieve
   * @returns {Promise<object>} Place details
   */
  async getPlaceDetails(placeId, fields = ['name', 'formatted_address', 'address_components', 'geometry', 'types']) {
    await this.loadGoogleMapsAPI();

    const request = {
      placeId: placeId,
      fields: fields,
      sessionToken: this.sessionToken
    };

    return new Promise((resolve, reject) => {
      this.placesService.getDetails(request, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          // Generate new session token after successful request
          this.generateNewSessionToken();
          resolve(place);
        } else {
          console.error('Place details error:', status);
          reject(new Error(`Place details error: ${status}`));
        }
      });
    });
  }

  /**
   * Search for cities in a specific country
   * @param {string} input - Search input
   * @param {string} countryCode - ISO country code (e.g., 'US', 'NL')
   * @returns {Promise<Array>} Array of city predictions
   */
  async searchCitiesInCountry(input, countryCode) {
    const options = {
      types: ['(cities)'],
      componentRestrictions: { country: countryCode }
    };

    return this.getPlacePredictions(input, options);
  }

  /**
   * Search for countries
   * @param {string} input - Search input
   * @returns {Promise<Array>} Array of country predictions
   */
  async searchCountries(input) {
    const options = {
      types: ['country']
    };

    return this.getPlacePredictions(input, options);
  }

  /**
   * Get location suggestions (cities and countries)
   * @param {string} input - Search input
   * @param {object} options - Search options
   * @returns {Promise<Array>} Array of location predictions
   */
  async getLocationSuggestions(input, options = {}) {
    const defaultOptions = {
      types: ['(cities)', 'country'],
      ...options
    };

    return this.getPlacePredictions(input, defaultOptions);
  }

  /**
   * Parse address components from place details
   * @param {object} place - Place details from Google
   * @returns {object} Parsed location data
   */
  parseLocationData(place) {
    const components = place.address_components || [];
    const result = {
      placeId: place.place_id,
      formattedAddress: place.formatted_address,
      name: place.name,
      types: place.types || [],
      geometry: place.geometry,
      city: '',
      country: '',
      countryCode: '',
      state: '',
      postalCode: '',
      coordinates: null
    };

    // Extract coordinates
    if (place.geometry && place.geometry.location) {
      result.coordinates = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };
    }

    // Parse address components
    components.forEach(component => {
      const types = component.types;
      
      if (types.includes('locality')) {
        // Prefer locality (actual city name) over administrative areas
        result.city = component.long_name;
      } else if (types.includes('administrative_area_level_2') && !result.city) {
        // Only use administrative_area_level_2 if no locality found
        // Clean up Dutch municipality names (e.g., "gemeente Groningen" -> "Groningen")
        let cityName = component.long_name;
        if (cityName.toLowerCase().startsWith('gemeente ')) {
          cityName = cityName.substring(9); // Remove "gemeente " prefix
        }
        result.city = cityName;
      } else if (types.includes('administrative_area_level_1')) {
        result.state = component.long_name;
      } else if (types.includes('country')) {
        result.country = component.long_name;
        result.countryCode = component.short_name;
      } else if (types.includes('postal_code')) {
        result.postalCode = component.long_name;
      }
    });

    // Fallback: if no city found but place name exists, use place name
    if (!result.city && place.name) {
      // Check if this is a city-type place
      const isCityType = place.types && (
        place.types.includes('locality') ||
        place.types.includes('administrative_area_level_2') ||
        place.types.includes('sublocality')
      );
      
      if (isCityType) {
        let cityName = place.name;
        // Clean up Dutch municipality names
        if (cityName.toLowerCase().startsWith('gemeente ')) {
          cityName = cityName.substring(9); // Remove "gemeente " prefix
        }
        result.city = cityName;
      }
    }

    // Final cleanup: ensure city name doesn't have "gemeente" prefix
    if (result.city && result.city.toLowerCase().startsWith('gemeente ')) {
      result.city = result.city.substring(9);
    }

    return result;
  }

  /**
   * Geocode an address string
   * @param {string} address - Address to geocode
   * @returns {Promise<object>} Geocoded location data
   */
  async geocodeAddress(address) {
    await this.loadGoogleMapsAPI();

    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const place = results[0];
          resolve(this.parseLocationData(place));
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  /**
   * Reverse geocode coordinates to address
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<object>} Location data
   */
  async reverseGeocode(lat, lng) {
    await this.loadGoogleMapsAPI();

    const location = { lat, lng };

    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ location }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const place = results[0];
          resolve(this.parseLocationData(place));
        } else {
          reject(new Error(`Reverse geocoding failed: ${status}`));
        }
      });
    });
  }

  /**
   * Check if API is loaded and ready
   */
  isReady() {
    return this.isLoaded && window.google && window.google.maps && window.google.maps.places;
  }

  /**
   * Get current session token (for debugging)
   */
  getCurrentSessionToken() {
    return this.sessionToken;
  }
}

// Create and export singleton instance
const googlePlacesService = new GooglePlacesService();

export default googlePlacesService;

// Export class for testing
export { GooglePlacesService };