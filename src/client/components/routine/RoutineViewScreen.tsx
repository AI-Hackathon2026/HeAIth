import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, withAuthRetry } from "../../api/client";
import type { CharacterProgress, Routine, RoutineDifficulty } from "../../types";
import {
  avatarLevelIncreased,
  defaultCharacterProgress,
  reconcileCharacterProgress,
  resolveCharacterProgressAfterTask,
  toAvatarData,
} from "../../utils/avatarData";
import { mergeRoutinePreservingPlanOrder } from "../../utils/routinePlanOrder";
import { applyUpdatedRoutine } from "../../utils/routineChatUpdate";
import {
  getRoutineWeekAnchor,
  isRoutineWeekExpired,
  resetRoutineWeekAnchor,
} from "../../utils/routineWeek";
import { RoutineRefreshCountdown } from "./view/RoutineRefreshCountdown";
import { LevelUpModal } from "../avatar/LevelUpModal";
import { ExerciseRoutineTracker } from "./ExerciseRoutineTracker";
import { NutritionRoutineTracker } from "./NutritionRoutineTracker";
import { RoutineGeneratingOverlay } from "./RoutineGeneratingOverlay";
import { RoutineReadyOverlay } from "./RoutineReadyOverlay";
import { RoutineChatFabPopup } from "./RoutineChatFabPopup";
import { ProgressSummaryCard } from "./view/ProgressSummaryCard";
import { RoutineInfoModal } from "./RoutineInfoModal";
import { RoutinePlanTabBar } from "./view/RoutinePlanTabBar";
import { RoutineViewHeader } from "./view/RoutineViewHeader";

import type { RoutinePlanTab } from "./RoutinePlanTabSlider";

interface Props {
  routineId: string;
  chatId?: string;
  refreshKey?: number;
  onChangeDifficulty: (previousDifficulty: RoutineDifficulty) => void;
  onViewHealthRecord: () => void;
  onRoutineDeleted: () => void;
}

export function RoutineViewScreen({
  routineId,
  chatId: initialChatId,
  refreshKey = 0,
  onChangeDifficulty,
  onViewHealthRecord,
  onRoutineDeleted,
}: Props) {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [characterProgress, setCharacterProgress] = useState<CharacterProgress>(
    defaultCharacterProgress(),
  );
  const [activeTab, setActiveTab] = useState<RoutinePlanTab>("nutrition");
  const [infoOpen, setInfoOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpTarget, setLevelUpTarget] = useState(1);
  const [weekOverlayPhase, setWeekOverlayPhase] = useState<
    "hidden" | "generating" | "ready"
  >("hidden");
  const [weekRefreshDifficulty, setWeekRefreshDifficulty] =
    useState<RoutineDifficulty | null>(null);
  const [resolvedChatId, setResolvedChatId] = useState<string | undefined>(
    initialChatId,
  );
  const weekCheckDoneRef = useRef(false);
  const routineRef = useRef(routine);
  routineRef.current = routine;
  const characterProgressRef = useRef(characterProgress);
  characterProgressRef.current = characterProgress;

  const avatar = useMemo(
    () => toAvatarData(characterProgress),
    [characterProgress],
  );

  const refreshCharacterProgress = useCallback(async () => {
    try {
      const progress = await withAuthRetry(() => api.getCharacterMe());
      setCharacterProgress(progress);
    } catch {
      // keep current progress on refresh failure
    }
  }, []);

  const refreshRoutineForNewWeek = useCallback(async (current: Routine) => {
    setWeekOverlayPhase("generating");
    setWeekRefreshDifficulty(current.difficulty);
    setError("");
    try {
      await withAuthRetry(() =>
        api.replaceRoutineMe({ difficulty: current.difficulty }),
      );
      resetRoutineWeekAnchor(current.id);
      const data = await withAuthRetry(() => api.getRoutineMe());
      if (data) {
        setRoutine(data);
        setCharacterProgress(
          reconcileCharacterProgress(data.characterProgress, data),
        );
      }
      setWeekOverlayPhase("ready");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "새 주차 루틴을 불러올 수 없습니다.",
      );
      setWeekOverlayPhase("hidden");
      setWeekRefreshDifficulty(null);
    }
  }, []);

  function dismissWeekReadyOverlay() {
    setWeekOverlayPhase("hidden");
    setWeekRefreshDifficulty(null);
  }

  useEffect(() => {
    weekCheckDoneRef.current = false;
  }, [routineId, refreshKey]);

  useEffect(() => {
    setResolvedChatId(initialChatId ?? routine?.chats?.[0]?.id);
  }, [initialChatId, routine?.chats, routineId, refreshKey]);

  useEffect(() => {
    if (!routine?.id || weekCheckDoneRef.current) return;
    getRoutineWeekAnchor(routine.id);
    weekCheckDoneRef.current = true;
    if (isRoutineWeekExpired(routine.id)) {
      void refreshRoutineForNewWeek(routine);
    }
  }, [routine, refreshRoutineForNewWeek]);

  useEffect(() => {
    setLoading(true);
    setError("");

    async function load() {
      try {
        const data = await withAuthRetry(() => api.getRoutineMe());
        setRoutine(data);

        if (data) {
          setCharacterProgress(
            reconcileCharacterProgress(data.characterProgress, data),
          );
        } else {
          const progress = await withAuthRetry(() => api.getCharacterMe());
          setCharacterProgress(progress);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "루틴을 불러올 수 없습니다.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [routineId, refreshKey]);

  const hasExerciseTracker = (routine?.exerciseRoutine?.length ?? 0) > 0;
  const hasNutritionTracker = (routine?.nutritionRoutine?.length ?? 0) > 0;

  const nutritionStats = useMemo(() => {
    const meals =
      routine?.nutritionRoutine?.flatMap((day) => day.meals) ?? [];
    return {
      done: meals.filter((m) => m.isCompleted).length,
      total: meals.length,
    };
  }, [routine]);

  const workoutStats = useMemo(() => {
    const items = routine?.exerciseRoutine ?? [];
    return {
      done: items.filter((i) => i.isCompleted).length,
      total: items.length,
    };
  }, [routine]);

  function handleProgressReward(
    previousLevel: number,
    nextProgress: CharacterProgress,
  ) {
    setCharacterProgress(nextProgress);

    if (!avatarLevelIncreased(previousLevel, nextProgress.level)) return;

    setLevelUpTarget(nextProgress.level);
    setShowLevelUp(true);
  }

  async function refreshRoutineAfterTaskUpdate(
    wasCompleted: boolean,
    reward?: {
      leveledUp: boolean;
      previousLevel: number;
      characterProgress: CharacterProgress;
    },
  ) {
    const data = await withAuthRetry(() => api.getRoutineMe());
    const previousProgress = characterProgressRef.current;
    const mergedRoutine = data
      ? mergeRoutinePreservingPlanOrder(routineRef.current, data)
      : null;

    setRoutine(mergedRoutine);

    if (!data || !mergedRoutine) return;

    if (!wasCompleted && reward) {
      const nextProgress = resolveCharacterProgressAfterTask(
        reward.characterProgress,
        mergedRoutine,
        previousProgress,
        data.characterProgress,
      );

      handleProgressReward(previousProgress.level, nextProgress);
      return;
    }

    setCharacterProgress(
      reconcileCharacterProgress(
        data.characterProgress,
        mergedRoutine,
        previousProgress,
      ),
    );
  }

  async function onToggleExercisePlan(planId: string, isCompleted: boolean) {
    setUpdatingPlanId(planId);
    setError("");
    try {
      const result = await withAuthRetry(() =>
        api.updateExercisePlanProgress(planId, !isCompleted),
      );
      await refreshRoutineAfterTaskUpdate(isCompleted, result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "운동 루틴 저장 실패");
    } finally {
      setUpdatingPlanId(null);
    }
  }

  async function onToggleNutritionPlan(planId: string, isCompleted: boolean) {
    setUpdatingPlanId(planId);
    setError("");
    try {
      const result = await withAuthRetry(() =>
        api.updateNutritionFoodItemProgress(planId, !isCompleted),
      );
      await refreshRoutineAfterTaskUpdate(isCompleted, result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "영양 루틴 저장 실패");
    } finally {
      setUpdatingPlanId(null);
    }
  }

  async function onDeleteRoutine() {
    if (
      !confirm(
        "루틴을 삭제하시겠습니까?\n식사·운동 계획은 모두 삭제되며, 캐릭터 성장 기록은 유지됩니다.",
      )
    ) {
      return;
    }

    setActionLoading(true);
    setError("");
    try {
      await withAuthRetry(() => api.deleteRoutineMe());
      onRoutineDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "루틴 삭제에 실패했습니다.");
      setActionLoading(false);
    }
  }

  const dismissLevelUp = useCallback(() => setShowLevelUp(false), []);

  if (loading) {
    return (
      <div className="routine-gate">
        <div className="spinner" />
        <p>루틴 불러오는 중...</p>
      </div>
    );
  }

  if (weekOverlayPhase === "generating") {
    return <RoutineGeneratingOverlay mode="change" />;
  }

  if (weekOverlayPhase === "ready" && weekRefreshDifficulty) {
    return (
      <RoutineReadyOverlay
        mode="change"
        difficulty={weekRefreshDifficulty}
        onContinue={dismissWeekReadyOverlay}
      />
    );
  }

  if (!routine) {
    return (
      <div className="routine-page">
        <div className="banner-error">{error || "루틴을 찾을 수 없습니다."}</div>
      </div>
    );
  }

  const activeChatId = resolvedChatId ?? routine?.chats?.[0]?.id;
  const summaryText = routine.summary || routine.title;

  return (
    <div className="routine-page routine-page--view routine-page--v2">
      {error && <div className="banner-error">{error}</div>}

      {showLevelUp && (
        <LevelUpModal
          newLevel={levelUpTarget}
          heroStyleId={avatar.heroStyleId}
          onClose={dismissLevelUp}
        />
      )}

      <RoutineViewHeader
        difficulty={routine.difficulty}
        summary={summaryText}
        hasInfo={true}
        avatar={avatar}
        onHealthRecord={onViewHealthRecord}
        onOpenInfo={() => setInfoOpen(true)}
        onCharacterUpdated={() => void refreshCharacterProgress()}
      />

      <ProgressSummaryCard
        nutritionDone={nutritionStats.done}
        nutritionTotal={nutritionStats.total}
        workoutDone={workoutStats.done}
        workoutTotal={workoutStats.total}
      />

      <RoutinePlanTabBar activeTab={activeTab} onChange={setActiveTab} />

      <div className="routine-v2-tab-panel" role="tabpanel">
        {activeTab === "nutrition" ? (
          hasNutritionTracker ? (
            <NutritionRoutineTracker
              days={routine.nutritionRoutine!}
              updatingPlanId={updatingPlanId}
              onToggle={(planId, isCompleted) =>
                void onToggleNutritionPlan(planId, isCompleted)
              }
            />
          ) : (
            <div className="routine-v2-legacy-text">{routine.nutritionPlan}</div>
          )
        ) : hasExerciseTracker ? (
          <ExerciseRoutineTracker
            items={routine.exerciseRoutine!}
            updatingPlanId={updatingPlanId}
            onToggle={(planId, isCompleted) =>
              void onToggleExercisePlan(planId, isCompleted)
            }
          />
        ) : (
          <div className="routine-v2-legacy-text">{routine.workoutPlan}</div>
        )}
      </div>

      <RoutineRefreshCountdown routineId={routine.id} />

      <div className="routine-v2-actions">
        <button
          type="button"
          className="routine-v2-action-btn"
          disabled={actionLoading}
          onClick={() => onChangeDifficulty(routine.difficulty)}
        >
          난이도 변경
        </button>
        <button
          type="button"
          className="routine-v2-action-btn routine-v2-action-btn--danger"
          disabled={actionLoading}
          onClick={() => void onDeleteRoutine()}
        >
          루틴 삭제
        </button>
      </div>

      <RoutineInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        routineInfo={routine.routineInfo}
        summary={summaryText}
        onRegenerate={() => onChangeDifficulty(routine.difficulty)}
      />

      <RoutineChatFabPopup
        chatId={activeChatId ?? null}
        onChatIdResolved={setResolvedChatId}
        onRoutineUpdate={(updated) => {
          setRoutine((prev) => (prev ? applyUpdatedRoutine(prev, updated) : prev));
          void withAuthRetry(() => api.getRoutineMe()).then((data) => {
            if (!data) return;
            setRoutine((prev) =>
              prev ? mergeRoutinePreservingPlanOrder(prev, data) : data,
            );
            if (data.characterProgress) {
              setCharacterProgress(data.characterProgress);
            }
          });
        }}
      />
    </div>
  );
}
