"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  DayLog,
  ExerciseLog,
  MealDay,
  MealPlanDetail,
  MealPlanSummary,
  ProgramDetail,
  ProgramSummary,
  Templates,
} from "@/lib/types";
import { Button, Card, PageTitle, Spinner } from "@/components/ui";

function computeCurrentDay(program: ProgramDetail, logs: DayLog[]): number {
  if (program.startDate) {
    const start = new Date(program.startDate + "T00:00:00");
    const diff = Math.floor((Date.now() - start.getTime()) / 86_400_000) + 1;
    return Math.min(Math.max(diff, 1), program.durationDays);
  }
  const firstIncomplete = Array.from(
    { length: program.durationDays },
    (_, i) => i + 1,
  ).find((d) => !logs.some((l) => l.dayNumber === d && l.completed));
  return firstIncomplete ?? program.durationDays;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlanDetail | null>(null);
  const [logs, setLogs] = useState<DayLog[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [day, setDay] = useState(1);
  const [templates, setTemplates] = useState<Templates | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const programs = await api<ProgramSummary[]>("/programs");
      const chosen = programs.find((p) => p.active) ?? programs[0] ?? null;
      if (!chosen) {
        setProgram(null);
        setTemplates(await api<Templates>("/templates"));
        return;
      }
      const [detail, dayLogs, exLogs, mealPlans] = await Promise.all([
        api<ProgramDetail>(`/programs/${chosen.id}`),
        api<DayLog[]>(`/programs/${chosen.id}/day-logs`),
        api<ExerciseLog[]>(`/programs/${chosen.id}/exercise-logs`),
        api<MealPlanSummary[]>("/meal-plans"),
      ]);
      setProgram(detail);
      setLogs(dayLogs);
      setExerciseLogs(exLogs);
      setDay(computeCurrentDay(detail, dayLogs));
      const activeMeal = mealPlans.find((m) => m.active) ?? mealPlans[0];
      if (activeMeal) {
        setMealPlan(await api<MealPlanDetail>(`/meal-plans/${activeMeal.id}`));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const workoutDay = useMemo(
    () => program?.days.find((d) => d.dayNumber === day) ?? null,
    [program, day],
  );
  const mealDay: MealDay | null = useMemo(
    () => mealPlan?.days.find((d) => d.dayNumber === day) ?? null,
    [mealPlan, day],
  );
  const log = logs.find((l) => l.dayNumber === day);
  const completedCount = logs.filter((l) => l.completed).length;

  async function toggleComplete() {
    if (!program) return;
    setBusy(true);
    try {
      await api(`/programs/${program.id}/day-logs/${day}`, {
        method: "PUT",
        body: { completed: !(log?.completed ?? false) },
      });
      setLogs(await api<DayLog[]>(`/programs/${program.id}/day-logs`));
    } finally {
      setBusy(false);
    }
  }

  async function toggleExercise(exerciseId: number, completed: boolean) {
    if (!program) return;
    // Optimistic update for snappy checkbox feedback
    setExerciseLogs((prev) => {
      const others = prev.filter((l) => l.exerciseId !== exerciseId);
      return [...others, { exerciseId, completed, completedAt: null }];
    });
    try {
      await api(`/programs/${program.id}/exercise-logs/${exerciseId}`, {
        method: "PUT",
        body: { completed },
      });
      setExerciseLogs(await api<ExerciseLog[]>(`/programs/${program.id}/exercise-logs`));
    } catch {
      setExerciseLogs(await api<ExerciseLog[]>(`/programs/${program.id}/exercise-logs`));
    }
  }

  async function cloneTemplates() {
    if (!templates) return;
    setBusy(true);
    try {
      if (templates.programs[0]) {
        await api(`/programs/from-template/${templates.programs[0].id}`, {
          method: "POST",
        });
      }
      if (templates.mealPlans[0]) {
        await api(`/meal-plans/from-template/${templates.mealPlans[0].id}`, {
          method: "POST",
        });
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;

  if (!program) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-50">歡迎使用 GymApp</h1>
        <p className="mt-3 text-slate-400">
          你還沒有訓練計劃。可以從 60 天 Lean Bulk 範本開始，或自行建立計劃。
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={cloneTemplates} disabled={busy}>
            {busy ? "建立中…" : "從 60 天 Lean Bulk 範本建立"}
          </Button>
          <Link href="/programs">
            <Button variant="secondary">自行建立計劃</Button>
          </Link>
        </div>
      </div>
    );
  }

  const progressPct = Math.round((completedCount / program.durationDays) * 100);

  return (
    <div className="space-y-5">
      <PageTitle
        title={`Day ${day}${workoutDay ? ` — 第 ${workoutDay.weekNumber ?? "?"} 週 ${workoutDay.dayOfWeek ?? ""}` : ""}`}
        subtitle={program.name}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDay(Math.max(1, day - 1))}>
              ← 前一天
            </Button>
            <Button
              variant="secondary"
              onClick={() => setDay(Math.min(program.durationDays, day + 1))}
            >
              後一天 →
            </Button>
            <Button onClick={toggleComplete} disabled={busy}>
              {log?.completed ? "取消完成標記" : "標記今日完成"}
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>
            完成進度：{completedCount} / {program.durationDays} 天
          </span>
          <span className="font-semibold text-emerald-400">{progressPct}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">今日訓練</h2>
            <Link
              href={`/programs/${program.id}?day=${day}`}
              className="text-sm text-emerald-400 hover:underline"
            >
              編輯 →
            </Link>
          </div>
          {workoutDay ? (
            <div className="space-y-3 text-sm">
              <p className="font-medium text-emerald-300">{workoutDay.trainingType}</p>
              {workoutDay.restAdvice && (
                <p className="text-slate-400">休息：{workoutDay.restAdvice}</p>
              )}
              <ul className="space-y-2">
                {workoutDay.exercises.map((ex) => {
                  const done =
                    exerciseLogs.find((l) => l.exerciseId === ex.id)?.completed ?? false;
                  return (
                    <li
                      key={ex.id}
                      className="flex items-center gap-3 rounded-lg bg-slate-900/60 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={(e) => toggleExercise(ex.id, e.target.checked)}
                        className="h-4 w-4 shrink-0 accent-emerald-500"
                      />
                      <span
                        className={`flex-1 ${
                          done ? "text-slate-500 line-through" : "text-slate-200"
                        }`}
                      >
                        {ex.name}
                      </span>
                      {ex.setsReps && (
                        <span className="font-mono text-xs text-emerald-400">{ex.setsReps}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {workoutDay.notes && <p className="text-slate-400">備註：{workoutDay.notes}</p>}
              {log?.workoutNotes && (
                <p className="text-slate-400">訓練記錄：{log.workoutNotes}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">此計劃尚未設定 Day {day} 的訓練內容。</p>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">今日飲食</h2>
            {mealPlan && (
              <Link
                href={`/meal-plans/${mealPlan.id}?day=${day}`}
                className="text-sm text-emerald-400 hover:underline"
              >
                編輯 →
              </Link>
            )}
          </div>
          {mealDay ? (
            <dl className="space-y-2 text-sm">
              {(
                [
                  ["早餐", mealDay.breakfast],
                  ["午餐", mealDay.lunch],
                  ["下午茶", mealDay.afternoonSnack],
                  ["晚餐", mealDay.dinner],
                  ["訓練後/睡前", mealDay.supplements],
                  ["備餐提示", mealDay.tips],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-slate-900/60 px-3 py-2">
                    <dt className="text-xs font-semibold text-emerald-400">{label}</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-slate-200">{value}</dd>
                  </div>
                ))}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">
              {mealPlan
                ? `餐單中沒有 Day ${day} 的內容。`
                : "你還沒有餐單，可到「飲食餐單」頁建立。"}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
