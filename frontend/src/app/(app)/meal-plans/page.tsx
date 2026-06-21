"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { MealPlanSummary, Templates } from "@/lib/types";
import { Button, Card, ErrorMessage, Input, PageTitle, Spinner, Textarea } from "@/components/ui";
import { ExcelActions } from "@/components/ExcelActions";

export default function MealPlansPage() {
  const [plans, setPlans] = useState<MealPlanSummary[] | null>(null);
  const [templates, setTemplates] = useState<Templates | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationDays, setDurationDays] = useState("60");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [list, tpl] = await Promise.all([
      api<MealPlanSummary[]>("/meal-plans"),
      api<Templates>("/templates"),
    ]);
    setPlans(list);
    setTemplates(tpl);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/meal-plans", {
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
      await api(`/meal-plans/from-template/${templateId}`, { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deletePlan(id: number) {
    if (!confirm("確定要刪除此餐單？")) return;
    await api(`/meal-plans/${id}`, { method: "DELETE" });
    await load();
  }

  async function activate(id: number) {
    setBusy(true);
    try {
      await api(`/meal-plans/${id}/activate`, { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!plans) return <Spinner />;

  return (
    <div className="space-y-5">
      <PageTitle
        title="飲食餐單"
        subtitle="建立與管理你的餐單。設定「使用中」的餐單會顯示在今日總覽。"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "取消" : "+ 新增餐單"}
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-400">
            使用 Excel 批次匯入餐單，或先下載範本填寫。
          </div>
          <ExcelActions
            templatePath="/meal-plans/template/excel"
            templateFilename="gymapp-meal-plan-template.xlsx"
            importPath="/meal-plans/import/excel"
            defaultName="我的餐單"
            onImported={load}
          />
        </div>
      </Card>

      {showForm && (
        <Card>
          <form onSubmit={createPlan} className="space-y-4">
            <Input label="餐單名稱" value={name} onChange={setName} required />
            <Textarea label="描述" value={description} onChange={setDescription} rows={2} />
            <Input label="天數" type="number" value={durationDays} onChange={setDurationDays} />
            <ErrorMessage message={error} />
            <Button type="submit" disabled={busy}>
              建立餐單
            </Button>
          </form>
        </Card>
      )}

      {plans.length === 0 && (
        <Card className="text-center text-sm text-slate-400">
          尚未建立任何餐單。可以從下方範本開始。
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((p) => (
          <Card
            key={p.id}
            className={`flex flex-col justify-between gap-3 ${
              p.active ? "ring-1 ring-emerald-400/60" : ""
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-100">{p.name}</h2>
                {p.active && (
                  <span className="shrink-0 rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-semibold text-slate-950">
                    使用中
                  </span>
                )}
              </div>
              {p.description && <p className="mt-1 text-sm text-slate-400">{p.description}</p>}
              <p className="mt-2 text-xs text-slate-500">{p.durationDays} 天</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!p.active && (
                <Button onClick={() => activate(p.id)} disabled={busy}>
                  設為使用中
                </Button>
              )}
              <Link href={`/meal-plans/${p.id}`} className="flex-1">
                <Button variant="secondary" className="w-full">
                  查看 / 編輯
                </Button>
              </Link>
              <Button variant="danger" onClick={() => deletePlan(p.id)}>
                刪除
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {templates && templates.mealPlans.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-200">範本</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {templates.mealPlans.map((t) => (
              <Card key={t.id} className="flex flex-col justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-100">{t.name}</h3>
                  {t.description && (
                    <p className="mt-1 text-sm text-slate-400">{t.description}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">{t.durationDays} 天</p>
                </div>
                <Button onClick={() => cloneTemplate(t.id)} disabled={busy}>
                  使用此範本建立餐單
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
