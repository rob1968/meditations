import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import axios from 'axios';
import { getFullUrl, API_ENDPOINTS } from '../config/api';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import './GrammarChecker.css';

const SpellingChecker = forwardRef(({ 
  text, 
  onTextChange, 
  onTextUpdated, // New callback for when text has been updated via suggestions
  onGrammarCheckComplete, // Callback when automatic grammar check is complete
  appliedCorrections = [], // Array of applied corrections to highlight
  showCorrectionHighlights = false, // Whether to show red highlights for corrections
  autoApplyCorrections = false, // Automatically apply corrections without showing UI
  className = '', 
  placeholder = '', 
  rows = 6,
  maxLength = 5000,
  enabled = true,
  language = 'auto',
  debounceMs = 1000
}, ref) => {
  const { t } = useTranslation();
  const [spellingAnalysis, setSpellingAnalysis] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(null);
  const [checkingEnabled, setCheckingEnabled] = useState(true);
  const [checkTypes, setCheckTypes] = useState(['nonsense', 'spelling', 'grammar']); // Always check nonsense + spelling + grammar
  const [enableGrammarCheck, setEnableGrammarCheck] = useState(true);
  const textareaRef = useRef(null);
  const debounceRef = useRef(null);
  const overlayRef = useRef(null);
  const isApplyingSuggestionRef = useRef(false);

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

  // Update checkTypes based on enabled checks - ALWAYS include nonsense detection
  useEffect(() => {
    const activeCheckTypes = ['nonsense']; // Always check for nonsense
    if (enableGrammarCheck) {
      activeCheckTypes.push('spelling');
      activeCheckTypes.push('grammar');
    }
    setCheckTypes(activeCheckTypes);
  }, [enableGrammarCheck]);

  // Clear analysis when grammar check is disabled
  useEffect(() => {
    if (!enableGrammarCheck) {
      console.log('Grammar check disabled, clearing analysis');
      setSpellingAnalysis(null);
      setShowSuggestions(null);
    }
  }, [enableGrammarCheck]);

  // Check grammar only
  const checkText = useCallback(async (textToCheck) => {
    console.log('checkText called with:', { textToCheck, checkingEnabled, enableGrammarCheck });
    
    if (!textToCheck || textToCheck.trim().length === 0 || !checkingEnabled || !enableGrammarCheck) {
      console.log('Skipping check - no text or checking disabled');
      setSpellingAnalysis(null);
      return { 
        suggestions: [], 
        errors: [], 
        isNonsense: false, 
        detectedLanguage: 'en',
        overallQuality: 'good',
        hasErrors: false
      };
    }

    console.log('Starting text check with types:', checkTypes);
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
        console.log('Raw analysis from backend:', analysis);
        
        // Filter to only include grammar errors
        const filteredAnalysis = {
          ...analysis,
          suggestions: (analysis.errors || analysis.suggestions || []).filter(suggestion => {
            const suggestionType = suggestion.type || suggestion.category;
            // Only include grammar, grammatical and punctuation errors
            return suggestionType === 'grammar' || 
                   suggestionType === 'grammatical' ||
                   suggestionType === 'punctuation';
          })
        };
        
        console.log('Filtered analysis with suggestions:', filteredAnalysis);
        console.log('Number of suggestions:', filteredAnalysis.suggestions?.length || 0);
        
        // Auto-apply corrections if enabled
        if (autoApplyCorrections && filteredAnalysis.suggestions && filteredAnalysis.suggestions.length > 0) {
          console.log(`Auto-applying ${filteredAnalysis.suggestions.length} grammar corrections`);
          
          let correctedText = textToCheck;
          const corrections = [...filteredAnalysis.suggestions].sort((a, b) => b.start - a.start);
          
          for (const suggestion of corrections) {
            if (suggestion.start >= 0 && suggestion.end <= correctedText.length && suggestion.start < suggestion.end) {
              const before = correctedText.substring(0, suggestion.start);
              const after = correctedText.substring(suggestion.end);
              correctedText = before + suggestion.suggestion + after;
              console.log(`Auto-applied: "${suggestion.error}" → "${suggestion.suggestion}"`);
            }
          }
          
          if (correctedText !== textToCheck) {
            onTextChange(correctedText);
            // Don't show analysis UI when auto-applying
            setSpellingAnalysis(null);
            console.log('Grammar corrections auto-applied');
          }
        } else {
          // Mark that we're setting new analysis to prevent clearing
          isSettingAnalysisRef.current = true;
          setSpellingAnalysis(filteredAnalysis);
          console.log('SpellingAnalysis state updated');
        }
        
        // Notify parent of grammar check completion
        if (onGrammarCheckComplete) {
          onGrammarCheckComplete(filteredAnalysis);
        }
        
        // Return with hasErrors flag for Journal component
        return {
          ...filteredAnalysis,
          hasErrors: filteredAnalysis.suggestions && filteredAnalysis.suggestions.length > 0
        };
      } else {
        console.warn('Grammar check API returned unsuccessful response');
        return { 
          suggestions: [], 
          errors: [], 
          isNonsense: false, 
          detectedLanguage: 'en',
          overallQuality: 'good'
        };
      }
    } catch (error) {
      console.error('Error checking text:', error);
      setSpellingAnalysis(null);
      return { 
        suggestions: [], 
        errors: [], 
        isNonsense: false, 
        detectedLanguage: 'en',
        overallQuality: 'good',
        hasErrors: false
      };
    } finally {
      setIsChecking(false);
    }
  }, [getCurrentLanguage, checkingEnabled, checkTypes]);

  // Clear analysis when text changes externally (not from our suggestions or analysis setting)
  const lastTextRef = useRef(text);
  const isSettingAnalysisRef = useRef(false);
  
  useEffect(() => {
    // Only clear if text changed, we have analysis, and it's not from our suggestion or new analysis
    if (text !== lastTextRef.current && spellingAnalysis && !isApplyingSuggestionRef.current && !isSettingAnalysisRef.current) {
      console.log('Text changed externally, clearing stale analysis');
      setSpellingAnalysis(null);
      setShowSuggestions(null);
    }
    lastTextRef.current = text;
    // Reset flags after processing
    setTimeout(() => {
      isApplyingSuggestionRef.current = false;
      isSettingAnalysisRef.current = false;
    }, 200);
  }, [text, spellingAnalysis]);

  // Debounced effect for auto-checking is disabled - only manual checking on save
  useEffect(() => {
    // Auto-checking disabled - grammar check only on save
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Expose check function to parent components
  const performGrammarCheck = useCallback(async () => {
    console.log('External grammar check triggered for text:', text);
    setCheckingEnabled(true);
    const result = await checkText(text);
    console.log('performGrammarCheck result:', result);
    return result;
  }, [text, checkText]);

  // Make performGrammarCheck, checkText and textareaRef available to parent via ref
  useImperativeHandle(ref, () => ({
    performGrammarCheck,
    checkText: () => checkText(text),
    textareaRef: textareaRef
  }), [performGrammarCheck, checkText, text]);

  // Grammar checking only - no type toggling needed

  // Handle clicking on error suggestion
  const handleErrorClick = (error, index) => {
    setShowSuggestions(index);
  };

  // Apply suggestion
  const applySuggestion = (error) => {
    console.log('Applying suggestion:', {
      error: error,
      originalText: text,
      textLength: text.length,
      errorStart: error.start,
      errorEnd: error.end,
      errorText: text.substring(error.start, error.end),
      suggestion: error.suggestion
    });
    
    // Validate positions
    if (error.start < 0 || error.end > text.length || error.start >= error.end) {
      console.error('Invalid error positions:', error);
      setShowSuggestions(null);
      return;
    }
    
    let before = text.substring(0, error.start);
    let after = text.substring(error.end);
    let suggestion = error.suggestion;
    
    // Handle spacing issues - ensure proper spacing around the suggestion
    const originalError = text.substring(error.start, error.end);
    
    // Check if we need to preserve or add spaces
    const needsSpaceBefore = error.start > 0 && !before.endsWith(' ') && !suggestion.startsWith(' ') && text.charAt(error.start - 1) !== ' ';
    const needsSpaceAfter = error.end < text.length && !after.startsWith(' ') && !suggestion.endsWith(' ') && text.charAt(error.end) !== ' ';
    
    // If the original error had trailing/leading spaces, preserve them in the suggestion
    if (originalError.startsWith(' ') && !suggestion.startsWith(' ')) {
      suggestion = ' ' + suggestion;
    }
    if (originalError.endsWith(' ') && !suggestion.endsWith(' ')) {
      suggestion = suggestion + ' ';
    }
    
    // Add spaces if needed for word boundaries
    if (needsSpaceBefore && !suggestion.startsWith(' ')) {
      suggestion = ' ' + suggestion;
    }
    if (needsSpaceAfter && !suggestion.endsWith(' ')) {
      suggestion = suggestion + ' ';
    }
    
    const newText = before + suggestion + after;
    
    console.log('Text replacement with spacing:', {
      before: `"${before}"`,
      errorText: `"${originalError}"`,  
      suggestion: `"${suggestion}"`,
      after: `"${after}"`,
      newText: `"${newText}"`,
      needsSpaceBefore,
      needsSpaceAfter
    });
    
    // Clear analysis immediately to prevent showing stale overlay
    setSpellingAnalysis(null);
    setShowSuggestions(null);
    
    // Apply text change
    onTextChange(newText);
    
    // Notify parent that text has been updated via suggestion
    if (onTextUpdated) {
      onTextUpdated(newText);
    }
    
    // Mark that we applied a suggestion
    isApplyingSuggestionRef.current = true;
  };

  // Apply all suggestions at once
  const applyAllSuggestions = () => {
    if (!spellingAnalysis || !spellingAnalysis.suggestions || spellingAnalysis.suggestions.length === 0) {
      return;
    }

    let newText = text;
    const suggestions = [...spellingAnalysis.suggestions].sort((a, b) => b.start - a.start); // Apply from end to start to maintain positions

    console.log('Applying all suggestions:', suggestions);

    suggestions.forEach((error, index) => {
      console.log(`Applying suggestion ${index + 1}:`, {
        error,
        currentText: newText,
        errorText: newText.substring(error.start, error.end)
      });

      // Validate positions for current text
      if (error.start < 0 || error.end > newText.length || error.start >= error.end) {
        console.error('Invalid error positions for current text:', error);
        return;
      }

      let before = newText.substring(0, error.start);
      let after = newText.substring(error.end);
      let suggestion = error.suggestion;
      
      // Handle spacing issues
      const originalError = newText.substring(error.start, error.end);
      
      // Preserve original spacing
      if (originalError.startsWith(' ') && !suggestion.startsWith(' ')) {
        suggestion = ' ' + suggestion;
      }
      if (originalError.endsWith(' ') && !suggestion.endsWith(' ')) {
        suggestion = suggestion + ' ';
      }
      
      newText = before + suggestion + after;
    });

    console.log('Final text after all suggestions:', newText);
    
    // Clear analysis immediately to prevent showing stale overlay
    setSpellingAnalysis(null);
    setShowSuggestions(null);
    
    // Apply text change
    onTextChange(newText);
    
    // Notify parent that text has been updated via suggestions
    if (onTextUpdated) {
      onTextUpdated(newText);
    }
    
    // Mark that we applied suggestions
    isApplyingSuggestionRef.current = true;
  };

  // Dismiss suggestion
  const dismissSuggestion = () => {
    setShowSuggestions(null);
  };

  // Render text with error highlights
  const renderHighlightedText = () => {
    console.log('renderHighlightedText called with:', {
      hasSpellingAnalysis: !!spellingAnalysis,
      suggestions: spellingAnalysis?.suggestions,
      suggestionsLength: spellingAnalysis?.suggestions?.length || 0,
      textLength: text?.length || 0
    });
    
    if (!spellingAnalysis || !spellingAnalysis.suggestions || spellingAnalysis.suggestions.length === 0) {
      console.log('No suggestions to render');
      return null;
    }

    const parts = [];
    let lastIndex = 0;

    // Sort errors by start position
    const sortedErrors = [...spellingAnalysis.suggestions].sort((a, b) => a.start - b.start);
    
    // Validate that all error positions are still valid for current text
    console.log('Validating errors against current text:', {
      textLength: text.length,
      currentText: text,
      sortedErrors: sortedErrors
    });
    
    const validErrors = sortedErrors.map(error => {
      const textSlice = text.substring(error.start, error.end);
      let correctedError = { ...error };
      
      // Try to fix common position issues
      if (textSlice !== error.error && error.error) {
        console.log(`Position mismatch detected, attempting auto-fix:`, {
          expected: error.error,
          found: textSlice,
          start: error.start,
          end: error.end
        });
        
        // Try to find the error text in the vicinity
        const searchStart = Math.max(0, error.start - 10);
        const searchEnd = Math.min(text.length, error.end + 10);
        const searchArea = text.substring(searchStart, searchEnd);
        const errorIndex = searchArea.indexOf(error.error);
        
        if (errorIndex !== -1) {
          // Found the error text, update positions
          correctedError.start = searchStart + errorIndex;
          correctedError.end = correctedError.start + error.error.length;
          console.log(`Auto-corrected positions:`, {
            newStart: correctedError.start,
            newEnd: correctedError.end,
            newSlice: text.substring(correctedError.start, correctedError.end)
          });
        }
      }
      
      return correctedError;
    }).filter(error => {
      const textSlice = text.substring(error.start, error.end);
      const isValid = error.start >= 0 && 
        error.end <= text.length && 
        error.start < error.end &&
        textSlice === error.error;
      
      console.log(`Final error validation:`, {
        error: error.error,
        start: error.start,
        end: error.end,
        textSlice: textSlice,
        isValid: isValid
      });
      
      return isValid;
    });
    
    // If no valid errors remain, return null to clear the overlay
    if (validErrors.length === 0) {
      console.log('No valid errors remain for current text, clearing overlay');
      setTimeout(() => setSpellingAnalysis(null), 0);
      return null;
    }

    validErrors.forEach((error, index) => {
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

  // Render text with correction highlights (red highlights for applied corrections)
  const renderCorrectedText = () => {
    console.log('renderCorrectedText called with:', {
      appliedCorrections,
      appliedCorrectionsLength: appliedCorrections?.length || 0,
      showCorrectionHighlights,
      text: text?.substring(0, 50) + '...'
    });
    
    if (!appliedCorrections || appliedCorrections.length === 0) {
      console.log('No applied corrections to render');
      return null;
    }

    const parts = [];
    let lastIndex = 0;

    // Map corrections to their suggestion positions in the current text
    const correctionPositions = appliedCorrections.map((correction, index) => {
      console.log(`Processing correction ${index}:`, {
        error: correction.error,
        suggestion: correction.suggestion,
        currentText: text
      });
      
      // Find where the suggestion appears in the current text
      const suggestionStart = text.indexOf(correction.suggestion);
      console.log(`Looking for "${correction.suggestion}" in text, found at:`, suggestionStart);
      
      if (suggestionStart !== -1) {
        const result = {
          ...correction,
          start: suggestionStart,
          end: suggestionStart + correction.suggestion.length,
          correctedText: correction.suggestion
        };
        console.log('Mapped correction position:', result);
        return result;
      }
      
      // If suggestion not found, try to find where the correction was applied
      // by looking for missing error text
      console.log(`Suggestion "${correction.suggestion}" not found directly, checking for removal of error "${correction.error}"`);
      const errorStart = text.indexOf(correction.error);
      if (errorStart === -1) {
        console.log(`Error text "${correction.error}" was removed, marking whole text as corrected`);
        // The error was completely removed, highlight based on approximate position
        return {
          ...correction,
          start: Math.max(0, correction.start || 0),
          end: Math.min(text.length, (correction.start || 0) + 20), // Highlight ~20 chars
          correctedText: 'removed text'
        };
      }
      
      return null;
    }).filter(Boolean).sort((a, b) => a.start - b.start);

    // Remove overlapping corrections
    const validCorrections = [];
    correctionPositions.forEach(correction => {
      const hasOverlap = validCorrections.some(existing => 
        (correction.start < existing.end && correction.end > existing.start)
      );
      if (!hasOverlap) {
        validCorrections.push(correction);
      }
    });

    validCorrections.forEach((correction, index) => {
      // Add text before correction
      if (correction.start > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, correction.start)}
          </span>
        );
      }

      // Add corrected text with red highlight
      parts.push(
        <span
          key={`correction-${index}`}
          className="grammar-correction"
          title={`Gecorrigeerd: "${correction.error}" → "${correction.suggestion}"`}
        >
          {text.substring(correction.start, correction.end)}
        </span>
      );

      lastIndex = correction.end;
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

      {/* Grammar results info - only show when analysis exists and not auto-applying */}
      {spellingAnalysis && !autoApplyCorrections && (
        <div className="spelling-checker-controls">
          {spellingAnalysis.suggestions && spellingAnalysis.suggestions.length > 1 && (
            <button
              type="button"
              className="spelling-apply-all-btn"
              onClick={applyAllSuggestions}
              title={t('applyAllSuggestions', 'Apply all grammar suggestions')}
            >
              {t('applyAll', 'Apply All')} ({spellingAnalysis.suggestions.length})
            </button>
          )}
        </div>
      )}

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
          disabled={!enabled}
          readOnly={!enabled}
        />
        
        {/* Error highlighting overlay */}
        {spellingAnalysis && spellingAnalysis.suggestions.length > 0 && !autoApplyCorrections && (
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
        
        {/* Correction highlighting overlay */}
        {showCorrectionHighlights && appliedCorrections.length > 0 && (
          <div
            className="spelling-overlay correction-overlay"
            style={{
              height: textareaRef.current?.scrollHeight || 'auto'
            }}
          >
            <div className="spelling-highlight-text">
              {renderCorrectedText()}
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
});

SpellingChecker.displayName = 'SpellingChecker';

export default SpellingChecker;