"use client";

import { useState, useTransition } from "react";
import { Pencil, GitMerge, Check, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { renameProducerAction } from "@/app/settings/producers/actions";

interface Producer {
  producteur: string;
  count: number;
}

export function ProducersTable({ producers: initialProducers }: { producers: Producer[] }) {
  const t = useTranslations("settings.producers");
  const [producers, setProducers] = useState(initialProducers);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function startEdit(name: string) {
    setEditingName(name);
    setEditValue(name);
  }

  function confirmEdit(oldName: string) {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingName(null);
      return;
    }

    startTransition(async () => {
      const result = await renameProducerAction(oldName, trimmed);
      if ("error" in result) {
        setMessage(result.error === "nameRequired" ? t("errors.nameRequired") : t("errors.renameFailed"));
        setTimeout(() => setMessage(null), 5000);
        return;
      }
      const count = result.count;
      setProducers((prev) => {
        // Check if target name already exists (merge case)
        const existing = prev.find((p) => p.producteur === trimmed);
        if (existing) {
          return prev
            .map((p) => p.producteur === trimmed ? { ...p, count: p.count + (prev.find((x) => x.producteur === oldName)?.count ?? 0) } : p)
            .filter((p) => p.producteur !== oldName);
        }
        return prev.map((p) => p.producteur === oldName ? { ...p, producteur: trimmed } : p);
      });
      setEditingName(null);
      setMessage(t("renamed", { oldName, newName: trimmed, count }));
      setTimeout(() => setMessage(null), 5000);
    });
  }

  function handleMerge() {
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return;

    startTransition(async () => {
      const result = await renameProducerAction(mergeSource, mergeTarget);
      if ("error" in result) {
        setMessage(result.error === "nameRequired" ? t("errors.nameRequired") : t("errors.renameFailed"));
        setTimeout(() => setMessage(null), 5000);
        return;
      }
      const count = result.count;
      setProducers((prev) => {
        const sourceCount = prev.find((p) => p.producteur === mergeSource)?.count ?? 0;
        return prev
          .map((p) => p.producteur === mergeTarget ? { ...p, count: p.count + sourceCount } : p)
          .filter((p) => p.producteur !== mergeSource);
      });
      setMergeOpen(false);
      setMergeSource("");
      setMergeTarget("");
      setMessage(t("merged", { source: mergeSource, target: mergeTarget, count }));
      setTimeout(() => setMessage(null), 5000);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-1.5">
          {t("title")}
          <InfoTip>{t("infoTip")}</InfoTip>
        </CardTitle>
        <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            <GitMerge className="size-3.5" />
            {t("mergeButton")}
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("mergeDialogTitle")}</DialogTitle>
              <DialogDescription>{t("mergeDialogDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("sourceLabel")}</Label>
                <select
                  value={mergeSource}
                  onChange={(e) => setMergeSource(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("selectPlaceholder")}</option>
                  {producers.filter((p) => p.producteur !== mergeTarget).map((p) => (
                    <option key={p.producteur} value={p.producteur}>
                      {p.producteur} ({p.count})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("targetLabel")}</Label>
                <select
                  value={mergeTarget}
                  onChange={(e) => setMergeTarget(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("selectPlaceholder")}</option>
                  {producers.filter((p) => p.producteur !== mergeSource).map((p) => (
                    <option key={p.producteur} value={p.producteur}>
                      {p.producteur} ({p.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMergeOpen(false)}>{t("cancel")}</Button>
              <Button onClick={handleMerge} disabled={isPending || !mergeSource || !mergeTarget || mergeSource === mergeTarget}>
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <GitMerge className="size-3.5" />}
                {t("mergeButton")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("summary", { count: producers.length, total: producers.reduce((sum, p) => sum + p.count, 0) })}
        </p>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.producer")}</TableHead>
              <TableHead className="text-right">{t("table.productions")}</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {producers.map((p) => (
              <TableRow key={p.producteur}>
                <TableCell>
                  {editingName === p.producteur ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmEdit(p.producteur);
                          if (e.key === "Escape") setEditingName(null);
                        }}
                        className="h-8"
                        autoFocus
                      />
                      <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => confirmEdit(p.producteur)} disabled={isPending}>
                        <Check className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => setEditingName(null)}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <span className="font-medium">{p.producteur}</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{p.count}</TableCell>
                <TableCell>
                  {editingName !== p.producteur && (
                    <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => startEdit(p.producteur)} disabled={isPending}>
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
