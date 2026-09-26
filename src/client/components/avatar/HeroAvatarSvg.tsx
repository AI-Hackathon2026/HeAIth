import { HERO_STYLES } from "../../constants/heroAvatar.constants";
import { buildHeroAvatarSvg, toHeroVisualLevel } from "../../utils/heroAvatarSvg";

interface HeroAvatarSvgProps {
  /** Game level 1–10 */
  level: number;
  /** Hero style index 0–2 */
  heroStyle?: number;
  size?: number;
  animate?: boolean;
  className?: string;
}

export function HeroAvatarSvg({
  level,
  heroStyle = 0,
  size = 110,
  animate = false,
  className = "",
}: HeroAvatarSvgProps) {
  const visualLevel = toHeroVisualLevel(level);
  const hero = HERO_STYLES[heroStyle] ? heroStyle : 0;
  const { inner, viewHeight } = buildHeroAvatarSvg(visualLevel, hero, size);

  const classes = [
    "hero-avatar-svg",
    animate ? "hero-avatar-svg--animate" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      className={classes}
      width={size}
      height={size}
      viewBox={`0 0 110 ${viewHeight}`}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
