import type { RoutinePlanTab } from "../RoutinePlanTabSlider";

const TABS: { id: RoutinePlanTab; label: string }[] = [
  { id: "nutrition", label: "영양 계획" },
  { id: "workout", label: "운동 계획" },
];

interface Props {
  activeTab: RoutinePlanTab;
  onChange: (tab: RoutinePlanTab) => void;
}

export function RoutinePlanTabBar({ activeTab, onChange }: Props) {
  return (
    <div className="routine-v2-tab-bar" role="tablist">
      {TABS.map(({ id, label }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`routine-v2-tab${isActive ? " is-active" : ""}`}
            onClick={() => onChange(id)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
