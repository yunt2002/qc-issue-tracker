import {
  Comment,
  ControlRun,
  DashboardStats,
  HistoryEvent,
  QCIssue,
  TestCategory,
} from "../src/types";
import { getSupabase } from "./supabase";
import { TEST_CONFIGS } from "./test-configs";
import { checkWestgardRules } from "./westgard";

type IssueRow = {
  id: string;
  sample_id: string;
  batch_id: string;
  test_name: string;
  measured_value: number;
  expected_value: number;
  standard_deviation: number;
  z_score: number;
  priority: string;
  status: string;
  investigator: string;
  detected_at: string;
  updated_at: string;
  issue_description: string;
  root_cause: string | null;
  capa_action_plan: string | null;
  ai_analysis: string | null;
  comments: Comment[];
  history: HistoryEvent[];
};

type RunRow = {
  id: string;
  test_name: string;
  run_date: string;
  run_number: number;
  measured_value: number;
  expected_value: number;
  standard_deviation: number;
  status: string;
  violation_rules: string[] | null;
  investigator: string;
  notes: string | null;
};

function mapIssue(row: IssueRow): QCIssue {
  return {
    id: row.id,
    sampleId: row.sample_id,
    batchId: row.batch_id,
    testName: row.test_name as TestCategory,
    measuredValue: Number(row.measured_value),
    expectedValue: Number(row.expected_value),
    standardDeviation: Number(row.standard_deviation),
    zScore: Number(row.z_score),
    priority: row.priority as QCIssue["priority"],
    status: row.status as QCIssue["status"],
    investigator: row.investigator,
    detectedAt: row.detected_at,
    updatedAt: row.updated_at,
    issueDescription: row.issue_description,
    rootCause: row.root_cause ?? undefined,
    capaActionPlan: row.capa_action_plan ?? undefined,
    aiAnalysis: row.ai_analysis ?? undefined,
    comments: row.comments ?? [],
    history: row.history ?? [],
  };
}

function mapRun(row: RunRow): ControlRun {
  return {
    id: row.id,
    testName: row.test_name as TestCategory,
    runDate: row.run_date,
    runNumber: row.run_number,
    measuredValue: Number(row.measured_value),
    expectedValue: Number(row.expected_value),
    standardDeviation: Number(row.standard_deviation),
    status: row.status as ControlRun["status"],
    violationRules: row.violation_rules ?? undefined,
    investigator: row.investigator,
    notes: row.notes ?? undefined,
  };
}

export async function getStats(): Promise<DashboardStats> {
  const supabase = getSupabase();
  const [{ data: issues }, { data: runs }] = await Promise.all([
    supabase.from("qc_issues").select("priority, status"),
    supabase.from("control_runs").select("status"),
  ]);

  const issueRows = issues ?? [];
  const runRows = runs ?? [];

  const totalIssues = issueRows.length;
  const activeIssues = issueRows.filter((i) =>
    ["Open", "Under Investigation", "CAPA Action"].includes(i.status)
  ).length;
  const criticalIssues = issueRows.filter(
    (i) => i.priority === "Urgent" && i.status !== "Closed"
  ).length;
  const resolvedIssues = issueRows.filter((i) =>
    ["Resolved", "Closed"].includes(i.status)
  ).length;

  const totalRuns = runRows.length;
  const failedRuns = runRows.filter(
    (r) => r.status === "Out-of-Control" || r.status === "Warning"
  ).length;
  const controlFailureRate =
    totalRuns > 0
      ? parseFloat(((failedRuns / totalRuns) * 100).toFixed(1))
      : 0;

  return {
    totalIssues,
    activeIssues,
    criticalIssues,
    resolvedIssues,
    controlFailureRate,
  };
}

export async function listIssues(): Promise<QCIssue[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("qc_issues")
    .select("*")
    .order("detected_at", { ascending: false });

  if (error) throw error;
  return (data as IssueRow[]).map(mapIssue);
}

export async function createIssue(input: {
  sampleId: string;
  batchId: string;
  testName: TestCategory;
  measuredValue: number;
  priority: QCIssue["priority"];
  investigator: string;
  issueDescription?: string;
}): Promise<QCIssue> {
  const config = TEST_CONFIGS[input.testName];
  const { mean, sd } = config;
  const zScore = parseFloat(((input.measuredValue - mean) / sd).toFixed(3));
  const detectedAt = new Date().toISOString();

  const supabase = getSupabase();
  const { count } = await supabase
    .from("qc_issues")
    .select("*", { count: "exact", head: true });

  const id = `QC-2026-${String((count ?? 0) + 1).padStart(3, "0")}`;
  const history: HistoryEvent[] = [
    {
      id: `h-${Date.now()}-1`,
      status: "Open",
      changedBy: input.investigator,
      text: `Issue logged manually in system registry. Measured control value: ${input.measuredValue}.`,
      createdAt: detectedAt,
    },
  ];

  const row = {
    id,
    sample_id: input.sampleId,
    batch_id: input.batchId,
    test_name: input.testName,
    measured_value: input.measuredValue,
    expected_value: mean,
    standard_deviation: sd,
    z_score: zScore,
    priority: input.priority,
    status: "Open",
    investigator: input.investigator,
    detected_at: detectedAt,
    updated_at: detectedAt,
    issue_description:
      input.issueDescription ||
      `Custom registered out-of-bounds issue on ${input.testName}. Measured: ${input.measuredValue} (expected ${mean} ± ${sd})`,
    comments: [],
    history,
  };

  const { data, error } = await supabase
    .from("qc_issues")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;
  return mapIssue(data as IssueRow);
}

export async function updateIssue(
  id: string,
  input: {
    status?: QCIssue["status"];
    priority?: QCIssue["priority"];
    rootCause?: string;
    capaActionPlan?: string;
    investigator?: string;
    text?: string;
  }
): Promise<QCIssue | null> {
  const supabase = getSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("qc_issues")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !existing) return null;

  const original = mapIssue(existing as IssueRow);
  const updatedDate = new Date().toISOString();
  let historyMessage = input.text || "QC Issue properties updated.";

  if (input.status && input.status !== original.status) {
    historyMessage = `Status changed from '${original.status}' to '${input.status}'. ${input.text || ""}`;
  }

  const history: HistoryEvent[] = [
    {
      id: `h-${Date.now()}`,
      status: input.status || original.status,
      changedBy: input.investigator || "System Auditor",
      text: historyMessage,
      createdAt: updatedDate,
    },
    ...original.history,
  ];

  const { data, error } = await supabase
    .from("qc_issues")
    .update({
      status: input.status || original.status,
      priority: input.priority || original.priority,
      root_cause:
        input.rootCause !== undefined ? input.rootCause : original.rootCause,
      capa_action_plan:
        input.capaActionPlan !== undefined
          ? input.capaActionPlan
          : original.capaActionPlan,
      updated_at: updatedDate,
      history,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapIssue(data as IssueRow);
}

export async function addComment(
  id: string,
  author: string,
  text: string
): Promise<QCIssue | null> {
  const supabase = getSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("qc_issues")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !existing) return null;

  const issue = mapIssue(existing as IssueRow);
  const comment: Comment = {
    id: `c-${Date.now()}`,
    author,
    text,
    createdAt: new Date().toISOString(),
  };

  const history: HistoryEvent[] = [
    {
      id: `h-${Date.now()}`,
      status: issue.status,
      changedBy: author,
      text: `Comment added: "${text.substring(0, 30)}${text.length > 30 ? "..." : ""}"`,
      createdAt: new Date().toISOString(),
    },
    ...issue.history,
  ];

  const { data, error } = await supabase
    .from("qc_issues")
    .update({
      comments: [...issue.comments, comment],
      history,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapIssue(data as IssueRow);
}

export async function setAiAnalysis(
  id: string,
  aiAnalysis: string
): Promise<QCIssue | null> {
  const supabase = getSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("qc_issues")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !existing) return null;

  const issue = mapIssue(existing as IssueRow);
  const history: HistoryEvent[] = [
    {
      id: `h-gemini-${Date.now()}`,
      status: issue.status,
      changedBy: "Gemini Copilot",
      text: "Completed deep quality control calibration diagnostics and CAPA protocol recommendation.",
      createdAt: new Date().toISOString(),
    },
    ...issue.history,
  ];

  const { data, error } = await supabase
    .from("qc_issues")
    .update({
      ai_analysis: aiAnalysis,
      history,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapIssue(data as IssueRow);
}

export async function getIssueById(id: string): Promise<QCIssue | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("qc_issues")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return mapIssue(data as IssueRow);
}

export async function listRuns(): Promise<ControlRun[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("control_runs")
    .select("*")
    .order("run_date", { ascending: true });

  if (error) throw error;
  return (data as RunRow[]).map(mapRun);
}

export async function createRun(input: {
  testName: TestCategory;
  measuredValue: number;
  investigator: string;
  notes?: string;
}): Promise<{ run: ControlRun; triggeredAutoIssue: boolean }> {
  const config = TEST_CONFIGS[input.testName];
  const { mean, sd } = config;
  const inputVal = parseFloat(String(input.measuredValue));

  const allRuns = await listRuns();
  const testHist = allRuns
    .filter((r) => r.testName === input.testName)
    .sort((a, b) => a.runNumber - b.runNumber);

  const historicalValues = testHist.map((r) => r.measuredValue);
  const nextRunNum =
    testHist.length > 0 ? testHist[testHist.length - 1].runNumber + 1 : 1;

  const { status, violationRules } = checkWestgardRules(
    inputVal,
    mean,
    sd,
    historicalValues
  );

  const prefix = input.testName.substring(0, 2).toUpperCase();
  const newRun: ControlRun = {
    id: `R-${prefix}-${String(nextRunNum).padStart(3, "0")}`,
    testName: input.testName,
    runDate: new Date().toISOString().split("T")[0],
    runNumber: nextRunNum,
    measuredValue: inputVal,
    expectedValue: mean,
    standardDeviation: sd,
    status,
    violationRules,
    investigator: input.investigator,
    notes: input.notes || "",
  };

  const supabase = getSupabase();
  const { error } = await supabase.from("control_runs").insert({
    id: newRun.id,
    test_name: newRun.testName,
    run_date: newRun.runDate,
    run_number: newRun.runNumber,
    measured_value: newRun.measuredValue,
    expected_value: newRun.expectedValue,
    standard_deviation: newRun.standardDeviation,
    status: newRun.status,
    violation_rules: newRun.violationRules ?? [],
    investigator: newRun.investigator,
    notes: newRun.notes ?? "",
  });

  if (error) throw error;

  let triggeredAutoIssue = false;
  if (status === "Out-of-Control") {
    triggeredAutoIssue = true;
    const detectedAt = new Date().toISOString();
    const z = parseFloat(((inputVal - mean) / sd).toFixed(3));
    const { count } = await supabase
      .from("qc_issues")
      .select("*", { count: "exact", head: true });

    await supabase.from("qc_issues").insert({
      id: `QC-2026-${String((count ?? 0) + 1).padStart(3, "0")}`,
      sample_id: `SMP-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
      batch_id: `BTH-AUTO-${nextRunNum}`,
      test_name: input.testName,
      measured_value: inputVal,
      expected_value: mean,
      standard_deviation: sd,
      z_score: z,
      priority: Math.abs(z) > 4 ? "Urgent" : "Medium",
      status: "Open",
      investigator: input.investigator,
      detected_at: detectedAt,
      updated_at: detectedAt,
      issue_description: `Westgard critical alert! ${input.testName} Run #${nextRunNum} flagged OUT OF CONTROL. Violation Rules: [${violationRules.join(", ")}]. Measured value: ${inputVal} (Target: ${mean} ± ${sd}).`,
      comments: [
        {
          id: "c-auto",
          author: "System Regulator",
          text: `Automated issue logged based on critical rule match: ${violationRules.join(", ")}`,
          createdAt: detectedAt,
        },
      ],
      history: [
        {
          id: "h-auto-1",
          status: "Open",
          changedBy: "System Regulator",
          text: `Issue auto-flagged online. Westgard violation detected on control run ${newRun.id}.`,
          createdAt: detectedAt,
        },
      ],
    });
  }

  return { run: newRun, triggeredAutoIssue };
}
