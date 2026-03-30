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

// ── Joke randomiser helpers ──────────────────────────────────
// Total jokes in the API array — keep in sync with concierge.js
const JOKE_COUNT = 28;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Fresh random deck every time the modal is mounted
function freshShuffle() {
  return shuffle([...Array(JOKE_COUNT).keys()]);
}

// ── Simple markdown renderer ──────────────────────────────────
// Handles: **bold**, [text](url), bullet lines (•), newlines.
// Returns an array of React-renderable nodes.
function renderMarkdown(text) {
  if (!text) return null;
  const nodes = [];
  const lines = text.split('\n');
  lines.forEach((line, li) => {
    if (li > 0) nodes.push(<br key={`br${li}`} />);
    // Parse inline: **bold** and [label](href)
    const parts = [];
    const pattern = /(\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
    let last = 0, m;
    while ((m = pattern.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      if (m[0].startsWith('**')) {
        parts.push(<strong key={m.index}>{m[2]}</strong>);
      } else {
        const href  = m[4];
        const isExt = href.startsWith('http');
        parts.push(
          <a key={m.index} href={href}
             target={isExt ? '_blank' : undefined}
             rel={isExt ? 'noopener noreferrer' : undefined}
             style={{ color: 'var(--pink)', textDecoration: 'underline' }}
          >{m[3]}</a>
        );
      }
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    nodes.push(<span key={`l${li}`}>{parts}</span>);
  });
  return nodes;
}

const GREETING = {
  role: 'bot',
  text: "Hi! I'm the NYC Wine Concierge 🍷 Your guide to wine bars, shops, events, and all things wine in New York City. How can I help you today?",
  options: [
    { label: 'Find me a wine bar'                    },
    { label: 'Recommend a wine shop'                 },
    { label: 'NYC wine events this week'             },
    { label: 'Make me laugh',         isJoke: true   },
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
  // Shuffled joke deck — randomised fresh on every mount
  const [jokePos,   setJokePos]     = useState(0);
  const [jokeOrder, setJokeOrder]   = useState(freshShuffle);
  // Map of message-index → { emoji, totals }
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

    const { isJoke = false } = opts;

    setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setLoading(true);

    // Resolve which joke to show from the shuffled deck
    let resolvedJokeIdx = 0;
    if (isJoke) {
      resolvedJokeIdx = jokeOrder[jokePos];
      const nextPos   = jokePos + 1;

      if (nextPos >= jokeOrder.length) {
        // Deck exhausted — reshuffle, ensuring the new first ≠ the last shown
        let next = freshShuffle();
        while (next[0] === resolvedJokeIdx) next = freshShuffle();
        setJokeOrder(next);
        setJokePos(0);
      } else {
        setJokePos(nextPos);
      }
    }

    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          isJoke,
          jokeIndex: resolvedJokeIdx,
          // Send only role + text — keeps payload light, Claude doesn't need options arrays
          history: messages.map(m => ({ role: m.role, text: m.text })),
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
          jokeIdx:       typeof data.jokeIdx === 'number' ? data.jokeIdx : null,
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

  async function rateJoke(msgIndex, emoji, jokeIdx) {
    // Optimistically mark emoji chosen
    setRatings(prev => ({ ...prev, [msgIndex]: { emoji, totals: null } }));
    try {
      const res = await fetch('/api/joke-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jokeIdx, emoji }),
      });
      if (res.ok) {
        const totals = await res.json();
        setRatings(prev => ({ ...prev, [msgIndex]: { emoji, totals } }));
      }
    } catch { /* non-fatal */ }
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
                  <div className="concierge-bubble">{renderMarkdown(msg.text)}</div>

                  {/* Joke rating bar — shown on every joke message */}
                  {msg.isJoke && (
                    <div className="concierge-joke-rating">
                      {/* Emoji buttons — disabled once voted */}
                      <div className="cjr-buttons">
                        {JOKE_RATINGS.map(({ emoji, label }) => {
                          const voted  = !!ratings[i];
                          const picked = ratings[i]?.emoji === emoji;
                          return (
                            <button
                              key={emoji}
                              className={`cjr-btn${picked ? ' cjr-picked' : ''}${voted && !picked ? ' cjr-dim' : ''}`}
                              onClick={() => !voted && rateJoke(i, emoji, msg.jokeIdx)}
                              title={label}
                              aria-label={label}
                              aria-pressed={picked}
                              disabled={voted}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                        {!ratings[i] && (
                          <span className="cjr-prompt">Rate this joke</span>
                        )}
                      </div>

                      {/* Results — shown after voting */}
                      {ratings[i] && (() => {
                        const { emoji: myEmoji, totals } = ratings[i];
                        const quip =
                          myEmoji === '🤣' ? 'Glad you loved it! 🍷' :
                          myEmoji === '😄' ? "Ha, we'll take it!"     :
                          myEmoji === '🙂' ? 'A polite chuckle 😄'    :
                                             'Tough crowd… 😬';
                        const total = totals ? Object.values(totals).reduce((a,b)=>a+b,0) : 0;
                        return (
                          <div className="cjr-results">
                            <span className="cjr-quip">{quip}</span>
                            {totals && total > 0 && (
                              <div className="cjr-bars">
                                {JOKE_RATINGS.map(({ emoji }) => {
                                  const count = totals[emoji] || 0;
                                  const pct   = Math.round((count / total) * 100);
                                  return (
                                    <div key={emoji} className="cjr-bar-row">
                                      <span className="cjr-bar-emoji">{emoji}</span>
                                      <div className="cjr-bar-track">
                                        <div
                                          className="cjr-bar-fill"
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      <span className="cjr-bar-pct">{pct}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 4-option choices — latest bot message only */}
                  {msg.options && msg.options.length > 0 && isLastBot && (
                    <div className="concierge-choices">
                      {msg.options.map((opt, j) => (
                        <button
                          key={j}
                          className={`concierge-choice${opt.isJoke ? ' concierge-choice-joke' : ''}`}
                          onClick={() => sendMessage(opt.label, { isJoke: opt.isJoke })}
                          disabled={loading}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Start over button — shown on the last bot message if the conversation has gone deep */}
                  {isLastBot && messages.length > 3 && !loading && (
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
