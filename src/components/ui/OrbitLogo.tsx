export function OrbitLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="5.5" fill="url(#orbitCore)" />
      <ellipse
        cx="16"
        cy="16"
        rx="13"
        ry="5.5"
        transform="rotate(-28 16 16)"
        stroke="url(#orbitRing)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="25.5" cy="11" r="2.2" fill="#67e8f9" />
      <defs>
        <linearGradient id="orbitCore" x1="10" y1="10" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e9d5ff" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id="orbitRing" x1="3" y1="16" x2="29" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#67e8f9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function OrbitMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="5" fill="white" />
      <ellipse cx="16" cy="16" rx="12" ry="5" transform="rotate(-28 16 16)" stroke="white" strokeWidth="2" />
    </svg>
  );
}
