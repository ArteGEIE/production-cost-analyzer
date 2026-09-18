"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { insertNote, updateNote, deleteNote } from "@/lib/db/queries-notes";

export type NoteActionError =
  | "unauthenticated"
  | "emptyContent"
  | "addFailed"
  | "editFailed"
  | "deleteFailed"
  | "notFound";
export type NoteActionResult = { success: true } | { error: NoteActionError };

export async function addNoteAction(
  productionId: number,
  content: string,
): Promise<NoteActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { error: "unauthenticated" };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "emptyContent" };
  }

  try {
    await insertNote({
      productionId,
      userId: session.user.id ?? "",
      userName: session.user.name ?? "",
      content: trimmed,
    });
    revalidatePath(`/productions/${productionId}/notes`);
    return { success: true };
  } catch (error) {
    console.error("Failed to insert note:", { productionId, error });
    return { error: "addFailed" };
  }
}

export async function editNoteAction(
  productionId: number,
  noteId: number,
  content: string,
): Promise<NoteActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { error: "unauthenticated" };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "emptyContent" };
  }

  try {
    const row = await updateNote(noteId, session.user.id ?? "", trimmed);
    if (!row) {
      return { error: "notFound" };
    }
    revalidatePath(`/productions/${productionId}/notes`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update note:", { noteId, error });
    return { error: "editFailed" };
  }
}

export async function deleteNoteAction(
  productionId: number,
  noteId: number,
): Promise<NoteActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { error: "unauthenticated" };
  }

  try {
    const row = await deleteNote(noteId, session.user.id ?? "");
    if (!row) {
      return { error: "notFound" };
    }
    revalidatePath(`/productions/${productionId}/notes`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete note:", { noteId, error });
    return { error: "deleteFailed" };
  }
}
