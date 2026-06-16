"use client";

import { useSession, signOut } from "next-auth/react";

/** Shows the signed-in account + a sign-out button (only when authenticated). */
export default function AuthMenu() {
  const { data: session, status } = useSession();
  if (status !== "authenticated" || !session?.user) return null;

  const label = session.user.email ?? session.user.name ?? "Akun";
  return (
    <div className="flex items-center gap-2">
      <span
        className="hidden max-w-[160px] truncate text-xs text-slate-500 dark:text-slate-400 sm:inline"
        title={label}
      >
        {label}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="btn-ghost text-xs"
        title="Keluar"
      >
        Keluar
      </button>
    </div>
  );
}
