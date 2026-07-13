export function SaturnLogo({ className = "h-7" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 200 200" className="h-full w-auto" aria-hidden="true">
        <rect width="200" height="200" rx="40" fill="#000000" />
        <path d="M148.193 52.5H52.5V148.193H148.193V52.5Z" fill="white" />
        <path
          d="M112.612 102.731L113.307 102.74C127.675 103.157 127.335 116.579 120.183 128.16L122.249 128.262C116.266 132.911 108.752 135.681 100.59 135.681C81.8765 135.681 66.5636 121.133 65.3379 102.731H112.612ZM100.59 65.0149C118.775 65.0151 133.75 78.7549 135.704 96.42H65.4746C67.4282 78.7548 82.4031 65.0149 100.59 65.0149Z"
          fill="#000000"
        />
        <path
          d="M127.448 117.163C127.448 125.128 120.99 131.586 113.024 131.586C105.059 131.586 98.6011 125.128 98.6011 117.163C98.6011 109.197 105.059 102.739 113.024 102.739C120.99 102.739 127.448 109.197 127.448 117.163Z"
          fill="#000000"
        />
        <path d="M66.7258 102.768H32.6748V107.897H66.7258V102.768Z" fill="#000000" />
        <path d="M134.248 91.3716H168.156V96.5008H134.248V91.3716Z" fill="#000000" />
      </svg>
      <span className="text-lg font-bold tracking-tight text-foreground">Saturn</span>
    </span>
  );
}
