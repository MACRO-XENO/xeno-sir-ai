import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, conversations } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "./auth";
import { hashPassword } from "./auth";

const router: IRouter = Router();

router.get("/students", requireAdmin, async (req: Request, res: Response) => {
  try {
    const students = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      createdAt: usersTable.createdAt,
    }).from(usersTable).where(eq(usersTable.role, "student"));
    res.json(students);
  } catch (err) {
    req.log.error({ err }, "List students error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/students", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password || !displayName) {
      res.status(400).json({ error: "username, password, and displayName are required" });
      return;
    }
    const [student] = await db.insert(usersTable).values({
      username,
      passwordHash: hashPassword(password),
      role: "student",
      displayName,
    }).returning({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      createdAt: usersTable.createdAt,
    });
    res.status(201).json(student);
  } catch (err) {
    req.log.error({ err }, "Create student error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/students/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const users = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      createdAt: usersTable.createdAt,
    }).from(usersTable).where(eq(usersTable.id, id));

    if (!users[0]) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    const studentConversations = await db.select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
    }).from(conversations).where(eq(conversations.userId, id));

    res.json({ ...users[0], conversations: studentConversations });
  } catch (err) {
    req.log.error({ err }, "Get student error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/students/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete student error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
