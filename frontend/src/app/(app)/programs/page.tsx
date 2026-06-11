"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ProgramSummary, Templates } from "@/lib/types";
import { Button, Card, ErrorMessage, Input, PageTitle, Spinner, Textarea } from "@/components/ui";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "草稿",
  ACTIVE: "進行中",
  COMPLETED: "已完成",
};

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramSummary[] | null>(null);
  const [templates, setTemplates] = useState<Templates | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationDays, setDurationDays] = useState("60");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [list, tpl] = await Promise.all([
      api<ProgramSummary[]>("/programs"),
      api<Templates>("/templates"),
    ]);
    setPrograms(list);
    setTemplates(tpl);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createProgram(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/programs", {
        method: "POST",
        body: { name, description, durationDays: Number(durationDays) || 60 },
      });
      setShowForm(false);
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立失敗");
    } finally {
      setBusy(false);
    }
  }

  async function cloneTemplate(templateId: number) {
    setBusy(true);
    try {
      await api(`/programs/from-template/${templateId}`, { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteProgram(id: number) {
    if (!confirm("確定要刪除此訓練計劃？相關進度記錄也會一併刪除。")) return;
    await api(`/programs/${id}`, { method: "DELETE" });
    await load();
  }

  if (!programs) return <Spinner />;

  return (
    <div className="space-y-5">
      <PageTitle
        title="訓練計劃"
        subtitle="建立與管理你的訓練計劃"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "取消" : "+ 新增計劃"}
          </Button>
        }
      />

      {showForm && (
        <Card>
          <form onSubmit={createProgram} className="space-y-4">
            <Input label="計劃名稱" value={name} onChange={setName} required />
            <Textarea label="描述" value={description} onChange={setDescription} rows={2} />
            <Input label="天數" type="number" value={durationDays} onChange={setDurationDays} />
            <ErrorMessage message={error} />
            <Button type="submit" disabled={busy}>
              建立計劃
            </Button>
          </form>
        </Card>
      )}

      {programs.length === 0 && (
        <Card className="text-center text-sm text-slate-400">
          尚未建立任何訓練計劃。可以從下方範本開始。
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {programs.map((p) => (
          <Card key={p.id} className="flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-100">{p.name}</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    p.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : p.status === "COMPLETED"
                        ? "bg-sky-500/15 text-sky-300"
                        : "bg-slate-600/30 text-slate-300"
                  }`}
                >
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              {p.description && (
                <p className="mt-1 text-sm text-slate-400">{p.description}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {p.durationDays} 天{p.startDate ? ` ・ 開始日期 ${p.startDate}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/programs/${p.id}`} className="flex-1">
                <Button variant="secondary" className="w-full">
                  查看 / 編輯
                </Button>
              </Link>
              <Button variant="danger" onClick={() => deleteProgram(p.id)}>
                刪除
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {templates && templates.programs.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-200">範本</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {templates.programs.map((t) => (
              <Card key={t.id} className="flex flex-col justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-100">{t.name}</h3>
                  {t.description && (
                    <p className="mt-1 text-sm text-slate-400">{t.description}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">{t.durationDays} 天</p>
                </div>
                <Button onClick={() => cloneTemplate(t.id)} disabled={busy}>
                  使用此範本建立計劃
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
