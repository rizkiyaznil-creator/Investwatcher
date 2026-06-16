"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginInner() {
  const sp = useSearchParams();
  const error = sp.get("error");
  const callbackUrl = sp.get("callbackUrl") ?? "/";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
      <div className="card w-full p-8">
        <div className="mb-2 text-3xl">📈</div>
        <h1 className="text-2xl font-bold">
          Invest<span className="text-brand">Watcher</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Aplikasi ini bersifat privat. Masuk untuk melanjutkan.
        </p>

        {error === "AccessDenied" && (
          <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Email Anda belum diizinkan mengakses aplikasi ini.
          </p>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="btn-primary mt-6 w-full justify-center py-2.5"
        >
          Masuk dengan Google
        </button>

        <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500">
          Hanya akun yang diizinkan pemilik yang dapat masuk.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">Memuat…</div>}>
      <LoginInner />
    </Suspense>
  );
}
