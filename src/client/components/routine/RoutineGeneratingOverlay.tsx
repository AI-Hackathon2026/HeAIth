import { useEffect, useMemo, useState } from "react";
import { HealthPulseMark } from "../HealthPulseMark";

interface Props {
  message?: string;
  mode?: "create" | "change";
}

const DEFAULT_TITLE = "잠시만 기다려 주세요!\nAI가 회원님을 위한 건강 루틴을 생성 중입니다";
const CREATE_STEPS = [
  "건강 데이터를 분석하고 있어요",
  "KNHANES 기준을 적용하고 있어요",
  "맞춤 영양·운동 루틴을 구성하고 있어요",
  "2~3분정도 소요될 수 있습니다",
];

const CHANGE_STEPS = [
  "난이도 설정을 업데이트하고 있어요",
  "루틴을 새로 구성하고 있어요",
  "2~3분정도 소요될 수 있습니다",
];

const STEP_INTERVAL_MS = 4800;
const STEP_FADE_MS = 560;

export function RoutineGeneratingOverlay({
  message,
  mode = "create",
}: Props) {
  const steps = useMemo(
    () => (mode === "change" ? CHANGE_STEPS : CREATE_STEPS),
    [mode],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [stepVisible, setStepVisible] = useState(true);
  const title = message?.trim() || DEFAULT_TITLE;

  useEffect(() => {
    setStepIndex(0);
    setStepVisible(true);
  }, [mode, title]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepVisible(false);
      window.setTimeout(() => {
        setStepIndex((prev) => (prev + 1) % steps.length);
        setStepVisible(true);
      }, STEP_FADE_MS);
    }, STEP_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [steps.length]);

  return (
    <div
      className="routine-generating-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="routine-generating-backdrop" aria-hidden />
      <div className="routine-generating-orb-field" aria-hidden>
        <span className="routine-generating-orb routine-generating-orb--1" />
        <span className="routine-generating-orb routine-generating-orb--2" />
        <span className="routine-generating-orb routine-generating-orb--3" />
      </div>

      <div className="routine-generating-card">
        <div className="routine-generating-visual" aria-hidden>
          <HealthPulseMark size="sm" bpm={30} className="routine-generating-pulse" />
        </div>

        <p className="routine-generating-title routine-generating-title--friendly">
          {title}
        </p>
        <p
          className={`routine-generating-step${stepVisible ? " is-visible" : ""}`}
          key={stepIndex}
        >
          {steps[stepIndex]}
        </p>

        <div className="routine-generating-progress" aria-hidden>
          <div className="routine-generating-progress-track">
            <div className="routine-generating-progress-fill" />
          </div>
        </div>

        <div className="routine-generating-dots" aria-hidden>
          {steps.map((_, index) => (
            <span
              key={index}
              className={`routine-generating-dot${index === stepIndex ? " is-active" : ""}${index < stepIndex ? " is-done" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
