"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { clearAuth, getStoredUser, getToken } from "@/lib/api";
import type { UserInfo } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/", label: "今日總覽" },
  { href: "/programs", label: "訓練計劃" },
  { href: "/meal-plans", label: "飲食餐單" },
  { href: "/nutrition", label: "營養目標" },
  { href: "/progress", label: "進度追蹤" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setUser(getStoredUser());
    setReady(true);
  }, [router]);

  if (!ready) return null;

  function logout() {
    clearAuth();
    router.replace("/login");
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-700/60 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="text-xl font-bold text-emerald-400">
            GymApp
          </Link>
          <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-2 sm:w-auto">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="order-2 flex items-center gap-3 sm:order-3">
            <span className="hidden text-sm text-slate-400 sm:inline">
              {user?.displayName}
            </span>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:border-red-400 hover:text-red-300"
            >
              登出
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        GymApp — 你的健身計劃管理平台
      </footer>
    </div>
  );
}
