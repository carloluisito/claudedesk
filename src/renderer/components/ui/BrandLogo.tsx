interface BrandLogoProps {
  size?: number;
  className?: string;
}

export function BrandLogo({ size = 20, className = '' }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="ClaudeDesk logo"
    >
      <text
        x="256"
        y="320"
        fontFamily="monospace"
        fontSize="280"
        fontWeight="bold"
        fill="#7aa2f7"
        textAnchor="middle"
      >
        C
      </text>
    </svg>
  );
}
