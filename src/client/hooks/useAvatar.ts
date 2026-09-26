import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { CharacterProgress } from "../types";
import { toAvatarData, type AvatarData } from "../utils/avatarData";
import { defaultCharacterProgress } from "../utils/avatarData";

export function useAvatar() {
  const [characterProgress, setCharacterProgress] = useState<CharacterProgress>(
    defaultCharacterProgress(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const progress = await api.getCharacterMe();
        if (!cancelled) setCharacterProgress(progress);
      } catch {
        if (!cancelled) setCharacterProgress(defaultCharacterProgress());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const avatar: AvatarData = toAvatarData(characterProgress);

  return { avatar, characterProgress, setCharacterProgress, loading };
}
