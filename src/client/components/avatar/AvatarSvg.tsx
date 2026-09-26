const AVATAR_PATHS: Record<number, string> = {
  1: `
    <ellipse cx="55" cy="112" rx="26" ry="3.5" fill="rgba(0,0,0,0.3)"/>
    <rect x="33" y="87" width="15" height="22" rx="7" fill="#1a6b8a"/>
    <rect x="52" y="87" width="15" height="22" rx="7" fill="#1a6b8a"/>
    <ellipse cx="55" cy="69" rx="24" ry="26" fill="#00c9a7"/>
    <ellipse cx="26" cy="70" rx="10" ry="9" fill="#00c9a7"/>
    <ellipse cx="84" cy="70" rx="10" ry="9" fill="#00c9a7"/>
    <rect x="47" y="40" width="16" height="9" rx="5" fill="#00b396"/>
    <ellipse cx="55" cy="31" rx="20" ry="20" fill="#7ec8e3"/>
    <ellipse cx="47" cy="30" rx="3" ry="2" fill="#0d1b2a"/>
    <ellipse cx="63" cy="30" rx="3" ry="2" fill="#0d1b2a"/>
    <path d="M46 40 Q55 37 64 40" stroke="#0d1b2a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="72" cy="18" rx="4" ry="5" fill="#5bc8e8" opacity="0.6"/>
  `,
  2: `
    <ellipse cx="55" cy="112" rx="23" ry="3" fill="rgba(0,0,0,0.3)"/>
    <rect x="36" y="88" width="13" height="22" rx="6" fill="#1a6b8a"/>
    <rect x="51" y="88" width="13" height="22" rx="6" fill="#1a6b8a"/>
    <ellipse cx="55" cy="68" rx="20" ry="23" fill="#00c9a7"/>
    <ellipse cx="29" cy="68" rx="9" ry="8" fill="#00c9a7"/>
    <ellipse cx="81" cy="68" rx="9" ry="8" fill="#00c9a7"/>
    <rect x="47" y="42" width="16" height="8" rx="4" fill="#00b396"/>
    <ellipse cx="55" cy="33" rx="17" ry="17" fill="#7ec8e3"/>
    <ellipse cx="48" cy="32" rx="2.5" ry="2.5" fill="#0d1b2a"/>
    <ellipse cx="62" cy="32" rx="2.5" ry="2.5" fill="#0d1b2a"/>
    <path d="M47 40 Q55 39 63 40" stroke="#0d1b2a" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,
  3: `
    <ellipse cx="55" cy="112" rx="20" ry="3" fill="rgba(0,0,0,0.3)"/>
    <rect x="38" y="88" width="12" height="23" rx="6" fill="#1a6b8a"/>
    <rect x="50" y="88" width="12" height="23" rx="6" fill="#1a6b8a"/>
    <ellipse cx="55" cy="68" rx="17" ry="20" fill="#00c9a7"/>
    <ellipse cx="32" cy="67" rx="8" ry="7" fill="#00c9a7"/>
    <ellipse cx="78" cy="67" rx="8" ry="7" fill="#00c9a7"/>
    <rect x="47" y="45" width="16" height="8" rx="4" fill="#00b396"/>
    <ellipse cx="55" cy="36" rx="15" ry="15" fill="#7ec8e3"/>
    <ellipse cx="49" cy="35" rx="2.5" ry="2.5" fill="#0d1b2a"/>
    <ellipse cx="61" cy="35" rx="2.5" ry="2.5" fill="#0d1b2a"/>
    <path d="M48 42 Q55 44 62 42" stroke="#0d1b2a" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,
  4: `
    <ellipse cx="55" cy="112" rx="17" ry="2.5" fill="rgba(0,0,0,0.3)"/>
    <rect x="40" y="89" width="11" height="23" rx="5" fill="#1a6b8a"/>
    <rect x="51" y="89" width="11" height="23" rx="5" fill="#1a6b8a"/>
    <path d="M34 85 L34 50 Q55 44 76 50 L76 85 Q55 89 34 85Z" fill="#00c9a7"/>
    <rect x="47" y="44" width="16" height="8" rx="4" fill="#00b396"/>
    <path d="M34 52 L20 68 Q19 74 25 75 L35 66Z" fill="#00c9a7"/>
    <path d="M76 52 L90 68 Q91 74 85 75 L75 66Z" fill="#00c9a7"/>
    <ellipse cx="55" cy="36" rx="14" ry="14" fill="#7ec8e3"/>
    <ellipse cx="49" cy="35" rx="2.5" ry="2.5" fill="#0d1b2a"/>
    <ellipse cx="61" cy="35" rx="2.5" ry="2.5" fill="#0d1b2a"/>
    <path d="M48 42 Q55 46 62 42" stroke="#0d1b2a" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,
  5: `
    <ellipse cx="55" cy="112" rx="16" ry="2.5" fill="rgba(0,0,0,0.3)"/>
    <rect x="40" y="89" width="11" height="23" rx="5" fill="#1565a0"/>
    <rect x="51" y="89" width="11" height="23" rx="5" fill="#1565a0"/>
    <path d="M32 85 L32 47 Q55 39 78 47 L78 85 Q55 90 32 85Z" fill="#00c9a7"/>
    <path d="M32 72 Q42 68 55 70 Q68 68 78 72" stroke="#00b396" stroke-width="2" fill="none"/>
    <rect x="46" y="39" width="18" height="10" rx="5" fill="#00b396"/>
    <path d="M32 49 L17 66 Q16 73 22 74 L33 63Z" fill="#00c9a7"/>
    <path d="M78 49 L93 66 Q94 73 88 74 L77 63Z" fill="#00c9a7"/>
    <ellipse cx="55" cy="30" rx="13" ry="13" fill="#7ec8e3"/>
    <ellipse cx="49" cy="29" rx="2.5" ry="2.5" fill="#0d1b2a"/>
    <ellipse cx="61" cy="29" rx="2.5" ry="2.5" fill="#0d1b2a"/>
    <path d="M48 36 Q55 40 62 36" stroke="#0d1b2a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="55" cy="30" r="16" fill="none" stroke="rgba(0,201,167,0.25)" stroke-width="2"/>
  `,
  6: `
    <ellipse cx="55" cy="112" rx="16" ry="2.5" fill="rgba(0,0,0,0.3)"/>
    <ellipse cx="55" cy="62" rx="34" ry="44" fill="rgba(0,201,167,0.07)"/>
    <rect x="40" y="89" width="11" height="23" rx="5" fill="#0d47a0"/>
    <rect x="51" y="89" width="11" height="23" rx="5" fill="#0d47a0"/>
    <path d="M30 85 L30 45 Q55 35 80 45 L80 85 Q55 91 30 85Z" fill="#00c9a7"/>
    <path d="M30 57 Q42 51 55 53 Q68 51 80 57" stroke="#00b396" stroke-width="1.5" fill="none"/>
    <path d="M30 67 Q42 62 55 64 Q68 62 80 67" stroke="#00b396" stroke-width="1.5" fill="none"/>
    <rect x="45" y="35" width="20" height="12" rx="6" fill="#00b396"/>
    <path d="M30 47 L14 65 Q13 73 20 74 L31 61Z" fill="#00c9a7"/>
    <path d="M80 47 L96 65 Q97 73 90 74 L79 61Z" fill="#00c9a7"/>
    <ellipse cx="17" cy="64" rx="7" ry="5" fill="#00b396"/>
    <ellipse cx="93" cy="64" rx="7" ry="5" fill="#00b396"/>
    <ellipse cx="55" cy="26" rx="13" ry="13" fill="#7ec8e3"/>
    <path d="M47 25 Q50 22 53 25" stroke="#0d1b2a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M57 25 Q60 22 63 25" stroke="#0d1b2a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M46 33 Q55 38 64 33" stroke="#0d1b2a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M44 13 L48 18 L55 10 L62 18 L66 13 L63 20 L47 20Z" fill="#f0c040"/>
    <circle cx="55" cy="26" r="16" fill="none" stroke="rgba(0,201,167,0.45)" stroke-width="2.5"/>
  `,
};

interface AvatarSvgProps {
  level: number;
  size?: number;
  animate?: boolean;
  className?: string;
}

export function AvatarSvg({
  level,
  size = 110,
  animate = false,
  className = "",
}: AvatarSvgProps) {
  const paths = AVATAR_PATHS[Math.min(6, Math.max(1, level))] ?? AVATAR_PATHS[1];
  const classes = ["avatar-svg", animate ? "avatar-svg--animate" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      className={classes}
      width={size}
      height={size}
      viewBox="0 0 110 115"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
}
