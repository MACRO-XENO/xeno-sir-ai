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
  const MAX_TRANSCRIPT_CHARS = 200000;
  const safeTranscript = transcript.length > MAX_TRANSCRIPT_CHARS
    ? transcript.slice(0, MAX_TRANSCRIPT_CHARS) + "\n\n[...transcript truncated]"
    : transcript;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    stream: false,
    messages: [
      {
        role: "user",
        content: `You are creating premium study notes for Lecture ${lectureNumber}: ${title}\n\nTranscript:\n${safeTranscript}`,
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

    if (!notes) {
      try {
        const generated = await generateNotesFromTranscript(lecture.lectureNumber, lecture.title, transcript);
        const [updated] = await db.update(lecturesTable)
          .set({ notes: generated, updatedAt: new Date() })
          .where(eq(lecturesTable.id, lecture.id))
          .returning();
        res.status(201).json(updated);
      } catch (aiErr) {
        req.log.error({ aiErr }, "Notes generation failed");
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
    const id = parseInt(req.params.id as string);
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
    const id = parseInt(req.params.id as string);
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

router.post("/lectures/:id/generate-notes", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
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

router.post("/lectures/generate-all-notes", requireAdmin, async (req: Request, res: Response) => {
  try {
    const force = req.query.force === "true";
    const allLectures = await db.select().from(lecturesTable).orderBy(lecturesTable.lectureNumber);
    const toProcess = force
      ? allLectures
      : allLectures.filter(l => !l.notes || l.notes.trim().length === 0);

    if (toProcess.length === 0) {
      res.json({ total: 0, generated: 0, failed: 0, message: "All lectures already have notes." });
      return;
    }

    let generated = 0;
    let failed = 0;
    for (const lecture of toProcess) {
      try {
        const notes = await generateNotesFromTranscript(lecture.lectureNumber, lecture.title, lecture.transcript);
        await db.update(lecturesTable)
          .set({ notes, updatedAt: new Date() })
          .where(eq(lecturesTable.id, lecture.id));
        generated++;
      } catch (err) {
        req.log.error({ err, lectureId: lecture.id }, "Notes generation failed");
        failed++;
      }
    }

    res.json({
      total: toProcess.length,
      generated,
      failed,
      message: `Notes generated for ${generated} lecture(s).`,
    });
  } catch (err) {
    req.log.error({ err }, "Generate all notes error");
    res.status(500).json({ error: "Failed to generate notes" });
  }
});

router.delete("/lectures/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.delete(lecturesTable).where(eq(lecturesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete lecture error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
