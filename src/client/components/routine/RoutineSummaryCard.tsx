import { MarkdownContent } from "../MarkdownContent";

interface Props {
  summary: string;
  reportReadme?: string;
}

export function RoutineSummaryCard({ summary, reportReadme }: Props) {
  const readme = reportReadme?.trim() ?? "";
  const headline = summary.trim();

  if (!headline && !readme) return null;

  return (
    <div className="routine-summary-card">
      {headline && <p className="routine-summary-headline">{headline}</p>}

      {readme && (
        <details className="routine-readme-details">
          <summary className="routine-readme-summary">
            <span className="routine-readme-summary-icon" aria-hidden>
              ✦
            </span>
            왜 이 루틴인가요?
          </summary>
          <div className="routine-readme-body">
            <MarkdownContent content={readme} />
          </div>
        </details>
      )}
    </div>
  );
}
