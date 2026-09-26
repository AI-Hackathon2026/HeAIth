interface Props {
  filename: string;
  fileDetailsReady?: boolean;
  pdfStreamReady?: boolean;
  progress?: number | null;
}

export function PdfViewerPageLoading({
  filename,
  fileDetailsReady = false,
  pdfStreamReady = false,
  progress = null,
}: Props) {
  const showProgress = progress != null && progress >= 0;

  return (
    <div className="pdf-page-loading">
      <div className="pdf-page-loading-card">
        <div className="pdf-page-loading-icon" aria-hidden>
          📄
        </div>
        <h2 className="pdf-page-loading-title">Opening document</h2>
        <p className="pdf-page-loading-filename">{filename}</p>

        <ul className="pdf-page-loading-checklist">
          <li className={fileDetailsReady ? "done" : ""}>
            <span className="pdf-page-loading-check" aria-hidden>
              {fileDetailsReady ? "✓" : "○"}
            </span>
            File details
          </li>
          <li className={pdfStreamReady ? "done" : ""}>
            <span className="pdf-page-loading-check" aria-hidden>
              {pdfStreamReady ? "✓" : "○"}
            </span>
            PDF stream
          </li>
        </ul>

        <div
          className={`pdf-page-loading-bar${showProgress ? "" : " pdf-page-loading-bar--indeterminate"}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={showProgress ? Math.round(progress!) : undefined}
        >
          <div
            className="pdf-page-loading-bar-fill"
            style={showProgress ? { width: `${Math.min(100, progress!)}%` } : undefined}
          />
        </div>
      </div>
    </div>
  );
}
