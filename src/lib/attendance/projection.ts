// Attendance module — pure projection math.
export interface AttendanceStats {
  pct: number;
  canMiss: number; // consecutive classes you can skip and stay >= target
  needToAttend: number; // consecutive classes needed to reach target
  status: "safe" | "edge" | "risk";
  message: string;
}

export function project(attended: number, total: number, target: number): AttendanceStats {
  const t = target / 100;
  const pct = total ? (attended / total) * 100 : 100;
  let canMiss = 0;
  let needToAttend = 0;
  if (pct >= target) canMiss = t > 0 ? Math.max(0, Math.floor(attended / t - total + 1e-9)) : 0;
  else needToAttend = t < 1 ? Math.ceil((t * total - attended) / (1 - t) - 1e-9) : Infinity;
  const status = pct < target ? "risk" : canMiss <= 1 ? "edge" : "safe";
  const message =
    total === 0
      ? "No classes recorded yet."
      : status === "risk"
        ? `Below your ${target}% target. Attend the next ${needToAttend} class${needToAttend === 1 ? "" : "es"} in a row to get back on track.`
        : canMiss === 0
          ? `Exactly at the edge — missing the next class drops you below ${target}%.`
          : `You can miss ${canMiss} more class${canMiss === 1 ? "" : "es"} and stay at or above ${target}%.`;
  return { pct: Math.round(pct * 10) / 10, canMiss, needToAttend, status, message };
}
