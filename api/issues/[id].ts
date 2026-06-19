import type { VercelRequest, VercelResponse } from "@vercel/node";
import { updateIssue } from "../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid issue ID." });
  }

  try {
    if (req.method === "PATCH") {
      const { status, priority, rootCause, capaActionPlan, investigator, text } =
        req.body ?? {};

      const updated = await updateIssue(id, {
        status,
        priority,
        rootCause,
        capaActionPlan,
        investigator,
        text,
      });

      if (!updated) {
        return res.status(404).json({ error: "QC Issue ID not found." });
      }

      return res.status(200).json(updated);
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update issue." });
  }
}
