import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lecturesTable = pgTable("lectures", {
  id: serial("id").primaryKey(),
  lectureNumber: integer("lecture_number").notNull(),
  title: text("title").notNull(),
  transcript: text("transcript").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLectureSchema = createInsertSchema(lecturesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLecture = z.infer<typeof insertLectureSchema>;
export type Lecture = typeof lecturesTable.$inferSelect;
