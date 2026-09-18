"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { saveProductionTypesAction, renameProductionTypeAction } from "@/app/settings/types/actions";

interface ProductionTypesFormProps {
  types: string[];
  /** Types actually used in productions (can't be removed) */
  usedTypes: string[];
}

export function ProductionTypesForm({ types: initialTypes, usedTypes }: ProductionTypesFormProps) {
  const t = useTranslations("settings.types");
  const [types, setTypes] = useState(initialTypes);
  const [newType, setNewType] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleAdd() {
    const trimmed = newType.trim();
    if (!trimmed || types.includes(trimmed)) return;
    const updated = [...types, trimmed];
    setTypes(updated);
    setNewType("");
    save(updated);
  }

  function handleRemove(index: number) {
    const updated = types.filter((_, i) => i !== index);
    setTypes(updated);
    save(updated);
  }

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditValue(types[index]);
  }

  function confirmEdit(index: number) {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    const oldValue = types[index];
    if (oldValue === trimmed) {
      setEditingIndex(null);
      return;
    }

    const updated = [...types];
    updated[index] = trimmed;
    setEditingIndex(null);

    // Rename in DB if the type was used in productions
    if (usedTypes.includes(oldValue)) {
      startTransition(async () => {
        const renameResult = await renameProductionTypeAction(oldValue, trimmed);
        if ("error" in renameResult) {
          setMessage(renameResult.error === "nameRequired" ? t("errors.nameRequired") : t("errors.renameFailed"));
          return;
        }
        const saveResult = await saveProductionTypesAction(updated);
        if ("error" in saveResult) {
          setMessage(t("errors.saveFailed"));
          return;
        }
        setTypes(updated);
        setMessage(t("renamed", { oldType: oldValue, newType: trimmed }));
      });
    } else {
      setTypes(updated);
      save(updated);
    }
  }

  function save(updated: string[]) {
    startTransition(async () => {
      const result = await saveProductionTypesAction(updated);
      if ("error" in result) {
        setMessage(t("errors.saveFailed"));
        setTimeout(() => setMessage(null), 3000);
        return;
      }
      setMessage(t("saved"));
      setTimeout(() => setMessage(null), 3000);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          {t("title")}
          <InfoTip>{t("infoTip")}</InfoTip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("description")}</p>

        <div className="space-y-1">
          {types.map((type, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              {editingIndex === i ? (
                <>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmEdit(i)}
                    className="h-8 flex-1"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => confirmEdit(i)} disabled={isPending}>
                    <Check className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditingIndex(null)}>
                    <X className="size-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{type}</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => startEdit(i)} disabled={isPending}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRemove(i)}
                    disabled={isPending || usedTypes.includes(type)}
                    title={usedTypes.includes(type) ? t("deleteUsedTitle") : t("deleteTitle")}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder={t("newTypePlaceholder")}
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="h-8"
          />
          <Button variant="outline" size="sm" onClick={handleAdd} disabled={isPending || !newType.trim()}>
            <Plus className="size-3.5" />
            {t("add")}
          </Button>
        </div>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
