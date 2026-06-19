import type { VercelRequest, VercelResponse } from "@vercel/node";
import { addComment } from "../../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid issue ID." });
  }

  try {
    if (req.method === "POST") {
      const { author, text } = req.body ?? {};

      if (!author || !text) {
        return res.status(400).json({ error: "Author and text fields required." });
      }

      const updated = await addComment(id, author, text);
      if (!updated) {
        return res.status(404).json({ error: "QC Issue ID not found." });
      }

      return res.status(201).json(updated);
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add comment." });
  }
}
