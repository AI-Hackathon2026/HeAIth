import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HeAIthLogo } from "../components/HeAIthLogo";

const PAGE_COUNT = 2;
const FADE_MS = 480;
const WHEEL_THRESHOLD = 36;

type FadePhase = "steady" | "out" | "in";

const PAGE_LABELS = ["메인", "소개 영상"];

export function HomePage() {
  const [page, setPage] = useState(0);
  const [fade, setFade] = useState<FadePhase>("in");
  const locked = useRef(false);
  const touchStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const featureVideoRef = useRef<HTMLVideoElement>(null);

  const goToPage = useCallback(
    (target: number) => {
      if (
        locked.current ||
        target === page ||
        target < 0 ||
        target >= PAGE_COUNT
      ) {
        return;
      }

      locked.current = true;
      setFade("out");

      window.setTimeout(() => {
        setPage(target);
        setFade("in");

        window.setTimeout(() => {
          setFade("steady");
          locked.current = false;
        }, FADE_MS);
      }, FADE_MS);
    },
    [page],
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => setFade("steady"), FADE_MS);
    return () => {
      document.body.style.overflow = "";
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    function onWheel(event: WheelEvent) {
      if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;

      if (locked.current) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      goToPage(event.deltaY > 0 ? page + 1 : page - 1);
    }

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [goToPage, page]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        goToPage(page + 1);
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        goToPage(page - 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToPage, page]);

  useEffect(() => {
    const video = featureVideoRef.current;
    if (!video) return;

    if (page === 1) {
      void video.play().catch(() => undefined);
      return;
    }

    video.pause();
    video.currentTime = 0;
  }, [page]);

  function handleTouchStart(event: React.TouchEvent) {
    touchStartY.current = event.touches[0]?.clientY ?? 0;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const endY = event.changedTouches[0]?.clientY ?? 0;
    const delta = touchStartY.current - endY;
    if (Math.abs(delta) < 56) return;
    goToPage(delta > 0 ? page + 1 : page - 1);
  }

  return (
    <div
      ref={scrollRef}
      className="landing-scroll"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`landing-page landing-page--${fade}`}
        aria-live="polite"
      >
        {page === 0 && (
          <section className="landing-hero landing-panel">
            <div className="landing-hero-content">
              <span className="landing-badge">Health + AI Platform</span>
              <h1 className="landing-title">
                <HeAIthLogo size="lg" />
              </h1>
              <p className="landing-tagline">AI가 만드는 건강의 미래</p>
              <p className="landing-desc">
                HeAIth는 국민건강통계 데이터를 기반으로 <br />
                개인 맞춤형 건강 루틴과 AI 상담을 제공합니다.
              </p>
              <div className="landing-hero-actions">
                <Link to="/login" className="primary-btn landing-cta-primary">
                  무료로 시작하기
                </Link>
                <button
                  type="button"
                  className="ghost-btn landing-cta-secondary"
                  onClick={() => goToPage(1)}
                >
                  소개 영상 보기
                </button>
              </div>
            </div>
            <div className="landing-hero-visual" aria-hidden>
              <div className="landing-hero-ripples">
                <span className="landing-hero-ripple" />
                <span className="landing-hero-ripple" />
                <span className="landing-hero-ripple" />
              </div>
              <div className="landing-hero-core">
                <span className="landing-hero-icon">+</span>
              </div>
            </div>
          </section>
        )}

        {page === 1 && (
          <section className="landing-section landing-video landing-panel">
            <h2 className="landing-section-title">HeAIth 소개</h2>
            <p className="landing-section-subtitle">
              맞춤 건강 루틴과 AI 상담이 어떻게 동작하는지 확인해 보세요
            </p>
            <div className="landing-video-wrap">
              <video
                ref={featureVideoRef}
                className="landing-video-player"
                src="/video/heaith-demo.mp4"
                controls
                playsInline
                muted
                loop
                preload="metadata"
                aria-label="HeAIth 서비스 소개 영상"
              />
            </div>
          </section>
        )}
      </div>

      {page === 0 && (
        <button
          type="button"
          className="landing-scroll-arrow landing-scroll-arrow--down"
          aria-label="소개 영상으로 이동"
          onClick={() => goToPage(1)}
        >
          <i className="ti ti-chevron-down" aria-hidden />
        </button>
      )}
      {page === 1 && (
        <button
          type="button"
          className="landing-scroll-arrow landing-scroll-arrow--up"
          aria-label="메인으로 이동"
          onClick={() => goToPage(0)}
        >
          <i className="ti ti-chevron-up" aria-hidden />
        </button>
      )}

      <nav className="landing-scroll-nav" aria-label="페이지 이동">
        {PAGE_LABELS.map((label, index) => (
          <button
            key={label}
            type="button"
            className={page === index ? "active" : ""}
            aria-label={label}
            aria-current={page === index ? "true" : undefined}
            onClick={() => goToPage(index)}
          >
            <span className="landing-scroll-nav-dot" />
          </button>
        ))}
      </nav>
    </div>
  );
}
