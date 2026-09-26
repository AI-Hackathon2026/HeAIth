import { FormEvent, useState } from "react";

export type AuthMode = "signin" | "signup";

interface AuthFormProps {
  mode: AuthMode;
  email: string;
  username: string;
  password: string;
  error: string;
  emailHint: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onEmailBlur: () => void;
  onSubmit: (event: FormEvent) => void;
  submitLabel?: string;
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3L21 21M10.6 10.6C10.2 11 10 11.5 10 12C10 13.1 10.9 14 12 14C12.5 14 13 13.8 13.4 13.4M6.7 6.7C4.9 8.1 3.5 10 2.5 12C2.5 12 5.5 19 12 19C13.8 19 15.4 18.4 16.7 17.5M9.9 5.1C10.6 5 11.3 5 12 5C18.5 5 22 12 22 12C21.4 13.2 20.5 14.3 19.4 15.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AuthForm({
  mode,
  email,
  username,
  password,
  error,
  emailHint,
  loading,
  onEmailChange,
  onUsernameChange,
  onPasswordChange,
  onEmailBlur,
  onSubmit,
  submitLabel,
}: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const defaultSubmitLabel = mode === "signin" ? "로그인" : "회원가입";

  return (
    <form onSubmit={onSubmit} className="auth-form">
      <label>
        이메일
        <input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          onBlur={onEmailBlur}
          placeholder="user@example.com"
          required
          autoComplete="email"
        />
        {emailHint && <span className="field-hint warn">{emailHint}</span>}
      </label>

      {mode === "signup" && (
        <label>
          사용자 이름
          <input
            type="text"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder="홍길동"
            required
            autoComplete="username"
          />
        </label>
      )}

      <label>
        비밀번호
        <div className="auth-password-field">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="8자 이상"
            required
            minLength={7}
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeIcon /> : <EyeOffIcon />}
          </button>
        </div>
      </label>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="primary-btn" disabled={loading}>
        {loading ? "처리 중..." : (submitLabel ?? defaultSubmitLabel)}
      </button>
    </form>
  );
}
