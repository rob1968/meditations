import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { getFullUrl, API_ENDPOINTS } from '../config/api';
import { getSortedCountries } from '../data/countries';
import PageHeader from './PageHeader';
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
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [piUserData, setPiUserData] = useState(null);
  const [isCheckingPiAuth, setIsCheckingPiAuth] = useState(true);
  const [piCheckCompleted, setPiCheckCompleted] = useState(false);
  const [showTraditionalAuth, setShowTraditionalAuth] = useState(false);
  const { t, i18n } = useTranslation();

  // Get sorted countries for the current language
  const countries = getSortedCountries(i18n.language);

  // Automatic Pi Network detection and initialization
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[Auth] Starting authentication initialization...');
      
      // First check for existing user session
      const existingUser = localStorage.getItem('user');
      if (existingUser && existingUser !== 'undefined' && existingUser !== 'null') {
        try {
          const userData = JSON.parse(existingUser);
          if (userData && userData.id) {
            console.log('[Auth] User already logged in, auto-logging in');
            setIsCheckingPiAuth(false);
            onLogin(userData);
            return;
          }
        } catch (error) {
          console.log('[Auth] Error parsing existing user data:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('authMethod');
        }
      }

      // No existing session, try automatic Pi Network detection
      console.log('[Auth] No existing session, checking Pi Network...');
      setIsCheckingPiAuth(true);
      
      try {
        // Initialize Pi authentication service with timeout
        const initialized = await Promise.race([
          piAuthService.initialize(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Pi init timeout')), 5000)) // 5 second init timeout
        ]);
        if (!initialized) {
          throw new Error('Pi service initialization failed');
        }

        // Attempt automatic Pi authentication with shorter timeout for faster fallback
        console.log('[Auth] Attempting automatic Pi authentication...');
        const piResult = await Promise.race([
          piAuthService.autoAuthenticate(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Pi auto-auth timeout')), 10000)) // 10 second timeout
        ]);
        
        if (piResult.success) {
          console.log('[Auth] Automatic Pi authentication successful:', piResult.user.username);
          
          // Check if user needs to complete registration
          const user = piResult.user;
          const needsProfile = !user.birthDate || !user.country || !user.gender || !user.preferredLanguage;
          
          if (needsProfile) {
            console.log('[Auth] New Pi user detected - showing registration fields');
            setNeedsRegistration(true);
            setPiUserData(user);
          } else {
            console.log('[Auth] Existing Pi user - logging in directly');
            localStorage.setItem('user', JSON.stringify(piResult.user));
            localStorage.setItem('authToken', piResult.token);
            localStorage.setItem('authMethod', 'pi');
            onLogin(piResult.user);
          }
        } else {
          console.log('[Auth] Pi authentication not available:', piResult.reason);
          setShowTraditionalAuth(true);
        }
      } catch (error) {
        console.log('[Auth] Pi authentication failed, showing traditional auth:', error.message);
        setShowTraditionalAuth(true);
      } finally {
        setIsCheckingPiAuth(false);
        setPiCheckCompleted(true);
      }
    };

    initializeAuth();
  }, [onLogin]);
  
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

  // Traditional login function (Pi detection now happens automatically at startup)
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('[Auth] Processing traditional authentication...');
      await handleTraditionalAuth();
    } catch (error) {
      console.error('[Auth] Traditional authentication failed:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Traditional authentication function
  const handleTraditionalAuth = async () => {
    try {
      // Validation for registration
      if (!isLogin) {
        if (birthDate) {
          const age = calculateAge(birthDate);
          if (age < 13 || age > 120) {
            throw new Error(t('invalidAge', 'You must be between 13 and 120 years old'));
          }
        }
      }

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
      console.error('Traditional auth error:', error);
      
      // Handle specific HTTP status codes
      if (error.response?.status === 409) {
        throw new Error(t('usernameExists', 'Username already exists. Please choose a different username.'));
      } else if (error.response?.status === 404) {
        throw new Error(t('userNotFound', 'Username not found. Please check your username or register.'));
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error(isLogin ? t('loginFailed', 'Login failed') : t('registrationFailed', 'Registration failed'));
      }
    }
  };


  // Complete Pi user registration with additional profile information
  const completePiRegistration = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate username
    if (!username || username.length < 3 || username.length > 20) {
      setError(t('usernameRequired', 'Username must be between 3 and 20 characters'));
      setIsLoading(false);
      return;
    }

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

      const response = await axios.post(getFullUrl('/api/auth/complete-pi-registration'), updateData);

      // Store updated user data
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('authMethod', 'pi');
      
      console.log('[Auth] Pi registration completed successfully');
      onLogin(updatedUser);
      
    } catch (error) {
      console.error('[Auth] Pi registration completion error:', error);
      if (error.response?.status === 409) {
        setError(t('usernameExists', 'Username already exists. Please choose a different username.'));
      } else if (error.response?.data?.error) {
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

  // Show loading screen while checking Pi Network
  if (isCheckingPiAuth) {
    return (
      <div className="auth-container">
        <div className="auth-language-header">
          <PageHeader />
        </div>
        <div className="auth-card">
          <div className="auth-header">
            <h2>{t('checkingPiNetwork', 'Checking Pi Network...')}</h2>
            <p>{t('pleaseWait', 'Please wait while we check for Pi Network authentication')}</p>
          </div>
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>{t('connectingPi', 'Connecting to Pi Network...')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-language-header">
        <PageHeader />
      </div>
      <div className="auth-card">
        <div className="auth-header">
          <h2>
            {needsRegistration 
              ? t('completePiProfile', 'Complete your Pi Profile')
              : (isLogin ? t('login', 'Login') : t('register', 'Register'))
            }
          </h2>
          <p>
            {needsRegistration 
              ? t('completePiProfileSubtitle', `Welcome ${piUserData?.username}! Please complete your profile (optional)`)
              : (isLogin ? t('loginSubtitle', 'Welcome back') : t('registerSubtitle', 'Create your account'))
            }
          </p>
        </div>

        {needsRegistration ? (
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
              <strong>{t('loggedInAsPi', 'Logged in as Pi')}: @{piUserData?.username}</strong>
            </div>

            <div className="form-group">
              <label>{t('chooseUsername', 'Choose Username')} *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('enterUsername', 'Enter your app username')}
                required
                minLength={3}
                maxLength={20}
                pattern="^[a-zA-Z0-9_-]+$"
                className="auth-input"
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                {t('usernameHelp', 'This will be your display name in the app (3-20 characters, letters/numbers only)')}
              </small>
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
        ) : showTraditionalAuth ? (
          // Traditional Authentication Form (shown when Pi Network is not available)
          <form onSubmit={handleLogin} className="auth-form">
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
        ) : null}

        {!needsRegistration && showTraditionalAuth && (
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;