'use client';

/**
 * SocialGo brand logo components — inline SVG for crisp rendering at any size.
 * Variants: 'light' (dark text for light bg), 'dark' (white text for dark bg), 'auto' (uses CSS var).
 */

export function SocialGoWordmark({
  height = 32,
  variant = 'light',
}: {
  height?: number;
  variant?: 'light' | 'dark' | 'auto';
}) {
  const scale = height / 60;
  const w = Math.round(340 * scale);
  const textFill =
    variant === 'dark'
      ? '#FFFFFF'
      : variant === 'auto'
      ? 'var(--text-dark, #2A1F1A)'
      : '#2A1F1A';
  const uid = `go-${variant}-${height}`;

  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 340 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SocialGo"
    >
      <defs>
        <linearGradient
          id={uid}
          x1="258"
          y1="0"
          x2="330"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FF8FAD" />
          <stop offset="100%" stopColor="#FFBA8A" />
        </linearGradient>
      </defs>
      <rect x="2" y="3" width="22" height="22" rx="6" fill="#FF8FAD" opacity="0.85" />
      <rect x="13" y="13" width="22" height="22" rx="6" fill="#FFBA8A" opacity="0.8" />
      <rect x="24" y="23" width="22" height="22" rx="6" fill="#C4A1FF" opacity="0.75" />
      <path
        d="M34 14 C34 14, 18 10, 16 20 C14 30, 30 28, 32 36 C34 44, 20 46, 16 40"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M14 38 L16 40 L14 44"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <text
        x="60"
        y="42"
        fontFamily="Fraunces, Georgia, serif"
        fontWeight="700"
        fontSize="40"
        fill={textFill}
        letterSpacing="-3"
      >
        social
      </text>
      <text
        x="258"
        y="42"
        fontFamily="Fraunces, Georgia, serif"
        fontWeight="900"
        fontSize="40"
        fill={`url(#${uid})`}
        letterSpacing="-3"
      >
        go
      </text>
    </svg>
  );
}

export function SocialGoIsotipo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SocialGo icon"
    >
      <defs>
        <linearGradient
          id="sg-iso-shared"
          x1="0"
          y1="0"
          x2="120"
          y2="120"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FF8FAD" />
          <stop offset="50%" stopColor="#FFBA8A" />
          <stop offset="100%" stopColor="#C4A1FF" />
        </linearGradient>
      </defs>
      <rect x="14" y="10" width="38" height="38" rx="10" fill="#FF8FAD" opacity="0.6" />
      <rect x="34" y="28" width="38" height="38" rx="10" fill="#FFBA8A" opacity="0.55" />
      <rect x="54" y="46" width="38" height="38" rx="10" fill="#C4A1FF" opacity="0.5" />
      <path
        d="M76 36 C76 36, 48 28, 44 44 C40 60, 68 58, 72 72 C76 88, 50 94, 42 82"
        stroke="url(#sg-iso-shared)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M36 78 L42 82 L38 90"
        stroke="#FFBA8A"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="80" cy="32" r="4" fill="#FF8FAD" />
    </svg>
  );
}
