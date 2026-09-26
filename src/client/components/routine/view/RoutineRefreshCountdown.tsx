import { useEffect, useState } from "react";
import {
  formatRoutineRefreshCountdown,
  getRoutineRefreshCountdown,
} from "../../../utils/routineWeek";

interface Props {
  routineId: string;
}

export function RoutineRefreshCountdown({ routineId }: Props) {
  const [countdown, setCountdown] = useState(() =>
    formatRoutineRefreshCountdown(getRoutineRefreshCountdown(routineId)),
  );

  useEffect(() => {
    function tick() {
      setCountdown(
        formatRoutineRefreshCountdown(getRoutineRefreshCountdown(routineId)),
      );
    }

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [routineId]);

  return (
    <p className="routine-v2-week-note">
      다음 루틴 갱신까지{" "}
      <span className="routine-v2-week-countdown">{countdown}</span>
    </p>
  );
}
