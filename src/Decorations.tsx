import React from "react";

/**
 * 8-Point Compass Star from Image 2 top-left brand header
 */
export function CompassStar({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="currentColor"
      className={`compass-star ${className}`}
      aria-hidden="true"
    >
      <polygon points="20,2 23,17 38,20 23,23 20,38 17,23 2,20 17,17" />
      <polygon
        points="20,9 22,18 29,20 22,22 20,29 18,22 11,20 18,18"
        opacity="0.35"
      />
      <circle cx="20" cy="20" r="1.6" fill="#f4eee1" />
    </svg>
  );
}

/**
 * Double-ring circular postal cancel stamp with "GOOD IDEAS TAKE TIME" & wavy cancel lines
 */
export function PostmarkStamp({ className = "" }: { className?: string }) {
  return (
    <div className={`postmark-stamp ${className}`} aria-hidden="true">
      <svg
        width="160"
        height="95"
        viewBox="0 0 160 95"
        fill="none"
        stroke="currentColor"
      >
        {/* Outer dashed/solid circle */}
        <circle
          cx="46"
          cy="47"
          r="40"
          strokeWidth="1.5"
          strokeDasharray="4 2.5"
        />
        <circle cx="46" cy="47" r="35" strokeWidth="0.8" />
        {/* Circular text path */}
        <defs>
          <path
            id="stampPath"
            d="M 46,47 m -28,0 a 28,28 0 1,1 56,0 a 28,28 0 1,1 -56,0"
          />
        </defs>
        <text
          fontSize="6.8"
          letterSpacing="1.8"
          fill="currentColor"
          fontWeight="600"
          fontFamily="'Plus Jakarta Sans', Georgia, sans-serif"
        >
          <textPath href="#stampPath" startOffset="6%">
            GOOD IDEAS TAKE TIME ✦ EST. 2024 ✦
          </textPath>
        </text>
        <circle cx="46" cy="47" r="4" fill="currentColor" opacity="0.18" />
        <circle cx="46" cy="47" r="1.6" fill="currentColor" />

        {/* 3 Wavy cancellation lines extending to right */}
        <path
          d="M 88,32 Q 100,25 112,32 T 134,32 T 156,32"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M 88,47 Q 100,40 112,47 T 134,47 T 156,47"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M 88,62 Q 100,55 112,62 T 134,62 T 156,62"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/**
 * Delicate pressed botanical wildflower sprig with dried nodes & leaves
 */
export function BotanicalSprig({ className = "" }: { className?: string }) {
  return (
    <svg
      width="72"
      height="195"
      viewBox="0 0 72 195"
      fill="currentColor"
      className={`botanical-sprig ${className}`}
      aria-hidden="true"
    >
      <path
        d="M 36,190 Q 37,130 34,85 Q 32,50 36,8"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      {/* Flower buds at top */}
      <circle cx="36" cy="9" r="3.8" />
      <circle cx="30" cy="14" r="3.2" />
      <circle cx="42" cy="13" r="3.4" />
      <circle cx="36" cy="21" r="2.8" />

      {/* Upper branch left */}
      <path
        d="M 35,40 Q 24,32 17,28"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <ellipse cx="16" cy="27" rx="4.5" ry="2.8" transform="rotate(-30 16 27)" />
      <ellipse cx="25" cy="35" rx="4" ry="2.4" transform="rotate(-25 25 35)" />

      {/* Upper branch right */}
      <path
        d="M 34,56 Q 44,50 54,46"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <ellipse cx="55" cy="45" rx="5" ry="3" transform="rotate(25 55 45)" />
      <ellipse cx="44" cy="52" rx="4" ry="2.4" transform="rotate(20 44 52)" />

      {/* Mid branch left */}
      <path
        d="M 33,84 Q 21,78 12,73"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <ellipse cx="11" cy="72" rx="5.5" ry="3.2" transform="rotate(-25 11 72)" />
      <ellipse cx="22" cy="80" rx="4.5" ry="2.8" transform="rotate(-20 22 80)" />

      {/* Mid branch right */}
      <path
        d="M 34,106 Q 46,101 59,95"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <ellipse cx="60" cy="94" rx="6" ry="3.4" transform="rotate(25 60 94)" />
      <ellipse cx="47" cy="102" rx="4.5" ry="2.8" transform="rotate(20 47 102)" />

      {/* Lower branch left */}
      <path
        d="M 35,134 Q 23,130 14,126"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <ellipse cx="13" cy="125" rx="6" ry="3.4" transform="rotate(-20 13 125)" />
      <ellipse cx="24" cy="131" rx="4.5" ry="2.8" transform="rotate(-15 24 131)" />

      {/* Lower branch right */}
      <path
        d="M 36,160 Q 45,157 56,153"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <ellipse cx="57" cy="152" rx="5.5" ry="3.2" transform="rotate(20 57 152)" />
    </svg>
  );
}

/**
 * Semi-transparent kraft washi tape strip
 */
export function WashiTape({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`washi-tape ${className}`} style={style} aria-hidden="true">
      <span className="washi-tape-tear left" />
      <span className="washi-tape-body" />
      <span className="washi-tape-tear right" />
    </div>
  );
}

/**
 * Pinned torn paper memo scrap with typewriter text
 */
export function TornMemoScrap({ className = "" }: { className?: string }) {
  return (
    <div className={`torn-memo-scrap ${className}`} aria-hidden="true">
      <div className="memo-pin">
        <span className="pin-head" />
        <span className="pin-shadow" />
      </div>
      <div className="memo-content">
        <span>Build</span>
        <span>Create</span>
        <span>Explore</span>
        <span>Repeat</span>
        <span className="memo-dots">···</span>
      </div>
    </div>
  );
}

/**
 * Detailed vintage architectural/studio line-art engraving
 */
export function StudioEngraving({ className = "" }: { className?: string }) {
  return (
    <div className={`studio-engraving-wrap ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 120 180"
        fill="none"
        stroke="currentColor"
        className="studio-engraving"
      >
        <line x1="15" y1="172" x2="105" y2="172" strokeWidth="1.5" />
        <line x1="22" y1="168" x2="98" y2="168" strokeWidth="1.2" />
        <line x1="28" y1="164" x2="92" y2="164" strokeWidth="1" />

        <rect x="32" y="148" width="56" height="16" strokeWidth="1.2" fill="none" />
        <line x1="32" y1="153" x2="88" y2="153" strokeWidth="0.8" />

        <rect x="36" y="90" width="48" height="58" strokeWidth="1.2" />
        <path
          d="M 52,148 L 52,126 Q 60,118 68,126 L 68,148 Z"
          strokeWidth="1"
          fill="currentColor"
          fillOpacity="0.12"
        />

        <rect
          x="30"
          y="86"
          width="60"
          height="4"
          strokeWidth="1"
          fill="currentColor"
          fillOpacity="0.2"
        />
        <line x1="30" y1="84" x2="90" y2="84" strokeWidth="0.8" />

        <rect x="42" y="52" width="36" height="32" strokeWidth="1" />
        <path d="M 54,76 L 54,64 Q 60,58 66,64 L 66,76 Z" strokeWidth="0.8" />
        <line
          x1="42"
          y1="62"
          x2="78"
          y2="62"
          strokeWidth="0.6"
          strokeDasharray="1 2"
        />

        <rect x="38" y="48" width="44" height="4" strokeWidth="1" />

        <rect x="46" y="28" width="28" height="20" strokeWidth="0.9" />
        <circle cx="60" cy="38" r="5" strokeWidth="0.8" />
        <line x1="60" y1="38" x2="60" y2="35" strokeWidth="0.7" />
        <line x1="60" y1="38" x2="62" y2="38" strokeWidth="0.7" />

        <path
          d="M 44,28 Q 60,8 60,4 Q 60,8 76,28 Z"
          strokeWidth="1"
          fill="currentColor"
          fillOpacity="0.08"
        />
        <line x1="60" y1="4" x2="60" y2="0" strokeWidth="1.2" />
        <circle cx="60" cy="0" r="1.5" fill="currentColor" />

        <line x1="38" y1="94" x2="38" y2="146" strokeWidth="0.6" />
        <line
          x1="42"
          y1="94"
          x2="42"
          y2="146"
          strokeWidth="0.6"
          strokeDasharray="2 2"
        />
        <line
          x1="78"
          y1="94"
          x2="78"
          y2="146"
          strokeWidth="0.6"
          strokeDasharray="2 2"
        />
        <line x1="82" y1="94" x2="82" y2="146" strokeWidth="0.6" />

        <path
          d="M 18,40 Q 24,36 30,40"
          strokeWidth="0.6"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M 90,34 Q 96,30 102,34"
          strokeWidth="0.6"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}

/**
 * Clean SVG icons for Instagram, Facebook, and Mail
 */
export function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function MailIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
