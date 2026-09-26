import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  LEVEL_BADGES,
  LEVEL_COLORS,
  LEVEL_LABELS,
} from "../../constants/avatar.constants";
import { HERO_STYLES } from "../../constants/heroAvatar.constants";
import { toAvatarLevel } from "../../utils/avatarData";
import { HeroAvatarSvg } from "./HeroAvatarSvg";

interface LevelUpModalProps {
  newLevel: number;
  heroStyleId?: number;
  onClose: () => void;
}

export function LevelUpModal({
  newLevel,
  heroStyleId = 0,
  onClose,
}: LevelUpModalProps) {
  const avatarLevel = toAvatarLevel(newLevel);
  const hero = HERO_STYLES[heroStyleId] ?? HERO_STYLES[0];
  const color = LEVEL_COLORS[avatarLevel] ?? hero.accent;
  const label = LEVEL_LABELS[avatarLevel] ?? LEVEL_LABELS[1];
  const badges = LEVEL_BADGES[avatarLevel] ?? [];

  useEffect(() => {
    const timer = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div
      className="avatar-levelup-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-levelup-title"
      onClick={onClose}
    >
      <div
        className="avatar-levelup-content"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="avatar-levelup-eyebrow">Level Up!</p>

        <div className="avatar-levelup-figure">
          <HeroAvatarSvg
            level={avatarLevel}
            heroStyle={heroStyleId}
            size={140}
            animate
          />
        </div>

        <div className="avatar-levelup-text">
          <p
            id="avatar-levelup-title"
            className="avatar-levelup-title"
            style={{ color }}
          >
            Lv.{avatarLevel} {label}
          </p>
          <p className="avatar-levelup-sub">루틴을 꾸준히 실천한 결과예요!</p>
        </div>

        {badges.length > 0 && (
          <div className="avatar-levelup-badges">
            {badges.map((badge) => (
              <span
                key={badge}
                className="avatar-levelup-badge"
                style={{
                  background: `${color}20`,
                  borderColor: `${color}50`,
                  color,
                }}
              >
                🏅 {badge}
              </span>
            ))}
          </div>
        )}

        <p className="avatar-levelup-hint">화면을 탭하면 닫힙니다</p>
      </div>
    </div>,
    document.body,
  );
}
