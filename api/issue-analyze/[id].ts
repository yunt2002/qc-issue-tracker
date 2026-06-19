import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getIssueById, setAiAnalysis } from "../../lib/db.js";
import {
  analyzeIssueWithGemini,
  historyMessageForResult,
} from "../../lib/gemini-analysis.js";

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

    const result = await analyzeIssueWithGemini(issue);

    await setAiAnalysis(
      id,
      result.aiAnalysis,
      historyMessageForResult(result)
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Analyze handler error:", error);
    return res.status(500).json({ error: "Failed to process AI analysis request." });
  }
}
