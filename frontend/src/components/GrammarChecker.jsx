import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { getFullUrl, API_ENDPOINTS } from '../config/api';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import './GrammarChecker.css';

const SpellingChecker = ({ 
  text, 
  onTextChange, 
  className = '', 
  placeholder = '', 
  rows = 6,
  maxLength = 5000,
  enabled = true,
  language = 'auto',
  debounceMs = 1000
}) => {
  const { t } = useTranslation();
  const [spellingAnalysis, setSpellingAnalysis] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(null);
  const [checkingEnabled, setCheckingEnabled] = useState(true);
  const [checkTypes, setCheckTypes] = useState(['grammar']); // Default to grammar only
  const textareaRef = useRef(null);
  const debounceRef = useRef(null);
  const overlayRef = useRef(null);

  // Get current language from i18n, fallback to language prop
  const getCurrentLanguage = useCallback(() => {
    const currentLang = i18n.language || language;
    // Map some common language variants to supported codes
    const langMap = {
      'en-US': 'en',
      'en-GB': 'en',
      'de-DE': 'de',
      'es-ES': 'es',
      'fr-FR': 'fr',
      'it-IT': 'it',
      'pt-BR': 'pt',
      'pt-PT': 'pt',
      'zh-CN': 'zh',
      'zh-TW': 'zh'
    };
    return langMap[currentLang] || currentLang.split('-')[0] || 'auto';
  }, [language]);

  // Supported languages list
  const supportedLanguages = {
    'ar': 'العربية (Arabic)',
    'de': 'Deutsch (German)',
    'en': 'English',
    'es': 'Español (Spanish)',
    'fr': 'Français (French)',
    'hi': 'हिन्दी (Hindi)',
    'it': 'Italiano (Italian)',
    'ja': '日本語 (Japanese)',
    'ko': '한국어 (Korean)',
    'nl': 'Nederlands (Dutch)',
    'pt': 'Português (Portuguese)',
    'ru': 'Русский (Russian)',
    'zh': '中文 (Chinese)'
  };

  // Check spelling and/or grammar
  const checkText = useCallback(async (textToCheck) => {
    if (!textToCheck || textToCheck.trim().length === 0 || !checkingEnabled) {
      setSpellingAnalysis(null);
      return;
    }

    setIsChecking(true);
    try {
      const currentLang = getCurrentLanguage();
      const response = await axios.post(getFullUrl(API_ENDPOINTS.AI_COACH + '/check-grammar'), {
        text: textToCheck,
        language: currentLang,
        checkTypes: checkTypes
      });

      if (response.data.success) {
        const analysis = response.data.analysis;
        // Filter for grammar errors only
        const filteredAnalysis = {
          ...analysis,
          suggestions: (analysis.errors || analysis.suggestions || []).filter(suggestion => {
            const suggestionType = suggestion.type || suggestion.category;
            return suggestionType === 'grammar' || suggestionType === 'grammatical';
          })
        };
        setSpellingAnalysis(filteredAnalysis);
      }
    } catch (error) {
      console.error('Error checking text:', error);
      setSpellingAnalysis(null);
    } finally {
      setIsChecking(false);
    }
  }, [getCurrentLanguage, checkingEnabled, checkTypes]);

  // Debounced effect for auto-checking (disabled - only manual checking now)
  useEffect(() => {
    // Auto-checking is disabled - users must click "Check Text" button
    // This prevents automatic API calls and gives users control
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [text, checkText, debounceMs]);

  // Manual check function
  const handleManualCheck = () => {
    setCheckingEnabled(true);
    checkText(text);
  };

  // Grammar checking only - no type toggling needed

  // Handle clicking on error suggestion
  const handleErrorClick = (error, index) => {
    setShowSuggestions(index);
  };

  // Apply suggestion
  const applySuggestion = (error) => {
    const before = text.substring(0, error.start);
    const after = text.substring(error.end);
    const newText = before + error.suggestion + after;
    onTextChange(newText);
    setShowSuggestions(null);
  };

  // Dismiss suggestion
  const dismissSuggestion = () => {
    setShowSuggestions(null);
  };

  // Render text with error highlights
  const renderHighlightedText = () => {
    if (!spellingAnalysis || !spellingAnalysis.suggestions || spellingAnalysis.suggestions.length === 0) {
      return null;
    }

    const parts = [];
    let lastIndex = 0;

    // Sort errors by start position
    const sortedErrors = [...spellingAnalysis.suggestions].sort((a, b) => a.start - b.start);

    sortedErrors.forEach((error, index) => {
      // Add text before error
      if (error.start > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, error.start)}
          </span>
        );
      }

      // Add error with highlight
      parts.push(
        <span
          key={`error-${index}`}
          className={`spelling-error ${error.type}-error`}
          onClick={() => handleErrorClick(error, index)}
          title={`${error.type} error: ${error.explanation}`}
        >
          {text.substring(error.start, error.end)}
        </span>
      );

      lastIndex = error.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <div className="spelling-checker-container">
      {/* Controls */}
      <div className="spelling-checker-controls">
        {/* Check type toggles - Removed, only grammar checking now */}

        <button
          type="button"
          className="spelling-check-btn"
          onClick={handleManualCheck}
          disabled={isChecking || !text.trim()}
        >
          {isChecking ? 
            t('checkingText', 'Checking text...') : 
            t('checkGrammar', 'Check Grammar')
          }
        </button>

        {spellingAnalysis && (
          <span className="error-count">
            {spellingAnalysis.suggestions.length} 
            {spellingAnalysis.suggestions.length === 1 ? 
              ` ${t('issue', 'issue')} ${t('found', 'found')}` : 
              ` ${t('issues', 'issues')} ${t('found', 'found')}`
            }
          </span>
        )}

        {spellingAnalysis && spellingAnalysis.detectedLanguage && (
          <span className="detected-language">
            {t('language', 'Language')}: {supportedLanguages[spellingAnalysis.detectedLanguage] || spellingAnalysis.detectedLanguage}
          </span>
        )}
      </div>

      {/* Text input area */}
      <div className="spelling-input-container">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className={`spelling-textarea ${className}`}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
        />
        
        {/* Error highlighting overlay */}
        {spellingAnalysis && spellingAnalysis.suggestions.length > 0 && (
          <div
            ref={overlayRef}
            className="spelling-overlay"
            style={{
              height: textareaRef.current?.scrollHeight || 'auto'
            }}
          >
            <div className="spelling-highlight-text">
              {renderHighlightedText()}
            </div>
          </div>
        )}
      </div>

      {/* Error suggestion popup */}
      {showSuggestions !== null && spellingAnalysis && spellingAnalysis.suggestions[showSuggestions] && (
        <div className="spelling-suggestion-popup">
          <div className="suggestion-content">
            <h4>{t(spellingAnalysis.suggestions[showSuggestions].type + 'Error', spellingAnalysis.suggestions[showSuggestions].type + ' Error')}</h4>
            <p className="error-text">
              <strong>{t('error', 'Error')}:</strong> "{spellingAnalysis.suggestions[showSuggestions].error}"
            </p>
            <p className="suggestion-text">
              <strong>{t('suggestion', 'Suggestion')}:</strong> "{spellingAnalysis.suggestions[showSuggestions].suggestion}"
            </p>
            <p className="explanation">
              {spellingAnalysis.suggestions[showSuggestions].explanation}
            </p>
            
            <div className="suggestion-actions">
              <button 
                className="apply-btn"
                onClick={() => applySuggestion(spellingAnalysis.suggestions[showSuggestions])}
              >
                {t('apply', 'Apply')}
              </button>
              <button 
                className="dismiss-btn"
                onClick={dismissSuggestion}
              >
                {t('dismiss', 'Dismiss')}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Loading indicator */}
      {isChecking && (
        <div className="checking-indicator">
          <span>{t('checkingText', 'Checking text...')}</span>
        </div>
      )}
    </div>
  );
};

export default SpellingChecker;