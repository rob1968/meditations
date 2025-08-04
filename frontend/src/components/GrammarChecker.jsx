import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { getFullUrl, API_ENDPOINTS } from '../config/api';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import './GrammarChecker.css';

const GrammarChecker = ({ 
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
  const [grammarAnalysis, setGrammarAnalysis] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(null);
  const [showNonsenseWarning, setShowNonsenseWarning] = useState(false);
  const [checkingEnabled, setCheckingEnabled] = useState(enabled);
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

  // Debounced grammar check
  const checkGrammar = useCallback(async (textToCheck) => {
    if (!textToCheck || textToCheck.trim().length === 0 || !checkingEnabled) {
      setGrammarAnalysis(null);
      return;
    }

    setIsChecking(true);
    try {
      const currentLang = getCurrentLanguage();
      const response = await axios.post(getFullUrl(API_ENDPOINTS.AI_COACH + '/check-grammar'), {
        text: textToCheck,
        language: currentLang
      });

      if (response.data.success) {
        const analysis = response.data.analysis;
        setGrammarAnalysis(analysis);
        
        // Show nonsense warning if detected
        if (analysis.isNonsense && !showNonsenseWarning) {
          setShowNonsenseWarning(true);
        }
      }
    } catch (error) {
      console.error('Error checking grammar:', error);
      setGrammarAnalysis(null);
    } finally {
      setIsChecking(false);
    }
  }, [getCurrentLanguage, checkingEnabled, showNonsenseWarning]);

  // Debounced effect for auto-checking
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      checkGrammar(text);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [text, checkGrammar, debounceMs]);

  // Manual check function
  const handleManualCheck = () => {
    checkGrammar(text);
  };

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
    if (!grammarAnalysis || !grammarAnalysis.errors || grammarAnalysis.errors.length === 0) {
      return null;
    }

    const parts = [];
    let lastIndex = 0;

    // Sort errors by start position
    const sortedErrors = [...grammarAnalysis.errors].sort((a, b) => a.start - b.start);

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
          className={`grammar-error ${error.type}-error`}
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
    <div className="grammar-checker-container">
      {/* Controls */}
      <div className="grammar-checker-controls">
        <label className="grammar-toggle">
          <input
            type="checkbox"
            checked={checkingEnabled}
            onChange={(e) => setCheckingEnabled(e.target.checked)}
          />
          <span>{t('grammarCheck', 'Spelling & Grammar Check')}</span>
        </label>
        
        <button
          type="button"
          className="manual-check-btn"
          onClick={handleManualCheck}
          disabled={isChecking || !text.trim()}
        >
          {isChecking ? t('checking', 'Checking...') : t('checkText', 'Check Text')}
        </button>

        {grammarAnalysis && (
          <span className="error-count">
            {grammarAnalysis.errors.length} 
            {grammarAnalysis.errors.length === 1 ? 
              ` ${t('issue', 'issue')} ${t('found', 'found')}` : 
              ` ${t('issues', 'issues')} ${t('found', 'found')}`
            }
          </span>
        )}

        {grammarAnalysis && grammarAnalysis.detectedLanguage && (
          <span className="detected-language">
            {t('language', 'Language')}: {supportedLanguages[grammarAnalysis.detectedLanguage] || grammarAnalysis.detectedLanguage}
          </span>
        )}
      </div>

      {/* Text input area */}
      <div className="grammar-input-container">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className={`grammar-textarea ${className}`}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
        />
        
        {/* Error highlighting overlay */}
        {checkingEnabled && grammarAnalysis && grammarAnalysis.errors.length > 0 && (
          <div
            ref={overlayRef}
            className="grammar-overlay"
            style={{
              height: textareaRef.current?.scrollHeight || 'auto'
            }}
          >
            <div className="grammar-highlight-text">
              {renderHighlightedText()}
            </div>
          </div>
        )}
      </div>

      {/* Error suggestion popup */}
      {showSuggestions !== null && grammarAnalysis && grammarAnalysis.errors[showSuggestions] && (
        <div className="grammar-suggestion-popup">
          <div className="suggestion-content">
            <h4>{t(grammarAnalysis.errors[showSuggestions].type + 'Error', grammarAnalysis.errors[showSuggestions].type + ' Error')}</h4>
            <p className="error-text">
              <strong>{t('error', 'Error')}:</strong> "{grammarAnalysis.errors[showSuggestions].error}"
            </p>
            <p className="suggestion-text">
              <strong>{t('suggestion', 'Suggestion')}:</strong> "{grammarAnalysis.errors[showSuggestions].suggestion}"
            </p>
            <p className="explanation">
              {grammarAnalysis.errors[showSuggestions].explanation}
            </p>
            
            <div className="suggestion-actions">
              <button 
                className="apply-btn"
                onClick={() => applySuggestion(grammarAnalysis.errors[showSuggestions])}
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

      {/* Nonsense warning modal */}
      {showNonsenseWarning && grammarAnalysis?.isNonsense && (
        <div className="nonsense-warning-modal">
          <div className="modal-content">
            <h3>{t('textQualityWarning', 'Text Quality Warning')}</h3>
            <p>
              {t('nonsenseText', 'The entered text appears to be nonsensical or incoherent.')}
              {grammarAnalysis.nonsenseReason && (
                <span> {grammarAnalysis.nonsenseReason}</span>
              )}
            </p>
            <p>
              {t('reviewText', 'Please review your text to ensure it expresses your thoughts clearly. This helps create more meaningful journal entries.')}
            </p>
            
            <div className="modal-actions">
              <button 
                className="understood-btn"
                onClick={() => setShowNonsenseWarning(false)}
              >
                {t('understand', 'I Understand')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isChecking && (
        <div className="checking-indicator">
          <span>{t('checkingGrammar', 'Checking grammar...')}</span>
        </div>
      )}
    </div>
  );
};

export default GrammarChecker;