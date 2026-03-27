import { Router, type IRouter, type Request, type Response } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requireAdmin } from "./auth";

const router: IRouter = Router();

router.get("/openai/conversations", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const role = (req as any).userRole;

    let convs;
    if (role === "admin") {
      convs = await db
        .select()
        .from(conversations)
        .orderBy(desc(conversations.createdAt))
        .limit(200);
    } else {
      convs = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.createdAt))
        .limit(100);
    }

    res.json(convs.map(c => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      userId: c.userId,
    })));
  } catch (err) {
    req.log.error({ err }, "List conversations error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/openai/conversations", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { title } = req.body;
    const [conv] = await db.insert(conversations).values({ title, userId }).returning();
    res.status(201).json({ id: conv.id, title: conv.title, createdAt: conv.createdAt });
  } catch (err) {
    req.log.error({ err }, "Create conversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/openai/conversations/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req as any).userId;
    const role = (req as any).userRole;

    const convs = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!convs[0]) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (role !== "admin" && convs[0].userId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    const conv = convs[0];
    res.json({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      messages: msgs,
    });
  } catch (err) {
    req.log.error({ err }, "Get conversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/openai/conversations/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete conversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/openai/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req as any).userId;
    const role = (req as any).userRole;

    const convs = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!convs[0]) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    if (role !== "admin" && convs[0].userId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json(msgs);
  } catch (err) {
    req.log.error({ err }, "List messages error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/openai/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { content } = req.body;
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    await db.insert(messages).values({ conversationId: id, role: "user", content });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";
    const chatMessages = [
      ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content },
    ];

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const c = chunk.choices[0]?.delta?.content;
      if (c) {
        fullResponse += c;
        res.write(`data: ${JSON.stringify({ content: c })}\n\n`);
      }
    }

    await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Send message error");
    res.write(`data: ${JSON.stringify({ error: "Failed" })}\n\n`);
    res.end();
  }
});

export default router;
