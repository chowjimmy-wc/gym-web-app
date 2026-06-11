"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setAuth } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";
import { Button, Card, ErrorMessage, Input } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("密碼長度至少需要 8 個字元");
      return;
    }
    setLoading(true);
    try {
      const res = await api<AuthResponse>("/auth/register", {
        method: "POST",
        body: { email, password, displayName },
        noRedirect: true,
      });
      setAuth(res.token, res.user);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "註冊失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <h1 className="mb-1 text-2xl font-bold text-emerald-400">建立帳號</h1>
        <p className="mb-6 text-sm text-slate-400">
          註冊後即可取得預設營養目標，並可從 60 天 Lean Bulk 範本建立計劃
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="顯示名稱" value={displayName} onChange={setDisplayName} required />
          <Input label="電子郵件" type="email" value={email} onChange={setEmail} required />
          <Input
            label="密碼（至少 8 個字元）"
            type="password"
            value={password}
            onChange={setPassword}
            required
          />
          <ErrorMessage message={error} />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "註冊中…" : "註冊"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          已經有帳號？{" "}
          <Link href="/login" className="text-emerald-400 hover:underline">
            前往登入
          </Link>
        </p>
      </Card>
    </main>
  );
}
