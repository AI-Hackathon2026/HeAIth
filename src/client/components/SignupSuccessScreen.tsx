import { Link } from "react-router-dom";

interface SignupSuccessScreenProps {
  email: string;
  onSignIn: () => void;
}

export function SignupSuccessScreen({ email, onSignIn }: SignupSuccessScreenProps) {
  return (
    <div className="signup-success" role="status" aria-live="polite">
      <div className="signup-success__glow" aria-hidden />
      <div className="signup-success__ring signup-success__ring--outer" aria-hidden />
      <div className="signup-success__ring signup-success__ring--inner" aria-hidden />

      <div className="signup-success__icon-wrap">
        <svg
          className="signup-success__check"
          viewBox="0 0 96 96"
          aria-hidden
        >
          <circle
            className="signup-success__circle"
            cx="48"
            cy="48"
            r="42"
            fill="none"
            strokeWidth="3"
          />
          <path
            className="signup-success__tick"
            d="M28 48 L42 62 L68 34"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="signup-success__spark signup-success__spark--1" aria-hidden />
        <div className="signup-success__spark signup-success__spark--2" aria-hidden />
        <div className="signup-success__spark signup-success__spark--3" aria-hidden />
        <div className="signup-success__spark signup-success__spark--4" aria-hidden />
      </div>

      <h2 className="signup-success__title">회원가입 완료</h2>
      <p className="signup-success__message">
        <strong>{email}</strong> 계정이 성공적으로 생성되었습니다.
      </p>
      <p className="signup-success__hint">
        로그인 후 HeAIth의 AI 건강 서비스를 이용해 보세요.
      </p>

      <div className="signup-success__actions">
        <button type="button" className="primary-btn" onClick={onSignIn}>
          로그인하기
        </button>
        <Link to="/" className="ghost-btn signup-success__home">
          홈으로
        </Link>
      </div>
    </div>
  );
}
