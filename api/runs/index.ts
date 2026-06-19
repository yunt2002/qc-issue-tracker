import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRun, listRuns } from "../../lib/db.js";
import { TestCategory } from "../../lib/types.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const runs = await listRuns();
      return res.status(200).json(runs);
    }

    if (req.method === "POST") {
      const { testName, measuredValue, investigator, notes } = req.body ?? {};

      if (!testName || measuredValue === undefined || !investigator) {
        return res.status(400).json({
          error:
            "Test name, measured value, and investigator parameters are highly required.",
        });
      }

      const result = await createRun({
        testName: testName as TestCategory,
        measuredValue: parseFloat(String(measuredValue)),
        investigator,
        notes,
      });

      return res.status(201).json(result);
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process runs request." });
  }
}
