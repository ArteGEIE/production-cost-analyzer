import { eq, desc, and } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db";
import { productionNotes } from "@/lib/db/schema";
import type { Db } from "@/lib/db/queries";

export async function getNotesByProductionId(
  productionId: number,
  database: Db = defaultDb,
) {
  return database
    .select()
    .from(productionNotes)
    .where(eq(productionNotes.productionId, productionId))
    .orderBy(desc(productionNotes.createdAt));
}

export async function insertNote(
  data: { productionId: number; userId: string; userName: string; content: string },
  database: Db = defaultDb,
) {
  const [row] = await database
    .insert(productionNotes)
    .values(data)
    .returning();
  return row;
}

export async function updateNote(
  noteId: number,
  userId: string,
  content: string,
  database: Db = defaultDb,
) {
  const [row] = await database
    .update(productionNotes)
    .set({ content })
    .where(and(eq(productionNotes.id, noteId), eq(productionNotes.userId, userId)))
    .returning();
  return row;
}

export async function deleteNote(
  noteId: number,
  userId: string,
  database: Db = defaultDb,
) {
  const [row] = await database
    .delete(productionNotes)
    .where(and(eq(productionNotes.id, noteId), eq(productionNotes.userId, userId)))
    .returning();
  return row;
}
