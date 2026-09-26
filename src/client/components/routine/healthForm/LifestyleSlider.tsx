interface LifestyleSliderProps {
  label: string;
  subLabel?: string;
  icon: string;
  value: number;
  onChange: (value: number) => void;
  iconClassName?: string;
}

export function LifestyleSlider({
  label,
  subLabel,
  icon,
  value,
  onChange,
  iconClassName = "",
}: LifestyleSliderProps) {
  return (
    <div className="health-form-slider">
      <div className="health-form-slider-top">
        <div>
          <p className="health-form-slider-title">
            <i className={`ti ${icon} ${iconClassName}`.trim()} aria-hidden />
            {label}
          </p>
          {subLabel && <p className="health-form-slider-sub">{subLabel}</p>}
        </div>
        <div className="health-form-slider-value-wrap">
          <span className="health-form-slider-value">{value}</span>
          <span className="health-form-slider-unit">일/주</span>
        </div>
      </div>

      <input
        type="range"
        className="health-form-range"
        min={0}
        max={7}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuemin={0}
        aria-valuemax={7}
        aria-valuenow={value}
        aria-label={`${label} 주당 일수`}
      />

      <div className="health-form-slider-ticks" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            className={i === value ? "health-form-tick active" : "health-form-tick"}
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}
