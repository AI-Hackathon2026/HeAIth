import { useState } from "react";
import { AVATAR_MAX_LEVEL, LEVEL_COLORS } from "../../constants/avatar.constants";
import { HERO_STYLES } from "../../constants/heroAvatar.constants";
import type { AvatarData } from "../../utils/avatarData";
import { HeroAvatarPickerModal } from "./HeroAvatarPickerModal";
import { HeroAvatarSvg } from "./HeroAvatarSvg";

interface AvatarCardProps {
  avatar: AvatarData;
  routineSummary: string;
  difficulty: string;
  leveledUp?: boolean;
  onCharacterUpdated?: () => void;
}

export function AvatarCard({
  avatar,
  routineSummary,
  difficulty,
  leveledUp = false,
  onCharacterUpdated,
}: AvatarCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const hero = HERO_STYLES[avatar.heroStyleId] ?? HERO_STYLES[0];
  const color = LEVEL_COLORS[avatar.level] ?? hero.accent;

  return (
    <>
      <div className="avatar-card">
        <div className="avatar-card-visual">
          <button
            type="button"
            className="avatar-card-figure-btn"
            onClick={() => setPickerOpen(true)}
            aria-label="캐릭터 선택"
          >
            <HeroAvatarSvg
              level={avatar.level}
              heroStyle={avatar.heroStyleId}
              size={96}
              animate={leveledUp}
            />
          </button>
          <div
            className="avatar-card-difficulty"
            style={{
              background: `${color}22`,
              borderColor: `${color}66`,
              color,
            }}
          >
            {difficulty}
          </div>
          <button
            type="button"
            className="avatar-card-style-btn"
            style={{ color: hero.accent, borderColor: `${hero.accent}44` }}
            onClick={() => setPickerOpen(true)}
          >
            {hero.tabLabel}
          </button>
        </div>

        <div className="avatar-card-info">
          <div className="avatar-card-title-row">
            <span className="avatar-card-label">{avatar.label}</span>
            <span className="avatar-card-level">Lv.{avatar.level}</span>
          </div>

          <div className="avatar-card-xp">
            <div className="avatar-card-xp-header">
              <span>
                {avatar.level < AVATAR_MAX_LEVEL
                  ? "다음 레벨까지"
                  : "최고 레벨 달성"}
              </span>
              <span className="avatar-card-xp-value">
                {avatar.level < AVATAR_MAX_LEVEL
                  ? `${avatar.xpToNext.current} / ${avatar.xpToNext.required} XP`
                  : "MAX"}
              </span>
            </div>
            <div className="avatar-card-xp-track">
              <div
                className="avatar-card-xp-fill"
                style={{
                  width: `${avatar.xpToNext.percent}%`,
                  background: hero.accent,
                }}
              />
            </div>
          </div>

          {routineSummary && (
            <p className="avatar-card-summary">{routineSummary}</p>
          )}
        </div>
      </div>

      <HeroAvatarPickerModal
        open={pickerOpen}
        avatar={avatar}
        onClose={() => setPickerOpen(false)}
        onCharacterUpdated={onCharacterUpdated}
      />
    </>
  );
}
