import { useId } from "react";
import type { Gender } from "../../types";
import {
  getAvatarBodyType,
  getAvatarGlowColor,
  getAvatarTorsoScale,
  type AvatarBodyType,
} from "../../utils/avatarAppearance";
import type { RoutineProgress } from "../../utils/routineProgress";

interface Props {
  gender: Gender;
  bmi: number;
  obesityRate: number;
  progress: RoutineProgress;
  size?: "sm" | "lg";
}

export function RoutineAvatar({
  gender,
  bmi,
  obesityRate,
  progress,
  size = "sm",
}: Props) {
  const uid = useId().replace(/:/g, "");
  const bodyType = getAvatarBodyType(bmi, obesityRate, progress.level);
  const torsoScale = getAvatarTorsoScale(bodyType);
  const glow = getAvatarGlowColor(bodyType);
  const isFemale = gender === "FEMALE";

  const headR = 12;
  const headCy = 28;
  const neckW = isFemale ? 5.5 : 6;
  const neckH = 7;
  const neckTop = headCy + headR - 1;
  const torsoTop = neckTop + neckH;
  const shoulder = (isFemale ? 16 : 18) * torsoScale;
  const hip = (isFemale ? 19 : 15) * torsoScale;
  const torsoH = 26 * (bodyType === "obese" ? 1.12 : 1);
  const legH = 20;
  const legW = 6.5;
  const legGap = 2;
  const armW = 4.5;
  const armH = 18;
  const armY = torsoTop + 5;
  const leftArmX = 50 - shoulder / 2 - armW + 1;
  const rightArmX = 50 + shoulder / 2 - 1;
  const leftLegX = 50 - legW - legGap / 2;
  const rightLegX = 50 + legGap / 2;
  const legTop = torsoTop + torsoH - 1;
  const platformY = legTop + legH + 4;

  return (
    <div
      className={`routine-avatar routine-avatar--${size} routine-avatar--${bodyType}`}
      style={{ "--avatar-glow": glow } as React.CSSProperties}
      aria-hidden
    >
      <div className="routine-avatar-scene">
        <div className="routine-avatar-ring" />
        <div className="routine-avatar-ring routine-avatar-ring--outer" />
        <svg
          className="routine-avatar-figure"
          viewBox="0 0 100 120"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`${uid}-skin`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8ec5ff" />
              <stop offset="100%" stopColor="#4d9fff" />
            </linearGradient>
            <linearGradient id={`${uid}-body`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00e5c0" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#4d9fff" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          <ellipse
            className="routine-avatar-platform"
            cx="50"
            cy={platformY}
            rx="24"
            ry="4.5"
            fill={`url(#${uid}-body)`}
            opacity="0.35"
          />

          <g className="routine-avatar-body-group">
            {/* Legs */}
            <rect
              x={leftLegX}
              y={legTop}
              width={legW}
              height={legH}
              rx="3"
              fill={`url(#${uid}-body)`}
            />
            <rect
              x={rightLegX}
              y={legTop}
              width={legW}
              height={legH}
              rx="3"
              fill={`url(#${uid}-body)`}
            />

            {/* Torso */}
            <rect
              x={50 - shoulder / 2}
              y={torsoTop}
              width={shoulder}
              height={torsoH}
              rx="7"
              fill={`url(#${uid}-body)`}
            />
            {bodyType === "obese" && (
              <ellipse
                cx="50"
                cy={torsoTop + torsoH * 0.45}
                rx={hip * 0.52}
                ry="9"
                fill={`url(#${uid}-body)`}
              />
            )}

            {/* Shoulder bridge (connects neck to torso) */}
            <path
              d={`M ${50 - neckW / 2} ${torsoTop}
                L ${50 - shoulder / 2} ${torsoTop}
                L ${50 + shoulder / 2} ${torsoTop}
                L ${50 + neckW / 2} ${torsoTop}
                Z`}
              fill={`url(#${uid}-body)`}
            />

            {/* Arms */}
            <rect
              x={leftArmX}
              y={armY}
              width={armW}
              height={armH}
              rx="2.5"
              fill={`url(#${uid}-body)`}
              opacity="0.9"
            />
            <rect
              x={rightArmX}
              y={armY}
              width={armW}
              height={armH}
              rx="2.5"
              fill={`url(#${uid}-body)`}
              opacity="0.9"
            />

            {/* Neck */}
            <rect
              x={50 - neckW / 2}
              y={neckTop}
              width={neckW}
              height={neckH}
              rx={neckW / 2}
              fill={`url(#${uid}-skin)`}
            />

            {/* Head */}
            <circle cx="50" cy={headCy} r={headR} fill={`url(#${uid}-skin)`} />

            {/* Hair / collar */}
            {isFemale ? (
              <path
                d={`M ${50 - headR + 2} ${headCy - 2}
                  Q 50 ${headCy - headR - 6} ${50 + headR - 2} ${headCy - 2}
                  Q ${50 + headR - 6} ${headCy + 2} 50 ${headCy + 1}
                  Q ${50 - headR + 6} ${headCy + 2} ${50 - headR + 2} ${headCy - 2}`}
                fill={`url(#${uid}-body)`}
                opacity="0.9"
              />
            ) : (
              <rect
                x={50 - neckW - 2}
                y={neckTop + neckH - 2}
                width={neckW + 4}
                height="5"
                rx="2"
                fill={`url(#${uid}-body)`}
              />
            )}

            {/* Eyes */}
            <circle
              cx="45.5"
              cy={headCy + 1}
              r="1.6"
              fill="#061018"
              className="routine-avatar-eye"
            />
            <circle
              cx="54.5"
              cy={headCy + 1}
              r="1.6"
              fill="#061018"
              className="routine-avatar-eye routine-avatar-eye--right"
            />
          </g>
        </svg>
        <span className="routine-avatar-scanline" />
      </div>
      <BodyTypeBadge bodyType={bodyType} />
    </div>
  );
}

function BodyTypeBadge({ bodyType }: { bodyType: AvatarBodyType }) {
  const labels: Record<AvatarBodyType, string> = {
    obese: "관리 필요",
    overweight: "개선 중",
    average: "보통",
    fit: "건강함",
    athletic: "최적",
  };
  return (
    <span className={`routine-avatar-badge routine-avatar-badge--${bodyType}`}>
      {labels[bodyType]}
    </span>
  );
}
