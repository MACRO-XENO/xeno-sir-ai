import { Router, type IRouter, type Request, type Response } from "express";
import { db, lecturesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin, requireAuth } from "./auth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

async function generateNotesFromTranscript(
  lectureNumber: number,
  title: string,
  transcript: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    stream: false,
    messages: [
      {
        role: "user",
        content: `You are creating premium, structured study notes for a Macroeconomics course taught by "Xeno Sir."

LECTURE ${lectureNumber}: ${title}

TRANSCRIPT (raw — contains timestamps and filler words, IGNORE all of that):
${transcript}

---

YOUR TASK: Create comprehensive, high-quality Markdown study notes based ONLY on the concepts taught in this transcript.

STRICT RULES:
- NEVER include any timestamps (e.g. "0:00", "1:23 minutes", "seconds"), time markers, or any raw transcript artifacts
- NEVER include filler words, incomplete sentences, or conversational noise from the transcript
- Extract only the actual macroeconomic knowledge and concepts being taught
- Write in clean, polished academic language — as if a top student wrote perfect notes
- **Easy to understand** — explain clearly, not like a dry textbook
- **Detailed** — cover every concept taught
- **Examples** — 2–3 real-world examples per major concept (countries, events, policies)
- **Markdown formatting** — use # headings, ## subheadings, **bold** key terms, bullet points, > blockquotes for definitions
- Only teach what is in this transcript — nothing extra

FORMAT:
# Lecture ${lectureNumber}: ${title}

## Overview
[2-3 sentence clean summary]

## [Topic from lecture]
[Clean explanation...]

> **Definition:** [key term defined clearly]

**Example 1:** ...
**Example 2:** ...

## Key Takeaways
- [Clean bullet summary]

---
*Xeno Sir — Lecture ${lectureNumber} Notes*`,
      },
    ],
  });
  return response.choices[0]?.message?.content || "";
}

router.get("/lectures", requireAuth, async (req: Request, res: Response) => {
  try {
    const isAdmin = (req as any).userRole === "admin";

    if (isAdmin) {
      const lectures = await db.select().from(lecturesTable).orderBy(lecturesTable.lectureNumber);
      res.json(lectures);
    } else {
      const lectures = await db.select({
        id: lecturesTable.id,
        lectureNumber: lecturesTable.lectureNumber,
        title: lecturesTable.title,
        notes: lecturesTable.notes,
        createdAt: lecturesTable.createdAt,
        updatedAt: lecturesTable.updatedAt,
      }).from(lecturesTable).orderBy(lecturesTable.lectureNumber);
      res.json(lectures);
    }
  } catch (err) {
    req.log.error({ err }, "List lectures error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/lectures", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { lectureNumber, title, transcript, notes } = req.body;
    if (!lectureNumber || !title || !transcript) {
      res.status(400).json({ error: "lectureNumber, title, and transcript are required" });
      return;
    }

    const [lecture] = await db.insert(lecturesTable).values({
      lectureNumber,
      title,
      transcript,
      notes: notes || null,
    }).returning();

    // Auto-generate notes from transcript if not manually provided
    if (!notes) {
      try {
        const generated = await generateNotesFromTranscript(lecture.lectureNumber, lecture.title, transcript);
        const [updated] = await db.update(lecturesTable)
          .set({ notes: generated, updatedAt: new Date() })
          .where(eq(lecturesTable.id, lecture.id))
          .returning();
        res.status(201).json(updated);
      } catch (aiErr) {
        req.log.error({ aiErr }, "Notes generation failed, returning lecture without notes");
        res.status(201).json(lecture);
      }
    } else {
      res.status(201).json(lecture);
    }
  } catch (err) {
    req.log.error({ err }, "Create lecture error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/lectures/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const isAdmin = (req as any).userRole === "admin";
    const lectures = await db.select().from(lecturesTable).where(eq(lecturesTable.id, id));
    if (!lectures[0]) {
      res.status(404).json({ error: "Lecture not found" });
      return;
    }
    if (!isAdmin) {
      const { transcript, ...rest } = lectures[0];
      res.json(rest);
    } else {
      res.json(lectures[0]);
    }
  } catch (err) {
    req.log.error({ err }, "Get lecture error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/lectures/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { lectureNumber, title, transcript, notes } = req.body;
    const updateData: any = { updatedAt: new Date() };
    if (lectureNumber !== undefined) updateData.lectureNumber = lectureNumber;
    if (title !== undefined) updateData.title = title;
    if (transcript !== undefined) updateData.transcript = transcript;
    if (notes !== undefined) updateData.notes = notes || null;

    const [lecture] = await db.update(lecturesTable).set(updateData).where(eq(lecturesTable.id, id)).returning();
    if (!lecture) {
      res.status(404).json({ error: "Lecture not found" });
      return;
    }

    // If transcript was updated and notes not manually provided, regenerate notes
    if (transcript !== undefined && notes === undefined) {
      try {
        const generated = await generateNotesFromTranscript(lecture.lectureNumber, lecture.title, transcript);
        const [updated] = await db.update(lecturesTable)
          .set({ notes: generated, updatedAt: new Date() })
          .where(eq(lecturesTable.id, id))
          .returning();
        res.json(updated);
      } catch (aiErr) {
        req.log.error({ aiErr }, "Notes regeneration failed");
        res.json(lecture);
      }
    } else {
      res.json(lecture);
    }
  } catch (err) {
    req.log.error({ err }, "Update lecture error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Manually regenerate notes for a single lecture
router.post("/lectures/:id/generate-notes", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const lectures = await db.select().from(lecturesTable).where(eq(lecturesTable.id, id));
    if (!lectures[0]) {
      res.status(404).json({ error: "Lecture not found" });
      return;
    }
    const lecture = lectures[0];
    const generated = await generateNotesFromTranscript(lecture.lectureNumber, lecture.title, lecture.transcript);
    const [updated] = await db.update(lecturesTable)
      .set({ notes: generated, updatedAt: new Date() })
      .where(eq(lecturesTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Generate notes error");
    res.status(500).json({ error: "Failed to generate notes" });
  }
});

// Generate notes for ALL lectures that don't have notes yet (parallel)
router.post("/lectures/generate-all-notes", requireAdmin, async (req: Request, res: Response) => {
  try {
    const allLectures = await db.select().from(lecturesTable).orderBy(lecturesTable.lectureNumber);
    const withoutNotes = allLectures.filter(l => !l.notes || l.notes.trim().length === 0);

    if (withoutNotes.length === 0) {
      res.json({ total: 0, generated: 0, failed: 0, message: "All lectures already have notes." });
      return;
    }

    const results = await Promise.allSettled(
      withoutNotes.map(async (lecture) => {
        const notes = await generateNotesFromTranscript(lecture.lectureNumber, lecture.title, lecture.transcript);
        await db.update(lecturesTable)
          .set({ notes, updatedAt: new Date() })
          .where(eq(lecturesTable.id, lecture.id));
      })
    );

    const generated = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    res.json({
      total: withoutNotes.length,
      generated,
      failed,
      message: `Notes generated for ${generated} lecture(s).${failed > 0 ? ` ${failed} failed — try again.` : ""}`,
    });
  } catch (err) {
    req.log.error({ err }, "Generate all notes error");
    res.status(500).json({ error: "Failed to generate notes" });
  }
});

router.delete("/lectures/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(lecturesTable).where(eq(lecturesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete lecture error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
