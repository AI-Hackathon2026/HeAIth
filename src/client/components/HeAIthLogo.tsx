interface HeAIthLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function HeAIthLogo({ size = "md", className = "" }: HeAIthLogoProps) {
  return (
    <span className={`heaith-logo heaith-logo--${size} ${className}`.trim()}>
      <span className="heaith-logo-he">He</span>
      <span className="heaith-logo-ai">AI</span>
      <span className="heaith-logo-th">th</span>
    </span>
  );
}
