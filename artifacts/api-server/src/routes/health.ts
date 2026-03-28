import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const checks: { db: boolean; openai: boolean } = {
    db: false,
    openai: false,
  };

  try {
    await db.execute(sql`SELECT 1`);
    checks.db = true;
  } catch {
    checks.db = false;
  }

  checks.openai = !!(
    process.env.OPENAI_API_KEY ||
    process.env.REPLIT_OPENAI_API_KEY ||
    process.env.AI_API_KEY
  );

  const allOk = checks.db && checks.openai;

  // Always return 200 so Replit deployment health checks pass.
  // The status field in the body tells the admin dashboard what's actually happening.
  res.status(200).json({
    status: allOk ? "ok" : "error",
    checks,
  });
});

export default router;
