import { GoogleGenAI } from "@google/genai";
import { QCIssue } from "./types.js";

export type AnalysisSource = "gemini" | "fallback" | "previous";

export interface AnalyzeResult {
  aiAnalysis: string;
  source: AnalysisSource;
  fallback?: boolean;
  fallbackReason?: "missing_key" | "quota_exhausted" | "api_error";
}

function buildOfflineAnalysis(
  issue: QCIssue,
  reason: "missing_key" | "quota_exhausted"
): string {
  const reasonLine =
    reason === "quota_exhausted"
      ? "*Gemini API 할당량/토큰이 소진되어 오프라인 CAPA 체크리스트(이전 버전)로 전환되었습니다.*"
      : "*Gemini API 키가 설정되지 않아 오프라인 CAPA 체크리스트(이전 버전)를 제공합니다.*";

  return `### 🧪 Automated Clinical Troubleshooting (Offline Fallback)

${reasonLine}

Based on **${issue.testName}** test criteria with a measured value of **${issue.measuredValue}** versus target **${issue.expectedValue}** (Z-Score: **${issue.zScore}**):

1. **Batch Isolation (Immediate CAPA)**: This run is flagged out-of-control. Stop clinical sampling instantly.
2. **Calibration Integrity**: Verify reagent formulation dates. Check incubator temperatures for deviation.
3. **Hardware Assessment**: Review chromatographic capillary channels or cycler well positioning to check for well leakage or physical blocks.`;
}

export function isQuotaOrTokenError(error: unknown): boolean {
  const parts: string[] = [];

  if (error instanceof Error) {
    parts.push(error.message);
    const withStatus = error as Error & { status?: number; code?: string };
    if (withStatus.status) parts.push(String(withStatus.status));
    if (withStatus.code) parts.push(withStatus.code);
  } else if (typeof error === "object" && error !== null) {
    parts.push(JSON.stringify(error));
  } else {
    parts.push(String(error));
  }

  const combined = parts.join(" ").toLowerCase();

  return (
    combined.includes("429") ||
    combined.includes("resource_exhausted") ||
    combined.includes("quota") ||
    combined.includes("rate limit") ||
    combined.includes("rate_limit") ||
    combined.includes("token") ||
    combined.includes("exceeded") ||
    combined.includes("billing") ||
    combined.includes("insufficient")
  );
}

function buildPrompt(issue: QCIssue): string {
  return `
Analyze this Laboratory Quality Control (QC) Failure and generate a formal Clinical Troubleshooting Protocol & CAPA (Corrective and Preventive Action) SOP recommendation.

QC Issue Details:
- Issue ID: ${issue.id}
- Test Category: ${issue.testName}
- Measured Value of Control Run: ${issue.measuredValue}
- Expected Target Mean: ${issue.expectedValue}
- Target Standard Deviation (SD): ${issue.standardDeviation}
- Z-Score of Failure: ${issue.zScore}
- Reported Clinical Urgency: ${issue.priority}
- Laboratory Investigator: ${issue.investigator}
- Description of Incident: ${issue.issueDescription}

Please output exactly three sections formatted in markdown:
1. **Clinical Assessment & Risk Classification**: Explain what this out-of-bounds deviation means biologically or analytically (e.g., random vs systematic error, effect on clinical diagnostics). Tell the technician if there's an immediate threat to clinical test validity.
2. **Actionable Root Cause Analysis Hypothesis**: Present 2-3 logical, chemical, or physics-based reasons for this deviation in the assay (e.g. primer dimers, reagent degradation, drift due to temperature, pump seal leakage, laser contamination).
3. **Draft CAPA SOP Action Steps**: Write 3-4 specific sequential bullet points that the lab technician MUST complete step by step to resolve the error, certify recalibration, and safely reinitialize testing. Keep instruction text direct, authoritative, and clinical.
`;
}

export async function analyzeIssueWithGemini(issue: QCIssue): Promise<AnalyzeResult> {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    const aiAnalysis = buildOfflineAnalysis(issue, "missing_key");
    return {
      aiAnalysis,
      source: "fallback",
      fallback: true,
      fallbackReason: "missing_key",
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "qc-issue-tracker",
        },
      },
    });

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: buildPrompt(issue),
      config: {
        systemInstruction:
          "You are a Chief Medical Quality Control Officer and Senior Laboratory CAPA Auditor with expertise in CLIA/CAP guidelines, Westgard rules, and clinical diagnostic calibration.",
      },
    });

    const aiText = result.text?.trim();
    if (!aiText) {
      throw new Error("Empty Gemini response");
    }

    return {
      aiAnalysis: aiText,
      source: "gemini",
      fallback: false,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);

    if (isQuotaOrTokenError(error)) {
      if (issue.aiAnalysis?.trim()) {
        return {
          aiAnalysis: issue.aiAnalysis,
          source: "previous",
          fallback: true,
          fallbackReason: "quota_exhausted",
        };
      }

      return {
        aiAnalysis: buildOfflineAnalysis(issue, "quota_exhausted"),
        source: "fallback",
        fallback: true,
        fallbackReason: "quota_exhausted",
      };
    }

    if (issue.aiAnalysis?.trim()) {
      return {
        aiAnalysis: issue.aiAnalysis,
        source: "previous",
        fallback: true,
        fallbackReason: "api_error",
      };
    }

    return {
      aiAnalysis: buildOfflineAnalysis(issue, "quota_exhausted"),
      source: "fallback",
      fallback: true,
      fallbackReason: "api_error",
    };
  }
}

export function historyMessageForResult(result: AnalyzeResult): string {
  if (result.source === "gemini") {
    return "Completed deep quality control calibration diagnostics and CAPA protocol recommendation.";
  }
  if (result.source === "previous") {
    return "Gemini API unavailable (quota/token limit). Restored previous AI analysis report.";
  }
  if (result.fallbackReason === "missing_key") {
    return "Gemini API key missing. Applied offline CAPA checklist (fallback mode).";
  }
  return "Gemini API quota exhausted. Applied offline CAPA checklist (fallback mode).";
}
