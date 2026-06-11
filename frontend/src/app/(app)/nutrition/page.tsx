"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { NutritionTarget } from "@/lib/types";
import { Button, Card, ErrorMessage, Input, PageTitle, Spinner, Textarea } from "@/components/ui";

interface Draft {
  item: string;
  value: string;
  note: string;
}

const EMPTY_DRAFT: Draft = { item: "", value: "", note: "" };

export default function NutritionPage() {
  const [targets, setTargets] = useState<NutritionTarget[] | null>(null);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setTargets(await api<NutritionTarget[]>("/nutrition-targets"));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(target: NutritionTarget) {
    setEditingId(target.id);
    setDraft({ item: target.item, value: target.value ?? "", note: target.note ?? "" });
    setError(null);
  }

  function startNew() {
    setEditingId("new");
    setDraft(EMPTY_DRAFT);
    setError(null);
  }

  async function save() {
    if (!draft.item.trim()) {
      setError("項目名稱不能為空");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = {
        item: draft.item.trim(),
        value: draft.value || null,
        note: draft.note || null,
        sortOrder:
          editingId === "new"
            ? (targets?.length ?? 0)
            : targets?.find((t) => t.id === editingId)?.sortOrder,
      };
      if (editingId === "new") {
        await api("/nutrition-targets", { method: "POST", body });
      } else {
        await api(`/nutrition-targets/${editingId}`, { method: "PUT", body });
      }
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("確定要刪除此營養目標？")) return;
    await api(`/nutrition-targets/${id}`, { method: "DELETE" });
    await load();
  }

  if (!targets) return <Spinner />;

  return (
    <div className="space-y-5">
      <PageTitle
        title="營養與熱量目標"
        subtitle="每日飲食請以此為參考基準"
        actions={<Button onClick={startNew}>+ 新增目標</Button>}
      />

      {editingId === "new" && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-100">新增營養目標</h2>
          <EditorForm
            draft={draft}
            setDraft={setDraft}
            error={error}
            busy={busy}
            onSave={save}
            onCancel={() => setEditingId(null)}
          />
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {targets.map((target) =>
          editingId === target.id ? (
            <Card key={target.id}>
              <EditorForm
                draft={draft}
                setDraft={setDraft}
                error={error}
                busy={busy}
                onSave={save}
                onCancel={() => setEditingId(null)}
              />
            </Card>
          ) : (
            <Card key={target.id} className="flex flex-col justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-100">{target.item}</h2>
                {target.value && (
                  <p className="mt-1 text-xl font-bold text-emerald-400">{target.value}</p>
                )}
                {target.note && <p className="mt-1 text-sm text-slate-400">{target.note}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => startEdit(target)}>
                  編輯
                </Button>
                <Button variant="danger" onClick={() => remove(target.id)}>
                  刪除
                </Button>
              </div>
            </Card>
          ),
        )}
      </div>

      {targets.length === 0 && (
        <Card className="text-center text-sm text-slate-400">
          尚未設定任何營養目標。
        </Card>
      )}
    </div>
  );
}

function EditorForm({
  draft,
  setDraft,
  error,
  busy,
  onSave,
  onCancel,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  error: string | null;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <Input
        label="項目"
        value={draft.item}
        onChange={(v) => setDraft({ ...draft, item: v })}
        placeholder="例如：蛋白質 (Protein)"
      />
      <Input
        label="數據/計算結果"
        value={draft.value}
        onChange={(v) => setDraft({ ...draft, value: v })}
        placeholder="例如：150g (600 kcal)"
      />
      <Textarea
        label="說明"
        value={draft.note}
        onChange={(v) => setDraft({ ...draft, note: v })}
        rows={2}
      />
      <ErrorMessage message={error} />
      <div className="flex gap-2">
        <Button onClick={onSave} disabled={busy}>
          儲存
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  );
}
