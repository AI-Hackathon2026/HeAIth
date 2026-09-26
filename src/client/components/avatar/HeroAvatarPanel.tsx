import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import {
  HERO_LEVEL_NAMES,
  HERO_STYLES,
  HERO_XP_THRESHOLDS,
} from "../../constants/heroAvatar.constants";
import { toHeroVisualLevel } from "../../utils/heroAvatarSvg";
import { HeroAvatarSvg } from "./HeroAvatarSvg";

interface HeroAvatarPanelProps {
  /** Current game level from progress (1–10) */
  gameLevel: number;
  heroStyle: number;
  onHeroStyleChange: (id: number) => void;
  /** XP within current level for progress bar */
  xpCurrent?: number;
  xpRequired?: number;
}

export function HeroAvatarPanel({
  gameLevel,
  heroStyle,
  onHeroStyleChange,
  xpCurrent,
  xpRequired,
}: HeroAvatarPanelProps) {
  const [previewLevel, setPreviewLevel] = useState(toHeroVisualLevel(gameLevel));
  const hero = HERO_STYLES[heroStyle] ?? HERO_STYLES[0];

  useEffect(() => {
    setPreviewLevel(toHeroVisualLevel(gameLevel));
  }, [gameLevel]);

  const displayLevel = previewLevel;
  const levelLabel = HERO_LEVEL_NAMES[displayLevel + 1] ?? "";

  const xpCurr = HERO_XP_THRESHOLDS[displayLevel] ?? 0;
  const xpNext =
    displayLevel < 9
      ? (HERO_XP_THRESHOLDS[displayLevel + 1] ?? xpCurr + 200)
      : xpCurr + 200;

  const useLiveXp = displayLevel === toHeroVisualLevel(gameLevel);
  const barPct =
    displayLevel >= 9
      ? 100
      : useLiveXp && xpRequired && xpRequired > 0
        ? Math.min(100, Math.round(((xpCurrent ?? 0) / xpRequired) * 100))
        : Math.min(100, Math.round((xpCurr / xpNext) * 100));

  const xpText =
    displayLevel >= 9
      ? "MAX LEVEL"
      : useLiveXp && xpRequired
        ? `${xpCurrent ?? 0} / ${xpRequired} XP`
        : `${xpCurr} / ${xpNext} XP`;

  return (
    <div className="hero-avatar-panel">
      <p className="hero-avatar-section-label">캐릭터 선택</p>

      <div className="hero-avatar-tabs" role="tablist" aria-label="캐릭터 스타일">
        {HERO_STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            role="tab"
            aria-selected={heroStyle === style.id}
            className={`hero-avatar-tab${heroStyle === style.id ? " active" : ""}`}
            style={{ "--hero-color": style.accent } as CSSProperties}
            onClick={() => {
              onHeroStyleChange(style.id);
              setPreviewLevel(0);
            }}
          >
            {style.tabLabel}
          </button>
        ))}
      </div>

      <p className="hero-avatar-section-label">레벨 선택 (클릭)</p>
      <div className="hero-avatar-grid">
        {Array.from({ length: 10 }, (_, lv) => (
          <button
            key={lv}
            type="button"
            className={`hero-avatar-grid-item${displayLevel === lv ? " selected" : ""}`}
            style={{ "--hero-color": hero.accent } as CSSProperties}
            onClick={() => setPreviewLevel(lv)}
          >
            <HeroAvatarSvg level={lv + 1} heroStyle={heroStyle} size={64} />
            <span
              className="hero-avatar-grid-label"
              style={{ color: displayLevel === lv ? hero.accent : undefined }}
            >
              Lv.{lv + 1}
            </span>
            <span className="hero-avatar-grid-sub">
              {HERO_LEVEL_NAMES[lv + 1]}
            </span>
          </button>
        ))}
      </div>

      <p className="hero-avatar-section-label">미리보기</p>
      <div className="hero-avatar-demo">
        <div className="hero-avatar-demo-figure">
          <HeroAvatarSvg
            level={displayLevel + 1}
            heroStyle={heroStyle}
            size={130}
          />
        </div>

        <div className="hero-avatar-lv-controls">
          <button
            type="button"
            className="hero-avatar-lv-btn"
            style={{ borderColor: hero.accent, color: hero.accent }}
            disabled={displayLevel === 0}
            onClick={() => setPreviewLevel((lv) => Math.max(0, lv - 1))}
            aria-label="이전 레벨"
          >
            −
          </button>
          <span
            className="hero-avatar-lv-name"
            style={{ color: hero.accent }}
          >
            Lv.{displayLevel + 1} {levelLabel}
          </span>
          <button
            type="button"
            className="hero-avatar-lv-btn"
            style={{ borderColor: hero.accent, color: hero.accent }}
            disabled={displayLevel === 9}
            onClick={() => setPreviewLevel((lv) => Math.min(9, lv + 1))}
            aria-label="다음 레벨"
          >
            +
          </button>
        </div>

        <div className="hero-avatar-xp-row">
          <div className="hero-avatar-xp-bar-bg">
            <div
              className="hero-avatar-xp-bar-fill"
              style={{ width: `${barPct}%`, background: hero.accent }}
            />
          </div>
          <div className="hero-avatar-xp-text">{xpText}</div>
        </div>
      </div>
    </div>
  );
}
