import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, withAuthRetry } from "../api/client";
import type {
  KnhanesGroundResponse,
  KnhanesQueryResponse,
} from "../types";

const METRIC_SUGGESTIONS = [
  "식사 거르는 비율",
  "단백질",
  "에너지(열량)",
  "비타민 C",
  "칼슘",
];

export function KnhanesPage() {
  const [files, setFiles] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [metric, setMetric] = useState("");
  const [sex, setSex] = useState("");
  const [age, setAge] = useState("");
  const [income, setIncome] = useState("");
  const [userValue, setUserValue] = useState("");
  const [queryResult, setQueryResult] = useState<KnhanesQueryResponse | null>(
    null,
  );
  const [groundResult, setGroundResult] = useState<KnhanesGroundResponse | null>(
    null,
  );
  const [groundSex, setGroundSex] = useState("");
  const [groundAge, setGroundAge] = useState("");
  const [groundIncome, setGroundIncome] = useState("");
  const [error, setError] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [groundLoading, setGroundLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFiles = useCallback(async () => {
    const { files: list } = await withAuthRetry(() => api.knhanesListFiles());
    setFiles(list);
    if (list.length > 0) {
      setFileName((prev) => prev || list[0]);
    }
  }, []);

  useEffect(() => {
    loadFiles()
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "파일 목록을 불러올 수 없습니다.",
        );
      })
      .finally(() => setLoading(false));
  }, [loadFiles]);

  async function handleQuery(event: FormEvent) {
    event.preventDefault();
    if (!fileName || !metric.trim()) return;

    setQueryLoading(true);
    setError("");
    setQueryResult(null);

    const filters: { sex?: string; age?: string; income?: string } = {};
    if (sex.trim()) filters.sex = sex.trim();
    if (age.trim()) filters.age = age.trim();
    if (income.trim()) filters.income = income.trim();

    const body: Parameters<typeof api.knhanesQuery>[0] = {
      fileName,
      metric: metric.trim(),
    };
    if (Object.keys(filters).length > 0) body.filters = filters;
    if (userValue.trim()) {
      const parsed = Number(userValue);
      if (!Number.isNaN(parsed)) body.userValue = parsed;
    }

    try {
      const result = await withAuthRetry(() => api.knhanesQuery(body));
      setQueryResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "지표 조회 실패");
    } finally {
      setQueryLoading(false);
    }
  }

  async function handleGround(event: FormEvent) {
    event.preventDefault();
    setGroundLoading(true);
    setError("");
    setGroundResult(null);

    const body: { sex?: string; age?: string; income?: string } = {};
    if (groundSex.trim()) body.sex = groundSex.trim();
    if (groundAge.trim()) body.age = groundAge.trim();
    if (groundIncome.trim()) body.income = groundIncome.trim();

    try {
      const result = await withAuthRetry(() => api.knhanesGround(body));
      setGroundResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "그라운딩 조회 실패");
    } finally {
      setGroundLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="tab-loading">
        <div className="spinner" />
        <p>KNHANES 데이터 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="knhanes-page">
      {error && <div className="banner-error knhanes-error">{error}</div>}

      <section className="knhanes-section">
        <h2>지표 조회</h2>
        <p className="section-desc">
          KNHANES 엑셀 파일에서 국민 건강 통계 지표를 검색합니다.
        </p>

        <form className="knhanes-form" onSubmit={handleQuery}>
          <label>
            데이터 파일
            <select
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              required
            >
              {files.length === 0 ? (
                <option value="">사용 가능한 파일 없음</option>
              ) : (
                files.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))
              )}
            </select>
          </label>

          <label>
            지표명
            <input
              type="text"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              placeholder="예: 식사 거르는 비율"
              list="metric-suggestions"
              required
            />
            <datalist id="metric-suggestions">
              {METRIC_SUGGESTIONS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>

          <div className="filter-grid">
            <label>
              성별 (선택)
              <input
                type="text"
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                placeholder="예: 전체, 남자, 여자"
              />
            </label>
            <label>
              연령 (선택)
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="예: 30-39"
              />
            </label>
            <label>
              소득 (선택)
              <input
                type="text"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="예: 하위, 중위, 상위"
              />
            </label>
          </div>

          <label>
            내 수치 (선택, 편차 계산용)
            <input
              type="number"
              step="any"
              value={userValue}
              onChange={(e) => setUserValue(e.target.value)}
              placeholder="예: 25.5"
            />
          </label>

          <button
            type="submit"
            className="primary-btn"
            disabled={queryLoading || files.length === 0}
          >
            {queryLoading ? "조회 중..." : "지표 조회"}
          </button>
        </form>

        {queryResult && (
          <div className="result-card">
            <h3>조회 결과</h3>
            <dl className="result-dl">
              <div>
                <dt>지표명</dt>
                <dd>{queryResult.metricName}</dd>
              </div>
              <div>
                <dt>국민 평균</dt>
                <dd>
                  {queryResult.nationalAverage !== null
                    ? queryResult.nationalAverage.toLocaleString("ko-KR")
                    : "—"}
                </dd>
              </div>
              {queryResult.userDeviation !== undefined && (
                <div>
                  <dt>편차</dt>
                  <dd>
                    {queryResult.userDeviation.toLocaleString("ko-KR")}
                    {queryResult.userDeviationPercent !== undefined && (
                      <span className="muted">
                        {" "}
                        ({queryResult.userDeviationPercent.toFixed(1)}%)
                      </span>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt>출처 파일</dt>
                <dd>{queryResult.source.file}</dd>
              </div>
              <div>
                <dt>시트</dt>
                <dd>{queryResult.source.sheet}</dd>
              </div>
              <div>
                <dt>위치</dt>
                <dd>
                  {queryResult.source.rowIndex != null &&
                  queryResult.source.colIndex != null
                    ? `행 ${queryResult.source.rowIndex + 1}, 열 ${queryResult.source.colIndex + 1}`
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      <section className="knhanes-section">
        <h2>건강 루틴 그라운딩</h2>
        <p className="section-desc">
          인구통계 정보를 바탕으로 KNHANES 데이터에 근거한 주간 건강 루틴을
          제안합니다.
        </p>

        <form className="knhanes-form" onSubmit={handleGround}>
          <div className="filter-grid">
            <label>
              성별 (선택)
              <input
                type="text"
                value={groundSex}
                onChange={(e) => setGroundSex(e.target.value)}
                placeholder="예: 전체"
              />
            </label>
            <label>
              연령 (선택)
              <input
                type="text"
                value={groundAge}
                onChange={(e) => setGroundAge(e.target.value)}
                placeholder="예: 30-39"
              />
            </label>
            <label>
              소득 (선택)
              <input
                type="text"
                value={groundIncome}
                onChange={(e) => setGroundIncome(e.target.value)}
                placeholder="예: 중위"
              />
            </label>
          </div>

          <button
            type="submit"
            className="primary-btn"
            disabled={groundLoading}
          >
            {groundLoading ? "분석 중..." : "루틴 생성"}
          </button>
        </form>

        {groundResult && (
          <div className="ground-results">
            <div className="result-card">
              <h3>분석 결과</h3>
              <FindingRow label="식사 거름 비율" finding={groundResult.findings.mealSkip} />
              <FindingRow label="단백질 RDA 비율" finding={groundResult.findings.protein} />
              <FindingRow label="에너지 RDA 비율" finding={groundResult.findings.calories} />
            </div>

            {groundResult.routine && (
              <div className="result-card routine-card">
                <h3>{groundResult.routine.title}</h3>
                <p className="routine-reason">{groundResult.routine.reason}</p>
                {groundResult.routine.week.length > 0 ? (
                  <ul className="routine-week">
                    {groundResult.routine.week.map((day) => (
                      <li key={day}>{day}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">상세 루틴 데이터가 없습니다.</p>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function FindingRow({
  label,
  finding,
}: {
  label: string;
  finding?: {
    available: boolean;
    value?: number | null;
    message?: string;
  };
}) {
  if (!finding) return null;

  return (
    <div className="finding-row">
      <span className="finding-label">{label}</span>
      {finding.available ? (
        <span className="finding-value">
          {finding.value !== null && finding.value !== undefined
            ? `${finding.value.toLocaleString("ko-KR")}%`
            : "—"}
        </span>
      ) : (
        <span className="finding-unavailable">
          {finding.message ?? "데이터 없음"}
        </span>
      )}
    </div>
  );
}
