export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 3c1.8 9.5 7.5 15.2 17 17-9.5 1.8-15.2 7.5-17 17-1.8-9.5-7.5-15.2-17-17C12.5 18.2 18.2 12.5 20 3Z"
        fill="currentColor"
      />
      <circle cx="20" cy="20" r="3.4" fill="var(--brand-hole, #202b26)" />
    </svg>
  );
}
export function MiniOrb() {
  return (
    <svg
      className="hero-orb"
      viewBox="0 0 300 230"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="orbGlow">
          <stop stopColor="#e7f8b9" />
          <stop offset="1" stopColor="#c9e2a8" />
        </radialGradient>
      </defs>
      <ellipse cx="167" cy="204" rx="65" ry="9" fill="#66824d" opacity=".09" />
      <circle cx="166" cy="108" r="74" fill="url(#orbGlow)" />
      <ellipse
        cx="166"
        cy="108"
        rx="73"
        ry="27"
        transform="rotate(-30 166 108)"
        stroke="#739255"
        strokeWidth="1.2"
        opacity=".5"
      />
      <ellipse
        cx="166"
        cy="108"
        rx="72"
        ry="26"
        transform="rotate(30 166 108)"
        stroke="#739255"
        strokeWidth="1.2"
        opacity=".5"
      />
      <ellipse
        cx="166"
        cy="108"
        rx="29"
        ry="74"
        stroke="#739255"
        strokeWidth="1.2"
        opacity=".5"
      />
      <path
        d="m162 75 5 22 20 11-20 9-6 24-9-24-23-9 23-11 10-22Z"
        fill="#405932"
      />
      <g transform="translate(29 115) rotate(-12)">
        <rect width="65" height="49" rx="10" fill="#fffef8" stroke="#d7dfcd" />
        <rect x="10" y="11" width="21" height="6" rx="3" fill="#bfdda3" />
        <path
          d="M10 26h42M10 34h30"
          stroke="#91a183"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(214 26) rotate(10)">
        <rect width="58" height="43" rx="10" fill="#fffef8" stroke="#d7dfcd" />
        <path
          d="m15 21 8-8m-8 8 8 8m20-8-8-8m8 8-8 8"
          stroke="#81936e"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <circle cx="85" cy="48" r="4" fill="#758a54" />
      <circle cx="259" cy="151" r="3" fill="#758a54" />
      <path
        d="M65 67v12m-6-6h12M250 103v10m-5-5h10"
        stroke="#91a573"
        strokeWidth="1.5"
      />
      <path
        d="M81 100c-10-36 37-68 63-73M219 159c19 7 37 0 45-18"
        stroke="#a6b994"
        strokeDasharray="3 5"
      />
    </svg>
  );
}
