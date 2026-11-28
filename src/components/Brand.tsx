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
