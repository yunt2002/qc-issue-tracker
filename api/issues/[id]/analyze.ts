import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
import { getIssueById, setAiAnalysis } from "../../../lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid issue ID." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const issue = await getIssueById(id);
    if (!issue) {
      return res.status(404).json({ error: "QC Issue ID not found." });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      const mockAnalysis = `### 🧪 Automated Clinical Troubleshooting (Simulated - API Key Missing)\n\n*System warning: Gemini API key not found in server variables. Providing offline protocol checklist.* \n\nBased on **${issue.testName}** test criteria with a measured value of **${issue.measuredValue}** versus target **${issue.expectedValue}** (Z-Score: **${issue.zScore}**):\n\n1. **Batch Isolation (Immediate CAPA)**: This run is flagged out-of-control. Stop clinical sampling instantly.\n2. **Calibration Integrity**: Verify reagent formulation dates. Check incubator temperatures for deviation.\n3. **Hardware Assessment**: Review chromatographic capillary channels or cycler well positioning to check for well leakage or physical blocks.`;

      await setAiAnalysis(id, mockAnalysis);
      return res.status(200).json({ aiAnalysis: mockAnalysis });
    }

    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "qc-issue-tracker",
        },
      },
    });

    const promptMessage = `
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

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptMessage,
      config: {
        systemInstruction:
          "You are a Chief Medical Quality Control Officer and Senior Laboratory CAPA Auditor with expertise in CLIA/CAP guidelines, Westgard rules, and clinical diagnostic calibration.",
      },
    });

    const aiText = result.text || "Failed to generate AI analysis report.";
    await setAiAnalysis(id, aiText);
    return res.status(200).json({ aiAnalysis: aiText });
  } catch (error) {
    console.error("Gemini API Error: ", error);
    return res.status(500).json({ error: "Failed to securely dial Gemini API engine." });
  }
}
