"use client";

import { useRef, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { addNoteAction, editNoteAction, deleteNoteAction } from "./actions";

interface Note {
  id: number;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

interface NotesViewProps {
  productionId: number;
  initialNotes: Note[];
}

function formatRelativeDate(iso: string, t: ReturnType<typeof useTranslations>): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return t("timeAgo.justNow");
  if (diffMin < 60) return t("timeAgo.minutes", { count: diffMin });
  if (diffH < 24) return t("timeAgo.hours", { count: diffH });
  if (diffD < 7) return t("timeAgo.days", { count: diffD });
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function UserInitials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {initials}
    </div>
  );
}

function NoteItem({
  note,
  productionId,
  isOwner,
}: {
  note: Note;
  productionId: number;
  isOwner: boolean;
}) {
  const t = useTranslations("notes");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [isPending, startTransition] = useTransition();

  function handleEdit() {
    if (!editContent.trim()) return;
    startTransition(async () => {
      const result = await editNoteAction(productionId, note.id, editContent);
      if ("success" in result) {
        setIsEditing(false);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteNoteAction(productionId, note.id);
    });
  }

  return (
    <div className="group flex gap-3">
      <UserInitials name={note.userName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">{note.userName}</span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeDate(note.createdAt, t)}
          </span>
          {isOwner && !isEditing && (
            <span className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => { setIsEditing(true); setEditContent(note.content); }}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label={t("edit")}
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                aria-label={t("delete")}
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          )}
        </div>
        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-1 flex gap-1">
              <button
                onClick={handleEdit}
                disabled={isPending || !editContent.trim()}
                className="rounded p-1 text-primary hover:bg-accent disabled:opacity-50"
                aria-label={t("save")}
              >
                <Check className="size-4" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded p-1 text-muted-foreground hover:bg-accent"
                aria-label={t("cancel")}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-sm whitespace-pre-wrap text-foreground">
            {note.content}
          </p>
        )}
      </div>
    </div>
  );
}

export function NotesView({ productionId, initialNotes }: NotesViewProps) {
  const t = useTranslations("notes");
  const tErrors = useTranslations("notes.errors");
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const currentUserId = session?.user?.id ?? "";

  function handleSubmit(formData: FormData) {
    const content = formData.get("content") as string;
    if (!content?.trim()) return;

    setError(null);
    startTransition(async () => {
      const result = await addNoteAction(productionId, content);
      if ("error" in result) {
        setError(tErrors(result.error));
      } else {
        formRef.current?.reset();
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      {/* New note form */}
      <form ref={formRef} action={handleSubmit} className="mb-8">
        <textarea
          name="content"
          placeholder={t("placeholder")}
          rows={3}
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        />
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? t("submitting") : t("submit")}
          </button>
        </div>
      </form>

      {/* Notes list */}
      {initialNotes.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="space-y-4">
          {initialNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              productionId={productionId}
              isOwner={note.userId === currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
