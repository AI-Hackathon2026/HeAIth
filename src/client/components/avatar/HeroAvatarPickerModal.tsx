import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useHeroStyle } from "../../hooks/useHeroStyle";
import type { AvatarData } from "../../utils/avatarData";
import { HeroAvatarPanel } from "./HeroAvatarPanel";

interface HeroAvatarPickerModalProps {
  open: boolean;
  avatar: AvatarData;
  onClose: () => void;
  onCharacterUpdated?: () => void;
}

export function HeroAvatarPickerModal({
  open,
  avatar,
  onClose,
  onCharacterUpdated,
}: HeroAvatarPickerModalProps) {
  const { heroStyle, setHeroStyle, saving, error } = useHeroStyle(avatar.heroStyleId);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  async function handleHeroStyleChange(id: number) {
    try {
      await setHeroStyle(id);
      onCharacterUpdated?.();
    } catch {
      // error state shown in panel footer
    }
  }

  return createPortal(
    <div
      className="modal-backdrop hero-avatar-picker-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-card hero-avatar-picker-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hero-avatar-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="hero-avatar-picker-title" className="modal-title">
            나의 히어로 캐릭터
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <HeroAvatarPanel
          gameLevel={avatar.level}
          heroStyle={heroStyle}
          onHeroStyleChange={(id) => void handleHeroStyleChange(id)}
          xpCurrent={avatar.xpToNext.current}
          xpRequired={avatar.xpToNext.required}
        />
        <div className="hero-avatar-picker-footer">
          {error && <p className="hero-avatar-picker-error">{error}</p>}
          {saving && (
            <p className="hero-avatar-picker-saving">캐릭터 저장 중...</p>
          )}
          <button type="button" className="primary-btn" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
