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

TRANSCRIPT:
${transcript}

---

YOUR TASK: Create comprehensive, high-quality Markdown study notes based ONLY on the content in this transcript. Do not add anything that was not covered in the lecture.

NOTES REQUIREMENTS:
- **Easy to understand** — write as if explaining to a smart student, not a textbook
- **Detailed** — cover every concept that was taught in the lecture
- **Examples** — for each major concept, include 2–3 real-world country examples (only if the transcript mentions or implies them; otherwise use relatable everyday analogies)
- **Markdown formatting** — use # headings, ## subheadings, **bold** for key terms, bullet points, numbered lists, and > blockquotes for important definitions
- **Structure**: Start with a brief overview, then cover each topic systematically
- **Key Terms** — highlight all important macroeconomic terms in **bold**
- Do NOT include anything beyond what is taught in this lecture's transcript

FORMAT:
# Lecture ${lectureNumber}: ${title}

## Overview
[2-3 sentence summary of what this lecture covers]

## [Topic 1 from transcript]
[Explanation...]

### Key Concept
[Definition in bold, then explanation]

**Example 1:** ...
**Example 2:** ...

## [Topic 2 from transcript]
...

## Key Takeaways
- [Bullet point summary of the most important points]

---
*Notes based on Xeno Sir's lecture transcript*`,
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

// Generate notes for ALL lectures that don't have notes yet
router.post("/lectures/generate-all-notes", requireAdmin, async (req: Request, res: Response) => {
  try {
    const allLectures = await db.select().from(lecturesTable).orderBy(lecturesTable.lectureNumber);
    const withoutNotes = allLectures.filter(l => !l.notes || l.notes.trim().length === 0);

    let generated = 0;
    let failed = 0;

    for (const lecture of withoutNotes) {
      try {
        const notes = await generateNotesFromTranscript(lecture.lectureNumber, lecture.title, lecture.transcript);
        await db.update(lecturesTable)
          .set({ notes, updatedAt: new Date() })
          .where(eq(lecturesTable.id, lecture.id));
        generated++;
      } catch {
        failed++;
      }
    }

    res.json({
      total: withoutNotes.length,
      generated,
      failed,
      message: `Notes generated for ${generated} lecture(s).${failed > 0 ? ` ${failed} failed.` : ""}`,
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
