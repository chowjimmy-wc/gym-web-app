"use client";

import { useRef, useState } from "react";
import { apiDownload, apiUpload } from "@/lib/api";
import { Button } from "@/components/ui";

export function ExcelActions({
  templatePath,
  templateFilename,
  importPath,
  defaultName,
  onImported,
}: {
  templatePath: string;
  templateFilename: string;
  importPath: string;
  defaultName: string;
  onImported: () => void | Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadTemplate() {
    setError(null);
    try {
      await apiDownload(templatePath, templateFilename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "下載失敗");
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const name = window.prompt("請輸入名稱：", defaultName)?.trim();
    if (name === undefined || name === "") return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiUpload(importPath, file, { name });
      setMessage(`已從「${file.name}」匯入成功`);
      await onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "匯入失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" onClick={downloadTemplate}>
        下載範本
      </Button>
      <Button onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? "匯入中…" : "從 Excel 匯入"}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx"
        onChange={handleFile}
        className="hidden"
      />
      {message && <span className="text-sm text-emerald-400">{message}</span>}
      {error && <span className="text-sm text-red-400">{error}</span>}
    </div>
  );
}
