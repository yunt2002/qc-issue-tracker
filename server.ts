import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  addComment,
  createIssue,
  createRun,
  getIssueById,
  getStats,
  listIssues,
  listRuns,
  setAiAnalysis,
  updateIssue,
} from "./lib/db";
import {
  analyzeIssueWithGemini,
  historyMessageForResult,
} from "./lib/gemini-analysis";
import { TestCategory } from "./src/types";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get("/api/stats", async (_req, res) => {
  try {
    res.json(await getStats());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load dashboard stats." });
  }
});

app.get("/api/issues", async (_req, res) => {
  try {
    res.json(await listIssues());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to list issues." });
  }
});

app.post("/api/issues", async (req, res) => {
  try {
    const {
      sampleId,
      batchId,
      testName,
      measuredValue,
      priority,
      investigator,
      issueDescription,
    } = req.body;

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
      measuredValue: parseFloat(measuredValue),
      priority,
      investigator,
      issueDescription,
    });

    res.status(201).json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create issue." });
  }
});

app.patch("/api/issues/:id", async (req, res) => {
  try {
    const updated = await updateIssue(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "QC Issue ID not found." });
    }
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update issue." });
  }
});

app.post("/api/issue-comments/:id", async (req, res) => {
  try {
    const { author, text } = req.body;
    if (!author || !text) {
      return res.status(400).json({ error: "Author and text fields required." });
    }

    const updated = await addComment(req.params.id, author, text);
    if (!updated) {
      return res.status(404).json({ error: "QC Issue ID not found." });
    }
    res.status(201).json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add comment." });
  }
});

app.get("/api/runs", async (_req, res) => {
  try {
    res.json(await listRuns());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to list runs." });
  }
});

app.post("/api/runs", async (req, res) => {
  try {
    const { testName, measuredValue, investigator, notes } = req.body;
    if (!testName || measuredValue === undefined || !investigator) {
      return res.status(400).json({
        error:
          "Test name, measured value, and investigator parameters are highly required.",
      });
    }

    const result = await createRun({
      testName: testName as TestCategory,
      measuredValue: parseFloat(measuredValue),
      investigator,
      notes,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create run." });
  }
});

app.post("/api/issue-analyze/:id", async (req, res) => {
  try {
    const issue = await getIssueById(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: "QC Issue ID not found." });
    }

    const result = await analyzeIssueWithGemini(issue);
    await setAiAnalysis(
      req.params.id,
      result.aiAnalysis,
      historyMessageForResult(result)
    );
    res.json(result);
  } catch (error) {
    console.error("Gemini API Error: ", error);
    res.status(500).json({ error: "Failed to securely dial Gemini API engine." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🧪 Quality Control Capstone Service running on port ${PORT}`);
  });
}

startServer();
