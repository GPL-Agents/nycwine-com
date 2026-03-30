// components/ConciergeModal.jsx
// ─────────────────────────────────────────────────────────────
// NYC Wine Concierge — guided chat widget.
//
// Each bot turn surfaces 4 choices. The 4th on the home screen is
// "Make me laugh" which cycles through wine jokes + lets the user
// rate each one with emoji reactions.
//
// State lives here; the parent (QuickNav) just passes onClose.
// Real Claude API wired through /api/concierge.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';

const GREETING = {
  role: 'bot',
  text: "Hi! I'm the NYC Wine Concierge 🍷 Your guide to wine bars, shops, events, and all things wine in New York City. How can I help you today?",
  options: [
    { label: 'Find me a wine bar',        silly: false              },
    { label: 'Recommend a wine shop',     silly: false              },
    { label: 'NYC wine events this week', silly: false              },
    { label: 'Make me laugh',             silly: false, isJoke: true },
  ],
};

// Emoji reactions the user can give to a joke
const JOKE_RATINGS = [
  { emoji: '😐', label: 'Not funny'    },
  { emoji: '🙂', label: 'Smiling'      },
  { emoji: '😄', label: 'Small laugh'  },
  { emoji: '🤣', label: 'ROFL'         },
];

export default function ConciergeModal({ onClose }) {
  const [messages, setMessages]     = useState([GREETING]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [jokeIndex, setJokeIndex]   = useState(0);
  // Map of message-index → rating emoji (for joke messages)
  const [ratings, setRatings]       = useState({});
  const bottomRef                   = useRef(null);
  const inputRef                    = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-focus input on open
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function sendMessage(text, opts = {}) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const { isSilly = false, isJoke = false } = opts;

    setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setLoading(true);

    // Capture current jokeIndex before any state update
    const currentJokeIndex = jokeIndex;
    if (isJoke) setJokeIndex(prev => prev + 1);

    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          isSilly,
          isJoke,
          jokeIndex: currentJokeIndex,
          history: messages,
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          role:          'bot',
          text:          data.reply,
          options:       data.options || [],
          isSillyDeadEnd:data.isSillyDeadEnd || false,
          isJoke:        data.isJoke || false,
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role:    'bot',
          text:    "Sorry, I'm having trouble connecting right now. Give me a moment and try again!",
          options: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  function rateJoke(msgIndex, emoji) {
    setRatings(prev => ({ ...prev, [msgIndex]: emoji }));
  }

  return (
    <div
      className="concierge-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="NYC Wine Concierge"
      onClick={onClose}
    >
      <div className="concierge-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="concierge-modal-header">
          <img
            src="/images/concierge-avatar.png"
            alt="Concierge"
            className="concierge-modal-avatar"
          />
          <div className="concierge-modal-title">
            <span className="concierge-modal-name">NYC Wine Concierge</span>
            <span className="concierge-modal-status">
              <span className="concierge-online-dot" />
              Online
            </span>
          </div>
          <button
            className="concierge-modal-close"
            onClick={onClose}
            aria-label="Close Concierge"
          >
            ✕
          </button>
        </div>

        {/* ── Message thread ───────────────────────────────────── */}
        <div className="concierge-messages">
          {messages.map((msg, i) => {
            const isLastBot = msg.role === 'bot' && i === messages.length - 1 && !loading;
            return (
              <div key={i} className={`concierge-row concierge-row-${msg.role}`}>
                {msg.role === 'bot' && (
                  <img
                    src="/images/concierge-avatar.png"
                    alt=""
                    className="concierge-row-avatar"
                  />
                )}
                <div className="concierge-row-inner">
                  <div className="concierge-bubble">{msg.text}</div>

                  {/* Joke rating bar — shown on every joke message */}
                  {msg.isJoke && (
                    <div className="concierge-joke-rating">
                      {JOKE_RATINGS.map(({ emoji, label }) => {
                        const picked = ratings[i] === emoji;
                        return (
                          <button
                            key={emoji}
                            className={`cjr-btn${picked ? ' cjr-picked' : ''}`}
                            onClick={() => rateJoke(i, emoji)}
                            title={label}
                            aria-label={label}
                            aria-pressed={picked}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                      {ratings[i] && (
                        <span className="cjr-thanks">
                          {ratings[i] === '🤣' ? 'Glad you loved it! 🍷' :
                           ratings[i] === '😄' ? 'Ha, we\'ll take it!'   :
                           ratings[i] === '🙂' ? 'A polite chuckle 😄'   :
                                                  'Tough crowd… 😬'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 4-option choices — latest bot message only */}
                  {msg.options && msg.options.length > 0 && isLastBot && (
                    <div className="concierge-choices">
                      {msg.options.map((opt, j) => (
                        <button
                          key={j}
                          className={`concierge-choice${opt.silly ? ' concierge-choice-silly' : ''}${opt.isJoke ? ' concierge-choice-joke' : ''}`}
                          onClick={() => sendMessage(opt.label, { isSilly: opt.silly, isJoke: opt.isJoke })}
                          disabled={loading}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Silly dead-end: nudge to restart */}
                  {msg.isSillyDeadEnd && isLastBot && !loading && (
                    <button
                      className="concierge-restart-btn"
                      onClick={() => setMessages([GREETING])}
                    >
                      ↩ Start over
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {loading && (
            <div className="concierge-row concierge-row-bot">
              <img
                src="/images/concierge-avatar.png"
                alt=""
                className="concierge-row-avatar"
              />
              <div className="concierge-row-inner">
                <div className="concierge-bubble concierge-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ───────────────────────────────────────── */}
        <form className="concierge-input-bar" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="concierge-input"
            placeholder="Or type your question…"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            autoComplete="off"
          />
          <button
            type="submit"
            className="concierge-send"
            disabled={!input.trim() || loading}
            aria-label="Send"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>

      </div>
    </div>
  );
}
