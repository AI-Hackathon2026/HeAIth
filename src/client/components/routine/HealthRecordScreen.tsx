import { useEffect, useMemo, useState } from "react";
import { api, withAuthRetry } from "../../api/client";
import { DISEASE_LABELS } from "../../constants/routine";
import type { HealthRecord, HealthStatus } from "../../types";
import {
  getDiseaseDescription,
  getDiseaseFooterValue,
  getDiseaseRateLabel,
} from "../../utils/disease-description";
import {
  DASHBOARD_DISEASE_ORDER,
  getRiskBarWidth,
  getRiskLevel,
} from "../../utils/risk-level";
import { hasRoutineData } from "../../utils/routineData";
import { DiseaseCard } from "./healthDashboard/DiseaseCard";
import { ScoreCard } from "./healthDashboard/ScoreCard";

interface Props {
  fromGate?: boolean;
  refreshKey?: number;
  onRoutineStartClick: () => Promise<void>;
  onBack?: () => void;
  onUpdateHealthStatus?: () => void;
}

export function HealthRecordScreen({
  fromGate,
  refreshKey = 0,
  onRoutineStartClick,
  onBack,
  onUpdateHealthStatus,
}: Props) {
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [hasRoutine, setHasRoutine] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");

    Promise.all([
      withAuthRetry(() => api.getHealthRecordMe()),
      withAuthRetry(() => api.getHealthStatus()).catch(() => null),
      withAuthRetry(() => api.getRoutineMe()).catch(() => null),
    ])
      .then(([data, status, routine]) => {
        if (!data) {
          setError(
            "건강 기록이 없습니다. 건강 루틴을 위해 건강 정보를 먼저 입력해 주세요.",
          );
          return;
        }
        setRecord(data);
        setHealthStatus(status);
        setHasRoutine(hasRoutineData(routine));
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "건강 기록을 불러올 수 없습니다.",
        );
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const exposureRates = record?.exposureRates ?? {};

  const goodDiseases = useMemo(() => {
    if (!record) return [];
    return DASHBOARD_DISEASE_ORDER.filter(
      (disease) =>
        getRiskLevel(
          disease,
          exposureRates[disease] ?? 0,
          healthStatus ?? undefined,
        ) === "GOOD",
    ).map((disease) => DISEASE_LABELS[disease]);
  }, [record, exposureRates, healthStatus]);

  const diseaseCards = useMemo(() => {
    if (!record) return [];

    const context = healthStatus
      ? {
          smokeFreq: healthStatus.smokeFreq,
          alcoholFreq: healthStatus.alcoholFreq,
          weight: healthStatus.weight,
          height: healthStatus.height,
        }
      : undefined;

    return DASHBOARD_DISEASE_ORDER.map((disease) => {
      const rate = exposureRates[disease] ?? 0;
      const riskLevel = getRiskLevel(disease, rate, healthStatus ?? undefined);
      const barWidth = getRiskBarWidth(disease, rate, healthStatus ?? undefined);
      const rateLabel = getDiseaseRateLabel(disease, rate, healthStatus ?? undefined);
      const description = getDiseaseDescription(
        disease,
        rate,
        riskLevel,
        context,
      );
      const footerValue = getDiseaseFooterValue(
        disease,
        rate,
        rateLabel,
        riskLevel,
      );

      return {
        key: disease,
        name: DISEASE_LABELS[disease],
        rateLabel,
        footerValue,
        description,
        riskLevel,
        barWidth,
      };
    });
  }, [record, exposureRates, healthStatus]);

  if (loading) {
    return (
      <div className="health-dashboard-page">
        <div className="health-dashboard-loading">
          <div className="spinner" />
          <p>건강 현황 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="health-dashboard-page">
        <div className="banner-error">{error || "데이터 없음"}</div>
        <div className="health-dashboard-btn-row">
          {onUpdateHealthStatus && (
            <button
              type="button"
              className="health-dashboard-btn health-dashboard-btn--primary"
              onClick={onUpdateHealthStatus}
            >
              건강 정보 입력하기
            </button>
          )}
          {onBack && (
            <button
              type="button"
              className="health-dashboard-btn health-dashboard-btn--secondary"
              onClick={onBack}
            >
              돌아가기
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="health-dashboard-page">
      <header className="health-dashboard-header">
        <div>
          <p className="health-dashboard-eyebrow">Health Intelligence</p>
          <h1 className="health-dashboard-title">내 건강 현황</h1>
        </div>
        {!fromGate && onBack && (
          <button
            type="button"
            className="health-dashboard-btn health-dashboard-btn--secondary health-dashboard-btn--compact"
            onClick={onBack}
          >
            돌아가기
          </button>
        )}
      </header>

      <ScoreCard
        record={record}
        goodDiseases={goodDiseases}
        gender={healthStatus?.gender}
        age={healthStatus?.age}
      />

      <div className="health-dashboard-section-head">
        <h2 className="health-dashboard-section-title">질환 노출 위험도</h2>
        <span className="health-dashboard-section-note">동연령 대비 · KNHANES</span>
      </div>

      <ul className="health-disease-grid">
        {diseaseCards.map((card) => (
          <DiseaseCard
            key={card.key}
            name={card.name}
            rateLabel={card.rateLabel}
            footerValue={card.footerValue}
            description={card.description}
            riskLevel={card.riskLevel}
            barWidth={card.barWidth}
          />
        ))}
      </ul>

      <p className="health-dashboard-source">
        출처: 질병관리청 2024 국민건강영양조사
      </p>

      <div className="health-dashboard-btn-row">
        {onUpdateHealthStatus && (
          <button
            type="button"
            className="health-dashboard-btn health-dashboard-btn--secondary"
            onClick={onUpdateHealthStatus}
          >
            <i className="ti ti-pencil" aria-hidden />
            건강 정보 수정
          </button>
        )}
        <button
          type="button"
          className="health-dashboard-btn health-dashboard-btn--primary"
          disabled={starting}
          onClick={() => {
            setStarting(true);
            void onRoutineStartClick().finally(() => setStarting(false));
          }}
        >
          {starting
            ? "확인 중..."
            : hasRoutine
              ? "내 루틴 보기 →"
              : "루틴 시작하기 →"}
        </button>
      </div>
    </div>
  );
}
