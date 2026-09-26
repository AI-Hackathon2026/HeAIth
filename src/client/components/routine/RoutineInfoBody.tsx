import { useState } from "react";
import type { RoutineInfo, RoutineInfoItem } from "../../types";

function SectionLabel({
  emoji,
  label,
  color,
}: {
  emoji: string;
  label: string;
  color?: string;
}) {
  return (
    <p
      className="routine-info-section-label"
      style={color ? { color } : undefined}
    >
      {emoji} {label}
    </p>
  );
}

function Divider() {
  return <div className="routine-info-divider" role="separator" />;
}

function Chip({
  name,
  tooltip,
  dotColor,
}: {
  name: string;
  tooltip: string;
  dotColor: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="routine-info-chip-wrap">
      <button
        type="button"
        className="routine-info-chip"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onTouchStart={(event) => {
          event.preventDefault();
          setShow((value) => !value);
        }}
      >
        <span
          className="routine-info-chip-dot"
          style={{ background: dotColor }}
          aria-hidden
        />
        {name}
      </button>

      {show && tooltip && (
        <div className="routine-info-chip-tooltip" role="tooltip">
          {tooltip}
          <span className="routine-info-chip-tooltip-arrow" aria-hidden />
        </div>
      )}
    </div>
  );
}

function ChipRow({
  items,
  dotColor,
}: {
  items: RoutineInfoItem[];
  dotColor: string;
}) {
  return (
    <div className="routine-info-chip-row">
      {items.map((item) => (
        <Chip
          key={item.name}
          name={item.name}
          tooltip={item.tooltip}
          dotColor={dotColor}
        />
      ))}
    </div>
  );
}

export function RoutineInfoBody({ info }: { info: RoutineInfo }) {
  return (
    <div className="routine-info-body">
      {info.reason && (
        <>
          <SectionLabel emoji="💡" label="이 루틴을 추천한 이유" />
          <div className="routine-info-reason-card">
            <p>{info.reason}</p>
          </div>
        </>
      )}

      {info.nutrition.length > 0 && (
        <>
          <Divider />
          <SectionLabel emoji="🥗" label="영양 계획" color="#00c9a7" />
          <ChipRow items={info.nutrition} dotColor="#00c9a7" />
        </>
      )}

      {info.workout.length > 0 && (
        <>
          <Divider />
          <SectionLabel emoji="🏃" label="운동 계획" color="#378add" />
          <ChipRow items={info.workout} dotColor="#378add" />
        </>
      )}
    </div>
  );
}
