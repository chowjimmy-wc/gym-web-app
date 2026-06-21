"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MealItem } from "@/lib/types";
import { Button, Card, ErrorMessage, Input, PageTitle, Spinner, Textarea } from "@/components/ui";

interface Draft {
  name: string;
  cookingMethod: string;
}

const EMPTY: Draft = { name: "", cookingMethod: "" };

export default function MealItemsPage() {
  const [items, setItems] = useState<MealItem[] | null>(null);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setItems(await api<MealItem[]>("/meal-items"));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(item: MealItem) {
    setEditingId(item.id);
    setDraft({ name: item.name, cookingMethod: item.cookingMethod ?? "" });
    setError(null);
  }

  function startNew() {
    setEditingId("new");
    setDraft(EMPTY);
    setError(null);
  }

  async function save() {
    if (!draft.name.trim()) {
      setError("菜式名稱不能為空");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: draft.name.trim(),
        cookingMethod: draft.cookingMethod.trim() || null,
      };
      if (editingId === "new") {
        await api("/meal-items", { method: "POST", body });
      } else {
        await api(`/meal-items/${editingId}`, { method: "PUT", body });
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
    if (!confirm("確定要刪除此菜式？")) return;
    await api(`/meal-items/${id}`, { method: "DELETE" });
    await load();
  }

  if (!items) return <Spinner />;

  return (
    <div className="space-y-5">
      <PageTitle
        title="菜式庫"
        subtitle="建立你自己的菜式，編輯餐單時可直接加入"
        actions={<Button onClick={startNew}>+ 新增菜式</Button>}
      />

      {editingId === "new" && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-100">新增菜式</h2>
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
                <h2 className="font-semibold text-slate-100">{item.name}</h2>
                {item.cookingMethod && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-400">
                    煮食方法：{item.cookingMethod}
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
          尚未建立任何菜式。點擊「+ 新增菜式」開始。
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
        label="菜式名稱"
        value={draft.name}
        onChange={(v) => setDraft({ ...draft, name: v })}
        placeholder="例如：味噌烤三文魚"
      />
      <Textarea
        label="煮食方法"
        value={draft.cookingMethod}
        onChange={(v) => setDraft({ ...draft, cookingMethod: v })}
        rows={4}
        placeholder="例如：三文魚抹上味噌醬，焗爐 200 度 12 分鐘"
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
