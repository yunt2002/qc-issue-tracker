export interface WestgardResult {
  status: "In-Control" | "Warning" | "Out-of-Control";
  violationRules: string[];
}

export function checkWestgardRules(
  newVal: number,
  mean: number,
  sd: number,
  historical: number[]
): WestgardResult {
  const rules: string[] = [];
  const dev = Math.abs(newVal - mean) / sd;

  if (dev > 3) {
    rules.push("1_3s (Value exceeds ±3SD limit)");
  }

  if (dev > 2 && dev <= 3) {
    rules.push("1_2s (Value exceeds ±2SD warning)");
  }

  const allPoints = [...historical, newVal];
  const n = allPoints.length;

  if (n >= 2) {
    const last1Selected = allPoints[n - 1];
    const last2Selected = allPoints[n - 2];
    const dev1 = (last1Selected - mean) / sd;
    const dev2 = (last2Selected - mean) / sd;

    if ((dev1 > 2 && dev2 > 2) || (dev1 < -2 && dev2 < -2)) {
      rules.push("2_2s (Two consecutive runs exceeded ±2SD)");
    }

    if (Math.abs(last1Selected - last2Selected) > 4 * sd) {
      if ((dev1 > 2 && dev2 < -2) || (dev1 < -2 && dev2 > 2)) {
        rules.push("R_4s (Consecutive runs differed by >4SD)");
      }
    }
  }

  if (n >= 4) {
    const last4 = allPoints.slice(-4);
    const devs4 = last4.map((v) => (v - mean) / sd);
    if (devs4.every((d) => d > 1) || devs4.every((d) => d < -1)) {
      rules.push("4_1s (Four consecutive runs exceeded ±1SD)");
    }
  }

  if (n >= 10) {
    const last10 = allPoints.slice(-10);
    const sides = last10.map((v) => v > mean);
    if (sides.every((s) => s === true) || sides.every((s) => s === false)) {
      rules.push("10_X (Ten consecutive runs on one side of Mean)");
    }
  }

  let status: "In-Control" | "Warning" | "Out-of-Control" = "In-Control";
  const rejectRules = rules.filter((r) => !r.startsWith("1_2s"));

  if (rejectRules.length > 0) {
    status = "Out-of-Control";
  } else if (rules.some((r) => r.startsWith("1_2s"))) {
    status = "Warning";
  }

  return { status, violationRules: rules };
}
