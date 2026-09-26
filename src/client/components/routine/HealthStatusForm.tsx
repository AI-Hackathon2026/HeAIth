import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, withAuthRetry } from "../../api/client";
import {
  buildHealthStatusRequest,
  healthStatusToFormState,
  parseRequiredInt,
  type HealthStatusFormState,
} from "../../utils/healthstatus";
import { HeAIthLogo } from "../HeAIthLogo";
import { BmiCard } from "./healthForm/BmiCard";
import { GenderToggle } from "./healthForm/GenderToggle";
import { LifestyleSlider } from "./healthForm/LifestyleSlider";
import { StepIndicator } from "./healthForm/StepIndicator";

const INITIAL_FORM: HealthStatusFormState = {
  gender: "",
  age: "",
  height: "",
  weight: "",
  alcoholFreq: "0",
  smokeFreq: "0",
  exerciseFreq: "0",
};

interface Props {
  mode?: "create" | "update";
  onComplete: () => void;
  onCancel?: () => void;
}

function NumberField({
  label,
  optional,
  value,
  onChange,
  placeholder,
  min,
  max,
}: {
  label: string;
  optional?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  min: number;
  max: number;
}) {
  return (
    <label className="health-form-field">
      <span className="health-form-field-label">
        {label}
        {optional && (
          <span className="health-form-field-optional"> (선택)</span>
        )}
      </span>
      <input
        type="number"
        className="health-form-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        required={!optional}
      />
    </label>
  );
}

export function HealthStatusForm({
  mode = "create",
  onComplete,
  onCancel,
}: Props) {
  const [form, setForm] = useState<HealthStatusFormState>(INITIAL_FORM);
  const [healthStatusId, setHealthStatusId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(mode === "update");

  useEffect(() => {
    if (mode !== "update") return;

    setFetching(true);
    setError("");

    withAuthRetry(() => api.getHealthStatus())
      .then((status) => {
        if (!status) {
          setError("저장된 건강 정보를 찾을 수 없습니다.");
          return;
        }
        setHealthStatusId(status.id);
        setForm(healthStatusToFormState(status));
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "건강 정보를 불러올 수 없습니다.",
        );
      })
      .finally(() => setFetching(false));
  }, [mode]);

  function updateField<K extends keyof HealthStatusFormState>(
    key: K,
    value: HealthStatusFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const bmiReady = useMemo(() => {
    if (!form.gender) return false;
    const age = parseRequiredInt(form.age);
    const height = parseRequiredInt(form.height);
    const weight = parseRequiredInt(form.weight);
    return !!(age && height && weight);
  }, [form.age, form.gender, form.height, form.weight]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!form.gender) {
      setError("성별을 선택해 주세요.");
      return;
    }

    const body = buildHealthStatusRequest(form);
    if (!body) {
      setError(
        "모든 항목을 올바르게 입력해 주세요. (나이 19–100, 키·몸무게·생활습관 빈도 확인)",
      );
      return;
    }

    if (mode === "update" && !healthStatusId) {
      setError("건강 정보 ID를 찾을 수 없습니다. 다시 시도해 주세요.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "update" && healthStatusId) {
        await withAuthRetry(() => api.updateHealthStatus(healthStatusId, body));
      } else {
        await withAuthRetry(() => api.submitHealthStatus(body));
      }
      onComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "건강 정보 저장에 실패했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="health-form-page">
        <div className="health-form-loading">
          <div className="spinner" />
          <p>건강 정보 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const ageNum = parseRequiredInt(form.age);
  const heightNum = parseRequiredInt(form.height);
  const weightNum = parseRequiredInt(form.weight);

  return (
    <div className="health-form-page">
      <div className="health-form-logo">
        <HeAIthLogo size="md" />
      </div>
      <p className="health-form-subtitle">
        {mode === "update"
          ? "건강 정보를 수정하면 건강 점수와 루틴 추천이 다시 계산됩니다."
          : "맞춤 건강 루틴을 위해 정보를 입력해 주세요."}
      </p>

      {mode === "create" ? (
        <StepIndicator
          current={2}
          total={3}
          labels={["회원가입", "건강 정보", "루틴 선택"]}
        />
      ) : (
        <div className="health-form-update-header">
          <h2>건강 정보 수정</h2>
          {onCancel && (
            <button type="button" className="ghost-btn" onClick={onCancel}>
              취소
            </button>
          )}
        </div>
      )}

      {error && <div className="banner-error health-form-error">{error}</div>}

      <form className="health-form" onSubmit={(e) => void handleSubmit(e)}>
        <p className="health-form-section-label">기본 정보</p>

        <GenderToggle
          value={form.gender}
          onChange={(gender) => updateField("gender", gender)}
        />

        <NumberField
          label="나이"
          value={form.age}
          onChange={(v) => updateField("age", v)}
          placeholder="예: 35"
          min={19}
          max={100}
        />

        <div className="health-form-row">
          <NumberField
            label="키 (cm)"
            value={form.height}
            onChange={(v) => updateField("height", v)}
            placeholder="175"
            min={100}
            max={250}
          />
          <NumberField
            label="몸무게 (kg)"
            value={form.weight}
            onChange={(v) => updateField("weight", v)}
            placeholder="70"
            min={20}
            max={250}
          />
        </div>

        {bmiReady && ageNum && heightNum && weightNum && form.gender && (
          <BmiCard
            weight={weightNum}
            height={heightNum}
            gender={form.gender}
            age={ageNum}
          />
        )}

        <div className="health-form-divider" />

        <p className="health-form-section-label">생활 습관</p>
        <p className="health-form-section-desc">
          지난 1주 기준 해당 일수를 선택해 주세요.
        </p>

        <LifestyleSlider
          label="운동"
          subLabel="유산소, 근력 운동 포함"
          icon="ti-run"
          iconClassName="health-form-slider-icon--teal"
          value={parseRequiredInt(form.exerciseFreq) ?? 0}
          onChange={(v) => updateField("exerciseFreq", String(v))}
        />
        <LifestyleSlider
          label="음주"
          subLabel="음주한 날 기준"
          icon="ti-bottle"
          value={parseRequiredInt(form.alcoholFreq) ?? 0}
          onChange={(v) => updateField("alcoholFreq", String(v))}
        />
        <LifestyleSlider
          label="흡연"
          subLabel="흡연한 날 기준"
          icon="ti-flame-off"
          value={parseRequiredInt(form.smokeFreq) ?? 0}
          onChange={(v) => updateField("smokeFreq", String(v))}
        />

        <button
          type="submit"
          className="health-form-submit"
          disabled={loading}
        >
          {loading
            ? "저장 중..."
            : mode === "update"
              ? "건강 정보 업데이트"
              : "저장하고 계속하기"}
        </button>

        <p className="health-form-source">
          KNHANES 국민건강영양조사 기반 분석 · 질병관리청 2024
        </p>
      </form>
    </div>
  );
}
