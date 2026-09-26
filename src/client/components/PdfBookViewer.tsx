import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { PdfViewerPageLoading } from "./PdfViewerPageLoading";
import { apiUrl } from "../api/baseUrl";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MOBILE_BREAKPOINT = 1024;
const BOOK_PAGE_MAX_WIDTH = 520;
const BOOK_GRID_GAP_PX = 12;
const DESKTOP_SPREAD_PAGE_FRAME = 20;
const MOBILE_PAGE_MAX_WIDTH = 700;
const FLIP_DURATION = 460;

function toSpreadStart(page: number): number {
  return page % 2 === 0 ? Math.max(1, page - 1) : Math.max(1, page);
}

function clampPage(page: number, total: number): number {
  return Math.min(Math.max(1, page), Math.max(1, total));
}

function clamp(val: number, lo: number, hi: number): number {
  return Math.min(Math.max(val, lo), hi);
}

interface PdfBookViewerProps {
  fileId: string;
  filename: string;
  onClose: () => void;
}

export function PdfBookViewer({ fileId, filename, onClose }: PdfBookViewerProps) {
  // ── presigned URL ────────────────────────────────────────────────
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [fetchState, setFetchState] = useState<"loading" | "ready" | "error">("loading");
  const [fetchError, setFetchError] = useState("");

  const loadPresignedUrl = useCallback(() => {
    setFetchState("loading");
    setPresignedUrl(null);
    setFetchError("");
    fetch(apiUrl(`/files/download/${fileId}`), { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          throw new Error(`HTTP ${r.status}${t ? ` – ${t.slice(0, 100)}` : ""}`);
        }
        const json = (await r.json()) as { url?: string };
        if (!json.url) throw new Error("presigned URL이 응답에 없습니다.");
        return json.url;
      })
      .then((url) => { setPresignedUrl(url); setFetchState("ready"); })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setFetchError(msg);
        setFetchState("error");
      });
  }, [fileId]);

  useEffect(() => { loadPresignedUrl(); }, [loadPresignedUrl]);

  // ── PDF state ────────────────────────────────────────────────────
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev" | null>(null);
  const [mobileTransition, setMobileTransition] = useState<{
    from: number; to: number; direction: "next" | "prev";
  } | null>(null);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // ── Viewport measurement ────────────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const update = () => {
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const s = getComputedStyle(viewportRef.current);
      const pl = parseFloat(s.paddingLeft) || 0;
      const pr = parseFloat(s.paddingRight) || 0;
      setViewportWidth(Math.max(0, Math.round(rect.width - pl - pr)));
    };
    update();
    const el = viewportRef.current;
    const ro = el ? new ResizeObserver(update) : null;
    if (ro && el) ro.observe(el);
    window.addEventListener("resize", update);
    return () => { ro?.disconnect(); window.removeEventListener("resize", update); };
  }, []);

  const isSinglePageView = viewportWidth > 0 && viewportWidth < MOBILE_BREAKPOINT;
  const effectiveLeftPage = isSinglePageView ? currentPage : toSpreadStart(currentPage);
  const leftPage = effectiveLeftPage;
  const rightPage = !isSinglePageView && effectiveLeftPage + 1 <= numPages
    ? effectiveLeftPage + 1 : null;
  const canFlipNext = isSinglePageView ? currentPage < numPages : effectiveLeftPage + 2 <= numPages;
  const canFlipPrev = isSinglePageView ? currentPage > 1 : effectiveLeftPage > 1;

  const pageWidth = useMemo(() => {
    if (viewportWidth <= 0) return BOOK_PAGE_MAX_WIDTH;
    if (isSinglePageView) {
      return clamp(Math.floor(viewportWidth - 24), 240, MOBILE_PAGE_MAX_WIDTH);
    }
    return clamp(
      Math.floor((viewportWidth - BOOK_GRID_GAP_PX - 2 * DESKTOP_SPREAD_PAGE_FRAME) / 2),
      200, BOOK_PAGE_MAX_WIDTH
    );
  }, [viewportWidth, isSinglePageView]);

  // ── Navigation ───────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!canFlipNext || flipDirection) return;
    setFlipDirection("next");
    if (isSinglePageView) {
      const target = Math.min(numPages, currentPage + 1);
      setMobileTransition({ from: currentPage, to: target, direction: "next" });
      flipTimerRef.current = setTimeout(() => {
        setCurrentPage(target);
        setMobileTransition(null);
        setFlipDirection(null);
      }, FLIP_DURATION);
    } else {
      flipTimerRef.current = setTimeout(() => {
        setCurrentPage((p) => Math.min(numPages, p + 2));
        setFlipDirection(null);
      }, FLIP_DURATION);
    }
  }, [canFlipNext, flipDirection, isSinglePageView, numPages, currentPage]);

  const goPrev = useCallback(() => {
    if (!canFlipPrev || flipDirection) return;
    setFlipDirection("prev");
    if (isSinglePageView) {
      const target = Math.max(1, currentPage - 1);
      setMobileTransition({ from: currentPage, to: target, direction: "prev" });
      flipTimerRef.current = setTimeout(() => {
        setCurrentPage(target);
        setMobileTransition(null);
        setFlipDirection(null);
      }, FLIP_DURATION);
    } else {
      flipTimerRef.current = setTimeout(() => {
        setCurrentPage((p) => Math.max(1, p - 2));
        setFlipDirection(null);
      }, FLIP_DURATION);
    }
  }, [canFlipPrev, flipDirection, isSinglePageView, currentPage]);

  const goToPage = useCallback((page: number) => {
    if (!numPages) return;
    const target = clampPage(page, numPages);
    const resolved = isSinglePageView ? target : toSpreadStart(target);
    if (flipTimerRef.current) { clearTimeout(flipTimerRef.current); flipTimerRef.current = null; }
    setFlipDirection(null);
    setMobileTransition(null);
    setCurrentPage(resolved);
  }, [numPages, isSinglePageView]);

  useEffect(() => () => {
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
  }, []);

  // ── Keyboard ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (flipDirection) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft"  || e.key === "PageUp")   { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goNext, goPrev, flipDirection]);

  // ── Page label ───────────────────────────────────────────────────
  const pageLabel = isSinglePageView
    ? `${currentPage} / ${numPages}`
    : rightPage
      ? `${leftPage}–${rightPage} / ${numPages}`
      : `${leftPage} / ${numPages}`;

  const downloadProgress =
    loadProgress.total > 0
      ? Math.round((loadProgress.loaded / loadProgress.total) * 88)
      : null;

  return (
    <div className="bv-shell">
      {/* Header */}
      <div className="bv-header">
        <button className="bv-back-btn" onClick={onClose} title="목록으로">
          ← 목록
        </button>
        <span className="bv-filename">{filename}</span>
        <span className="bv-page-label">
          {numPages > 0 ? pageLabel : ""}
        </span>
      </div>

      {/* Book viewport */}
      <div className="bv-viewport" ref={viewportRef}>
        {fetchState === "loading" && (
          <PdfViewerPageLoading
            filename={filename}
            fileDetailsReady
            progress={null}
          />
        )}

        {fetchState === "error" && (
          <div className="bv-center-msg bv-center-msg--error">
            <p>PDF를 불러올 수 없습니다.</p>
            {fetchError && <code className="pdf-error-detail">{fetchError}</code>}
            <button className="primary-btn" style={{ marginTop: "1rem" }} onClick={loadPresignedUrl}>
              다시 시도
            </button>
          </div>
        )}

        {fetchState === "ready" && presignedUrl && (
          <Document
            key={presignedUrl}
            file={presignedUrl}
            onLoadProgress={({ loaded, total }) =>
              setLoadProgress({ loaded, total: total ?? 0 })
            }
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            loading={
              <PdfViewerPageLoading
                filename={filename}
                fileDetailsReady
                pdfStreamReady
                progress={downloadProgress}
              />
            }
            error={
              <div className="bv-center-msg">
                <p>PDF 렌더링 오류</p>
                {presignedUrl && (
                  <button
                    className="primary-btn"
                    style={{ marginTop: "1rem" }}
                    onClick={() => window.open(presignedUrl, "_blank")}
                  >
                    새 탭에서 열기
                  </button>
                )}
              </div>
            }
            className="bv-document"
          >
            {/* Spine dividers (desktop spread only) */}
            {!isSinglePageView && (
              <>
                <div className="bv-spine-line" />
                <div className="bv-spine-glow" />
              </>
            )}

            {/* Book grid */}
            <div
              className={isSinglePageView ? "bv-single-grid" : "bv-spread-grid"}
              onWheel={(e) => {
                if (isSinglePageView || flipDirection) return;
                e.preventDefault();
                e.stopPropagation();
                if (Math.abs(e.deltaY) < 8) return;
                if (e.deltaY > 0) goNext(); else goPrev();
              }}
              onTouchStart={(e) => {
                if (!isSinglePageView) return;
                setTouchStartX(e.touches[0]?.clientX ?? null);
              }}
              onTouchEnd={(e) => {
                if (!isSinglePageView || touchStartX === null) return;
                const endX = e.changedTouches[0]?.clientX;
                if (typeof endX !== "number") return;
                const delta = touchStartX - endX;
                if (Math.abs(delta) >= 44) {
                  if (delta > 0) goNext(); else goPrev();
                }
                setTouchStartX(null);
              }}
            >
              <BookPage
                pageNumber={leftPage}
                pageWidth={pageWidth}
                isRightPage={false}
                isMobileView={isSinglePageView}
                mobileIncomingPage={
                  isSinglePageView ? mobileTransition?.to ?? null : null
                }
                mobileTransitionDirection={
                  isSinglePageView ? mobileTransition?.direction ?? null : null
                }
                onNavigatePrev={goPrev}
                onNavigateNext={goNext}
              />
              {!isSinglePageView && (
                rightPage ? (
                  <BookPage
                    pageNumber={rightPage}
                    pageWidth={pageWidth}
                    isRightPage
                    isMobileView={false}
                    onNavigatePrev={goPrev}
                    onNavigateNext={goNext}
                  />
                ) : (
                  <div className="bv-blank-page" />
                )
              )}
            </div>

            {/* Flip overlay (desktop only) */}
            {flipDirection && !isSinglePageView && (
              <div className={`bv-flip-overlay bv-flip-${flipDirection}`}>
                <div className="bv-flip-bg" />
                <div className="bv-flip-shadow" />
              </div>
            )}
          </Document>
        )}
      </div>

      {/* Bottom controls */}
      {numPages > 0 && (
        <div className="bv-controls">
          <button
            className="bv-nav-btn"
            onClick={goPrev}
            disabled={!canFlipPrev || Boolean(flipDirection)}
          >
            ← {isSinglePageView ? "이전 페이지" : "이전 페이지"}
          </button>

          {numPages > 1 && (
            <div className="bv-scrubber-wrap">
              <input
                type="range"
                min={1}
                max={numPages}
                step={1}
                value={currentPage}
                onChange={(e) => goToPage(Number(e.target.value))}
                className="bv-scrubber"
                aria-label="페이지 이동"
              />
            </div>
          )}

          <button
            className="bv-nav-btn"
            onClick={goNext}
            disabled={!canFlipNext || Boolean(flipDirection)}
          >
            {isSinglePageView ? "다음 페이지" : "다음 페이지"} →
          </button>
        </div>
      )}
    </div>
  );
}

// ── BookPage sub-component ────────────────────────────────────────

interface BookPageProps {
  pageNumber: number;
  pageWidth: number;
  isRightPage: boolean;
  isMobileView: boolean;
  mobileIncomingPage?: number | null;
  mobileTransitionDirection?: "next" | "prev" | null;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
}

function BookPage({
  pageNumber, pageWidth, isRightPage, isMobileView,
  mobileIncomingPage, mobileTransitionDirection,
  onNavigatePrev, onNavigateNext,
}: BookPageProps) {
  const renderPage = (pn: number) => (
    <Page
      pageNumber={pn}
      width={pageWidth}
      renderTextLayer
      renderAnnotationLayer={false}
    />
  );

  return (
    <div
      className={[
        "bv-book-page",
        isRightPage ? "bv-page-right" : "bv-page-left",
      ].join(" ")}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (isMobileView) {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x < rect.width / 2) onNavigatePrev(); else onNavigateNext();
          return;
        }
        if (isRightPage) onNavigateNext(); else onNavigatePrev();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isRightPage) onNavigateNext(); else onNavigatePrev();
        }
      }}
    >
      <div className="bv-page-label-row">
        <p className="bv-page-num">Page {pageNumber}</p>
      </div>
      <div className="bv-page-canvas">
        {isMobileView && mobileIncomingPage && mobileTransitionDirection ? (
          <>
            <div
              className={[
                "bv-mobile-page",
                mobileTransitionDirection === "next"
                  ? "bv-slide-out-next"
                  : "bv-slide-out-prev",
              ].join(" ")}
            >
              {renderPage(pageNumber)}
            </div>
            <div
              className={[
                "bv-mobile-page bv-mobile-incoming",
                mobileTransitionDirection === "next"
                  ? "bv-slide-in-next"
                  : "bv-slide-in-prev",
              ].join(" ")}
            >
              {renderPage(mobileIncomingPage)}
            </div>
          </>
        ) : (
          renderPage(pageNumber)
        )}
      </div>
      <div className={[
        "bv-page-hover-edge",
        isRightPage ? "bv-hover-right" : "bv-hover-left",
      ].join(" ")} />
    </div>
  );
}
