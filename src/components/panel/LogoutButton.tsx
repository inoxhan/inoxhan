"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/server/actions/auth";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => logout()}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-steel-500 transition-colors hover:bg-steel-100 hover:text-status-overdue"
    >
      <LogOut className="size-4.5" aria-hidden />
      Çıkış Yap
    </button>
  );
}
