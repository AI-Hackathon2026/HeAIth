import type { CSSProperties } from "react";

interface Props {
  size?: "xs" | "sm" | "md" | "lg";
  bpm?: number;
  className?: string;
}

export function HealthPulseMark({
  size = "md",
  bpm = 60,
  className = "",
}: Props) {
  const beatMs = 60000 / bpm;
  const style = {
    "--pulse-beat-ms": `${beatMs}ms`,
  } as CSSProperties;

  return (
    <div
      className={`health-pulse-mark health-pulse-mark--${size} ${className}`.trim()}
      style={style}
      aria-hidden
    >
      <div className="health-pulse-ripples">
        <span className="health-pulse-ripple" />
        <span className="health-pulse-ripple" />
        <span className="health-pulse-ripple" />
      </div>
      <div className="health-pulse-core">
        <span className="health-pulse-icon">+</span>
      </div>
    </div>
  );
}
