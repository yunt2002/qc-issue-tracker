import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { SEED_CONTROL_RUNS, SEED_QC_ISSUES } from "../lib/seed-data.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase env vars.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function seed() {
  console.log("Clearing existing data...");
  await supabase.from("qc_issues").delete().neq("id", "");
  await supabase.from("control_runs").delete().neq("id", "");

  console.log(`Inserting ${SEED_CONTROL_RUNS.length} control runs...`);
  const runRows = SEED_CONTROL_RUNS.map((r) => ({
    id: r.id,
    test_name: r.testName,
    run_date: r.runDate,
    run_number: r.runNumber,
    measured_value: r.measuredValue,
    expected_value: r.expectedValue,
    standard_deviation: r.standardDeviation,
    status: r.status,
    violation_rules: r.violationRules ?? [],
    investigator: r.investigator,
    notes: r.notes ?? "",
  }));

  const { error: runsError } = await supabase.from("control_runs").insert(runRows);
  if (runsError) throw runsError;

  console.log(`Inserting ${SEED_QC_ISSUES.length} QC issues...`);
  const issueRows = SEED_QC_ISSUES.map((i) => ({
    id: i.id,
    sample_id: i.sampleId,
    batch_id: i.batchId,
    test_name: i.testName,
    measured_value: i.measuredValue,
    expected_value: i.expectedValue,
    standard_deviation: i.standardDeviation,
    z_score: i.zScore,
    priority: i.priority,
    status: i.status,
    investigator: i.investigator,
    detected_at: i.detectedAt,
    updated_at: i.updatedAt,
    issue_description: i.issueDescription,
    root_cause: i.rootCause ?? null,
    capa_action_plan: i.capaActionPlan ?? null,
    ai_analysis: i.aiAnalysis ?? null,
    comments: i.comments,
    history: i.history,
  }));

  const { error: issuesError } = await supabase.from("qc_issues").insert(issueRows);
  if (issuesError) throw issuesError;

  console.log("Seed complete.");
  console.log(`  control_runs: ${SEED_CONTROL_RUNS.length}`);
  console.log(`  qc_issues: ${SEED_QC_ISSUES.length}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
