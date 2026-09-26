import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import {
  heroStyleIdToKey,
  heroStyleKeyToId,
} from "../constants/heroAvatar.constants";
import type { CharacterProgress, HeroStyleKey } from "../types";

export function useHeroStyle(initialStyleId = 0) {
  const [heroStyle, setHeroStyleState] = useState(initialStyleId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHeroStyleState(initialStyleId);
  }, [initialStyleId]);

  const setHeroStyle = useCallback(async (id: number) => {
    const next = Math.min(2, Math.max(0, id));
    const previous = heroStyle;
    setHeroStyleState(next);
    setSaving(true);
    setError(null);

    try {
      const key = heroStyleIdToKey(next);
      await api.updateCharacterMe({ heroStyle: key });
    } catch (err) {
      setHeroStyleState(previous);
      setError(err instanceof Error ? err.message : "캐릭터 저장에 실패했습니다.");
      throw err;
    } finally {
      setSaving(false);
    }
  }, [heroStyle]);

  return { heroStyle, setHeroStyle, saving, error };
}

export function heroStyleFromProgress(progress: CharacterProgress | undefined): number {
  return heroStyleKeyToId(progress?.heroStyle);
}

export function applyHeroStyleToProgress(
  progress: CharacterProgress,
  key: HeroStyleKey,
): CharacterProgress {
  return { ...progress, heroStyle: key };
}
