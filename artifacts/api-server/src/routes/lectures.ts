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
  // Safety truncation — only for extremely large transcripts (>200K chars)
  const MAX_TRANSCRIPT_CHARS = 200000;
  const safeTranscript = transcript.length > MAX_TRANSCRIPT_CHARS
    ? transcript.slice(0, MAX_TRANSCRIPT_CHARS) + "\n\n[...transcript truncated — all major concepts above are fully covered]"
    : transcript;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    stream: false,
    messages: [
      {
        role: "user",
        content: `You are creating premium, structured study notes for a Macroeconomics course taught by "Xeno Sir."

LECTURE ${lectureNumber}: ${title}

TRANSCRIPT (raw — contains timestamps and filler words, IGNORE all of that):
${safeTranscript}

---

SUPPLEMENTARY DASHBOARD CONTEXT (Federal Reserve Rate Dashboard used during class — use this to enrich explanations with real data and current figures where relevant):
- Fed Funds Rate: 3.65% (target 3.50–3.75%), Feb 2026. Cycle peak: 5.33% (Jul 2023–Aug 2024). Hike cycle (2022–23): +525bps over 11 meetings in 16 months — fastest in 40 years. Cut cycle (2024–25): −175bps across 6 meetings.
- CPI (Jan 2026): 3.0% | PCE (Dec 2025): 2.9% | Fed target: 2.0%. Real Rate (CPI): +0.65% | Real Rate (PCE): +0.75% → RESTRICTIVE
- 10Y Treasury: 4.41% | 10Y–2Y Spread: +0.23% (re-normalizing after 24-month inversion, deepest: −1.07% Jul 2023 — deepest since 1981). Every US recession since 1955 preceded by yield curve inversion.
- Intermarket: Rate hike → 10Y Treasury rises (+0.82 corr), DXY strengthens (+0.61 corr, forward-looking — peaks BEFORE real rate), Equities pressured (but soft landing kept S&P elevated in 2023), Gold inversely linked to real rates, INR weakens on capital outflows (+0.74 corr), Oil mixed (−0.28 corr).
- DXY: Peaked near 114 (Sep 2022), cycle peak 109.1 (Jan 2025). KEY: DXY peaks before real rate peaks — it's forward-looking.
- Global CBs: Fed 3.65% | ECB 2.65% (cutting) | RBI 6.25% (250bps above Fed → FII flows into India, but INR risk) | BoJ 0.50% (hiking — carry trade unwind risk) | BoE 4.50%.
- QE/QT: Balance sheet pre-GFC $900B → COVID peak $8.97T. QT began Jun 2022 ($95B/month). QT ended Dec 1, 2025. Current: $6.60T. Shadow rate in 2022–23 was more restrictive than 5.33% nominal rate alone.
- Taylor Rule: i = r* + π + 0.5(π − π*) + 0.5(y). Currently implies ~4.10%. Actual 3.65% → 45bps too loose. 2021 gap of −4 to −6% caused the inflation surge. Created by John B. Taylor, Stanford, 1993.
- FedWatch: 30-Day Fed Funds Futures → implied rate = 100 − futures price. Mar 2026: 94.1% Hold. First cut: June 2026 (~47%). Trade the shift in expectations, not the meeting itself.
- Bond-Rate Law: Rate ↑ → Bond Price ↓. Duration × rate move = % price change. 2022 hike cycle: 20Y+ bond funds lost 30–40%. Fed cutting → buy long-duration bonds (TLT).
- Monetary Transmission: Rate hike → Credit tightens → Spending falls → Demand falls → CPI falls (6–18 months lag) → GDP slows → Jobs lost (9–18 months lag). Time lags: 6–24 months total.
- All-time high rate: 20% (Jun 1981 Volcker Shock). All-time low: 0.07% (Mar 2021 COVID). ZIRP: 2008–2015 and 2020–2022.

---

YOUR TASK: Create comprehensive, high-quality Markdown study notes based on the concepts taught in the TRANSCRIPT above, enriched with real-world data from the DASHBOARD where directly relevant.

STRICT RULES:
- NEVER include any timestamps (e.g. "0:00", "1:23 minutes", "seconds"), time markers, or any raw transcript artifacts
- NEVER include filler words, incomplete sentences, or conversational noise from the transcript
- Extract the actual macroeconomic knowledge from the transcript — dashboard data supports and enriches, not replaces
- **LANGUAGE STYLE — MOST IMPORTANT:** Write in HINGLISH (Roman Hindi + English mixed) — exactly like an educated Indian student writes notes. English for all technical/economic terms, Roman Hindi for explanations, transitions, and context. Examples of the style:
  - "Fed jab rates badhata hai, toh credit tighten hota hai — matlab loan lena mehnga ho jaata hai"
  - "Yeh concept samajhna zaroori hai — Real Rate = Nominal Rate minus Inflation"
  - "Jab yield curve invert hoti hai, iska matlab recession aa sakta hai aage"
  - "DXY strengthen hota hai jab Fed hike karta hai — kyunki dollar-denominated assets attractive lagte hain"
  - Technical terms ALWAYS in English: GDP, inflation, yield curve, Fed Funds Rate, DXY, PCE, FOMC, QE, QT, etc.
  - Explanations and flow in Roman Hindi/Urdu: "matlab", "kyunki", "jab", "toh", "iska matlab", "samjho"
- **Easy to understand** — bilkul simple aur clear, dry textbook jaisa nahi
- **Detailed** — har concept jo transcript mein padha gaya, cover karo
- **Examples** — 2–3 real-world examples per major concept (dashboard data se real figures use karo)
- **Markdown formatting** — use # headings, ## subheadings, **bold** key terms, bullet points, > blockquotes for definitions
- Only teach what is grounded in the transcript (supported by dashboard context)

FORMAT — Follow this structure EXACTLY, in Hinglish style throughout:

# 📚 Lecture ${lectureNumber}: ${title}

## 🔍 Overview
[3-4 sentence Hinglish summary — kya padha, kyun important hai, kya seekha]

---

## [Topic Name — from lecture]

> 💡 **Definition:** [Key term ka clear Hinglish definition — simple words mein]

### Yeh kaam kaise karta hai?
[Step-by-step Hinglish explanation of the mechanism — jaise ek professor samjha raha ho]

### Real-World Examples
**Example 1 — [Country/Event]:** [Dashboard data ya transcript se real example, Hinglish mein]
**Example 2 — [Country/Event]:** [Another real example with actual numbers where possible]
**Example 3 (if applicable):** [Third example]

### Kyun important hai? (Why It Matters)
[2-3 lines — is concept ka practical importance kya hai, trading ya policy mein kaise use hota hai]

### ⚠️ Common Mistakes / Exam Traps
- [Galti jo students karte hain]
- [Tricky exam question jo iss topic pe aata hai]

---

[Repeat above block for each major topic in the lecture]

---

## 📊 Key Formulas & Data (if applicable)
| Formula / Data Point | Value / Explanation |
|---|---|
| [Formula name] | [Formula with current values] |

---

## 🎯 Exam Key Points
- [Most important point — exam mein zaroor aayega]
- [Second most important]
- [Third most important]
- [Keywords examiner dhundhta hai]

---

## 📝 Quick Revision Summary
[8-10 bullet points — poore lecture ka rapid-fire summary in Hinglish — revision ke liye perfect]

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

// Generate/regenerate notes for ALL lectures (force = true regenerates even existing notes)
router.post("/lectures/generate-all-notes", requireAdmin, async (req: Request, res: Response) => {
  try {
    const force = req.query.force === "true";
    const allLectures = await db.select().from(lecturesTable).orderBy(lecturesTable.lectureNumber);
    const toProcess = force
      ? allLectures
      : allLectures.filter(l => !l.notes || l.notes.trim().length === 0);

    if (toProcess.length === 0) {
      res.json({ total: 0, generated: 0, failed: 0, message: "All lectures already have notes. Use force=true to regenerate." });
      return;
    }

    // Sequential processing — one lecture at a time to prevent timeout on large transcripts
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
        req.log.error({ err, lectureId: lecture.id }, "Notes generation failed for lecture");
        failed++;
      }
    }

    res.json({
      total: toProcess.length,
      generated,
      failed,
      message: `Notes ${force ? "regenerated" : "generated"} for ${generated} lecture(s).${failed > 0 ? ` ${failed} failed — try again.` : ""}`,
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
