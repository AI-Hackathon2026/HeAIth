import { useCallback, useEffect, useRef, useState } from "react";
import { api, withAuthRetry } from "../../api/client";
import {
  CHRONIC_DISEASE_KEYS,
  DIFFICULTY_FREQUENCY,
  DIFFICULTY_LABELS,
  DISEASE_LABELS,
  formatAverageReductionSummary,
  formatModalAverageReductionSummary,
  getAverageRiskReduction,
  getProjectedRates,
  getRiskColor,
  type DiseaseKey,
} from "../../constants/routine";
import type { Routine, RoutineDifficulty, RoutineProjection } from "../../types";
import { hasRoutineData } from "../../utils/routineData";
import { RoutineGeneratingOverlay } from "./RoutineGeneratingOverlay";
import { RoutineReadyOverlay } from "./RoutineReadyOverlay";

interface Props {
  mode?: "create" | "change";
  routineId?: string;
  previousDifficulty?: RoutineDifficulty;
  onGenerated: (routineId: string, chatId: string) => void;
  onRoutineAlreadyExists?: (routine: Routine) => void;
  onCancel?: () => void;
}

const DIFFICULTIES: RoutineDifficulty[] = ["EASY", "MODERATE", "HARD"];
const DETAIL_FADE_MS = 320;

type OverlayPhase = "hidden" | "generating" | "ready";

interface ProjectionDetailModalProps {
  difficulty: RoutineDifficulty;
  mode: "create" | "change";
  projections: Record<DiseaseKey, RoutineProjection | null>;
  currentRates: Record<string, number>;
  onClose: () => void;
  onConfirm: () => void;
}

function ProjectionDetailModal({
  difficulty,
  mode,
  projections,
  currentRates,
  onClose,
  onConfirm,
}: ProjectionDetailModalProps) {
  const [closing, setClosing] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    setClosing(false);
    setRevealedCount(0);

    const timers = CHRONIC_DISEASE_KEYS.map((_, index) =>
      window.setTimeout(() => setRevealedCount(index + 1), 280 * (index + 1)),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [difficulty]);

  function handleClose() {
    setClosing(true);
    window.setTimeout(onClose, DETAIL_FADE_MS);
  }

  function handleConfirm() {
    setClosing(true);
    window.setTimeout(onConfirm, DETAIL_FADE_MS);
  }

  const avgReduction = getAverageRiskReduction(
    difficulty,
    projections,
    currentRates,
  );
  const avgSummary = formatModalAverageReductionSummary(avgReduction);

  return (
    <div
      className={`routine-projection-detail-overlay${closing ? " is-closing" : " is-open"}`}
      role="dialog"
      aria-labelledby="projection-detail-title"
    >
      <div
        className={`routine-projection-detail-card${closing ? " is-closing" : " is-open"}`}
      >
        <h3 id="projection-detail-title">4개월 후, 이렇게 달라질 수 있어요</h3>
        <ul className="routine-projection-detail-list">
          {CHRONIC_DISEASE_KEYS.map((disease, index) => {
            const { current, projected } = getProjectedRates(
              projections[disease],
              disease,
              difficulty,
              currentRates,
            );
            const visible = revealedCount > index;

            return (
              <li
                key={disease}
                className={`routine-projection-detail-item${visible ? " is-visible" : ""}${closing ? " is-closing" : ""}`}
                style={{ transitionDelay: closing ? `${index * 40}ms` : undefined }}
              >
                <span className="routine-projection-label">{DISEASE_LABELS[disease]}</span>
                <span className="routine-projection-values">
                  <span style={{ color: getRiskColor(current) }}>
                    {current.toFixed(1)}%
                  </span>
                  <span className="routine-projection-arrow">→</span>
                  <span style={{ color: getRiskColor(projected) }}>
                    {projected.toFixed(1)}%
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="routine-projection-detail-avg">
          <span className="routine-projection-detail-avg-label">
            {avgSummary.title}
          </span>
          <span
            className={`routine-projection-detail-avg-value${avgSummary.muted ? " muted" : ""}`}
          >
            {avgSummary.message}
          </span>
        </div>
        <div className="routine-projection-detail-actions">
          <button type="button" className="ghost-btn" onClick={handleClose}>
            취소
          </button>
          <button type="button" className="primary-btn" onClick={handleConfirm}>
            {mode === "change" ? "난이도 변경하기" : "루틴 시작하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DifficultyPickerScreen({
  mode = "create",
  previousDifficulty,
  onGenerated,
  onRoutineAlreadyExists,
  onCancel,
}: Props) {
  const [projections, setProjections] = useState<
    Record<DiseaseKey, RoutineProjection | null>
  >({} as Record<DiseaseKey, RoutineProjection | null>);
  const [currentRates, setCurrentRates] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkingExisting, setCheckingExisting] = useState(mode === "create");
  const [overlayPhase, setOverlayPhase] = useState<OverlayPhase>("hidden");
  const [readyPayload, setReadyPayload] = useState<{
    routineId: string;
    chatId: string;
    difficulty: RoutineDifficulty;
  } | null>(null);
  const generateLockRef = useRef(false);
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<RoutineDifficulty | null>(previousDifficulty ?? null);
  const [detailDifficulty, setDetailDifficulty] =
    useState<RoutineDifficulty | null>(null);

  const [baselineDifficulty, setBaselineDifficulty] = useState<
    RoutineDifficulty | undefined
  >(previousDifficulty);

  useEffect(() => {
    if (previousDifficulty) {
      setBaselineDifficulty(previousDifficulty);
    }
  }, [previousDifficulty]);

  useEffect(() => {
    if (mode !== "change" || baselineDifficulty) return;

    async function loadCurrentDifficulty() {
      try {
        const routine = await withAuthRetry(() => api.getRoutineMe());
        if (routine?.difficulty) {
          setBaselineDifficulty(routine.difficulty);
          setSelectedDifficulty((current) => current ?? routine.difficulty);
        }
      } catch {
        // ignore
      }
    }

    void loadCurrentDifficulty();
  }, [mode, baselineDifficulty]);

  useEffect(() => {
    if (previousDifficulty) {
      setSelectedDifficulty((current) => current ?? previousDifficulty);
    }
  }, [previousDifficulty]);

  useEffect(() => {
    if (mode !== "create") {
      setCheckingExisting(false);
      return;
    }

    async function checkExistingRoutine() {
      try {
        const routine = await withAuthRetry(() => api.getRoutineMe());
        if (hasRoutineData(routine)) {
          onRoutineAlreadyExists?.(routine);
        }
      } catch {
        // Keep showing the create form when the check fails.
      } finally {
        setCheckingExisting(false);
      }
    }

    void checkExistingRoutine();
  }, [mode, onRoutineAlreadyExists]);

  useEffect(() => {
    async function load() {
      try {
        const record = await withAuthRetry(() => api.getHealthRecordMe());
        if (!record) {
          setError("건강 기록이 없습니다.");
          return;
        }
        setCurrentRates(record.exposureRates as Record<string, number>);

        const allProjections = await withAuthRetry(() =>
          api.getChronicDiseaseProjections(CHRONIC_DISEASE_KEYS),
        );
        setProjections(allProjections);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "예측 데이터를 불러올 수 없습니다.",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function openDetailModal() {
    if (!selectedDifficulty) return;
    setDetailDifficulty(selectedDifficulty);
  }

  async function proceedFromDetail() {
    if (!detailDifficulty) return;
    const difficulty = detailDifficulty;
    setDetailDifficulty(null);
    await onSelectDifficulty(difficulty);
  }

  function showReadyScreen(
    routineId: string,
    chatId: string,
    difficulty: RoutineDifficulty,
  ) {
    setReadyPayload({ routineId, chatId, difficulty });
    setOverlayPhase("ready");
  }

  const handleReadyContinue = useCallback(() => {
    if (!readyPayload) return;
    onGenerated(readyPayload.routineId, readyPayload.chatId);
  }, [onGenerated, readyPayload]);

  async function resolveCreateRoutine(difficulty: RoutineDifficulty) {
    const existing = await withAuthRetry(() => api.getRoutineMe());

    if (hasRoutineData(existing)) {
      return withAuthRetry(() => api.replaceRoutineMe({ difficulty }));
    }

    try {
      return await withAuthRetry(() => api.generateRoutinePlan({ difficulty }));
    } catch (generateError) {
      try {
        return await withAuthRetry(() => api.replaceRoutineMe({ difficulty }));
      } catch {
        throw generateError;
      }
    }
  }

  async function onSelectDifficulty(difficulty: RoutineDifficulty) {
    if (generateLockRef.current || overlayPhase !== "hidden") return;

    generateLockRef.current = true;
    setOverlayPhase("generating");
    setError("");

    try {
      if (mode === "change") {
        const result = await withAuthRetry(() =>
          api.replaceRoutineMe({ difficulty }),
        );
        showReadyScreen(result.routineId, result.chatId, difficulty);
        return;
      }

      const result = await resolveCreateRoutine(difficulty);
      showReadyScreen(result.routineId, result.chatId, difficulty);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "루틴 생성에 실패했습니다.",
      );
      setOverlayPhase("hidden");
    } finally {
      generateLockRef.current = false;
    }
  }

  function cardClassName(difficulty: RoutineDifficulty) {
    const classes = ["routine-difficulty-card"];
    if (baselineDifficulty === difficulty) classes.push("previous");
    if (selectedDifficulty === difficulty) classes.push("selected");
    return classes.join(" ");
  }

  if (loading || checkingExisting) {
    return (
      <div className="routine-gate">
        <div className="spinner" />
        <p>{checkingExisting ? "루틴 정보 확인 중..." : "난이도 정보 불러오는 중..."}</p>
      </div>
    );
  }

  return (
    <div className="routine-page routine-page--wide routine-difficulty-page">
      {overlayPhase === "generating" && (
        <RoutineGeneratingOverlay mode={mode} />
      )}
      {overlayPhase === "ready" && readyPayload && (
        <RoutineReadyOverlay
          mode={mode}
          difficulty={readyPayload.difficulty}
          onContinue={handleReadyContinue}
        />
      )}

      {detailDifficulty && (
        <ProjectionDetailModal
          difficulty={detailDifficulty}
          mode={mode}
          projections={projections}
          currentRates={currentRates}
          onClose={() => setDetailDifficulty(null)}
          onConfirm={() => void proceedFromDetail()}
        />
      )}

      <section className="routine-section">
        <div className="routine-section-header routine-difficulty-header">
          <h2 className="routine-difficulty-title">
            {mode === "change" ? "루틴 난이도 변경" : "루틴 난이도를 선택해주세요"}
          </h2>
          {mode === "change" && onCancel && (
            <button type="button" className="ghost-btn" onClick={onCancel}>
              취소
            </button>
          )}
        </div>

        {error && <div className="banner-error">{error}</div>}

        <div className="routine-difficulty-grid">
          {DIFFICULTIES.map((difficulty) => {
            const isPrevious = baselineDifficulty === difficulty;
            const avgReduction = getAverageRiskReduction(
              difficulty,
              projections,
              currentRates,
            );
            const summary = formatAverageReductionSummary(avgReduction);

            return (
              <article
                key={difficulty}
                role="button"
                tabIndex={0}
                aria-pressed={selectedDifficulty === difficulty}
                className={cardClassName(difficulty)}
                onClick={() => setSelectedDifficulty(difficulty)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedDifficulty(difficulty);
                  }
                }}
              >
                {isPrevious && (
                  <span className="routine-difficulty-previous-tag">현재 루틴</span>
                )}
                <h3>{DIFFICULTY_LABELS[difficulty]}</h3>
                <span className="routine-difficulty-en">{difficulty}</span>
                <p className="routine-difficulty-freq">
                  {DIFFICULTY_FREQUENCY[difficulty]}
                </p>

                <div
                  className={`routine-difficulty-projections routine-difficulty-projections--${difficulty.toLowerCase()}`}
                >
                  <h4>{summary.title}</h4>
                  <p
                    className={`routine-difficulty-avg-reduction${summary.muted ? " muted" : ""}`}
                  >
                    {summary.message}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="routine-difficulty-dock">
          <button
            type="button"
            className="primary-btn routine-difficulty-dock-btn"
            disabled={!selectedDifficulty || overlayPhase !== "hidden"}
            onClick={openDetailModal}
          >
            {mode === "change"
              ? "선택한 난이도로 변경"
              : "선택한 난이도로 루틴 시작"}
          </button>
        </div>

        <div className="routine-disclaimer">
          <p>
            * 위 루틴은 질병관리청 KNHANES 데이터를 기반으로 생성되었으며, 4개월
            이상 루틴을 유지했을때 예상 결과를 보여줍니다.
          </p>
          <p>* 실제 효과는 개인에 따라 다를 수 있습니다.</p>
        </div>
      </section>
    </div>
  );
}
