"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { saveCncMappingAction } from "@/app/settings/mappings/actions";
import { InfoTip } from "@/components/ui/info-tip";
import { cncGrid } from "@/lib/config/cnc-grid";
import type { CncRoleMapping } from "@/lib/config/cnc-mapping";

interface CncMappingFormProps {
  mapping: CncRoleMapping[];
}

export function CncMappingForm({ mapping: initialMapping }: CncMappingFormProps) {
  const t = useTranslations("settings.mappings");
  const tCncGrid = useTranslations("config.cncGrid");
  const [mapping, setMapping] = useState(initialMapping);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<CncRoleMapping | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newRow, setNewRow] = useState<CncRoleMapping>({
    cnc_category: "2_personnel",
    role_key: "",
    labels: { fr: "", de: "", en: "" },
  });
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // Group by category for display
  const grouped = useMemo(() => {
    const groups = new Map<string, { index: number; row: CncRoleMapping }[]>();
    mapping.forEach((row, index) => {
      const list = groups.get(row.cnc_category) ?? [];
      list.push({ index, row });
      groups.set(row.cnc_category, list);
    });
    return groups;
  }, [mapping]);

  function startEdit(index: number) {
    setEditIndex(index);
    setEditRow({ ...mapping[index], labels: { ...mapping[index].labels } });
  }

  function confirmEdit() {
    if (editIndex === null || !editRow) return;
    const updated = [...mapping];
    updated[editIndex] = editRow;
    setMapping(updated);
    setEditIndex(null);
    setEditRow(null);
    save(updated);
  }

  function handleDelete(index: number) {
    const updated = mapping.filter((_, i) => i !== index);
    setMapping(updated);
    save(updated);
  }

  function handleAdd() {
    if (!newRow.role_key.trim() || !newRow.labels.fr.trim()) return;
    const updated = [...mapping, newRow];
    setMapping(updated);
    setAddOpen(false);
    setNewRow({ cnc_category: "2_personnel", role_key: "", labels: { fr: "", de: "", en: "" } });
    save(updated);
  }

  function save(updated: CncRoleMapping[]) {
    startTransition(async () => {
      await saveCncMappingAction(updated);
      setMessage(t("saved"));
      setTimeout(() => setMessage(null), 3000);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("summary", { count: mapping.length })}
            <InfoTip>{t("infoTip")}</InfoTip>
          </p>
          {message && <p className="text-sm text-muted-foreground mt-1">{message}</p>}
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            <Plus className="size-3.5" />
            {t("addButton")}
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("addDialogTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("categoryLabel")}</Label>
                <select
                  value={newRow.cnc_category}
                  onChange={(e) => setNewRow((prev) => ({ ...prev, cnc_category: e.target.value }))}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {cncGrid.map((cat) => (
                    <option key={cat.key} value={cat.key}>{cat.number}. {tCncGrid(cat.key)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("roleKeyLabel")}</Label>
                <Input
                  placeholder={t("roleKeyPlaceholder")}
                  value={newRow.role_key}
                  onChange={(e) => setNewRow((prev) => ({ ...prev, role_key: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label>{t("labelFr")}</Label>
                  <Input
                    placeholder={t("placeholderFr")}
                    value={newRow.labels.fr}
                    onChange={(e) => setNewRow((prev) => ({ ...prev, labels: { ...prev.labels, fr: e.target.value } }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("labelDe")}</Label>
                  <Input
                    placeholder={t("placeholderDe")}
                    value={newRow.labels.de}
                    onChange={(e) => setNewRow((prev) => ({ ...prev, labels: { ...prev.labels, de: e.target.value } }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("labelEn")}</Label>
                  <Input
                    placeholder={t("placeholderEn")}
                    value={newRow.labels.en}
                    onChange={(e) => setNewRow((prev) => ({ ...prev, labels: { ...prev.labels, en: e.target.value } }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>{t("cancel")}</Button>
              <Button onClick={handleAdd} disabled={!newRow.role_key.trim() || !newRow.labels.fr.trim()}>
                <Plus className="size-3.5" />
                {t("addButton")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {cncGrid.map((cat) => {
        const rows = grouped.get(cat.key);
        if (!rows || rows.length === 0) return null;
        return (
          <Card key={cat.key}>
            <CardHeader className="py-3">
              <CardTitle className="text-base">{cat.number}. {tCncGrid(cat.key)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">{t("table.key")}</TableHead>
                    <TableHead>{t("table.fr")}</TableHead>
                    <TableHead>{t("table.de")}</TableHead>
                    <TableHead>{t("table.en")}</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ index, row }) => (
                    <TableRow key={index}>
                      {editIndex === index && editRow ? (
                        <>
                          <TableCell>
                            <Input value={editRow.role_key} onChange={(e) => setEditRow({ ...editRow, role_key: e.target.value })} className="h-8 text-sm" />
                          </TableCell>
                          <TableCell>
                            <Input value={editRow.labels.fr} onChange={(e) => setEditRow({ ...editRow, labels: { ...editRow.labels, fr: e.target.value } })} className="h-8 text-sm" />
                          </TableCell>
                          <TableCell>
                            <Input value={editRow.labels.de} onChange={(e) => setEditRow({ ...editRow, labels: { ...editRow.labels, de: e.target.value } })} className="h-8 text-sm" />
                          </TableCell>
                          <TableCell>
                            <Input value={editRow.labels.en} onChange={(e) => setEditRow({ ...editRow, labels: { ...editRow.labels, en: e.target.value } })} className="h-8 text-sm" />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="size-7 p-0" onClick={confirmEdit}><Check className="size-3.5" /></Button>
                              <Button variant="ghost" size="sm" className="size-7 p-0" onClick={() => { setEditIndex(null); setEditRow(null); }}><X className="size-3.5" /></Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-mono text-xs text-muted-foreground">{row.role_key}</TableCell>
                          <TableCell className="text-sm">{row.labels.fr}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.labels.de}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.labels.en}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="size-7 p-0" onClick={() => startEdit(index)} disabled={isPending}><Pencil className="size-3.5" /></Button>
                              <Button variant="ghost" size="sm" className="size-7 p-0" onClick={() => handleDelete(index)} disabled={isPending}><Trash2 className="size-3.5" /></Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
