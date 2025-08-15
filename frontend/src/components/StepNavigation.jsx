import React from 'react';
import { useTranslation } from 'react-i18next';

const StepNavigation = ({ 
  currentStep, 
  totalSteps, 
  onNext, 
  onPrev, 
  isCurrentStepValid,
  onSave,
  onGenerate,
  isGenerating 
}) => {
  const { t } = useTranslation();

  const isLastStep = currentStep === totalSteps;

  return (
    <div className="step-navigation">
      {/* Only show Generate button for final step - navigation via clickable step indicators */}
      {isLastStep && (
        <button
          className="generate-btn primary"
          onClick={onGenerate}
          disabled={!isCurrentStepValid || isGenerating}
        >
          {isGenerating ? t('generating', 'Genereren...') : `🎵 ${t('generateAudio', 'Audio Genereren')}`}
        </button>
      )}
    </div>
  );
};

export default StepNavigation;