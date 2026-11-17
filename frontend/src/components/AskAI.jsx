import { useState } from 'react';

import { Button } from '../ui/Button.jsx';
import { Spinner, EmptyState } from '../ui/Feedback.jsx';

const SUGGESTED_QUESTIONS = [
  'Which emails need my attention?',
  'Summarize my recent conversations.',
  'Show pending replies.',
  'Which conversations are most important?',
];

function getMessageText(message) {
  if (typeof message === 'string') return message;

  return (
    message?.content ||
    message?.text ||
    message?.message ||
    ''
  );
}

function AskAI({
  messages = [],
  loading = false,
  onSend,
  placeholder = 'Ask anything about your inbox...',
}) {
  const [input, setInput] = useState('');

  const chatMessages = Array.isArray(messages)
    ? messages
    : [];

  function handleSend(value = input) {
    const message = value.trim();

    if (!message || loading || !onSend) return;

    onSend(message);
    setInput('');
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <section className="ask-ai">
      <div className="ask-ai-header">
        <div>
          <h3 className="ask-ai-title">Ask AI</h3>
          <p className="ask-ai-subtitle">
            Your intelligent inbox assistant
          </p>
        </div>

        <span className="ask-ai-badge">AI</span>
      </div>

      <div className="ask-ai-messages">
        {chatMessages.length === 0 && (
          <div className="ask-ai-empty">
            <EmptyState
              title="How can I help?"
              description="Ask questions about your emails, pending replies, and conversations."
            />

            <div className="ask-ai-suggestions">
              <span className="ask-ai-suggestions-title">
                Suggested questions
              </span>

              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  type="button"
                  className="ask-ai-suggestion"
                  key={question}
                  disabled={loading || !onSend}
                  onClick={() => handleSend(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((message, index) => {
          const text = getMessageText(message);

          const isUser =
            message?.role === 'user' ||
            message?.sender === 'user';

          return (
            <div
              className={
                isUser
                  ? 'ask-ai-message-row user'
                  : 'ask-ai-message-row assistant'
              }
              key={message?._id || message?.id || index}
            >
              <div className="ask-ai-message">
                <span className="ask-ai-message-label">
                  {isUser ? 'You' : 'AI Assistant'}
                </span>

                <p className="ask-ai-message-text">
                  {text}
                </p>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="ask-ai-loading">
            <Spinner />
            <span>AI is thinking...</span>
          </div>
        )}
      </div>

      <form
        className="ask-ai-input-area"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend();
        }}
      >
        <textarea
          className="ask-ai-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={2}
          disabled={loading}
        />

        <div className="ask-ai-input-footer">
          <span className="ask-ai-input-hint">
            Enter to send · Shift + Enter for new line
          </span>

          <Button
            type="submit"
            disabled={!input.trim() || loading || !onSend}
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </section>
  );
}

export default AskAI;