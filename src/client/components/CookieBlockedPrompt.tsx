import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isUsingApiProxy } from "../api/baseUrl";
import {
  hasStorageCookieAccess,
  isCrossOriginApi,
  requestStorageCookieAccess,
  supportsStorageAccessRequest,
  verifyAuthSession,
} from "../utils/cookieSupport";
import { isStandalonePwa, openInSystemBrowser } from "../utils/pwa";

interface CookieBlockedPromptProps {
  open: boolean;
  onClose: () => void;
  onResolved?: () => void;
  reason?: "login" | "session" | "precheck";
}

export function CookieBlockedPrompt({
  open,
  onClose,
  onResolved,
  reason = "login",
}: CookieBlockedPromptProps) {
  const [allowing, setAllowing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [storageGranted, setStorageGranted] = useState<boolean | null>(null);

  const canRequestNativePrompt = supportsStorageAccessRequest();
  const usingProxy = isUsingApiProxy();

  useEffect(() => {
    if (!open) {
      setAllowing(false);
      setStatusMessage(null);
      setStorageGranted(null);
      return;
    }

    void hasStorageCookieAccess().then((granted) => {
      setStorageGranted(granted);
    });
  }, [open]);

  if (!open) return null;

  async function handleAllowCookies() {
    setAllowing(true);
    setStatusMessage(null);

    const result = await requestStorageCookieAccess();
    setAllowing(false);

    if (result === "granted") {
      setStorageGranted(true);
      setStatusMessage("쿠키가 허용되었습니다. 로그인을 계속해 주세요.");

      const sessionOk = await verifyAuthSession();
      if (sessionOk) {
        onResolved?.();
      }
      return;
    }

    if (result === "unsupported") {
      setStatusMessage(
        "이 브라우저는 자동 허용을 지원하지 않습니다. 아래 '브라우저에서 열기'를 사용해 주세요.",
      );
      return;
    }

    setStatusMessage(
      "쿠키 허용이 거부되었습니다. 브라우저에서 HeAIth를 열어 로그인해 주세요.",
    );
  }

  async function handleRetrySession() {
    setAllowing(true);
    setStatusMessage(null);

    const sessionOk = await verifyAuthSession();
    setAllowing(false);

    if (sessionOk) {
      setStatusMessage("로그인 세션이 연결되었습니다.");
      onResolved?.();
      return;
    }

    setStatusMessage("아직 로그인되지 않았습니다. 쿠키 허용 후 다시 로그인해 주세요.");
  }

  const title = usingProxy
    ? "로그인 연결을 확인해 주세요"
    : "쿠키 허용이 필요합니다";

  const intro = usingProxy
    ? "로그인 정보를 저장하지 못했습니다. 아래 버튼으로 다시 시도해 주세요."
    : reason === "precheck"
      ? "앱에서 로그인하려면 먼저 쿠키를 허용해야 합니다. 아래 버튼을 누르면 브라우저 허용 창이 표시됩니다."
      : reason === "session"
        ? "로그인 세션이 유지되지 않았습니다. 쿠키를 허용한 뒤 다시 로그인해 주세요."
        : "로그인은 되었지만 쿠키가 차단되어 세션을 유지할 수 없습니다.";

  return createPortal(
    <div
      className="modal-backdrop cookie-blocked-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-card cookie-blocked-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-blocked-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="cookie-blocked-title" className="modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="cookie-blocked-body">
          <p className="cookie-blocked-intro">{intro}</p>

          {!usingProxy && isStandalonePwa() && canRequestNativePrompt && (
            <div className="cookie-blocked-hero">
              <button
                type="button"
                className="primary-btn cookie-blocked-allow-btn"
                disabled={allowing || storageGranted === true}
                onClick={() => void handleAllowCookies()}
              >
                {allowing
                  ? "허용 창 표시 중..."
                  : storageGranted
                    ? "쿠키 허용됨"
                    : "쿠키 허용"}
              </button>
              <p className="cookie-blocked-hero-hint">
                탭하면 iPhone/Android 브라우저 허용 팝업이 표시됩니다.
              </p>
            </div>
          )}

          {usingProxy && (
            <div className="cookie-blocked-hero">
              <button
                type="button"
                className="primary-btn cookie-blocked-allow-btn"
                disabled={allowing}
                onClick={() => void handleRetrySession()}
              >
                {allowing ? "확인 중..." : "다시 시도"}
              </button>
            </div>
          )}

          {!usingProxy && !canRequestNativePrompt && isCrossOriginApi() && (
            <p className="cookie-blocked-warning">
              이 기기에서는 자동 쿠키 허용을 지원하지 않습니다. Safari 또는
              Chrome에서 HeAIth를 열어 주세요.
            </p>
          )}

          {statusMessage && (
            <p
              className={
                statusMessage.includes("허용되었") ||
                statusMessage.includes("연결되었")
                  ? "cookie-blocked-status cookie-blocked-status--ok"
                  : "cookie-blocked-status"
              }
            >
              {statusMessage}
            </p>
          )}

          <div className="cookie-blocked-actions">
            <button
              type="button"
              className={usingProxy ? "ghost-btn" : "primary-btn"}
              onClick={() => openInSystemBrowser()}
            >
              Safari / Chrome에서 열기
            </button>
            {!usingProxy && (
              <button
                type="button"
                className="ghost-btn"
                disabled={allowing}
                onClick={() => void handleRetrySession()}
              >
                {allowing ? "확인 중..." : "로그인 상태 확인"}
              </button>
            )}
            <button type="button" className="ghost-btn" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface PwaCookieHintProps {
  onAllow: () => void;
}

/** One-tap entry on auth screens inside the installed PWA. */
export function PwaCookieHint({ onAllow }: PwaCookieHintProps) {
  if (!shouldShowPwaCookieHint()) return null;

  return (
    <div className="pwa-cookie-hint" role="note">
      <p>앱에서 로그인하려면 쿠키 허용이 필요합니다.</p>
      <button type="button" className="primary-btn pwa-cookie-hint-allow" onClick={onAllow}>
        쿠키 허용
      </button>
    </div>
  );
}

function shouldShowPwaCookieHint(): boolean {
  if (!isStandalonePwa()) return false;
  if (isUsingApiProxy()) return false;
  return isCrossOriginApi();
}

/** Auto-open the allow prompt when the PWA login screen loads. */
export function usePwaCookiePrecheck(enabled: boolean): {
  showPrecheckPrompt: boolean;
  dismissPrecheck: () => void;
} {
  const [showPrecheckPrompt, setShowPrecheckPrompt] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function run() {
      if (!isStandalonePwa() || isUsingApiProxy()) return;

      const granted = await hasStorageCookieAccess();
      if (!cancelled && !granted && isCrossOriginApi()) {
        setShowPrecheckPrompt(true);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    showPrecheckPrompt,
    dismissPrecheck: () => setShowPrecheckPrompt(false),
  };
}
