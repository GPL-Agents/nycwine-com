// components/MapLink.jsx
// ─────────────────────────────────────────────────────────────
// Opens Google Maps (or Apple Maps on iOS) with the venue
// pre-loaded as a destination.
//
// Props:
//   name      – venue name, used to make the map search precise
//   address   – full address string
//   label     – optional text to show next to the pin icon
//               (e.g. neighborhood). When present, renders as
//               a "pin + label" row instead of icon-only.
//   className – optional extra class on the button
// ─────────────────────────────────────────────────────────────

export default function MapLink({ name, address, label, className = '' }) {
  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const query = encodeURIComponent(`${name} ${address}`);
    const isIOS =
      typeof navigator !== 'undefined' &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !window.MSStream;
    const url = isIOS
      ? `https://maps.apple.com/?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const pin = (
    <svg width="10" height="13" viewBox="0 0 11 14" fill="currentColor" aria-hidden="true">
      <path d="M5.5 0C2.46 0 0 2.46 0 5.5 0 9.35 5.5 14 5.5 14S11 9.35 11 5.5C11 2.46 8.54 0 5.5 0zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
    </svg>
  );

  if (label) {
    return (
      <button
        className={`map-link map-link--label ${className}`.trim()}
        onClick={handleClick}
        title="Get directions"
        aria-label={`Get directions to ${name} — ${label}`}
        type="button"
      >
        {pin}
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      className={`map-link ${className}`.trim()}
      onClick={handleClick}
      title="Get directions"
      aria-label={`Get directions to ${name}`}
      type="button"
    >
      {pin}
    </button>
  );
}
