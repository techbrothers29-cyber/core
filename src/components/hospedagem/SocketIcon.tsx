import React from "react";

interface SocketIconProps {
  type: string;
  className?: string;
}

// Visual representation of common IEC socket types
const SocketIcon: React.FC<SocketIconProps> = ({ type, className = "h-16 w-16" }) => {
  const t = type.toLowerCase();

  const Frame = ({ children }: { children: React.ReactNode }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="56" height="56" rx="10" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2" />
      {children}
    </svg>
  );

  const hole = (cx: number, cy: number, r = 2.2, fill = "currentColor") => (
    <circle cx={cx} cy={cy} r={r} fill={fill} />
  );

  switch (t) {
    case "a": // Two flat parallel pins
      return (
        <Frame>
          <rect x="26" y="22" width="3" height="14" rx="1" fill="currentColor" />
          <rect x="35" y="22" width="3" height="14" rx="1" fill="currentColor" />
        </Frame>
      );
    case "b": // Two flat + round ground
      return (
        <Frame>
          <rect x="24" y="20" width="3" height="14" rx="1" fill="currentColor" />
          <rect x="37" y="20" width="3" height="14" rx="1" fill="currentColor" />
          {hole(32, 44, 3)}
        </Frame>
      );
    case "c": // Two round pins (Europlug)
      return (
        <Frame>
          {hole(26, 32, 3.5)}
          {hole(38, 32, 3.5)}
        </Frame>
      );
    case "d": // Three large round pins triangle (India)
      return (
        <Frame>
          {hole(32, 22, 3.5)}
          {hole(24, 40, 3.5)}
          {hole(40, 40, 3.5)}
        </Frame>
      );
    case "e": // Two round + male ground pin (France)
      return (
        <Frame>
          {hole(26, 36, 3.5)}
          {hole(38, 36, 3.5)}
          {hole(32, 22, 2.5)}
        </Frame>
      );
    case "f": // Schuko - two round with side clips
      return (
        <Frame>
          <circle cx="32" cy="32" r="14" stroke="currentColor" strokeWidth="1.5" fill="none" />
          {hole(26, 32, 3.5)}
          {hole(38, 32, 3.5)}
          <rect x="30" y="18" width="4" height="2" fill="currentColor" />
          <rect x="30" y="44" width="4" height="2" fill="currentColor" />
        </Frame>
      );
    case "g": // UK - 3 rectangular pins
      return (
        <Frame>
          <rect x="30" y="18" width="4" height="8" rx="1" fill="currentColor" />
          <rect x="20" y="36" width="8" height="3" rx="1" fill="currentColor" />
          <rect x="36" y="36" width="8" height="3" rx="1" fill="currentColor" />
        </Frame>
      );
    case "i": // AU - two angled flat + ground
      return (
        <Frame>
          <rect x="22" y="36" width="8" height="3" rx="1" transform="rotate(-30 26 37)" fill="currentColor" />
          <rect x="34" y="36" width="8" height="3" rx="1" transform="rotate(30 38 37)" fill="currentColor" />
          <rect x="30.5" y="22" width="3" height="8" rx="1" fill="currentColor" />
        </Frame>
      );
    case "j": // Swiss - 3 round pins
      return (
        <Frame>
          {hole(26, 36, 3)}
          {hole(38, 36, 3)}
          {hole(32, 24, 3)}
        </Frame>
      );
    case "k": // Danish - 3 round, smiley
      return (
        <Frame>
          {hole(26, 28, 3)}
          {hole(38, 28, 3)}
          {hole(32, 42, 3)}
        </Frame>
      );
    case "l": // Italian - 3 round in line
      return (
        <Frame>
          {hole(22, 32, 3)}
          {hole(32, 32, 3)}
          {hole(42, 32, 3)}
        </Frame>
      );
    case "m": // South African - 3 large round (like D but bigger)
      return (
        <Frame>
          {hole(32, 20, 4)}
          {hole(22, 40, 4)}
          {hole(42, 40, 4)}
        </Frame>
      );
    case "n": // Brazilian (NBR 14136) - 3 round in line, recessed
      return (
        <Frame>
          <circle cx="32" cy="32" r="14" stroke="currentColor" strokeWidth="1.5" fill="none" />
          {hole(25, 34, 3)}
          {hole(39, 34, 3)}
          {hole(32, 24, 3)}
        </Frame>
      );
    default:
      return (
        <Frame>
          <text x="32" y="38" textAnchor="middle" fontSize="18" fontWeight="bold" fill="currentColor">
            {type.toUpperCase()}
          </text>
        </Frame>
      );
  }
};

export default SocketIcon;
