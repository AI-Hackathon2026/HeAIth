import { Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { HeAIthLogo } from "./HeAIthLogo";

export const PUBLIC_BG_BLUR_MS = 450;

export function PublicLayout() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isLogin = location.pathname === "/login";
  const showHeader = !isHome && !isLogin;
  const [meshBlurred, setMeshBlurred] = useState(false);
  const skipBlur = useRef(true);

  useEffect(() => {
    if (skipBlur.current) {
      skipBlur.current = false;
      return;
    }

    setMeshBlurred(true);
    const timer = window.setTimeout(() => setMeshBlurred(false), PUBLIC_BG_BLUR_MS);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="public-layout">
      <div
        className={`mesh-bg${meshBlurred ? " mesh-bg--transition" : ""}`}
        aria-hidden="true"
      >
        <div className="mesh-orb mesh-orb--1" />
        <div className="mesh-orb mesh-orb--2" />
        <div className="mesh-orb mesh-orb--3" />
        <div className="mesh-grid" />
      </div>

      {!showHeader ? null : (
        <header className="public-header">
          <Link to="/" className="public-header-brand">
            <HeAIthLogo size="sm" />
          </Link>
          <nav className="public-header-nav">
            <Link to="/" className="public-nav-link">
              홈
            </Link>
            <Link
              to="/login"
              className={`public-nav-link ${location.pathname === "/login" ? "active" : ""}`}
            >
              로그인
            </Link>
            <Link to="/login" className="primary-btn public-nav-cta">
              시작하기
            </Link>
          </nav>
        </header>
      )}

      <main className="public-main">
        <div key={location.pathname} className="public-page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
