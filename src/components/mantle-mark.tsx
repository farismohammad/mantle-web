// The Mantle mark: a hooded M on a rounded tile. Colors come from CSS
// (--mark-tile, --mark-glyph) so dark surfaces can invert it.
export function MantleMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`mantle-mark ${className}`}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="8" className="mantle-mark-tile" />
      <g
        fill="none"
        className="mantle-mark-glyph"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M6 25.2C7.8 20 9.2 15.6 10.4 12.8L16 19.4l5.6-6.6c1.2 2.8 2.6 7.2 4.4 12.4"
          strokeWidth="3.4"
        />
        <path
          d="M13.2 13.2c-.3-3.9 1-6.4 2.8-7.2 1.8.8 3.1 3.3 2.8 7.2"
          strokeWidth="2.2"
        />
      </g>
    </svg>
  );
}
