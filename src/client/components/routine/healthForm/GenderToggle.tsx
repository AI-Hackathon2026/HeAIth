import type { Gender } from "../../../types";

interface GenderToggleProps {
  value: "" | Gender;
  onChange: (gender: Gender) => void;
}

export function GenderToggle({ value, onChange }: GenderToggleProps) {
  return (
    <div className="health-form-field">
      <span className="health-form-field-label">성별</span>
      <div className="health-form-gender-row">
        {(["MALE", "FEMALE"] as Gender[]).map((gender) => {
          const selected = value === gender;
          return (
            <button
              key={gender}
              type="button"
              className={`health-form-gender-btn${selected ? " selected" : ""}`}
              aria-pressed={selected}
              onClick={() => onChange(gender)}
            >
              <span className="health-form-gender-icon" aria-hidden>
                {gender === "MALE" ? "♂" : "♀"}
              </span>
              <span>{gender === "MALE" ? "남성" : "여성"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
