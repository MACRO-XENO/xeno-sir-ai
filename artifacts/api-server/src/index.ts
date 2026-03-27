import app from "./app";
import { logger } from "./lib/logger";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function seedAdminIfNeeded() {
  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.username, "admin"));
    if (existing.length === 0) {
      const passwordHash = crypto
        .createHash("sha256")
        .update("admin123xeno_sir_salt_2024")
        .digest("hex");
      await db.insert(usersTable).values({
        username: "admin",
        passwordHash,
        role: "admin",
        displayName: "Xeno Sir Admin",
      });
      logger.info("Admin user created successfully");
    } else {
      logger.info("Admin user already exists");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed admin user");
  }
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  await seedAdminIfNeeded();
});
