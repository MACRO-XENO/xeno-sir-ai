import { Router, type IRouter, type Request, type Response } from "express";
import { db, lecturesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin, requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/lectures", requireAuth, async (req: Request, res: Response) => {
  try {
    const lectures = await db.select({
      id: lecturesTable.id,
      lectureNumber: lecturesTable.lectureNumber,
      title: lecturesTable.title,
      createdAt: lecturesTable.createdAt,
      updatedAt: lecturesTable.updatedAt,
      transcript: lecturesTable.transcript,
    }).from(lecturesTable).orderBy(lecturesTable.lectureNumber);
    res.json(lectures);
  } catch (err) {
    req.log.error({ err }, "List lectures error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/lectures", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { lectureNumber, title, transcript } = req.body;
    if (!lectureNumber || !title || !transcript) {
      res.status(400).json({ error: "lectureNumber, title, and transcript are required" });
      return;
    }
    const [lecture] = await db.insert(lecturesTable).values({
      lectureNumber,
      title,
      transcript,
    }).returning();
    res.status(201).json(lecture);
  } catch (err) {
    req.log.error({ err }, "Create lecture error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/lectures/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const lectures = await db.select().from(lecturesTable).where(eq(lecturesTable.id, id));
    if (!lectures[0]) {
      res.status(404).json({ error: "Lecture not found" });
      return;
    }
    res.json(lectures[0]);
  } catch (err) {
    req.log.error({ err }, "Get lecture error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/lectures/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { lectureNumber, title, transcript } = req.body;
    const updateData: any = { updatedAt: new Date() };
    if (lectureNumber !== undefined) updateData.lectureNumber = lectureNumber;
    if (title !== undefined) updateData.title = title;
    if (transcript !== undefined) updateData.transcript = transcript;

    const [lecture] = await db.update(lecturesTable).set(updateData).where(eq(lecturesTable.id, id)).returning();
    if (!lecture) {
      res.status(404).json({ error: "Lecture not found" });
      return;
    }
    res.json(lecture);
  } catch (err) {
    req.log.error({ err }, "Update lecture error");
    res.status(500).json({ error: "Internal server error" });
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
