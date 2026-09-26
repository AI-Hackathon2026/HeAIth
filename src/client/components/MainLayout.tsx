import type { ReactNode } from "react";
import { HeAIthLogo } from "./HeAIthLogo";

interface MainLayoutProps {
  username: string;
  isAdmin: boolean;
  onSignOut: () => void;
  children: ReactNode;
}

export function MainLayout({
  username,
  isAdmin,
  onSignOut,
  children,
}: MainLayoutProps) {
  return (
    <div className="main-layout">
      <header className="main-header main-header--minimal">
        <div className="main-brand">
          <HeAIthLogo size="sm" />
          {isAdmin && (
            <span className="main-brand-tagline">Admin Console</span>
          )}
        </div>

        <div className="main-user">
          <span className="user-avatar">{username.charAt(0).toUpperCase()}</span>
          <span className="user-name">{username}</span>
          {isAdmin && <span className="admin-badge">관리자</span>}
          <button type="button" className="ghost-btn" onClick={onSignOut}>
            로그아웃
          </button>
        </div>
      </header>

      <div className="main-content main-content--routine">{children}</div>
    </div>
  );
}
