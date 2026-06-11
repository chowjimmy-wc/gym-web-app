"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DayLog, ProgramSummary, WeeklyReview } from "@/lib/types";
import { Button, Card, ErrorMessage, Input, PageTitle, Spinner, Textarea } from "@/components/ui";

interface ReviewDraft {
  logDate: string;
  weightKg: string;
  waistCm: string;
  strengthProgress: string;
  moodSleepSoreness: string;
  reflection: string;
}

const EMPTY_REVIEW: ReviewDraft = {
  logDate: "",
  weightKg: "",
  waistCm: "",
  strengthProgress: "",
  moodSleepSoreness: "",
  reflection: "",
};

function toDraft(review: WeeklyReview | undefined): ReviewDraft {
  if (!review) return EMPTY_REVIEW;
  return {
    logDate: review.logDate ?? "",
    weightKg: review.weightKg?.toString() ?? "",
    waistCm: review.waistCm?.toString() ?? "",
    strengthProgress: review.strengthProgress ?? "",
    moodSleepSoreness: review.moodSleepSoreness ?? "",
    reflection: review.reflection ?? "",
  };
}

export default function ProgressPage() {
  const [programs, setPrograms] = useState<ProgramSummary[] | null>(null);
  const [programId, setProgramId] = useState<number | null>(null);
  const [logs, setLogs] = useState<DayLog[]>([]);
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [draft, setDraft] = useState<ReviewDraft>(EMPTY_REVIEW);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const list = await api<ProgramSummary[]>("/programs");
      setPrograms(list);
      const active = list.find((p) => p.status === "ACTIVE") ?? list[0];
      if (active) setProgramId(active.id);
    })();
  }, []);

  const loadProgress = useCallback(async () => {
    if (programId == null) return;
    const [dayLogs, weeklyReviews] = await Promise.all([
      api<DayLog[]>(`/programs/${programId}/day-logs`),
      api<WeeklyReview[]>(`/programs/${programId}/weekly-reviews`),
    ]);
    setLogs(dayLogs);
    setReviews(weeklyReviews);
  }, [programId]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  if (!programs) return <Spinner />;

  if (programs.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400">
        尚未建立任何訓練計劃，請先到「訓練計劃」頁建立。
      </div>
    );
  }

  const program = programs.find((p) => p.id === programId);
  const totalWeeks = program ? Math.ceil(program.durationDays / 7) : 0;
  const completedCount = logs.filter((l) => l.completed).length;

  function startEdit(week: number) {
    setEditingWeek(week);
    setDraft(toDraft(reviews.find((r) => r.weekNumber === week)));
    setError(null);
  }

  async function saveReview() {
    if (editingWeek == null || programId == null) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/programs/${programId}/weekly-reviews/${editingWeek}`, {
        method: "PUT",
        body: {
          logDate: draft.logDate || null,
          weightKg: draft.weightKg ? Number(draft.weightKg) : null,
          waistCm: draft.waistCm ? Number(draft.waistCm) : null,
          strengthProgress: draft.strengthProgress || null,
          moodSleepSoreness: draft.moodSleepSoreness || null,
          reflection: draft.reflection || null,
        },
      });
      setEditingWeek(null);
      await loadProgress();
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setBusy(false);
    }
  }

  async function deleteReview(week: number) {
    if (programId == null || !confirm(`確定要刪除第 ${week} 週的記錄？`)) return;
    await api(`/programs/${programId}/weekly-reviews/${week}`, { method: "DELETE" });
    await loadProgress();
  }

  return (
    <div className="space-y-5">
      <PageTitle title="進度追蹤與檢討" subtitle="每週記錄體重、腰圍與訓練進展" />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-300">訓練計劃：</label>
          <select
            value={programId ?? ""}
            onChange={(e) => setProgramId(Number(e.target.value))}
            className="rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {program && (
            <span className="text-sm text-slate-400">
              已完成 {completedCount} / {program.durationDays} 天
            </span>
          )}
        </div>
      </Card>

      {program && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-100">完成日曆</h2>
          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
            {Array.from({ length: program.durationDays }, (_, i) => i + 1).map((d) => {
              const completed = logs.some((l) => l.dayNumber === d && l.completed);
              return (
                <div
                  key={d}
                  className={`rounded-lg py-2 text-center text-xs font-medium ${
                    completed
                      ? "bg-emerald-500/30 text-emerald-200"
                      : "bg-slate-900/70 text-slate-500"
                  }`}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {Array.from({ length: totalWeeks + 1 }, (_, i) => i).map((week) => {
          const review = reviews.find((r) => r.weekNumber === week);
          const title = week === 0 ? "起始 (Day 0)" : `第 ${week} 週`;
          if (editingWeek === week) {
            return (
              <Card key={week}>
                <h3 className="mb-3 font-semibold text-slate-100">{title}</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    label="日期"
                    type="date"
                    value={draft.logDate}
                    onChange={(v) => setDraft({ ...draft, logDate: v })}
                  />
                  <Input
                    label="體重 (kg)"
                    type="number"
                    value={draft.weightKg}
                    onChange={(v) => setDraft({ ...draft, weightKg: v })}
                  />
                  <Input
                    label="腰圍 (cm)"
                    type="number"
                    value={draft.waistCm}
                    onChange={(v) => setDraft({ ...draft, waistCm: v })}
                  />
                </div>
                <div className="mt-3 space-y-3">
                  <Textarea
                    label="主要力量進步"
                    value={draft.strengthProgress}
                    onChange={(v) => setDraft({ ...draft, strengthProgress: v })}
                    rows={2}
                  />
                  <Textarea
                    label="體感/睡眠/疲勞度"
                    value={draft.moodSleepSoreness}
                    onChange={(v) => setDraft({ ...draft, moodSleepSoreness: v })}
                    rows={2}
                  />
                  <Textarea
                    label="檢討與調整建議"
                    value={draft.reflection}
                    onChange={(v) => setDraft({ ...draft, reflection: v })}
                    rows={2}
                  />
                </div>
                <ErrorMessage message={error} />
                <div className="mt-3 flex gap-2">
                  <Button onClick={saveReview} disabled={busy}>
                    儲存
                  </Button>
                  <Button variant="secondary" onClick={() => setEditingWeek(null)}>
                    取消
                  </Button>
                </div>
              </Card>
            );
          }
          return (
            <Card key={week}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-100">{title}</h3>
                  {review ? (
                    <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-300">
                      {review.logDate && <span>日期：{review.logDate}</span>}
                      {review.weightKg != null && (
                        <span>
                          體重：<b className="text-emerald-400">{review.weightKg} kg</b>
                        </span>
                      )}
                      {review.waistCm != null && (
                        <span>
                          腰圍：<b className="text-emerald-400">{review.waistCm} cm</b>
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">尚未記錄</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => startEdit(week)}>
                    {review ? "編輯" : "記錄"}
                  </Button>
                  {review && (
                    <Button variant="danger" onClick={() => deleteReview(week)}>
                      刪除
                    </Button>
                  )}
                </div>
              </div>
              {review && (review.strengthProgress || review.moodSleepSoreness || review.reflection) && (
                <dl className="mt-3 space-y-1.5 text-sm">
                  {review.strengthProgress && (
                    <div>
                      <dt className="inline font-medium text-slate-400">力量進步：</dt>
                      <dd className="inline text-slate-200">{review.strengthProgress}</dd>
                    </div>
                  )}
                  {review.moodSleepSoreness && (
                    <div>
                      <dt className="inline font-medium text-slate-400">體感/睡眠：</dt>
                      <dd className="inline text-slate-200">{review.moodSleepSoreness}</dd>
                    </div>
                  )}
                  {review.reflection && (
                    <div>
                      <dt className="inline font-medium text-slate-400">檢討：</dt>
                      <dd className="inline text-slate-200">{review.reflection}</dd>
                    </div>
                  )}
                </dl>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
