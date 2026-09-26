import { useCallback, useEffect, useRef, useState } from "react";

export type RoutinePlanTab = "nutrition" | "workout";

const TABS: { id: RoutinePlanTab; label: string }[] = [
  { id: "nutrition", label: "영양 계획" },
  { id: "workout", label: "운동 계획" },
];

const HOLD_MS = 140;

interface Props {
  activeTab: RoutinePlanTab;
  onChange: (tab: RoutinePlanTab) => void;
  onDragRatioChange?: (ratio: number | null) => void;
}

export function RoutinePlanTabSlider({
  activeTab,
  onChange,
  onDragRatioChange,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const activeIndex = activeTab === "nutrition" ? 0 : 1;
  const thumbRatio = dragRatio ?? activeIndex;

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearHoldTimer(), [clearHoldTimer]);

  useEffect(() => {
    onDragRatioChange?.(dragging ? thumbRatio : null);
  }, [dragging, thumbRatio, onDragRatioChange]);

  function ratioFromClientX(clientX: number) {
    const track = trackRef.current;
    if (!track) return activeIndex;
    const rect = track.getBoundingClientRect();
    const segment = rect.width / 2;
    const x = clientX - rect.left - segment / 2;
    return Math.max(0, Math.min(1, x / segment));
  }

  function tabFromRatio(ratio: number): RoutinePlanTab {
    return ratio >= 0.5 ? "workout" : "nutrition";
  }

  function updateDragRatio(ratio: number) {
    setDragRatio(ratio);
  }

  function beginDrag(pointerId: number, target: HTMLElement) {
    setDragging(true);
    target.setPointerCapture(pointerId);
  }

  function onThumbPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    clearHoldTimer();
    const target = event.currentTarget;

    holdTimerRef.current = setTimeout(() => {
      beginDrag(event.pointerId, target);
      updateDragRatio(ratioFromClientX(event.clientX));
    }, HOLD_MS);
  }

  function onTrackPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest(".routine-view-tabs-thumb")) return;

    const ratio = ratioFromClientX(event.clientX);
    onChange(tabFromRatio(ratio));
  }

  function onThumbPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    updateDragRatio(ratioFromClientX(event.clientX));
  }

  function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    clearHoldTimer();

    if (dragging) {
      const ratio = ratioFromClientX(event.clientX);
      onChange(tabFromRatio(ratio));
      setDragging(false);
      setDragRatio(null);
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }

    setDragRatio(null);
  }

  function onThumbPointerCancel() {
    clearHoldTimer();
    setDragging(false);
    setDragRatio(null);
  }

  return (
    <div
      ref={trackRef}
      className={`routine-view-tabs routine-view-tabs--pill routine-view-tabs--slider${dragging ? " is-dragging" : ""}`}
      role="tablist"
      onPointerDown={onTrackPointerDown}
    >
      <div
        className="routine-view-tabs-thumb"
        role="presentation"
        style={{
          transform: `translateX(calc(${thumbRatio * 100}% + ${thumbRatio * 0.5}rem))`,
          transition: dragging ? "none" : undefined,
        }}
        onPointerDown={onThumbPointerDown}
        onPointerMove={onThumbPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={onThumbPointerCancel}
        aria-hidden
      />

      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          tabIndex={-1}
          aria-selected={activeTab === id}
          className={activeTab === id ? "active" : ""}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
