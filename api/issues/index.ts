import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createIssue, listIssues } from "../../lib/db.js";
import { TestCategory } from "../../lib/types.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const issues = await listIssues();
      return res.status(200).json(issues);
    }

    if (req.method === "POST") {
      const {
        sampleId,
        batchId,
        testName,
        measuredValue,
        priority,
        investigator,
        issueDescription,
      } = req.body ?? {};

      if (
        !sampleId ||
        !batchId ||
        !testName ||
        measuredValue === undefined ||
        !priority ||
        !investigator
      ) {
        return res
          .status(400)
          .json({ error: "Missing required clinical QC field parameters." });
      }

      const issue = await createIssue({
        sampleId,
        batchId,
        testName: testName as TestCategory,
        measuredValue: parseFloat(String(measuredValue)),
        priority,
        investigator,
        issueDescription,
      });

      return res.status(201).json(issue);
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process issues request." });
  }
}
