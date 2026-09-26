import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { MarkdownContent } from "./MarkdownContent";

interface TypewriterTextProps {
  text: string;
  stopRef?: MutableRefObject<boolean>;
  onComplete?: () => void;
  onProgress?: () => void;
  onStopped?: (partialText: string) => void;
}

const CHARS_PER_TICK = 2;
const TICK_MS = 16;

export function TypewriterText({
  text,
  stopRef,
  onComplete,
  onProgress,
  onStopped,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);
  const onStoppedRef = useRef(onStopped);

  onCompleteRef.current = onComplete;
  onProgressRef.current = onProgress;
  onStoppedRef.current = onStopped;

  useEffect(() => {
    let index = 0;
    setDisplayed("");

    const interval = window.setInterval(() => {
      if (stopRef?.current) {
        window.clearInterval(interval);
        const partial = text.slice(0, index);
        setDisplayed(partial);
        onStoppedRef.current?.(partial);
        return;
      }

      index = Math.min(index + CHARS_PER_TICK, text.length);
      setDisplayed(text.slice(0, index));
      onProgressRef.current?.();

      if (index >= text.length) {
        window.clearInterval(interval);
        onCompleteRef.current?.();
      }
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [text, stopRef]);

  return <MarkdownContent content={displayed} />;
}
