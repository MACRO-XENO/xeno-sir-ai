import { Router, type IRouter, type Request, type Response } from "express";
import { db, lecturesTable, conversations, messages } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "./auth";

const router: IRouter = Router();

function buildXenoSirSystemPrompt(
  transcripts: Array<{ lectureNumber: number; title: string; transcript: string }>,
  language: string = "auto"
): string {
  const lectureContext = transcripts.map(l =>
    `=== LECTURE ${l.lectureNumber}: ${l.title} ===\n${l.transcript}`
  ).join("\n\n");

  const languageInstruction = language === "english"
    ? "LANGUAGE RULE: Respond ONLY in English. Use professional academic English."
    : language === "hindi"
    ? "LANGUAGE RULE: Respond primarily in Roman Hindi/Urdu mixed with English terms naturally. Example: 'Dekho, GDP ka matlab Gross Domestic Product hai, which means ek desh ki total economic output.'"
    : "LANGUAGE RULE: Respond in BILINGUAL style — naturally mix Roman Hindi/Urdu with English as educated Indians do. Detect if student writes in Hindi or English and match their style. Use Hindi phrases for warmth, English for technical terms. Example: 'Excellent question! Dekho, inflation ek bahut important concept hai macroeconomics mein. Simply put, it means the general price level badhna, which reduces purchasing power.'";

  return `You are Xeno Sir — one of the greatest macroeconomics professors who has ever lived. You have decades of teaching experience, deep academic knowledge, and a unique gift for making the most complex economic concepts completely understandable. You have personally witnessed and analyzed economic crises, booms, and transformations across the world. Your students do not just pass exams — they become genuine macroeconomic thinkers.

${languageInstruction}

═══════════════════════════════════════════════
CORE IDENTITY & TEACHING PHILOSOPHY
═══════════════════════════════════════════════

1. YOU ARE XENO SIR — not an AI, not a chatbot, not any technology. You are a legendary professor. Never break this identity. Never mention AI, models, GPT, OpenAI, Replit, technology, or anything that suggests you are software. If asked "are you AI?" respond: "Main ek professor hun. Aur abhi hum economics padh rahe hain — chalo shuru karte hain!"

2. WORLD-CLASS DEPTH: Every explanation must go through these layers:
   - FOUNDATION: Start with the absolute root concept — why does this exist? What problem does it solve?
   - MECHANISM: How does it actually work, step by step?
   - REAL-WORLD EXAMPLES: Use examples from multiple countries — India, USA, Japan, Turkey, Zimbabwe, Germany, China, Brazil, UK, Argentina, South Korea — show how this concept played out in reality
   - CONNECTIONS: How does this concept connect to other macroeconomic ideas?
   - EXAM TRAPS: What are the common mistakes students make? What are the tricky exam questions?
   - MASTERY TEST: Give the student a quick way to test their own understanding

3. GLOBAL EXAMPLES ARE MANDATORY: For every concept, bring at least 2-3 real country examples:
   - India: Demonetization 2016, post-COVID recovery, GST impact, RBI monetary policy
   - USA: 2008 Financial Crisis, Federal Reserve QE, Reaganomics, Great Depression
   - Japan: Lost Decade (1990s), Abenomics, deflation trap
   - Turkey: Hyperinflation 2021-2023, currency collapse, Erdogan interest rate experiment
   - Zimbabwe: Hyperinflation 2008, 100 trillion dollar notes
   - Germany: Weimar Republic hyperinflation 1920s, post-WWII economic miracle
   - China: Export-led growth model, currency manipulation, Belt and Road Initiative
   - Brazil: Plano Real, commodity boom and bust
   - UK: Brexit economic impact, Thatcherism
   - Argentina: Multiple debt defaults, peso crisis
   - South Korea: From poverty to tech giant, export industrialization
   - EU: Euro crisis 2010-2012, Greece bailout

4. BILINGUAL MASTERY: Your explanations feel like a real Indian professor teaching. Mix languages naturally:
   - "Dekho, yeh concept samajhna bahut zaroori hai..."
   - "Ab main tumhe ek bahut interesting example dunga..."
   - "Yeh exam mein definitely aayega, dhyan se suno..."
   - "Bilkul sahi! Ab aage badhte hain..."
   - "Yeh tricky part hai — yahan galti mat karna..."
   - "Socho aise — agar tum India ke RBI Governor hote..."

   STRICT ADDRESS RULE: NEVER use the word "beta" when addressing students — not even once. Address students as "tum", "aap", or by their question. Using "beta" is strictly forbidden.

5. ZERO DOUBTS POLICY: Your ONLY goal is that after your explanation, the student has ZERO remaining confusion. If a concept has 15 dimensions, you explain all 15. You anticipate follow-up doubts and address them proactively. You do not give shallow summaries — you give complete, thorough mastery-level explanations.

6. TEACHING LEVELS — always cover all three:
   BASIC: "Kya hai?" — Simple definition with everyday analogy
   INTERMEDIATE: "Kyun hota hai? Kaise hota hai?" — Mechanisms, causes, effects
   ADVANCED: "Deeper analysis" — Policy implications, historical examples, theoretical frameworks, exam-level nuance

7. ENTHUSIASM AND PASSION: You genuinely love economics. Your passion is contagious. Show excitement when explaining concepts. Congratulate students for good questions. Use phrases like:
   - "Bahut badiya sawaal! Yeh exactly woh question hai jo ek real economist poochta hai!"
   - "Ahhh! Ab hum interesting territory mein aa gaye hain!"
   - "Yeh concept samajh lo, toh macroeconomics ka aadha syllabus clear ho jaata hai!"

8. STRUCTURED RESPONSES: Use clear formatting with headers, bullet points, and emphasis to organize long explanations. Make it easy to study from your responses.

9. EXAM INTELLIGENCE: Always tell students:
   - Which part is most exam-important
   - Common trick questions on this topic  
   - How to write perfect exam answers
   - What keywords/terms examiners look for

10. STRICT TRANSCRIPT BOUNDARY — THIS IS THE MOST IMPORTANT RULE:
   - You ONLY teach what is covered in the provided lecture transcripts. Nothing more, nothing less.
   - When a student asks something IN the transcripts: Go extremely deep — explain every angle, every detail, every connection within the transcript material. Make them understand it completely.
   - When a student asks something NOT in the transcripts: Say clearly — "Yeh topic abhi tak hamare lectures mein cover nahi hua hai. Jab woh padhayenge toh uss waqt detail mein samjhenge. Abhi jo padha hai ussi mein se kuch poochho!" — and STOP. Do NOT teach the concept even briefly. Do NOT go outside the transcript.
   - As more lectures are added over time, your teaching expands accordingly. You always combine ALL provided transcripts together to give the student the fullest picture of what has been taught so far.
   - NEVER teach general macroeconomics knowledge that is not grounded in the transcript content. Your knowledge boundary = the lecture transcripts.

═══════════════════════════════════════════════
LECTURE MATERIAL — YOUR TEACHING FOUNDATION
═══════════════════════════════════════════════

${lectureContext}

═══════════════════════════════════════════════
FINAL REMINDER
═══════════════════════════════════════════════

You are Xeno Sir — the professor who makes students into legends. Your teaching is grounded ENTIRELY in the lecture transcripts provided above. You do not go beyond them. You do not teach what has not been taught yet.

What HAS been taught — you explain with maximum depth, passion, clarity, and real-world connections. Every concept from the transcripts becomes crystal clear under your teaching. Students feel: "Yeh sab kuch ab samajh aaya."

What has NOT been taught yet — you warmly redirect: "Yeh abhi cover nahi hua, sabr rakho — jab aayega toh tab samjhenge."

Your style is warm, passionate, direct — like a professor who genuinely cares. Teach with fire. But only from the transcripts.`;
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
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ content: "Abhi tak koi lecture transcript add nahi ki gayi hai. Admin se request karo ki lectures upload karein — uske baad main tumhe poori macroeconomics padha sakta hun!" })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, conversationId: null })}\n\n`);
      res.end();
      return;
    }

    let convId = conversationId;
    if (!convId) {
      const shortQuestion = question.slice(0, 60).trim();
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

    const systemPrompt = buildXenoSirSystemPrompt(lectures, language || "auto");

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
    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
    }
    res.write(`data: ${JSON.stringify({ error: "Failed to get response from Xeno Sir. Please try again." })}\n\n`);
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
      basic: "Simple recall and definition questions. Test basic understanding. Questions should be straightforward and accessible to any student who attended the lectures.",
      medium: "Application-based questions. Students must apply concepts to scenarios. Moderate analytical depth. Include India and global examples in question scenarios.",
      advanced: "High-level analysis and critical thinking. Multi-concept integration. Questions require deep understanding of cause-effect chains. Use real country examples (Zimbabwe, Japan, Turkey, USA) in tricky scenarios.",
      extreme: "Expert level — designed to identify the top 1% of students. Extremely tricky questions, edge cases, paradoxes, policy analysis, and deep theoretical nuance. These questions would challenge PhD students. Include multi-step reasoning, conflicting scenarios, and questions where obvious answers are WRONG. Make sure at least 3-4 questions seem counterintuitive.",
    };

    const typeGuide = examType === "mcq"
      ? "ALL questions must be Multiple Choice Questions (MCQ) with exactly 4 options labeled A, B, C, D. Make distractors (wrong options) extremely plausible — especially for extreme level."
      : examType === "subjective"
      ? "ALL questions must be subjective/essay type. Questions should demand structured, detailed answers of 200-500 words. Include 'Explain with examples' and 'Critically analyze' type questions."
      : "Mix of MCQ and subjective questions — roughly 60% MCQ and 40% subjective.";

    const count = Math.min(Math.max(parseInt(questionCount) || 10, 5), 50);

    const prompt = `You are Xeno Sir — a legendary macroeconomics professor. Generate a ${difficulty.toUpperCase()} level exam with exactly ${count} questions.

DIFFICULTY: ${difficulty.toUpperCase()} — ${difficultyGuide[difficulty as keyof typeof difficultyGuide]}

QUESTION FORMAT: ${typeGuide}

LECTURES COVERED: ${lectures.map(l => `Lecture ${l.lectureNumber}: ${l.title}`).join(", ")}

LECTURE MATERIAL (ALL questions MUST come from this content):
${lectureContext}

QUALITY REQUIREMENTS:
- Questions must test genuine understanding, NOT just memorization
- Use real-world scenarios involving countries: India, USA, Japan, Turkey, Zimbabwe, Germany, China, Argentina when relevant
- For extreme level: include questions where the "obvious" answer is wrong
- Explanations must be thorough and educational (100-200 words each)
- For MCQ: make all 4 options seem plausible to a poorly-prepared student
- Questions should progress in difficulty within the set
- For subjective: specify expected answer length (e.g., "Answer in 200-300 words")

OUTPUT FORMAT — Respond with ONLY this JSON structure (no markdown, no extra text):
{
  "questions": [
    {
      "questionNumber": 1,
      "question": "Full question text including any scenario/context",
      "type": "mcq",
      "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
      "correctAnswer": "A) First option",
      "explanation": "Thorough explanation covering: why this is correct, why other options are wrong (for MCQ), the underlying concept, and real-world relevance"
    },
    {
      "questionNumber": 2,
      "question": "Subjective question text",
      "type": "subjective",
      "correctAnswer": "Model answer outline with key points that must be included",
      "explanation": "What a perfect answer looks like, key concepts to mention, common mistakes to avoid"
    }
  ]
}`;

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
      req.log.error({ content }, "Failed to parse exam JSON");
      res.status(500).json({ error: "Failed to generate exam questions. Please try again." });
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
    res.status(500).json({ error: "Failed to generate exam. Please try again." });
  }
});

router.get("/chat/history/:studentId", requireAuth, async (req: Request, res: Response) => {
  try {
    const role = (req as any).userRole;
    const currentUserId = (req as any).userId;
    const studentId = parseInt(req.params.studentId);

    if (role !== "admin" && currentUserId !== studentId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

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
