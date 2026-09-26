import { useEffect, useRef, useState, type ReactNode } from "react";

export const SCREEN_FADE_MS = 400;

type FadePhase = "in" | "out" | "steady";

interface ScreenTransitionProps {
  screenKey: string;
  children: ReactNode;
  className?: string;
}

export function ScreenTransition({
  screenKey,
  children,
  className = "",
}: ScreenTransitionProps) {
  const [phase, setPhase] = useState<FadePhase>("in");
  const [shownKey, setShownKey] = useState(screenKey);
  const lastSyncedChild = useRef(children);
  const pendingKey = useRef(screenKey);

  const transitioning = screenKey !== shownKey;
  if (!transitioning) {
    lastSyncedChild.current = children;
  }

  const displayChild = transitioning ? lastSyncedChild.current : children;

  useEffect(() => {
    const steadyTimer = window.setTimeout(() => setPhase("steady"), SCREEN_FADE_MS);
    return () => window.clearTimeout(steadyTimer);
  }, []);

  useEffect(() => {
    if (screenKey === shownKey) {
      setPhase("steady");
      return;
    }

    pendingKey.current = screenKey;
    setPhase("out");

    const outTimer = window.setTimeout(() => {
      setShownKey(pendingKey.current);
      setPhase("in");
      window.setTimeout(() => setPhase("steady"), SCREEN_FADE_MS);
    }, SCREEN_FADE_MS);

    return () => window.clearTimeout(outTimer);
  }, [screenKey, shownKey]);

  return (
    <div
      className={`screen-transition screen-transition--${phase}${className ? ` ${className}` : ""}`}
    >
      {displayChild}
    </div>
  );
}
