// Cities API service using CountriesNow API
// Provides city data by country with caching and error handling

const CITIES_API_BASE_URL = 'https://countriesnow.space/api/v0.1/countries';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_PREFIX = 'cities_cache_';

class CitiesService {
  constructor() {
    this.requestCache = new Map(); // In-memory cache for current session
  }

  /**
   * Get all countries with their cities (for initial load/caching)
   */
  async getAllCountriesWithCities() {
    const cacheKey = 'all_countries';
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(CITIES_API_BASE_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.msg || 'API returned an error');
      }

      const countries = result.data || [];
      
      // Cache the result
      this.setCachedData(cacheKey, countries);
      
      return countries;
    } catch (error) {
      console.error('Error fetching all countries with cities:', error);
      throw new Error('Failed to load countries data. Please try again.');
    }
  }

  /**
   * Get cities for a specific country
   * @param {string} countryName - Name of the country
   * @returns {Promise<string[]>} Array of city names
   */
  async getCitiesByCountry(countryName) {
    if (!countryName || typeof countryName !== 'string') {
      throw new Error('Country name is required');
    }

    // Normalize country name
    const normalizedCountry = countryName.trim().toLowerCase();
    const cacheKey = `country_${normalizedCountry}`;
    
    // Check session cache first
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }

    // Check localStorage cache
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      this.requestCache.set(cacheKey, cached);
      return cached;
    }

    try {
      const response = await fetch(`${CITIES_API_BASE_URL}/cities`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          country: normalizedCountry
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.msg || 'Country not found or API error');
      }

      const cities = result.data || [];
      
      // Sort cities alphabetically
      const sortedCities = cities.sort((a, b) => {
        return a.localeCompare(b, undefined, { 
          numeric: true, 
          sensitivity: 'base' 
        });
      });

      // Cache the result
      this.setCachedData(cacheKey, sortedCities);
      this.requestCache.set(cacheKey, sortedCities);
      
      return sortedCities;
    } catch (error) {
      console.error(`Error fetching cities for ${countryName}:`, error);
      
      // Try to fallback to cached all countries data
      const fallbackCities = await this.getFallbackCities(normalizedCountry);
      if (fallbackCities.length > 0) {
        return fallbackCities;
      }
      
      throw new Error(`Failed to load cities for ${countryName}. Please enter manually.`);
    }
  }

  /**
   * Search cities by country with filtering
   * @param {string} countryName - Name of the country
   * @param {string} searchTerm - Search term to filter cities
   * @returns {Promise<string[]>} Filtered array of city names
   */
  async searchCities(countryName, searchTerm = '') {
    const cities = await this.getCitiesByCountry(countryName);
    
    if (!searchTerm || searchTerm.trim().length === 0) {
      return cities;
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();
    
    // Filter cities that start with or contain the search term
    const filtered = cities.filter(city => {
      const normalizedCity = city.toLowerCase();
      return normalizedCity.startsWith(normalizedSearch) || 
             normalizedCity.includes(normalizedSearch);
    });

    // Sort by relevance: exact matches first, then starts with, then contains
    return filtered.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      
      // Exact match
      if (aLower === normalizedSearch) return -1;
      if (bLower === normalizedSearch) return 1;
      
      // Starts with
      if (aLower.startsWith(normalizedSearch) && !bLower.startsWith(normalizedSearch)) return -1;
      if (bLower.startsWith(normalizedSearch) && !aLower.startsWith(normalizedSearch)) return 1;
      
      // Alphabetical for same priority
      return a.localeCompare(b);
    });
  }

  /**
   * Get popular/major cities for a country (first 10 alphabetically)
   * @param {string} countryName - Name of the country
   * @returns {Promise<string[]>} Array of popular city names
   */
  async getPopularCities(countryName) {
    const cities = await this.getCitiesByCountry(countryName);
    return cities.slice(0, 10); // Return first 10 cities
  }

  /**
   * Fallback method to get cities from cached all countries data
   */
  async getFallbackCities(normalizedCountry) {
    try {
      const allCountries = this.getCachedData('all_countries');
      if (!allCountries) return [];

      const country = allCountries.find(c => 
        c.country.toLowerCase() === normalizedCountry
      );
      
      return country ? country.cities || [] : [];
    } catch (error) {
      console.error('Fallback cities lookup failed:', error);
      return [];
    }
  }

  /**
   * Cache data in localStorage with timestamp
   */
  setCachedData(key, data) {
    try {
      const cacheItem = {
        data: data,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheItem));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  /**
   * Get cached data from localStorage if not expired
   */
  getCachedData(key) {
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + key);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - cacheItem.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.warn('Failed to read cached data:', error);
      return null;
    }
  }

  /**
   * Clear all cached cities data
   */
  clearCache() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      this.requestCache.clear();
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Preload cities for a list of countries (for better UX)
   */
  async preloadCountries(countryNames = []) {
    const promises = countryNames.map(country => 
      this.getCitiesByCountry(country).catch(error => {
        console.warn(`Failed to preload cities for ${country}:`, error.message);
        return [];
      })
    );
    
    await Promise.all(promises);
  }

  /**
   * Check if service is online and API is accessible
   */
  async checkApiHealth() {
    try {
      const response = await fetch(CITIES_API_BASE_URL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Create and export a singleton instance
const citiesService = new CitiesService();

export default citiesService;

// Export class for testing purposes
export { CitiesService };