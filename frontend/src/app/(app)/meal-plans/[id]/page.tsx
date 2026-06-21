"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { MealDay, MealItem, MealPlanDetail } from "@/lib/types";
import { Button, Card, ErrorMessage, Input, PageTitle, Spinner, Textarea } from "@/components/ui";

interface MealDraft {
  dayOfWeek: string;
  breakfast: string;
  lunch: string;
  afternoonSnack: string;
  dinner: string;
  supplements: string;
  tips: string;
}

function toDraft(day: MealDay | null): MealDraft {
  return {
    dayOfWeek: day?.dayOfWeek ?? "",
    breakfast: day?.breakfast ?? "",
    lunch: day?.lunch ?? "",
    afternoonSnack: day?.afternoonSnack ?? "",
    dinner: day?.dinner ?? "",
    supplements: day?.supplements ?? "",
    tips: day?.tips ?? "",
  };
}

export default function MealPlanDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = params.id;

  const [plan, setPlan] = useState<MealPlanDetail | null>(null);
  const [mealItems, setMealItems] = useState<MealItem[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [draft, setDraft] = useState<MealDraft>(toDraft(null));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPlan(await api<MealPlanDetail>(`/meal-plans/${planId}`));
  }, [planId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api<MealItem[]>("/meal-items").then(setMealItems).catch(() => {});
  }, []);

  useEffect(() => {
    const dayParam = Number(searchParams.get("day"));
    if (dayParam >= 1) setSelectedDay(dayParam);
  }, [searchParams]);

  const currentDay = useMemo(
    () => plan?.days.find((d) => d.dayNumber === selectedDay) ?? null,
    [plan, selectedDay],
  );

  useEffect(() => {
    setDraft(toDraft(currentDay));
  }, [currentDay, selectedDay]);

  async function saveDay() {
    setError(null);
    setBusy(true);
    try {
      await api(`/meal-plans/${planId}/days/${selectedDay}`, {
        method: "PUT",
        body: {
          dayOfWeek: draft.dayOfWeek || null,
          breakfast: draft.breakfast || null,
          lunch: draft.lunch || null,
          afternoonSnack: draft.afternoonSnack || null,
          dinner: draft.dinner || null,
          supplements: draft.supplements || null,
          tips: draft.tips || null,
        },
      });
      await load();
      setSavedMessage(`Day ${selectedDay} 已儲存`);
      setTimeout(() => setSavedMessage(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDay() {
    if (!currentDay || !confirm(`確定要刪除 Day ${selectedDay} 的餐單內容？`)) return;
    setBusy(true);
    try {
      await api(`/meal-plans/${planId}/days/${selectedDay}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!plan) return <Spinner />;

  const readOnly = plan.template;

  return (
    <div className="space-y-5">
      <PageTitle
        title={plan.name}
        subtitle={readOnly ? "系統範本（唯讀）" : `${plan.durationDays} 天餐單`}
        actions={
          <Button variant="secondary" onClick={() => router.push("/meal-plans")}>
            ← 返回列表
          </Button>
        }
      />

      {savedMessage && (
        <p className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {savedMessage}
        </p>
      )}
      <ErrorMessage message={error} />

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-100">{plan.durationDays} 天日曆</h2>
        <p className="mb-3 text-xs text-slate-500">點擊任一天查看或編輯餐單。深色 = 已有內容。</p>
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
          {Array.from({ length: plan.durationDays }, (_, i) => i + 1).map((d) => {
            const hasContent = plan.days.some((x) => x.dayNumber === d);
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`rounded-lg py-2 text-xs font-medium transition-colors ${
                  selectedDay === d ? "ring-2 ring-emerald-400" : ""
                } ${
                  hasContent
                    ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                    : "bg-slate-900/70 text-slate-500 hover:bg-slate-800"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            Day {selectedDay}
            {currentDay?.weekNumber ? `（第 ${currentDay.weekNumber} 週）` : ""}
          </h2>
          {!readOnly && currentDay && (
            <Button variant="danger" onClick={deleteDay} disabled={busy}>
              刪除此日內容
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <Input
            label="星期"
            value={draft.dayOfWeek}
            onChange={(v) => setDraft({ ...draft, dayOfWeek: v })}
            placeholder="星期一"
          />
          {mealItems.length > 0 && (
            <p className="text-xs text-slate-500">
              提示：每個餐別可從「菜式庫」加入菜式，或直接輸入其他內容。
            </p>
          )}
          <DishField
            label="早餐"
            value={draft.breakfast}
            onChange={(v) => setDraft({ ...draft, breakfast: v })}
            items={mealItems}
          />
          <DishField
            label="午餐"
            value={draft.lunch}
            onChange={(v) => setDraft({ ...draft, lunch: v })}
            items={mealItems}
          />
          <DishField
            label="下午茶"
            value={draft.afternoonSnack}
            onChange={(v) => setDraft({ ...draft, afternoonSnack: v })}
            items={mealItems}
          />
          <DishField
            label="晚餐"
            value={draft.dinner}
            onChange={(v) => setDraft({ ...draft, dinner: v })}
            items={mealItems}
          />
          <DishField
            label="訓練後/睡前補充"
            value={draft.supplements}
            onChange={(v) => setDraft({ ...draft, supplements: v })}
            items={mealItems}
          />
          <Textarea
            label="備餐提示與技巧"
            value={draft.tips}
            onChange={(v) => setDraft({ ...draft, tips: v })}
            rows={2}
          />
        </div>

        {!readOnly && (
          <div className="mt-4">
            <Button onClick={saveDay} disabled={busy}>
              儲存 Day {selectedDay}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function DishField({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: MealItem[];
}) {
  function addDish(name: string) {
    if (!name) return;
    onChange(value.trim() ? `${value}\n${name}` : name);
  }

  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        {items.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              addDish(e.target.value);
              e.target.value = "";
            }}
            className="rounded-lg border border-slate-600 bg-slate-900/70 px-2 py-1 text-xs text-slate-200 focus:border-emerald-400 focus:outline-none"
          >
            <option value="">+ 加入菜式</option>
            {items.map((it) => (
              <option key={it.id} value={it.name}>
                {it.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
      />
    </label>
  );
}
