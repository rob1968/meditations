import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { getFullUrl, API_ENDPOINTS } from '../config/api';
import { getSortedCountries } from '../data/countries';
import PageHeader from './PageHeader';
import { isPiBrowser } from '../utils/piDetection';
import piAuthService from '../services/piAuth';

const Auth = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [bio, setBio] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPiAuthenticated, setIsPiAuthenticated] = useState(false);
  const [showPiAuth, setShowPiAuth] = useState(false);
  const [piAuthStatus, setPiAuthStatus] = useState(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [piUserData, setPiUserData] = useState(null);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [isAutoAuthenticating, setIsAutoAuthenticating] = useState(false);
  const { t, i18n } = useTranslation();

  // Get sorted countries for the current language
  const countries = getSortedCountries(i18n.language);

  // Initialize Pi authentication and attempt auto-login
  useEffect(() => {
    const initializePiAuth = async () => {
      console.log('[Auth] Initializing Pi authentication...');
      setShowPiAuth(true);
      
      try {
        const initialized = await piAuthService.initialize();
        if (initialized) {
          const status = piAuthService.getAuthStatus();
          setPiAuthStatus(status);
          console.log('[Auth] Pi authentication service initialized:', status);
          
          // Temporarily disable auto-login to allow manual Pi authentication with registration
          // await attemptAutoLogin();
        } else {
          console.log('[Auth] Pi authentication service failed to initialize');
          setShowPiAuth(false);
        }
      } catch (error) {
        console.error('[Auth] Error initializing Pi authentication:', error);
        setShowPiAuth(false);
      }
    };

    const attemptAutoLogin = async () => {
      if (autoLoginAttempted) return;
      
      // Check if user intentionally logged out - if so, don't auto-login
      const logoutIntentional = localStorage.getItem('piLogoutIntentional');
      if (logoutIntentional === 'true') {
        console.log('[Auth] Skipping auto-login due to intentional logout');
        localStorage.removeItem('piLogoutIntentional'); // Clear flag
        setAutoLoginAttempted(true);
        setIsAutoAuthenticating(false);
        return;
      }
      
      // Check if user is already logged in from another tab/session
      const existingUser = localStorage.getItem('user');
      if (existingUser && existingUser !== 'undefined' && existingUser !== 'null') {
        try {
          const userData = JSON.parse(existingUser);
          if (userData && userData.id) {
            console.log('[Auth] User already logged in, skipping auto-authentication');
            setAutoLoginAttempted(true);
            setIsAutoAuthenticating(false);
            onLogin(userData);
            return;
          }
        } catch (error) {
          console.log('[Auth] Error parsing existing user data:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('authMethod');
        }
      }
      
      setAutoLoginAttempted(true);
      setIsAutoAuthenticating(true);
      
      try {
        console.log('[Auth] Attempting automatic Pi authentication...');
        const result = await piAuthService.autoAuthenticate();
        
        if (result.success) {
          console.log('[Auth] Automatic Pi authentication successful:', result.user.username);
          
          // Check if user needs to complete registration
          const user = result.user;
          const needsProfile = !user.birthDate || !user.country || !user.gender || !user.preferredLanguage;
          
          if (needsProfile) {
            console.log('[Auth] New Pi user detected - showing registration fields');
            setNeedsRegistration(true);
            setPiUserData(user);
            setIsPiAuthenticated(true);
            setIsAutoAuthenticating(false);
          } else {
            console.log('[Auth] Existing Pi user - logging in directly');
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('authMethod', 'pi');
            setIsPiAuthenticated(true);
            onLogin(user);
          }
        } else {
          console.log('[Auth] Automatic Pi authentication failed:', result.reason);
          setIsAutoAuthenticating(false);
        }
      } catch (error) {
        console.log('[Auth] Auto-authentication error:', error.message);
        setIsAutoAuthenticating(false);
        // Set an error message for user feedback
        if (error.message.includes('timeout') || error.message.includes('network')) {
          setError('Network connection issue. Please check your internet connection and try again.');
        }
      }
    };

    initializePiAuth();
  }, [autoLoginAttempted, onLogin]);
  
  // Available languages
  const availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'zh', name: '中文' },
    { code: 'ar', name: 'العربية' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'nl', name: 'Nederlands' }
  ];

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleCountryChange = (e) => {
    const selectedCountry = countries.find(c => c.name === e.target.value);
    if (selectedCountry) {
      setCountry(selectedCountry.name);
      setCountryCode(selectedCountry.code);
    } else {
      setCountry(e.target.value);
      setCountryCode('');
    }
  };

  // Handle Pi Network authentication with enhanced debugging
  const handlePiAuth = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('[Auth Component] Starting Pi authentication...');
      
      // Update debug status during authentication
      const updateStatus = () => {
        const status = piAuthService.getAuthStatus();
        setPiAuthStatus(status);
      };
      
      // Update status before authentication
      updateStatus();
      
      const result = await piAuthService.authenticateUser();
      
      // Update status after authentication attempt
      updateStatus();
      
      if (result.success) {
        console.log('[Auth Component] Pi authentication successful:', result);
        
        // Check if user needs to complete registration
        const user = result.user;
        const needsProfile = !user.birthDate || !user.country || !user.gender || !user.preferredLanguage;
        
        if (needsProfile) {
          console.log('[Auth Component] New Pi user detected - showing registration fields');
          setNeedsRegistration(true);
          setPiUserData(user);
          setIsPiAuthenticated(true);
        } else {
          console.log('[Auth Component] Existing Pi user - logging in directly');
          // Store user data and token in localStorage
          localStorage.setItem('user', JSON.stringify(result.user));
          localStorage.setItem('authToken', result.token);
          localStorage.setItem('authMethod', 'pi');
          
          setIsPiAuthenticated(true);
          onLogin(result.user);
        }
      } else {
        throw new Error('Pi authentication failed');
      }
    } catch (error) {
      console.error('[Auth Component] Pi authentication error:', error);
      setError(error.message || t('piAuthFailed', 'Pi authentication failed'));
      
      // Update status after error
      const status = piAuthService.getAuthStatus();
      setPiAuthStatus(status);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle traditional authentication
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation for registration
    if (!isLogin) {
      if (birthDate) {
        const age = calculateAge(birthDate);
        if (age < 13 || age > 120) {
          setError(t('invalidAge', 'You must be between 13 and 120 years old'));
          setIsLoading(false);
          return;
        }
      }
    }

    try {
      const endpoint = isLogin ? API_ENDPOINTS.LOGIN : API_ENDPOINTS.REGISTER;
      const requestData = isLogin 
        ? { username: username.trim() }
        : { 
            username: username.trim(), 
            birthDate: birthDate || null,
            age: birthDate ? calculateAge(birthDate) : null,
            country: country || null,
            countryCode: countryCode || null,
            city: city.trim() || null,
            gender: gender || null,
            preferredLanguage: preferredLanguage || null,
            bio: bio.trim() || null
          };

      const response = await axios.post(getFullUrl(endpoint), requestData);

      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('authMethod', 'traditional');
      
      // Call parent callback
      onLogin(response.data.user);
      
    } catch (error) {
      console.error('Auth error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError(isLogin ? t('loginFailed', 'Login failed') : t('registrationFailed', 'Registration failed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Complete Pi user registration with additional profile information
  const completePiRegistration = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation for registration
    if (birthDate) {
      const age = calculateAge(birthDate);
      if (age < 13 || age > 120) {
        setError(t('invalidAge', 'You must be between 13 and 120 years old'));
        setIsLoading(false);
        return;
      }
    }

    try {
      console.log('[Auth] Completing Pi user registration...');
      
      const updateData = {
        userId: piUserData.id,
        birthDate: birthDate || null,
        age: birthDate ? calculateAge(birthDate) : null,
        country: country || null,
        countryCode: countryCode || null,
        city: city.trim() || null,
        gender: gender || null,
        preferredLanguage: preferredLanguage || null,
        bio: bio.trim() || null
      };

      const response = await axios.post(getFullUrl('/api/auth/complete-pi-registration'), updateData);

      // Store updated user data
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('authMethod', 'pi');
      
      console.log('[Auth] Pi registration completed successfully');
      onLogin(updatedUser);
      
    } catch (error) {
      console.error('[Auth] Pi registration completion error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError(t('registrationFailed', 'Registration failed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setBirthDate('');
    setCountry('');
    setCountryCode('');
    setCity('');
    setGender('');
    setPreferredLanguage('');
    setBio('');
    setError('');
    setNeedsRegistration(false);
    setPiUserData(null);
  };

  return (
    <div className="auth-container">
      <div className="auth-language-header">
        <PageHeader />
      </div>
      <div className="auth-card">
        <div className="auth-header">
          <h2>
            {isAutoAuthenticating 
              ? t('autoAuthenticating', 'Connecting with Pi Network...') 
              : needsRegistration 
                ? t('completePiProfile', 'Complete your Pi Profile')
                : showPiAuth 
                  ? t('piAuthTitle', 'Pi Network Authentication') 
                  : (isLogin ? t('login', 'Login') : t('register', 'Register'))
            }
          </h2>
          <p>
            {isAutoAuthenticating 
              ? t('autoAuthSubtitle', 'Please wait while we connect you automatically')
              : needsRegistration 
                ? t('completePiProfileSubtitle', `Welcome ${piUserData?.username}! Please complete your profile (optional)`)
                : showPiAuth 
                  ? t('piAuthSubtitle', 'Access with your Pi Network account') 
                  : (isLogin ? t('loginSubtitle', 'Welcome back') : t('registerSubtitle', 'Create your account'))
            }
          </p>
        </div>

        {isAutoAuthenticating ? (
          // Auto-authentication in progress
          <div className="auto-auth-section">
            <div className="auto-auth-status">
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>{t('connectingPi', 'Connecting to Pi Network...')}</p>
              </div>
            </div>
            
            <div style={{ 
              border: '1px dashed blue', 
              padding: '10px', 
              margin: '10px 0', 
              fontSize: '12px', 
              backgroundColor: '#f0f0ff',
              borderRadius: '4px'
            }}>
              <p><strong>[Debug Info - Auto Pi Auth]</strong></p>
              <p>Auto-authentication: In Progress</p>
              <p>SDK Available: {piAuthStatus?.isSDKAvailable ? 'Yes' : 'No'}</p>
              <p>Service Initialized: {piAuthStatus?.isInitialized ? 'Yes' : 'No'}</p>
              <p>Status: Attempting automatic login...</p>
            </div>
          </div>
        ) : needsRegistration ? (
          // Pi User Profile Completion
          <form onSubmit={completePiRegistration} className="auth-form">
            <div className="pi-user-info" style={{
              padding: '12px',
              backgroundColor: '#E7F3FF',
              border: '1px solid #6B46C1',
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '20px', marginRight: '8px' }}>π</span>
              <strong>{t('loggedInAsPi', 'Logged in as')}: {piUserData?.username}</strong>
            </div>

            <div className="form-group">
              <label>{t('birthDate', 'Birth Date')} ({t('optional', 'Optional')})</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                min={new Date(new Date().setFullYear(new Date().getFullYear() - 120)).toISOString().split('T')[0]}
                className="auth-input"
              />
            </div>

            <div className="form-group">
              <label>{t('country', 'Country')} ({t('optional', 'Optional')})</label>
              <select
                value={country}
                onChange={handleCountryChange}
                className="auth-input"
              >
                <option value="">{t('selectCountry', 'Select your country')}</option>
                {countries.map(country => (
                  <option key={country.code} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{t('location', 'City')} ({t('optional', 'Optional')})</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('enterCity', 'Enter your city')}
                className="auth-input"
              />
            </div>

            <div className="form-group">
              <label>{t('gender', 'Gender')} ({t('optional', 'Optional')})</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="auth-input"
              >
                <option value="">{t('selectGender', 'Select your gender')}</option>
                <option value="male">☀️ {t('male', 'Male')}</option>
                <option value="female">🌙 {t('female', 'Female')}</option>
                <option value="other">{t('other', 'Other')}</option>
                <option value="prefer_not_to_say">{t('preferNotToSay', 'Prefer not to say')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('preferredLanguage', 'Preferred Language')} ({t('optional', 'Optional')})</label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="auth-input"
              >
                <option value="">{t('selectLanguage', 'Select your language')}</option>
                {availableLanguages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{t('bio', 'Bio')} ({t('optional', 'Optional')})</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('bioPlaceholder', 'Tell us about yourself...')}
                maxLength={500}
                rows={3}
                className="auth-input"
              />
              <div className="character-count">
                {500 - bio.length} {t('charactersRemaining', 'characters remaining')}
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="pi-registration-buttons">
              <button 
                type="submit" 
                disabled={isLoading}
                className="auth-button"
                style={{ marginBottom: '10px' }}
              >
                {isLoading ? (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    {t('updatingProfile', 'Updating profile...')}
                  </div>
                ) : (
                  t('completeRegistration', 'Complete Registration')
                )}
              </button>
              
              <button 
                type="button"
                onClick={() => {
                  console.log('[Auth] User skipped Pi profile completion');
                  localStorage.setItem('user', JSON.stringify(piUserData));
                  localStorage.setItem('authMethod', 'pi');
                  onLogin(piUserData);
                }}
                className="fallback-button"
                disabled={isLoading}
              >
                {t('skipForNow', 'Skip for now')}
              </button>
            </div>
          </form>
        ) : showPiAuth ? (
          // Pi Network Authentication
          <div className="pi-auth-section">
            <div className="pi-auth-info">
              <div className="pi-status">
                <span className="pi-indicator">π</span>
                <span>{t('piDetected', 'Pi Browser Detected')}</span>
              </div>
              
              {/* Enhanced Visual Debugging like working example */}
              <div style={{ 
                border: '1px dashed blue', 
                padding: '10px', 
                margin: '10px 0', 
                fontSize: '12px', 
                backgroundColor: '#f0f0ff',
                borderRadius: '4px'
              }}>
                <p><strong>[Debug Info - Pi Auth]</strong></p>
                <p>Pi Browser: Deprecated (always No)</p>
                <p>SDK Loaded: {piAuthStatus?.isSDKAvailable ? 'Yes' : 'No'}</p>
                <p>Service Initialized: {piAuthStatus?.isInitialized ? 'Yes' : 'No'}</p>
                <p>Authentication Available: {piAuthStatus?.isAvailable ? 'Yes' : 'No'}</p>
                <p>Authentication in Progress: {piAuthStatus?.isAuthenticating ? 'Yes' : 'No'}</p>
                <p>Current Status: {isLoading ? 'Loading/Authenticating...' : 'Ready'}</p>
                {error && <p style={{ color: 'red', fontWeight: 'bold' }}>Error: {error}</p>}
              </div>
            </div>
            
            <button 
              type="button"
              onClick={handlePiAuth}
              disabled={isLoading || !piAuthStatus?.isAvailable}
              className="pi-auth-button"
            >
              {isLoading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  {t('piAuthenticating', 'Authenticating with Pi...')}
                </div>
              ) : (
                <>
                  <span className="pi-logo">π</span>
                  {t('loginWithPi', 'Login with Pi Network')}
                </>
              )}
            </button>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="auth-fallback">
              <hr />
              <p>{t('piAuthFallback', 'Having trouble with Pi authentication?')}</p>
              <button 
                type="button"
                onClick={() => setShowPiAuth(false)}
                className="fallback-button"
              >
                {t('useTraditionalAuth', 'Use traditional login instead')}
              </button>
            </div>
          </div>
        ) : (
          // Traditional Authentication Form
          <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>{t('username', 'Username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('enterUsername', 'Enter username')}
              required
              minLength={3}
              maxLength={20}
              className="auth-input"
            />
          </div>

          {!isLogin && (
            <>

              <div className="form-group">
                <label>{t('birthDate', 'Birth Date')} ({t('optional', 'Optional')})</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                  min={new Date(new Date().setFullYear(new Date().getFullYear() - 120)).toISOString().split('T')[0]}
                  className="auth-input"
                />
              </div>

              <div className="form-group">
                <label>{t('country', 'Country')} ({t('optional', 'Optional')})</label>
                <select
                  value={country}
                  onChange={handleCountryChange}
                  className="auth-input"
                >
                  <option value="">{t('selectCountry', 'Select your country')}</option>
                  {countries.map(country => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t('location', 'City')} ({t('optional', 'Optional')})</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t('enterCity', 'Enter your city')}
                  className="auth-input"
                />
              </div>

              <div className="form-group">
                <label>{t('gender', 'Gender')} ({t('optional', 'Optional')})</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="auth-input"
                >
                  <option value="">{t('selectGender', 'Select your gender')}</option>
                  <option value="male">☀️ {t('male', 'Male')}</option>
                  <option value="female">🌙 {t('female', 'Female')}</option>
                  <option value="other">{t('other', 'Other')}</option>
                  <option value="prefer_not_to_say">{t('preferNotToSay', 'Prefer not to say')}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t('preferredLanguage', 'Preferred Language')} ({t('optional', 'Optional')})</label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="auth-input"
                >
                  <option value="">{t('selectLanguage', 'Select your language')}</option>
                  {availableLanguages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t('bio', 'Bio')} ({t('optional', 'Optional')})</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('bioPlaceholder', 'Tell us about yourself...')}
                  maxLength={500}
                  rows={3}
                  className="auth-input"
                />
                <div className="character-count">
                  {500 - bio.length} {t('charactersRemaining', 'characters remaining')}
                </div>
              </div>
            </>
          )}

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            disabled={isLoading || username.trim().length < 3}
            className="auth-button"
          >
            {isLoading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                {isLogin ? t('loggingIn', 'Logging in...') : t('registering', 'Registering...')}
              </div>
            ) : (
              isLogin ? t('login', 'Login') : t('register', 'Register')
            )}
          </button>
        </form>
        )}

        {!showPiAuth && (
          <div className="auth-switch">
            <p>
              {isLogin ? t('noAccount', "Don't have an account?") : t('haveAccount', 'Already have an account?')}
              <button 
                type="button" 
                onClick={() => {
                  setIsLogin(!isLogin);
                  resetForm();
                }}
                className="switch-button"
              >
                {isLogin ? t('register', 'Register') : t('login', 'Login')}
              </button>
            </p>
            
            {showPiAuth && (
              <div className="pi-auth-option">
                <hr />
                <p>{t('piAvailable', 'Pi Network authentication is available')}</p>
                <button 
                  type="button"
                  onClick={() => setShowPiAuth(true)}
                  className="pi-switch-button"
                >
                  <span className="pi-logo">π</span>
                  {t('switchToPi', 'Use Pi Network instead')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;