import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getStats } from "../lib/db.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const stats = await getStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load dashboard stats." });
  }
}
