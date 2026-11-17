import { useState } from 'react';

import { Button } from '../ui/Button.jsx';
import { Spinner } from '../ui/Feedback.jsx';

function getText(value) {
  if (typeof value === 'string') return value;

  if (typeof value === 'number') return String(value);

  if (value && typeof value === 'object') {
    return (
      value.text ||
      value.content ||
      value.summary ||
      value.description ||
      ''
    );
  }

  return '';
}

function getList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => getText(item))
    .filter(Boolean);
}

function AIPanel({
  summary = '',
  keyPoints = [],
  importantDates = [],
  reason = '',
  draftReply = '',
  loading = false,
  onGenerateDraft,
  onUseDraft,
  onRegenerateDraft,
}) {
  const [showDraft, setShowDraft] = useState(false);

  const summaryText = getText(summary);
  const reasonText = getText(reason);
  const draftText = getText(draftReply);

  const points = getList(keyPoints);
  const dates = getList(importantDates);

  return (
    <aside className="ai-panel">
      <div className="ai-panel-header">
        <div>
          <h3 className="ai-panel-title">AI Insights</h3>
          <p className="ai-panel-subtitle">
            Analysis of this conversation
          </p>
        </div>

        <span className="ai-panel-status">
          AI
        </span>
      </div>

      {loading ? (
        <div className="ai-panel-loading">
          <Spinner />
          <span>Analyzing conversation...</span>
        </div>
      ) : (
        <div className="ai-panel-content">
          <section className="ai-panel-section">
            <h4 className="ai-panel-section-title">
              Conversation Summary
            </h4>

            <div className="ai-summary-box">
              {summaryText || 'Summary is not available yet.'}
            </div>
          </section>

          {points.length > 0 && (
            <section className="ai-panel-section">
              <h4 className="ai-panel-section-title">
                Key Points
              </h4>

              <ul className="ai-panel-list">
                {points.map((point, index) => (
                  <li key={`${index}-${point}`}>
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {dates.length > 0 && (
            <section className="ai-panel-section">
              <h4 className="ai-panel-section-title">
                Important Dates
              </h4>

              <ul className="ai-panel-list">
                {dates.map((date, index) => (
                  <li key={`${index}-${date}`}>
                    {date}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="ai-panel-section">
            <h4 className="ai-panel-section-title">
              Why this label?
            </h4>

            <div className="ai-reason-box">
              {reasonText || 'No classification explanation available.'}
            </div>
          </section>

          <section className="ai-panel-section ai-draft-section">
            <div className="ai-draft-heading">
              <h4 className="ai-panel-section-title">
                Draft Reply
              </h4>

              {draftText && (
                <button
                  type="button"
                  className="ai-text-button"
                  onClick={() => setShowDraft((current) => !current)}
                >
                  {showDraft ? 'Hide' : 'Show'}
                </button>
              )}
            </div>

            {draftText && showDraft ? (
              <div className="ai-draft-content">
                {draftText}
              </div>
            ) : (
              <p className="ai-draft-description">
                Generate an AI-assisted reply for this conversation.
              </p>
            )}

            <div className="ai-draft-actions">
              {!draftText ? (
                <Button
                  type="button"
                  onClick={onGenerateDraft}
                  disabled={!onGenerateDraft}
                >
                  Generate Draft
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={onUseDraft}
                    disabled={!onUseDraft}
                  >
                    Use Draft
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onRegenerateDraft}
                    disabled={!onRegenerateDraft}
                  >
                    Regenerate
                  </Button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}

export default AIPanel;