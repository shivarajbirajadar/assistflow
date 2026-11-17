import { useState } from 'react';

import {
  ChevronDown,
  Check,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { classNames } from '../utils.js';


/* =========================================================
   CLASSIFICATION CONFIGURATION
========================================================= */

export const CLASSIFICATION_OPTIONS = [
  {
    value: 'assistant_to_reply',
    label: 'Assistant to Reply',
    className: 'classification-assistant',
  },
  {
    value: 'client_to_reply',
    label: 'Client to Reply',
    className: 'classification-client',
  },
  {
    value: 'no_reply_needed',
    label: 'No Reply Needed',
    className: 'classification-no-reply',
  },
  {
    value: 'needs_review',
    label: 'Needs Review',
    className: 'classification-review',
  },
  {
    value: 'action_required',
    label: 'Action Required',
    className: 'classification-action',
  },
  {
    value: 'waiting',
    label: 'Waiting',
    className: 'classification-waiting',
  },
  {
    value: 'meeting',
    label: 'Meeting',
    className: 'classification-meeting',
  },
  {
    value: 'important',
    label: 'Important',
    className: 'classification-important',
  },
  {
    value: 'general',
    label: 'General',
    className: 'classification-general',
  },
  {
    value: 'archived',
    label: 'Archived',
    className: 'classification-archived',
  },
];


const getClassification = (value) => {
  if (!value) {
    return null;
  }

  const normalizedValue = String(value)
    .trim()
    .toLowerCase()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');

  return CLASSIFICATION_OPTIONS.find(
    (option) =>
      option.value === normalizedValue ||
      option.label.toLowerCase() === String(value).toLowerCase()
  ) || {
    value: normalizedValue,
    label: String(value)
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase()),
    className: 'classification-general',
  };
};


/* =========================================================
   1. CLASSIFICATION CHIP
========================================================= */

export function ClassificationChip({
  label,
  confidence,
  source,
  showSource = false,
  className = '',
}) {
  const classification = getClassification(label);

  if (!classification) {
    return null;
  }

  const confidenceValue =
    typeof confidence === 'number'
      ? confidence <= 1
        ? Math.round(confidence * 100)
        : Math.round(confidence)
      : null;

  const confidenceText =
    confidenceValue !== null
      ? `AI confidence: ${confidenceValue}%`
      : '';

  const sourceText =
    source === 'manual'
      ? 'Manually classified'
      : source === 'ai'
        ? 'AI classified'
        : source === 'rule'
          ? 'Classified by rule'
          : '';

  return (
    <span
      className={classNames(
        'classification-chip',
        classification.className,
        className
      )}
      title={[
        confidenceText,
        sourceText,
      ].filter(Boolean).join(' · ') || undefined}
    >
      <span className="classification-dot" />

      <span className="classification-label">
        {classification.label}
      </span>

      {showSource && source === 'ai' && (
        <Sparkles
          size={12}
          aria-label="AI classified"
        />
      )}

      {showSource && source === 'manual' && (
        <UserRound
          size={12}
          aria-label="Manually classified"
        />
      )}
    </span>
  );
}


/* =========================================================
   2. CONFIDENCE INDICATOR
========================================================= */

export function ClassificationConfidence({
  confidence,
  className = '',
}) {
  if (typeof confidence !== 'number') {
    return null;
  }

  const percentage = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        confidence <= 1
          ? confidence * 100
          : confidence
      )
    )
  );

  const confidenceLevel =
    percentage >= 80
      ? 'high'
      : percentage >= 50
        ? 'medium'
        : 'low';

  const descriptions = {
    high: 'High confidence',
    medium: 'Medium confidence',
    low: 'Low confidence',
  };

  return (
    <span
      className={classNames(
        'classification-confidence',
        `confidence-${confidenceLevel}`,
        className
      )}
      title={`${descriptions[confidenceLevel]} · ${percentage}%`}
    >
      <span className="confidence-dot" />
      {percentage}% confidence
    </span>
  );
}


/* =========================================================
   3. CLASSIFICATION DROPDOWN
========================================================= */

export function ClassificationDropdown({
  value,
  onChange,
  options = CLASSIFICATION_OPTIONS,
  disabled = false,
  placeholder = 'Change classification',
  className = '',
}) {
  const [open, setOpen] = useState(false);

  const selected = getClassification(value);

  const handleSelect = (option) => {
    onChange?.(option.value);
    setOpen(false);
  };

  return (
    <div
      className={classNames(
        'classification-dropdown',
        className
      )}
    >
      <button
        type="button"
        className="classification-dropdown-trigger"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        <span>
          {selected?.label || placeholder}
        </span>

        <ChevronDown
          size={15}
          className={classNames(
            'classification-dropdown-chevron',
            open && 'is-open'
          )}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="classification-dropdown-backdrop"
            aria-label="Close classification menu"
            onClick={() => setOpen(false)}
          />

          <div
            className="classification-dropdown-menu"
            role="listbox"
            aria-label="Email classification"
          >
            {options.map((option) => {
              const isSelected =
                selected?.value === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={classNames(
                    'classification-dropdown-option',
                    isSelected && 'is-selected'
                  )}
                  onClick={() => handleSelect(option)}
                >
                  <ClassificationChip
                    label={option.value}
                  />

                  {isSelected && (
                    <Check
                      size={15}
                      className="classification-option-check"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}