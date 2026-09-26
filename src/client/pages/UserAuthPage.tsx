import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, saveUsername } from "../api/client";
import { AuthForm } from "../components/AuthForm";
import {
  CookieBlockedPrompt,
  PwaCookieHint,
  usePwaCookiePrecheck,
} from "../components/CookieBlockedPrompt";
import { HeAIthLogo } from "../components/HeAIthLogo";
import { SignupSuccessScreen } from "../components/SignupSuccessScreen";
import {
  ensureCookieAccessForLogin,
  verifyAuthSession,
} from "../utils/cookieSupport";
import { verifyIsAdmin, isAdminRole } from "../utils/authRole";

export function UserAuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [showCookiePrompt, setShowCookiePrompt] = useState(false);
  const { showPrecheckPrompt, dismissPrecheck } = usePwaCookiePrecheck(
    mode === "signin" && !signupComplete,
  );
  const cookiePromptOpen = showCookiePrompt || showPrecheckPrompt;

  useEffect(() => {
    const state = location.state as { cookieBlocked?: boolean } | null;
    if (state?.cookieBlocked) {
      setShowCookiePrompt(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  async function handleEmailBlur() {
    if (mode !== "signup" || !email.trim()) return;
    setEmailHint("");
    try {
      const result = await api.checkEmail(email.trim());
      if (result.message.toLowerCase().includes("exists")) {
        setEmailHint("이미 사용 중인 이메일입니다.");
      }
    } catch {
      // ignore check failures
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signin") {
        const cookieAccess = await ensureCookieAccessForLogin();
        if (!cookieAccess.ok) {
          setShowCookiePrompt(true);
          setError("로그인하려면 먼저 쿠키를 허용해 주세요.");
          return;
        }

        const result = await api.signIn(email, password);
        const isAdmin =
          isAdminRole(result.role) || (await verifyIsAdmin(result.role));
        if (isAdmin) {
          await api.signOut();
          setError("관리자 계정입니다. 관리자 로그인을 이용해 주세요.");
          return;
        }
        saveUsername(result.username);
        const sessionOk = await verifyAuthSession();
        if (!sessionOk) {
          await api.signOut().catch(() => undefined);
          setShowCookiePrompt(true);
          setError(
            "로그인은 되었지만 쿠키가 차단되어 세션을 유지할 수 없습니다.",
          );
          return;
        }
        navigate("/app", { replace: true });
      } else {
        await api.signUp(email, username, password);
        setSignupComplete(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="auth-split">
      <div className="auth-split-brand">
        <Link to="/" className="auth-split-logo-link" aria-label="HeAIth 홈으로">
          <HeAIthLogo size="lg" />
        </Link>
        <p className="auth-split-tagline">AI가 만드는 건강의 미래</p>
        <ul className="auth-split-features">
          <li>AI 건강 상담 챗봇</li>
          <li>KNHANES 건강통계 탐색</li>
          <li>맞춤형 건강 인사이트</li>
        </ul>
      </div>

      <div className="auth-split-form">
        <div className="auth-card auth-card--glass">
          {signupComplete ? (
            <SignupSuccessScreen
              email={email}
              onSignIn={() => {
                setSignupComplete(false);
                setMode("signin");
                setPassword("");
                setError("");
              }}
            />
          ) : (
            <>
              <h1>{mode === "signin" ? "로그인" : "회원가입"}</h1>
              <p className="auth-subtitle">
                HeAIth 계정으로 AI 건강 서비스를 이용하세요.
              </p>

              <div className="auth-tabs" role="tablist" aria-label="인증 방식">
                <div
                  className="auth-tabs-slider"
                  data-active={mode}
                  aria-hidden
                />
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signin"}
                  className={mode === "signin" ? "active" : ""}
                  onClick={() => {
                    setMode("signin");
                    setError("");
                  }}
                >
                  로그인
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signup"}
                  className={mode === "signup" ? "active" : ""}
                  onClick={() => {
                    setMode("signup");
                    setError("");
                  }}
                >
                  회원가입
                </button>
              </div>

              <PwaCookieHint onAllow={() => setShowCookiePrompt(true)} />

              <AuthForm
                mode={mode}
                email={email}
                username={username}
                password={password}
                error={error}
                emailHint={emailHint}
                loading={loading}
                onEmailChange={(value) => {
                  setEmail(value);
                  setEmailHint("");
                }}
                onUsernameChange={setUsername}
                onPasswordChange={setPassword}
                onEmailBlur={() => void handleEmailBlur()}
                onSubmit={(e) => void handleSubmit(e)}
              />

              <p className="auth-footer-link">
                관리자이신가요?{" "}
                <Link to="/admin/login">관리자 로그인</Link>
              </p>
            </>
          )}
        </div>
      </div>
      </div>

      <CookieBlockedPrompt
        open={cookiePromptOpen}
        onClose={() => {
          setShowCookiePrompt(false);
          dismissPrecheck();
        }}
        onResolved={() => {
          setShowCookiePrompt(false);
          dismissPrecheck();
          setError("");
          navigate("/app", { replace: true });
        }}
        reason={
          showPrecheckPrompt ? "precheck" : error ? "login" : "session"
        }
      />
    </>
  );
}
