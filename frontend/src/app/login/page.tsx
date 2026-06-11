"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setAuth } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";
import { Button, Card, ErrorMessage, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<AuthResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
        noRedirect: true,
      });
      setAuth(res.token, res.user);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <h1 className="mb-1 text-2xl font-bold text-emerald-400">GymApp</h1>
        <p className="mb-6 text-sm text-slate-400">登入以管理你的訓練計劃與餐單</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="電子郵件" type="email" value={email} onChange={setEmail} required />
          <Input label="密碼" type="password" value={password} onChange={setPassword} required />
          <ErrorMessage message={error} />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "登入中…" : "登入"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          還沒有帳號？{" "}
          <Link href="/register" className="text-emerald-400 hover:underline">
            立即註冊
          </Link>
        </p>
      </Card>
    </main>
  );
}
