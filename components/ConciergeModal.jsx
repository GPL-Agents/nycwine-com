// components/ConciergeModal.jsx
// ─────────────────────────────────────────────────────────────
// NYC Wine Concierge — guided chat widget.
//
// Each bot turn surfaces 4 choices (the 4th is always a silly wildcard).
// Users can also type freely into the input at the bottom.
//
// State lives here; the parent (QuickNav) just passes onClose.
// The real Claude API is wired through /api/concierge — swap the
// mock logic there for production.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';

const GREETING = {
  role: 'bot',
  text: "Hi! I'm the NYC Wine Concierge 🍷 Your guide to wine bars, shops, events, and all things wine in New York City. How can I help you today?",
  options: [
    { label: 'Find me a wine bar',            silly: false },
    { label: 'Recommend a wine shop',          silly: false },
    { label: 'NYC wine events this week',      silly: false },
    { label: '🦆 [SILLY OPTION PLACEHOLDER]',  silly: true  },
  ],
};

export default function ConciergeModal({ onClose }) {
  const [messages, setMessages]   = useState([GREETING]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when modal opens
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // Append user message
    const userMsg = { role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages,
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: 'bot', text: data.reply, options: data.options || [] },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          text: "Sorry, I'm having trouble connecting right now. Give me a moment and try again!",
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

  return (
    /* Overlay — click outside to close */
    <div
      className="concierge-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="NYC Wine Concierge"
      onClick={onClose}
    >
      <div className="concierge-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ─────────────────────────────────────────── */}
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

        {/* ── Message thread ─────────────────────────────────── */}
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

                  {/* 4-option choices — only shown on the latest bot message */}
                  {msg.options && msg.options.length > 0 && isLastBot && (
                    <div className="concierge-choices">
                      {msg.options.map((opt, j) => (
                        <button
                          key={j}
                          className={`concierge-choice${opt.silly ? ' concierge-choice-silly' : ''}`}
                          onClick={() => sendMessage(opt.label)}
                          disabled={loading}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
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

        {/* ── Input bar ──────────────────────────────────────── */}
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
