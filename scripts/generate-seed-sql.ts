import { writeFileSync } from "fs";
import { SEED_CONTROL_RUNS, SEED_QC_ISSUES } from "../lib/seed-data.js";

function sqlStr(v: string | null | undefined): string {
  if (v == null || v === "") return "NULL";
  return `'${v.replace(/'/g, "''").replace(/\n/g, "\\n")}'`;
}

function sqlJson(v: unknown): string {
  return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
}

const runValues = SEED_CONTROL_RUNS.map(
  (r) =>
    `(${sqlStr(r.id)}, ${sqlStr(r.testName)}, ${sqlStr(r.runDate)}, ${r.runNumber}, ${r.measuredValue}, ${r.expectedValue}, ${r.standardDeviation}, ${sqlStr(r.status)}, ${sqlJson(r.violationRules ?? [])}, ${sqlStr(r.investigator)}, ${sqlStr(r.notes ?? "")})`
).join(",\n");

const issueValues = SEED_QC_ISSUES.map(
  (i) =>
    `(${sqlStr(i.id)}, ${sqlStr(i.sampleId)}, ${sqlStr(i.batchId)}, ${sqlStr(i.testName)}, ${i.measuredValue}, ${i.expectedValue}, ${i.standardDeviation}, ${i.zScore}, ${sqlStr(i.priority)}, ${sqlStr(i.status)}, ${sqlStr(i.investigator)}, ${sqlStr(i.detectedAt)}, ${sqlStr(i.updatedAt)}, ${sqlStr(i.issueDescription)}, ${sqlStr(i.rootCause ?? null)}, ${sqlStr(i.capaActionPlan ?? null)}, ${sqlStr(i.aiAnalysis ?? null)}, ${sqlJson(i.comments)}, ${sqlJson(i.history)})`
).join(",\n");

const sql = `-- Full demo seed from original AI Studio test data
TRUNCATE public.qc_issues, public.control_runs;

INSERT INTO public.control_runs (id, test_name, run_date, run_number, measured_value, expected_value, standard_deviation, status, violation_rules, investigator, notes) VALUES
${runValues};

INSERT INTO public.qc_issues (id, sample_id, batch_id, test_name, measured_value, expected_value, standard_deviation, z_score, priority, status, investigator, detected_at, updated_at, issue_description, root_cause, capa_action_plan, ai_analysis, comments, history) VALUES
${issueValues};
`;

writeFileSync("supabase/seed-full.sql", sql, "utf8");
console.log("Wrote supabase/seed-full.sql");
