import { Router, type IRouter, type Request, type Response } from "express";
import { db, lecturesTable, conversations, messages } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "./auth";

const router: IRouter = Router();

function buildXenoSirSystemPrompt(transcripts: Array<{ lectureNumber: number; title: string; transcript: string }>): string {
  const lectureContext = transcripts.map(l =>
    `=== LECTURE ${l.lectureNumber}: ${l.title} ===\n${l.transcript}`
  ).join("\n\n");

  return `You are Xeno Sir, an extraordinary Macroeconomics professor and tutor. You are teaching from actual lecture transcripts. Your teaching style is:

1. **IDENTITY**: You are Xeno Sir - a brilliant, passionate economics teacher who makes complex concepts crystal clear. Students feel like they are learning directly from their actual professor.

2. **LANGUAGE**: Always respond in BILINGUAL format - mix Hindi/Urdu and English naturally as educated Indians do. Use Roman script for Hindi/Urdu (not Devanagari). For example: "Dekho, inflation ka matlab hai prices ka badhna, which means purchasing power kam ho jaati hai." Adapt language to what the student uses.

3. **TEACHING DEPTH**: 
   - Start with the absolute basics (kya hota hai, kyun hota hai)
   - Give real-world desi examples (Indian economy, daily life situations)
   - Build up to intermediate concepts with more examples
   - Then go to advanced/expert level analysis
   - End with exam-relevant insights and tricks
   
4. **STYLE**: 
   - Passionate and enthusiastic like a great teacher
   - Use phrases like "Excellent question!", "Bahut badiya socha tumne!", "Ab samajhte hain..."
   - Draw analogies from Indian daily life
   - Never give incomplete answers - always be thorough
   - If a concept needs 10 paragraphs to explain properly, give 10 paragraphs
   
5. **KNOWLEDGE BASE**: You teach ONLY from the provided lecture transcripts. If asked about something not covered in transcripts, say: "Yeh topic abhi tak cover nahi hua humari classes mein, lekin basics samjha sakta hun..."

6. **EXAM FOCUS**: Always mention which concepts are exam-important, tricky points, and common mistakes students make.

7. **ZERO DOUBTS POLICY**: Your goal is that after your explanation, students should have absolutely ZERO doubts. If something needs more detail, add it automatically.

8. **REPLIT DISCLAIMER**: Never mention Replit, AI models (GPT, OpenAI etc.), or that you are built on any platform. You ARE Xeno Sir - that is your complete identity.

---
LECTURE TRANSCRIPTS (Your Teaching Material):

${lectureContext}

---
Remember: You are Xeno Sir teaching from these exact lectures. Use the transcript content as your knowledge base. Teach with the passion and depth that makes students feel they got a better explanation than the actual class!`;
}

router.post("/chat/ask", requireAuth, async (req: Request, res: Response) => {
  try {
    const { question, lectureIds, conversationId, language } = req.body;
    const userId = (req as any).userId;

    if (!question) {
      res.status(400).json({ error: "Question is required" });
      return;
    }

    let lectures;
    if (lectureIds && lectureIds.length > 0) {
      lectures = await db.select().from(lecturesTable).where(inArray(lecturesTable.id, lectureIds));
    } else {
      lectures = await db.select().from(lecturesTable).orderBy(lecturesTable.lectureNumber);
    }

    if (lectures.length === 0) {
      res.status(400).json({ error: "No lecture transcripts available. Admin needs to add lectures first." });
      return;
    }

    let convId = conversationId;
    if (!convId) {
      const shortQuestion = question.slice(0, 50);
      const [conv] = await db.insert(conversations).values({
        title: shortQuestion,
        userId,
      }).returning();
      convId = conv.id;
    }

    await db.insert(messages).values({
      conversationId: convId,
      role: "user",
      content: question,
    });

    const history = await db.select().from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(messages.createdAt);

    const systemPrompt = buildXenoSirSystemPrompt(lectures);

    const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...history.slice(0, -1).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: question },
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Conversation-Id", convId.toString());

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content, conversationId: convId })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: convId,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true, conversationId: convId })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Chat ask error");
    res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
    res.end();
  }
});

router.post("/chat/exam", requireAuth, async (req: Request, res: Response) => {
  try {
    const { lectureIds, difficulty, examType, questionCount } = req.body;

    let lectures;
    if (lectureIds && lectureIds.length > 0) {
      lectures = await db.select().from(lecturesTable).where(inArray(lecturesTable.id, lectureIds));
    } else {
      lectures = await db.select().from(lecturesTable).orderBy(lecturesTable.lectureNumber);
    }

    if (lectures.length === 0) {
      res.status(400).json({ error: "No lectures available for exam generation" });
      return;
    }

    const lectureContext = lectures.map(l =>
      `LECTURE ${l.lectureNumber} (${l.title}):\n${l.transcript}`
    ).join("\n\n---\n\n");

    const difficultyGuide = {
      basic: "Simple recall questions, straightforward definitions, basic concepts",
      medium: "Application questions, moderate analysis, connect concepts",
      advanced: "High-level analysis, critical thinking, multi-concept integration",
      extreme: "Expert level, trick questions, edge cases, deep analysis that would challenge even top students",
    };

    const typeGuide = examType === "mcq"
      ? "ALL questions must be Multiple Choice (MCQ) with 4 options (A, B, C, D)"
      : examType === "subjective"
      ? "ALL questions must be subjective/essay type requiring detailed answers"
      : "Mix of MCQ and subjective questions";

    const prompt = `You are Xeno Sir, creating a macroeconomics exam. Generate exactly ${questionCount} questions.

DIFFICULTY: ${difficulty} - ${difficultyGuide[difficulty as keyof typeof difficultyGuide]}
QUESTION TYPE: ${typeGuide}
LECTURES COVERED: ${lectures.map(l => `Lecture ${l.lectureNumber}: ${l.title}`).join(", ")}

LECTURE MATERIAL:
${lectureContext}

Generate ${questionCount} questions STRICTLY based on the lecture material above. Make them ${difficulty} level.

RESPOND IN THIS EXACT JSON FORMAT (no markdown, just JSON):
{
  "questions": [
    {
      "questionNumber": 1,
      "question": "Question text here",
      "type": "mcq",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A) Option 1",
      "explanation": "Detailed explanation of why this is correct and the concept behind it"
    }
  ]
}

For subjective questions, omit "options" field. The explanation should be thorough and educational.
Make the questions genuinely test understanding, not just memorization. Especially for extreme level, include tricky scenarios.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    });

    const content = response.choices[0]?.message?.content || "";
    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      res.status(500).json({ error: "Failed to parse exam questions" });
      return;
    }

    res.json({
      lecturesCovered: lectures.map(l => `Lecture ${l.lectureNumber}: ${l.title}`),
      difficulty,
      questions: parsed.questions,
      totalQuestions: parsed.questions.length,
    });
  } catch (err) {
    req.log.error({ err }, "Exam generation error");
    res.status(500).json({ error: "Failed to generate exam" });
  }
});

router.get("/chat/history/:studentId", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const studentId = parseInt(req.params.studentId);

    const studentConversations = await db.select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
    }).from(conversations).where(eq(conversations.userId, studentId));

    res.json(studentConversations);
  } catch (err) {
    req.log.error({ err }, "Get chat history error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
