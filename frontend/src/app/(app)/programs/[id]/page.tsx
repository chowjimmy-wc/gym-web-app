"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { DayLog, ProgramDetail, ProgramStatus, WorkoutDay } from "@/lib/types";
import {
  Button,
  Card,
  ErrorMessage,
  Input,
  PageTitle,
  Spinner,
  Textarea,
} from "@/components/ui";

interface ExerciseDraft {
  name: string;
  setsReps: string;
}

interface DayDraft {
  dayOfWeek: string;
  trainingType: string;
  restAdvice: string;
  cardio: string;
  notes: string;
  exercises: ExerciseDraft[];
}

function toDraft(day: WorkoutDay | null): DayDraft {
  return {
    dayOfWeek: day?.dayOfWeek ?? "",
    trainingType: day?.trainingType ?? "",
    restAdvice: day?.restAdvice ?? "",
    cardio: day?.cardio ?? "",
    notes: day?.notes ?? "",
    exercises:
      day?.exercises.map((e) => ({ name: e.name, setsReps: e.setsReps ?? "" })) ?? [],
  };
}

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const programId = params.id;

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [logs, setLogs] = useState<DayLog[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [draft, setDraft] = useState<DayDraft>(toDraft(null));
  const [meta, setMeta] = useState({ name: "", description: "", startDate: "", status: "DRAFT" as ProgramStatus });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const detail = await api<ProgramDetail>(`/programs/${programId}`);
    setProgram(detail);
    setMeta({
      name: detail.name,
      description: detail.description ?? "",
      startDate: detail.startDate ?? "",
      status: detail.status,
    });
    if (!detail.template) {
      setLogs(await api<DayLog[]>(`/programs/${programId}/day-logs`));
    }
  }, [programId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const dayParam = Number(searchParams.get("day"));
    if (dayParam >= 1) setSelectedDay(dayParam);
  }, [searchParams]);

  const currentDay = useMemo(
    () => program?.days.find((d) => d.dayNumber === selectedDay) ?? null,
    [program, selectedDay],
  );

  useEffect(() => {
    setDraft(toDraft(currentDay));
  }, [currentDay, selectedDay]);

  function flashSaved(message: string) {
    setSavedMessage(message);
    setTimeout(() => setSavedMessage(null), 2500);
  }

  async function saveMeta() {
    setError(null);
    setBusy(true);
    try {
      await api(`/programs/${programId}`, {
        method: "PUT",
        body: {
          name: meta.name,
          description: meta.description || null,
          startDate: meta.startDate || null,
          status: meta.status,
        },
      });
      await load();
      flashSaved("計劃設定已儲存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setBusy(false);
    }
  }

  async function saveDay() {
    setError(null);
    setBusy(true);
    try {
      await api(`/programs/${programId}/days/${selectedDay}`, {
        method: "PUT",
        body: {
          dayOfWeek: draft.dayOfWeek || null,
          trainingType: draft.trainingType || null,
          restAdvice: draft.restAdvice || null,
          cardio: draft.cardio || null,
          notes: draft.notes || null,
          exercises: draft.exercises
            .filter((e) => e.name.trim())
            .map((e) => ({ name: e.name.trim(), setsReps: e.setsReps.trim() || null })),
        },
      });
      await load();
      flashSaved(`Day ${selectedDay} 已儲存`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDay() {
    if (!currentDay || !confirm(`確定要刪除 Day ${selectedDay} 的訓練內容？`)) return;
    setBusy(true);
    try {
      await api(`/programs/${programId}/days/${selectedDay}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  function updateExercise(index: number, field: keyof ExerciseDraft, value: string) {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    }));
  }

  if (!program) return <Spinner />;

  const readOnly = program.template;

  return (
    <div className="space-y-5">
      <PageTitle
        title={program.name}
        subtitle={readOnly ? "系統範本（唯讀）" : `${program.durationDays} 天計劃`}
        actions={
          <Button variant="secondary" onClick={() => router.push("/programs")}>
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

      {!readOnly && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-100">計劃設定</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="計劃名稱"
              value={meta.name}
              onChange={(v) => setMeta({ ...meta, name: v })}
            />
            <Input
              label="開始日期"
              type="date"
              value={meta.startDate}
              onChange={(v) => setMeta({ ...meta, startDate: v })}
            />
            <Input
              label="描述"
              value={meta.description}
              onChange={(v) => setMeta({ ...meta, description: v })}
            />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-400">狀態</span>
              <select
                value={meta.status}
                onChange={(e) => setMeta({ ...meta, status: e.target.value as ProgramStatus })}
                className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
              >
                <option value="DRAFT">草稿</option>
                <option value="ACTIVE">進行中</option>
                <option value="COMPLETED">已完成</option>
              </select>
            </label>
          </div>
          <div className="mt-4">
            <Button onClick={saveMeta} disabled={busy}>
              儲存計劃設定
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-100">
          {program.durationDays} 天日曆
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          點擊任一天進行編輯。綠色 = 已完成，深色 = 已有訓練內容。
        </p>
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
          {Array.from({ length: program.durationDays }, (_, i) => i + 1).map((d) => {
            const hasContent = program.days.some((x) => x.dayNumber === d);
            const completed = logs.some((l) => l.dayNumber === d && l.completed);
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`rounded-lg py-2 text-xs font-medium transition-colors ${
                  selectedDay === d
                    ? "ring-2 ring-emerald-400"
                    : ""
                } ${
                  completed
                    ? "bg-emerald-500/30 text-emerald-200"
                    : hasContent
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

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="星期"
            value={draft.dayOfWeek}
            onChange={(v) => setDraft({ ...draft, dayOfWeek: v })}
            placeholder="星期一"
          />
          <Input
            label="訓練類型"
            value={draft.trainingType}
            onChange={(v) => setDraft({ ...draft, trainingType: v })}
            placeholder="上半身 (推+拉)"
          />
          <Input
            label="休息時間建議"
            value={draft.restAdvice}
            onChange={(v) => setDraft({ ...draft, restAdvice: v })}
            placeholder="主項120秒，孤立60秒"
          />
          <Input
            label="有氧運動"
            value={draft.cardio}
            onChange={(v) => setDraft({ ...draft, cardio: v })}
          />
        </div>

        <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-200">動作列表</h3>
        <div className="space-y-2">
          {draft.exercises.map((ex, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex-1">
                <Input value={ex.name} onChange={(v) => updateExercise(i, "name", v)} placeholder="動作名稱" />
              </div>
              <div className="w-36">
                <Input
                  value={ex.setsReps}
                  onChange={(v) => updateExercise(i, "setsReps", v)}
                  placeholder="4x8-10"
                />
              </div>
              {!readOnly && (
                <Button
                  variant="danger"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      exercises: d.exercises.filter((_, j) => j !== i),
                    }))
                  }
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
        </div>
        {!readOnly && (
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                exercises: [...d.exercises, { name: "", setsReps: "" }],
              }))
            }
          >
            + 新增動作
          </Button>
        )}

        <div className="mt-4">
          <Textarea
            label="備註"
            value={draft.notes}
            onChange={(v) => setDraft({ ...draft, notes: v })}
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
