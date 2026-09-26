import { useEffect, useState } from "react";
import { DIFFICULTY_LABELS } from "../../constants/routine";
import type { RoutineDifficulty } from "../../types";
import { HealthPulseMark } from "../HealthPulseMark";

interface Props {
  mode?: "create" | "change";
  difficulty: RoutineDifficulty;
  onContinue: () => void;
}

const CREATE_TITLE = "건강 루틴이 준비됐어요";
const CHANGE_TITLE = "건강 루틴이 업데이트됐어요";

const CREATE_HINT = "오늘부터 함께 건강한 습관을 만들어 보세요.";
const CHANGE_HINT = "업데이트된 루틴으로 이번 주도 파이팅!";

const FEATURES = [
  { icon: "🥗", label: "맞춤 영양 플랜" },
  { icon: "💪", label: "맞춤 운동 플랜" },
];

export function RoutineReadyOverlay({
  mode = "create",
  difficulty,
  onContinue,
}: Props) {
  const [revealedLines, setRevealedLines] = useState(0);
  const title = mode === "change" ? CHANGE_TITLE : CREATE_TITLE;
  const hint = mode === "change" ? CHANGE_HINT : CREATE_HINT;

  useEffect(() => {
    setRevealedLines(0);
    const timers = FEATURES.map((_, index) =>
      window.setTimeout(() => setRevealedLines(index + 1), 520 * (index + 1)),
    );
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [mode, difficulty]);

  return (
    <div
      className="routine-ready-overlay"
      role="status"
      aria-live="polite"
      aria-busy="false"
    >
      <div className="routine-ready-backdrop" aria-hidden />
      <div className="routine-generating-orb-field" aria-hidden>
        <span className="routine-generating-orb routine-generating-orb--1" />
        <span className="routine-generating-orb routine-generating-orb--2" />
        <span className="routine-generating-orb routine-generating-orb--3" />
      </div>

      <div className="routine-ready-hud" aria-hidden>
        <span className="routine-ready-hud-corner routine-ready-hud-corner--tl" />
        <span className="routine-ready-hud-corner routine-ready-hud-corner--tr" />
        <span className="routine-ready-hud-corner routine-ready-hud-corner--bl" />
        <span className="routine-ready-hud-corner routine-ready-hud-corner--br" />
        <span className="routine-ready-scanline" />
      </div>

      <div className="routine-ready-card">
        <div className="routine-ready-visual">
          <HealthPulseMark
            size="sm"
            bpm={30}
            className="routine-ready-pulse"
          />
        </div>

        <p className="routine-ready-eyebrow">ROUTINE READY</p>
        <h2 className="routine-ready-title">{title}</h2>
        <p className="routine-ready-hint">{hint}</p>

        <div className="routine-ready-difficulty">
          <span className="routine-ready-difficulty-label">난이도</span>
          <span className="routine-ready-difficulty-value">
            {DIFFICULTY_LABELS[difficulty]}
          </span>
        </div>

        <ul className="routine-ready-features">
          {FEATURES.map((feature, index) => (
            <li
              key={feature.label}
              className={`routine-ready-feature${revealedLines > index ? " is-visible" : ""}`}
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <span className="routine-ready-feature-icon" aria-hidden>
                {feature.icon}
              </span>
              <span>{feature.label}</span>
            </li>
          ))}
        </ul>

        <div className="routine-ready-progress" aria-hidden>
          <div className="routine-ready-progress-track">
            <div className="routine-ready-progress-fill" />
          </div>
          <span className="routine-ready-progress-label">100%</span>
        </div>

        <button
          type="button"
          className="primary-btn routine-ready-cta"
          onClick={onContinue}
        >
          확인
        </button>
      </div>
    </div>
  );
}
