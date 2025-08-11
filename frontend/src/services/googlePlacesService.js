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
      console.log('[GooglePlaces] Checking API key:', apiKey ? 'Present' : 'Missing');
      
      if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE' || apiKey === 'YOUR_ACTUAL_API_KEY_HERE') {
        console.log('[GooglePlaces] Google Maps API key not configured - location features disabled');
        this.isLoaded = false; // Mark as failed to load
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
            console.log('[GooglePlaces] Google Maps API objects not available - location features disabled');
            this.isLoaded = false; // Mark as failed to load
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

    // Initialize services - use new API if available, fallback to old
    if (window.google.maps.places.AutocompleteSuggestion) {
      console.log('[GooglePlaces] Using new AutocompleteSuggestion API');
      this.useNewAPI = true;
    } else {
      console.log('[GooglePlaces] Using legacy AutocompleteService API');
      this.useNewAPI = false;
      this.initializeLegacyServices();
    }
    
    this.geocoder = new window.google.maps.Geocoder();
    
    // Generate new session token
    this.generateNewSessionToken();
  }

  /**
   * Initialize legacy Google Places services
   */
  initializeLegacyServices() {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.error('[GooglePlaces] Cannot initialize legacy services - Google Maps not available');
      return;
    }
    
    console.log('[GooglePlaces] Initializing legacy services...');
    this.autocompleteService = new window.google.maps.places.AutocompleteService();
    this.placesService = new window.google.maps.places.PlacesService(
      document.createElement('div')
    );
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
   * Clean city name by removing common prefixes
   * @param {string} name - City name to clean
   * @returns {string} Cleaned city name
   */
  cleanCityName(name) {
    if (!name) return '';
    
    // Remove "gemeente " prefix (Dutch municipalities)
    if (name.toLowerCase().startsWith('gemeente ')) {
      return name.substring(9);
    }
    
    // Remove other common prefixes
    const prefixes = ['stad ', 'city of ', 'ville de ', 'ciudad de '];
    const lowerName = name.toLowerCase();
    
    for (const prefix of prefixes) {
      if (lowerName.startsWith(prefix)) {
        return name.substring(prefix.length);
      }
    }
    
    return name;
  }

  /**
   * Get place predictions with autocomplete
   * @param {string} input - Search input
   * @param {object} options - Autocomplete options
   * @returns {Promise<Array>} Array of place predictions
   */
  async getPlacePredictions(input, options = {}) {
    try {
      await this.loadGoogleMapsAPI();
    } catch (error) {
      console.log('[GooglePlaces] API not available, returning empty results');
      return [];
    }

    if (!input || input.trim().length < 2) {
      return [];
    }

    // Try new API first if available, fallback to legacy on error
    if (this.useNewAPI) {
      try {
        return await this.getPlacePredictionsNew(input, options);
      } catch (error) {
        console.log('[GooglePlaces] New API failed, falling back to legacy API:', error.message);
        // Switch to legacy API permanently for this session and initialize legacy services
        this.useNewAPI = false;
        this.initializeLegacyServices();
        return this.getPlacePredictionsLegacy(input, options);
      }
    } else {
      return this.getPlacePredictionsLegacy(input, options);
    }
  }

  /**
   * Get place predictions using new AutocompleteSuggestion API
   */
  async getPlacePredictionsNew(input, options = {}) {
    try {
      const request = {
        input: input.trim(),
        includedPrimaryTypes: options.types || ['locality'],
        sessionToken: this.sessionToken
      };

      // Add location restriction if country is specified
      if (options.componentRestrictions && options.componentRestrictions.country) {
        request.locationRestriction = {
          rectangle: {
            // Use country bounds - for NL as example, but we'll make it more generic
            low: { lat: 50.0, lng: 3.0 },
            high: { lat: 54.0, lng: 8.0 }
          }
        };
        
        // Better approach: use includedRegionCodes instead
        request.includedRegionCodes = [options.componentRestrictions.country];
        delete request.locationRestriction;
      }

      const { suggestions } = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      
      // Convert new format to legacy format for compatibility
      return suggestions.map(suggestion => ({
        place_id: suggestion.placePrediction.placeId,
        description: suggestion.placePrediction.text.text,
        structured_formatting: {
          main_text: suggestion.placePrediction.structuredFormat.mainText?.text || '',
          secondary_text: suggestion.placePrediction.structuredFormat.secondaryText?.text || ''
        },
        types: suggestion.placePrediction.types || []
      }));
    } catch (error) {
      console.error('New Places API error:', error);
      throw error;
    }
  }

  /**
   * Get place predictions using legacy AutocompleteService API
   */
  async getPlacePredictionsLegacy(input, options = {}) {
    // Ensure legacy services are initialized
    if (!this.autocompleteService) {
      console.log('[GooglePlaces] AutocompleteService not initialized, initializing now...');
      this.initializeLegacyServices();
    }

    if (!this.autocompleteService) {
      throw new Error('AutocompleteService could not be initialized');
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
    try {
      await this.loadGoogleMapsAPI();
    } catch (error) {
      console.log('[GooglePlaces] API not available, cannot fetch place details');
      throw new Error('Google Places API not available');
    }

    // Try new API first if available, fallback to legacy on error
    if (this.useNewAPI) {
      try {
        return await this.getPlaceDetailsNew(placeId, fields);
      } catch (error) {
        console.log('[GooglePlaces] New API failed for place details, falling back to legacy API:', error.message);
        // Switch to legacy API permanently for this session
        this.useNewAPI = false;
        return this.getPlaceDetailsLegacy(placeId, fields);
      }
    } else {
      return this.getPlaceDetailsLegacy(placeId, fields);
    }
  }

  /**
   * Get place details using new Place API
   */
  async getPlaceDetailsNew(placeId, fields) {
    try {
      const request = {
        id: placeId,
        fields: fields,
        sessionToken: this.sessionToken
      };

      const place = await window.google.maps.places.Place.fetchFields(request);
      
      // Generate new session token after successful request
      this.generateNewSessionToken();
      return place;
    } catch (error) {
      console.error('New Place details error:', error);
      throw error;
    }
  }

  /**
   * Get place details using legacy PlacesService API
   */
  async getPlaceDetailsLegacy(placeId, fields) {
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
   * Get major cities for a specific country
   * @param {string} countryCode - ISO country code (e.g., 'NL', 'US')
   * @returns {Promise<Array>} Array of major cities in the country
   */
  async getCitiesForCountry(countryCode) {
    try {
      await this.loadGoogleMapsAPI();
    } catch (error) {
      console.log('[GooglePlaces] API not available, using fallback cities');
      // Return known cities as fallback when API isn't available
      const fallbackCities = this.getKnownCitiesForCountry(countryCode).slice(0, 20).map((cityName, index) => ({
        name: cityName,
        placeId: `fallback-${index}`,
        description: `${cityName}, ${countryCode}`,
        isFallback: true
      }));
      
      // Always include "Other" option
      fallbackCities.push({
        name: 'Other',
        placeId: 'manual',
        description: 'Enter city manually',
        isManual: true
      });
      
      return fallbackCities;
    }
    
    try {
      console.log('[getCitiesForCountry] Getting cities for country:', countryCode);
      
      // Country-specific city lists as fallback and to guide search
      const knownCities = this.getKnownCitiesForCountry(countryCode);
      console.log('[getCitiesForCountry] Known cities count:', knownCities.length);
      
      const allCities = new Map();
      
      // Strategy 1: Search for each known city individually with (cities) type
      console.log('[getCitiesForCountry] Strategy 1: Searching for known cities with (cities) type...');
      for (const knownCity of knownCities.slice(0, 8)) {
        try {
          const options = {
            input: knownCity,
            types: ['(cities)'],
            componentRestrictions: { country: countryCode },
            sessionToken: this.sessionToken
          };
          
          const predictions = await this.getPlacePredictions(knownCity, options);
          console.log(`[getCitiesForCountry] Search for "${knownCity}" returned ${predictions.length} predictions`);
          
          predictions.forEach(prediction => {
            const cityName = this.cleanCityName(
              prediction.structured_formatting?.main_text || 
              prediction.description.split(',')[0]
            );
            
            if (cityName && cityName.length > 1 && !allCities.has(prediction.place_id)) {
              allCities.set(prediction.place_id, {
                name: cityName,
                placeId: prediction.place_id,
                description: prediction.description
              });
              console.log(`[getCitiesForCountry] Added city: ${cityName}`);
            }
          });
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`[getCitiesForCountry] Error searching for "${knownCity}":`, error);
        }
      }
      
      // Strategy 2: Try with locality type specifically
      if (allCities.size < 15) {
        console.log('[getCitiesForCountry] Strategy 2: Trying with locality type...');
        const localityOptions = {
          types: ['locality'],
          componentRestrictions: { country: countryCode }
        };
        
        // Try with single letters to get broad results
        const searchLetters = ['a', 'e', 'r', 'n'];
        for (const letter of searchLetters) {
          try {
            const predictions = await this.getPlacePredictions(letter, localityOptions);
            console.log(`[getCitiesForCountry] Locality search for "${letter}" returned ${predictions.length} predictions`);
            
            predictions.forEach(prediction => {
              const cityName = this.cleanCityName(
                prediction.structured_formatting?.main_text || 
                prediction.description.split(',')[0]
              );
              
              if (cityName && cityName.length > 1 && !allCities.has(prediction.place_id)) {
                allCities.set(prediction.place_id, {
                  name: cityName,
                  placeId: prediction.place_id,
                  description: prediction.description
                });
                console.log(`[getCitiesForCountry] Added from locality search: ${cityName}`);
              }
            });
            
            if (allCities.size >= 30) break;
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.warn(`[getCitiesForCountry] Error with locality search "${letter}":`, error);
          }
        }
      }
      
      // Strategy 3: Try administrative areas for Netherlands
      if (countryCode === 'NL' && allCities.size < 20) {
        console.log('[getCitiesForCountry] Strategy 3: Trying administrative areas for Netherlands...');
        const adminOptions = {
          types: ['administrative_area_level_2'],
          componentRestrictions: { country: 'NL' }
        };
        
        try {
          const predictions = await this.getPlacePredictions('gemeente', adminOptions);
          console.log(`[getCitiesForCountry] Admin search returned ${predictions.length} predictions`);
          
          predictions.forEach(prediction => {
            const cityName = this.cleanCityName(
              prediction.structured_formatting?.main_text || 
              prediction.description.split(',')[0]
            );
            
            if (cityName && cityName.length > 1 && !allCities.has(prediction.place_id)) {
              allCities.set(prediction.place_id, {
                name: cityName,
                placeId: prediction.place_id,
                description: prediction.description
              });
              console.log(`[getCitiesForCountry] Added from admin search: ${cityName}`);
            }
          });
        } catch (error) {
          console.warn('[getCitiesForCountry] Error with admin search:', error);
        }
      }
      
      // If Google API returns limited results, add known cities as supplementary options
      if (allCities.size < 10) {
        console.log('[getCitiesForCountry] Supplementing with known cities as API returned limited results');
        knownCities.forEach((cityName, index) => {
          if (!Array.from(allCities.values()).some(city => city.name.toLowerCase() === cityName.toLowerCase())) {
            allCities.set(`known-${index}`, {
              name: cityName,
              placeId: `known-${index}`,
              description: `${cityName}, ${countryCode}`,
              isKnown: true
            });
          }
        });
      }
      
      // Convert Map to array and sort
      const cities = Array.from(allCities.values())
        .sort((a, b) => {
          // Prioritize Google results over known cities
          if (a.isKnown && !b.isKnown) return 1;
          if (!a.isKnown && b.isKnown) return -1;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 50);
      
      console.log(`[getCitiesForCountry] Final result: ${cities.length} cities for ${countryCode}`);
      console.log('[getCitiesForCountry] Cities:', cities.map(c => c.name).join(', '));
      
      // Always include "Other" option for manual input
      if (!cities.some(c => c.name === 'Other')) {
        cities.push({
          name: 'Other',
          placeId: 'manual',
          description: 'Enter city manually',
          isManual: true
        });
      }
      
      return cities;
    } catch (error) {
      console.error('[getCitiesForCountry] Error fetching cities for country:', error);
      // Return known cities as ultimate fallback
      const fallbackCities = this.getKnownCitiesForCountry(countryCode).slice(0, 20).map((cityName, index) => ({
        name: cityName,
        placeId: `fallback-${index}`,
        description: `${cityName}, ${countryCode}`,
        isFallback: true
      }));
      
      // Always include "Other" option
      fallbackCities.push({
        name: 'Other',
        placeId: 'manual',
        description: 'Enter city manually',
        isManual: true
      });
      
      return fallbackCities;
    }
  }

  /**
   * Get known major cities for a country as fallback
   * @param {string} countryCode - ISO country code
   * @returns {Array} Array of known city names
   */
  getKnownCitiesForCountry(countryCode) {
    const knownCities = {
      'NL': [
        'Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven', 'Groningen', 
        'Tilburg', 'Almere', 'Breda', 'Nijmegen', 'Enschede', 'Apeldoorn', 
        'Haarlem', 'Amersfoort', 'Arnhem', 'Zaanstad', 'Haarlemmermeer', 
        'Zoetermeer', 'Zwolle', 'Maastricht', 'Leiden', 'Dordrecht', 'Alphen aan den Rijn'
      ],
      'US': [
        'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
        'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
        'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle'
      ],
      'DE': [
        'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt am Main', 'Stuttgart',
        'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden'
      ],
      'FR': [
        'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes',
        'Montpellier', 'Strasbourg', 'Bordeaux', 'Lille', 'Rennes', 'Reims'
      ],
      'GB': [
        'London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Leeds',
        'Sheffield', 'Edinburgh', 'Bristol', 'Cardiff', 'Leicester', 'Coventry'
      ],
      'BE': [
        'Brussel', 'Antwerpen', 'Gent', 'Charleroi', 'Luik', 'Brugge',
        'Namur', 'Leuven', 'Mons', 'Aalst', 'Mechelen', 'La Louvière'
      ]
    };
    
    return knownCities[countryCode] || [];
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
    try {
      await this.loadGoogleMapsAPI();
    } catch (error) {
      console.log('[GooglePlaces] API not available, cannot geocode address');
      throw new Error('Google Places API not available');
    }

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
    try {
      await this.loadGoogleMapsAPI();
    } catch (error) {
      console.log('[GooglePlaces] API not available, cannot reverse geocode');
      throw new Error('Google Places API not available');
    }

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
    return this.isLoaded && !!window.google && !!window.google.maps && !!window.google.maps.places;
  }

  /**
   * Get current session token (for debugging)
   */
  getCurrentSessionToken() {
    return this.sessionToken;
  }

  /**
   * Reset the service state (for debugging/troubleshooting)
   */
  resetService() {
    console.log('[GooglePlaces] Resetting service state...');
    this.isLoaded = false;
    this.loadPromise = null;
    this.placesService = null;
    this.autocompleteService = null;
    this.geocoder = null;
    this.sessionToken = null;
    this.useNewAPI = undefined;
  }
}

// Create and export singleton instance
const googlePlacesService = new GooglePlacesService();

export default googlePlacesService;

// Export class for testing
export { GooglePlacesService };