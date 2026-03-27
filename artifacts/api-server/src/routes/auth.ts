import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "xeno_sir_salt_2024").digest("hex");
}

function generateToken(userId: number, role: string): string {
  const data = `${userId}:${role}:${Date.now()}`;
  const sig = crypto.createHash("sha256").update(data + "xeno_sir_jwt_secret").digest("hex");
  return Buffer.from(JSON.stringify({ userId, role, sig })).toString("base64");
}

export function verifyToken(token: string): { userId: number; role: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString());
    return { userId: decoded.userId, role: decoded.role };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  (req as any).userId = payload.userId;
  (req as any).userRole = payload.role;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: Function) {
  await requireAuth(req, res, async () => {
    if ((req as any).userRole !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.username, username));
    const user = users[0];

    if (!user || user.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const token = generateToken(user.id, user.role);
    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.displayName,
      },
      token,
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/me", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
    const user = users[0];
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({ id: user.id, username: user.username, role: user.role, displayName: user.displayName });
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (_req: Request, res: Response) => {
  res.json({ message: "Logged out successfully" });
});

export default router;
export { hashPassword };
