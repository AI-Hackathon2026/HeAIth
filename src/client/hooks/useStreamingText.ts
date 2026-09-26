import { useEffect, useRef, useState } from "react";

const BASE_DELAY_MS = 16;

function delayAfterChar(char: string): number {
  if (char === "\n") return 64;
  if (".!?".includes(char)) return 36;
  if (",;:".includes(char)) return 18;
  if (char === " ") return 8;
  return 0;
}

export function useStreamingText(
  fullText: string,
  enabled: boolean,
  onComplete?: () => void,
  onProgress?: () => void,
): { text: string; isComplete: boolean } {
  const [visibleLength, setVisibleLength] = useState(
    enabled ? 0 : fullText.length,
  );
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);

  onCompleteRef.current = onComplete;
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (!enabled) {
      setVisibleLength(fullText.length);
      return;
    }

    setVisibleLength(0);
    let index = 0;
    let cancelled = false;
    let timeoutId = 0;

    const tick = () => {
      if (cancelled) return;

      if (index >= fullText.length) {
        onCompleteRef.current?.();
        return;
      }

      index += 1;
      setVisibleLength(index);
      onProgressRef.current?.();

      const char = fullText[index - 1] ?? "";
      timeoutId = window.setTimeout(tick, BASE_DELAY_MS + delayAfterChar(char));
    };

    timeoutId = window.setTimeout(tick, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [fullText, enabled]);

  const text = fullText.slice(0, visibleLength);

  return {
    text,
    isComplete: !enabled || visibleLength >= fullText.length,
  };
}
