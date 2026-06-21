"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { WorkoutActivity } from "@/lib/types";
import { Button, Card, ErrorMessage, Input, PageTitle, Spinner, Textarea } from "@/components/ui";

interface Draft {
  category: string;
  name: string;
  notes: string;
}

const EMPTY: Draft = { category: "", name: "", notes: "" };

export default function ActivitiesPage() {
  const [items, setItems] = useState<WorkoutActivity[] | null>(null);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setItems(await api<WorkoutActivity[]>("/workout-activities"));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(item: WorkoutActivity) {
    setEditingId(item.id);
    setDraft({
      category: item.category ?? "",
      name: item.name,
      notes: item.notes ?? "",
    });
    setError(null);
  }

  function startNew() {
    setEditingId("new");
    setDraft(EMPTY);
    setError(null);
  }

  async function save() {
    if (!draft.name.trim()) {
      setError("動作名稱不能為空");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = {
        category: draft.category.trim() || null,
        name: draft.name.trim(),
        notes: draft.notes.trim() || null,
      };
      if (editingId === "new") {
        await api("/workout-activities", { method: "POST", body });
      } else {
        await api(`/workout-activities/${editingId}`, { method: "PUT", body });
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
    if (!confirm("確定要刪除此動作？")) return;
    await api(`/workout-activities/${id}`, { method: "DELETE" });
    await load();
  }

  if (!items) return <Spinner />;

  return (
    <div className="space-y-5">
      <PageTitle
        title="動作庫"
        subtitle="建立你自己的訓練動作，編輯訓練計劃時可直接選用"
        actions={<Button onClick={startNew}>+ 新增動作</Button>}
      />

      {editingId === "new" && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-100">新增動作</h2>
          <Editor draft={draft} setDraft={setDraft} error={error} busy={busy} onSave={save} onCancel={() => setEditingId(null)} />
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) =>
          editingId === item.id ? (
            <Card key={item.id}>
              <Editor draft={draft} setDraft={setDraft} error={error} busy={busy} onSave={save} onCancel={() => setEditingId(null)} />
            </Card>
          ) : (
            <Card key={item.id} className="flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {item.category && (
                    <span className="rounded-full bg-slate-600/30 px-2.5 py-0.5 text-xs text-slate-300">
                      {item.category}
                    </span>
                  )}
                  <h2 className="font-semibold text-slate-100">{item.name}</h2>
                </div>
                {item.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-400">
                    注意：{item.notes}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => startEdit(item)}>
                  編輯
                </Button>
                <Button variant="danger" onClick={() => remove(item.id)}>
                  刪除
                </Button>
              </div>
            </Card>
          ),
        )}
      </div>

      {items.length === 0 && editingId !== "new" && (
        <Card className="text-center text-sm text-slate-400">
          尚未建立任何動作。點擊「+ 新增動作」開始。
        </Card>
      )}
    </div>
  );
}

function Editor({
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
        label="動作種類"
        value={draft.category}
        onChange={(v) => setDraft({ ...draft, category: v })}
        placeholder="例如：胸、背、腿、有氧"
      />
      <Input
        label="動作名稱"
        value={draft.name}
        onChange={(v) => setDraft({ ...draft, name: v })}
        placeholder="例如：槓鈴臥推"
      />
      <Textarea
        label="注意地方"
        value={draft.notes}
        onChange={(v) => setDraft({ ...draft, notes: v })}
        rows={3}
        placeholder="例如：肩胛骨收緊，手肘約 45 度"
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
